import { useEffect, useState } from 'react';
import { apiClient } from '@client/api/client';
import { Globe, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { cn } from '@client/lib/utils';

interface ProxyStats {
  enabled: boolean;
  status: string;
}

export function ProxyStatus() {
  const [status, setStatus] = useState<ProxyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await apiClient.stats.proxy();
      if (res.data) {
        setStatus(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch proxy status', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading && !status) {
    return <div className="h-64 animate-pulse bg-muted rounded-lg" />;
  }

  if (!status) return null;

  const isEnabled = status.enabled;

  return (
    <div className="card h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="w-5 h-5 text-muted-foreground" />
          Proxy Network
        </h2>
        <button 
          onClick={fetchStatus}
          disabled={loading}
          className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center",
          isEnabled ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
        )}>
          <Globe className="w-8 h-8" />
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl font-bold">
              {isEnabled ? 'Active' : 'Disabled'}
            </span>
            {isEnabled ? (
              <CheckCircle2 className="w-5 h-5 text-success" />
            ) : (
              <XCircle className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isEnabled 
              ? 'Traffic routed through proxy.' 
              : 'Direct connection.'}
          </p>
        </div>
      </div>
    </div>
  );
}
