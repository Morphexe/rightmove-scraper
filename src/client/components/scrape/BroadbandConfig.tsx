import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, Wifi } from 'lucide-react';
import { apiClient } from '@client/api/client';
import { toast } from 'sonner';
import { cn } from '@client/lib/utils';

interface BroadbandSettings {
  enabled: boolean;
  minDownloadSpeed?: number;
  minUploadSpeed?: number;
}

export function BroadbandConfig() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BroadbandSettings>({ enabled: false });
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['config-broadband'],
    queryFn: async () => {
      const res = await apiClient.config.broadband.get();
      return res.data as BroadbandSettings;
    }
  });
  
  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);
  
  const mutation = useMutation({
    mutationFn: (data: BroadbandSettings) => apiClient.config.broadband.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-broadband'] });
      toast.success('Broadband settings saved');
    },
    onError: (err) => toast.error(`Failed: ${err.message}`)
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              form.enabled ? 'bg-success/20' : 'bg-muted'
            )}>
              <Wifi className={cn('h-5 w-5', form.enabled ? 'text-success' : 'text-muted-foreground')} />
            </div>
            <div>
              <p className="font-medium">Broadband Speed Filter</p>
              <p className="text-sm text-muted-foreground">
                Filter properties by minimum internet speed
              </p>
            </div>
          </div>
          <button
            onClick={() => setForm({ ...form, enabled: !form.enabled })}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              form.enabled ? 'bg-success' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                form.enabled && 'translate-x-6'
              )}
            />
          </button>
        </div>
      </div>
      
      {form.enabled && (
        <div className="card">
          <h3 className="font-medium mb-4">Minimum Speed Requirements</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Download Speed
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.minDownloadSpeed || ''}
                  onChange={(e) => setForm({ ...form, minDownloadSpeed: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="500"
                  className="input w-full pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  Mbps
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: 100+ for remote work
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Upload Speed
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.minUploadSpeed || ''}
                  onChange={(e) => setForm({ ...form, minUploadSpeed: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="50"
                  className="input w-full pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  Mbps
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Optional - leave empty to skip
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-end">
        <button
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );
}
