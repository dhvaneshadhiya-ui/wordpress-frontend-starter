import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Build {
  timestamp: string;
  totalDuration: number;
  phase: string;
  stats: {
    cacheHitRate?: string;
    filesWritten?: number;
    filesSkipped?: number;
    totalPosts?: number;
    postsModified?: number;
    incrementalRate?: string;
  };
}

interface BuildHistoryTableProps {
  builds: Build[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

export function BuildHistoryTable({ builds }: BuildHistoryTableProps) {
  const sortedBuilds = [...builds].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Build History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Cache Rate</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Posts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBuilds.map((build, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {new Date(build.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={build.phase === 'content-fetch' ? 'default' : 'secondary'}>
                      {build.phase}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDuration(build.totalDuration)}</TableCell>
                  <TableCell>
                    {build.stats?.cacheHitRate || '-'}
                  </TableCell>
                  <TableCell>
                    {build.stats?.filesWritten !== undefined ? (
                      <span>
                        {build.stats.filesWritten} / {(build.stats.filesWritten || 0) + (build.stats.filesSkipped || 0)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {build.stats?.totalPosts !== undefined ? (
                      <span>
                        {build.stats.postsModified || 0} / {build.stats.totalPosts}
                      </span>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
