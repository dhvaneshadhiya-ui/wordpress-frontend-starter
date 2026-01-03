import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Zap, TrendingUp, Database } from "lucide-react";

interface BuildMetricsSummary {
  totalBuilds: number;
  averageDuration: number;
  fastestBuild: number;
  slowestBuild: number;
  averageCacheHitRate: string;
  lastBuild: string;
}

interface BuildMetricsCardsProps {
  summary: BuildMetricsSummary;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

export function BuildMetricsCards({ summary }: BuildMetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Builds</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalBuilds}</div>
          <p className="text-xs text-muted-foreground">
            Last: {new Date(summary.lastBuild).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDuration(summary.averageDuration)}</div>
          <p className="text-xs text-muted-foreground">
            Last 10 builds average
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fastest Build</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatDuration(summary.fastestBuild)}</div>
          <p className="text-xs text-muted-foreground">
            Slowest: {formatDuration(summary.slowestBuild)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.averageCacheHitRate}</div>
          <p className="text-xs text-muted-foreground">
            Average across builds
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
