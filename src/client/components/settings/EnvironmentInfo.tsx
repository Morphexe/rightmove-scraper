import { useEffect, useState } from 'react';
import { apiClient } from '@client/api/client';
import { Monitor, Shield, Clock, Layers, FileText } from 'lucide-react';
import { cn } from '@client/lib/utils';

interface EnvInfo {
  browserMode: string;
  proxyEnabled: boolean;
  scrapeDelayMs: number;
  maxPagesPerRun: number;
  logLevel: string;
}

export function EnvironmentInfo() {
  const [info, setInfo] = useState<EnvInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.config.env();
        if (res.data) {
          setInfo(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch env info', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="h-64 animate-pulse bg-muted rounded-lg" />;
  }

  if (!info) return null;

  const items = [
    { label: 'Browser Mode', value: info.browserMode, icon: Monitor },
    { label: 'Proxy Enabled', value: info.proxyEnabled ? 'Yes' : 'No', icon: Shield },
    { label: 'Scrape Delay', value: `${info.scrapeDelayMs}ms`, icon: Clock },
    { label: 'Max Pages', value: info.maxPagesPerRun, icon: Layers },
    { label: 'Log Level', value: info.logLevel.toUpperCase(), icon: FileText },
  ];

  return (
    <div className="card h-full">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Monitor className="w-5 h-5 text-muted-foreground" />
        System Environment
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <item.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
            <span className="text-sm font-medium font-mono">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
