import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Build {
  timestamp: string;
  stats: {
    cacheHitRate?: string;
    filesWritten?: number;
    filesSkipped?: number;
  };
  phase: string;
}

interface CacheHitRateChartProps {
  builds: Build[];
}

export function CacheHitRateChart({ builds }: CacheHitRateChartProps) {
  const chartData = builds.slice(-20).map((build, index) => {
    const rate = build.stats?.cacheHitRate 
      ? parseFloat(build.stats.cacheHitRate.replace('%', ''))
      : 0;
    
    return {
      name: `#${index + 1}`,
      rate,
      phase: build.phase,
      date: new Date(build.timestamp).toLocaleDateString(),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache Hit Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Cache Hit Rate']}
              />
              <Bar
                dataKey="rate"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
