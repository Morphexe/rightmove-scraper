import { Activity, MapPin, FileText, Home, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useScrapeWebSocket } from '@client/hooks/useWebSocket';
import { cn } from '@client/lib/utils';

export function ScrapeProgress() {
  const { status, connected } = useScrapeWebSocket();
  
  if (!status?.isRunning) {
    return (
      <div className="card bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Scraper Idle</p>
              <p className="text-sm text-muted-foreground">
                Click "Start Scraping" to begin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {connected ? (
              <>
                <Wifi className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">Disconnected</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  const { progress, currentLocation } = status;
  const progressPercent = progress.totalPages > 0 
    ? (progress.currentPage / progress.totalPages) * 100 
    : 0;
  
  return (
    <div className="card bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 animate-pulse">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Scraping in Progress</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {currentLocation || 'Initializing...'}
              </p>
            </div>
          </div>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary text-primary-foreground animate-pulse">
            Running
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              Page {progress.currentPage} of {progress.totalPages}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{progress.pagesScraped}</p>
            <p className="text-xs text-muted-foreground">Pages Scraped</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Home className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{progress.propertiesFound}</p>
            <p className="text-xs text-muted-foreground">Properties Found</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-success">{progress.newProperties}</p>
            <p className="text-xs text-muted-foreground">New Properties</p>
          </div>
        </div>
      </div>
    </div>
  );
}
