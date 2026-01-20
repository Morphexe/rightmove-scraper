import { Activity, BarChart3, Home, Menu } from 'lucide-react';
import { cn } from '@client/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ label, value, icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors">
      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold tracking-tight">{value}</p>
          {trend && (
            <span className={cn(
              "text-[10px] font-medium",
              trendUp ? "text-success" : "text-destructive"
            )}>
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 w-full px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 md:hidden">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="text-sm font-semibold text-foreground/80">Dashboard</div>
      </div>

      <div className="hidden md:flex flex-1 items-center justify-end gap-3">
        <StatCard 
          label="Total Properties" 
          value="1,284" 
          icon={<Home size={14} />}
          trend="+12"
          trendUp={true}
        />
        <StatCard 
          label="Active Scrapes" 
          value="3" 
          icon={<Activity size={14} />}
        />
        <StatCard 
          label="Avg. Price" 
          value="£450k" 
          icon={<BarChart3 size={14} />}
          trend="-2.4%"
          trendUp={false}
        />
      </div>
      
      <div className="flex md:hidden items-center gap-3 ml-auto">
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground">Properties</span>
          <span className="text-sm font-bold">1,284</span>
        </div>
      </div>
    </header>
  );
}
