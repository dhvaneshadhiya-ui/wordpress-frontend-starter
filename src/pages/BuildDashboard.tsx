import { useQuery } from "@tanstack/react-query";
import { BuildMetricsCards } from "@/components/BuildMetricsCards";
import { BuildDurationChart } from "@/components/BuildDurationChart";
import { CacheHitRateChart } from "@/components/CacheHitRateChart";
import { BuildHistoryTable } from "@/components/BuildHistoryTable";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BuildMetrics {
  builds: Array<{
    timestamp: string;
    totalDuration: number;
    phase: string;
    stats: Record<string, unknown>;
    timings: Record<string, number>;
  }>;
  summary: {
    totalBuilds: number;
    averageDuration: number;
    fastestBuild: number;
    slowestBuild: number;
    averageCacheHitRate: string;
    lastBuild: string;
  };
}

async function fetchBuildMetrics(): Promise<BuildMetrics> {
  const response = await fetch('/build-metrics.json');
  if (!response.ok) {
    throw new Error('Failed to fetch build metrics');
  }
  return response.json();
}

export default function BuildDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['build-metrics'],
    queryFn: fetchBuildMetrics,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center space-y-4 py-16">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No Build Metrics Available</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Build metrics will appear here after your first deployment. 
            Run the build pipeline to generate metrics data.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Build Performance</h1>
          <p className="text-muted-foreground">
            Monitor build times and cache efficiency
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <BuildMetricsCards summary={data.summary} />

      <div className="grid gap-4 md:grid-cols-2">
        <BuildDurationChart builds={data.builds} />
        <CacheHitRateChart builds={data.builds} />
      </div>

      <BuildHistoryTable builds={data.builds} />
    </div>
  );
}
