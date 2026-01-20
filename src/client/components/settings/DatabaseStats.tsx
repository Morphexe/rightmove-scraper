import { useEffect, useState } from 'react';
import { apiClient } from '@client/api/client';
import { Database, Trash2, AlertTriangle, RefreshCw, HardDrive, FileText, CheckCircle, EyeOff } from 'lucide-react';
import { cn } from '@client/lib/utils';

interface DbStats {
  tables: {
    properties: number;
    scrapeRuns: number;
  };
}

interface OverviewStats {
  totalProperties: number;
  newToday: number;
  marked: number;
  unseen: number;
  byStatus: Record<string, number>;
}

function StatCard({ label, value, icon: Icon, color, highlight = false }: { label: string; value: number; icon: any; color: string; highlight?: boolean }) {
  return (
    <div className="bg-muted p-4 rounded-xl border border-border flex items-start justify-between group hover:bg-card hover:border-border hover:shadow-sm transition-all">
      <div>
        <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
        <p className={cn("text-2xl font-bold font-mono tracking-tight", highlight ? "text-primary" : "text-foreground")}>
          {value.toLocaleString()}
        </p>
      </div>
      <div className={cn("p-2 rounded-lg bg-card shadow-sm opacity-50 group-hover:opacity-100 transition-opacity", color)}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

export function DatabaseStats() {
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [dbRes, ovRes] = await Promise.all([
        apiClient.stats.database(),
        apiClient.stats.overview()
      ]);
      if (dbRes.data) setDbStats(dbRes.data);
      if (ovRes.data) setOverview(ovRes.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await apiClient.properties.deleteAll();
      await fetchStats();
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to delete properties', error);
    } finally {
      setDeleting(false);
    }
  };

  if (!dbStats || !overview) return <div className="h-48 animate-pulse bg-muted rounded-xl" />;

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-muted-foreground" />
          Database Statistics
        </h2>
        <button 
          onClick={fetchStats}
          disabled={loading}
          className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Total Properties" 
          value={overview.totalProperties} 
          icon={HardDrive}
          color="text-blue-500"
        />
        <StatCard 
          label="New Today" 
          value={overview.newToday} 
          highlight={overview.newToday > 0} 
          icon={FileText}
          color="text-green-500"
        />
        <StatCard 
          label="Marked" 
          value={overview.marked} 
          icon={CheckCircle}
          color="text-purple-500"
        />
        <StatCard 
          label="Unseen" 
          value={overview.unseen} 
          highlight={overview.unseen > 0} 
          icon={EyeOff}
          color="text-orange-500"
        />
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          Danger Zone
        </h3>
        
        {showConfirm ? (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/20 rounded-full text-destructive shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-sm text-destructive font-medium">
                Permanently delete all {overview.totalProperties} properties? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 sm:flex-none px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete All Properties
          </button>
        )}
      </div>
    </div>
  );
}
