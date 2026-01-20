import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Loader2 } from 'lucide-react';
import { apiClient } from '@client/api/client';
import { useScrapeWebSocket } from '@client/hooks/useWebSocket';
import { toast } from 'sonner';
import { cn } from '@client/lib/utils';

export function ScrapeControls() {
  const queryClient = useQueryClient();
  const { status } = useScrapeWebSocket();
  const isRunning = status?.isRunning ?? false;
  
  const startMutation = useMutation({
    mutationFn: () => apiClient.scrape.start({}),
    onSuccess: () => {
      toast.success('Scraping started');
      queryClient.invalidateQueries({ queryKey: ['scrape-status'] });
    },
    onError: (err) => {
      toast.error(`Failed to start: ${err.message}`);
    }
  });
  
  const stopMutation = useMutation({
    mutationFn: () => apiClient.scrape.stop(),
    onSuccess: () => {
      toast.info('Scraping stopped');
      queryClient.invalidateQueries({ queryKey: ['scrape-status'] });
    },
    onError: (err) => {
      toast.error(`Failed to stop: ${err.message}`);
    }
  });
  
  if (isRunning) {
    return (
      <button
        onClick={() => stopMutation.mutate()}
        disabled={stopMutation.isPending}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {stopMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Square className="h-4 w-4" />
        )}
        Stop Scraping
      </button>
    );
  }
  
  return (
    <button
      onClick={() => startMutation.mutate()}
      disabled={startMutation.isPending}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
        'bg-success text-success-foreground hover:bg-success/90',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      {startMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      Start Scraping
    </button>
  );
}
