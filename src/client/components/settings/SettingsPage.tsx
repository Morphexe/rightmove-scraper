import { EnvironmentInfo } from './EnvironmentInfo';
import { ProxyStatus } from './ProxyStatus';
import { DatabaseStats } from './DatabaseStats';

export function SettingsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-muted-foreground mt-1">Configuration, health status, and database management.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EnvironmentInfo />
        <ProxyStatus />
        <div className="md:col-span-2">
          <DatabaseStats />
        </div>
      </div>
    </div>
  );
}
