import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { apiClient } from '@client/api/client';
import { formatDateTime } from '@client/lib/utils';
import { cn } from '@client/lib/utils';

interface ScrapeRun {
  id: number;
  searchLocation: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  pagesScraped: number;
  propertiesFound: number;
  newProperties: number;
  errorMessage?: string;
}

export function ScrapeHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['scrape-history'],
    queryFn: async () => {
      const res = await apiClient.scrape.history({ limit: '50' });
      return res.data as { data: ScrapeRun[]; pagination: { total: number } };
    }
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const runs = data?.data || [];
  
  if (runs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No scrape history yet</p>
        <p className="text-sm">Start a scrape to see results here</p>
      </div>
    );
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-success/20 text-success',
      failed: 'bg-destructive/20 text-destructive',
      running: 'bg-primary/20 text-primary',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };
  
  const getDuration = (start: string, end?: string) => {
    if (!end) return 'In progress';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Location</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Pages</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Found</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">New</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Duration</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-3 px-4 text-sm">
                {formatDateTime(run.startedAt)}
              </td>
              <td className="py-3 px-4 font-medium">
                {run.searchLocation}
              </td>
              <td className="py-3 px-4">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                  getStatusBadge(run.status)
                )}>
                  {getStatusIcon(run.status)}
                  {run.status}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-right tabular-nums">
                {run.pagesScraped}
              </td>
              <td className="py-3 px-4 text-sm text-right tabular-nums">
                {run.propertiesFound}
              </td>
              <td className="py-3 px-4 text-sm text-right tabular-nums font-medium text-success">
                +{run.newProperties}
              </td>
              <td className="py-3 px-4 text-sm text-right text-muted-foreground">
                {getDuration(run.startedAt, run.completedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
