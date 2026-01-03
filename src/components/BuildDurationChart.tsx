import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Build {
  timestamp: string;
  totalDuration: number;
  phase: string;
}

interface BuildDurationChartProps {
  builds: Build[];
}

export function BuildDurationChart({ builds }: BuildDurationChartProps) {
  const chartData = builds.slice(-20).map((build, index) => ({
    name: `#${index + 1}`,
    duration: Math.round(build.totalDuration / 1000),
    phase: build.phase,
    date: new Date(build.timestamp).toLocaleDateString(),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Build Duration Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value}s`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value}s`, 'Duration']}
              />
              <Line
                type="monotone"
                dataKey="duration"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
