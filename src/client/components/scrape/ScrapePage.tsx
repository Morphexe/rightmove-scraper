import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Loader2, Plus, X, MapPin, Wifi, Save, Trash2, Settings2, History } from 'lucide-react';
import { apiClient } from '@client/api/client';
import { useScrapeWebSocket } from '@client/hooks/useWebSocket';
import { toast } from 'sonner';
import { cn } from '@client/lib/utils';
import { ScrapeProgress } from './ScrapeProgress';
import { ScrapeHistory } from './ScrapeHistory';

interface Location {
  name: string;
  postcode: string;
  radius: number;
}

interface Filters {
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  propertyTypes?: string[];
  maxDaysSinceAdded?: number;
}

interface BroadbandSettings {
  enabled: boolean;
  minDownloadSpeed?: number;
}

const PROPERTY_TYPES = [
  { id: 'detached', label: 'Detached' },
  { id: 'semi-detached', label: 'Semi' },
  { id: 'terraced', label: 'Terraced' },
  { id: 'flat', label: 'Flat' },
  { id: 'bungalow', label: 'Bungalow' }
];

export function ScrapePage() {
  const queryClient = useQueryClient();
  const { status } = useScrapeWebSocket();
  const isRunning = status?.isRunning ?? false;
  const [showHistory, setShowHistory] = useState(false);
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [broadband, setBroadband] = useState<BroadbandSettings>({ enabled: false });
  const [newZone, setNewZone] = useState({ name: '', postcode: '', radius: 5 });
  const [hasChanges, setHasChanges] = useState(false);
  
  const { data: locationsData, isLoading: locLoading } = useQuery({
    queryKey: ['config-locations'],
    queryFn: async () => {
      const res = await apiClient.config.locations.list();
      return (res.data as Location[]) || [];
    }
  });
  
  const { data: filtersData, isLoading: filterLoading } = useQuery({
    queryKey: ['config-filters'],
    queryFn: async () => {
      const res = await apiClient.config.filters.get();
      return res.data as Filters;
    }
  });
  
  const { data: broadbandData, isLoading: bbLoading } = useQuery({
    queryKey: ['config-broadband'],
    queryFn: async () => {
      const res = await apiClient.config.broadband.get();
      return res.data as BroadbandSettings;
    }
  });
  
  useEffect(() => {
    if (locationsData) setLocations(locationsData);
  }, [locationsData]);
  
  useEffect(() => {
    if (filtersData) setFilters(filtersData);
  }, [filtersData]);
  
  useEffect(() => {
    if (broadbandData) setBroadband(broadbandData);
  }, [broadbandData]);
  
  const saveLocationsMutation = useMutation({
    mutationFn: async (locs: Location[]) => {
      const currentLocs = await apiClient.config.locations.list();
      const current = (currentLocs.data as Location[]) || [];
      
      for (let i = current.length - 1; i >= 0; i--) {
        await apiClient.config.locations.delete(i);
      }
      
      for (const loc of locs) {
        await apiClient.config.locations.add(loc);
      }
    }
  });
  
  const saveFiltersMutation = useMutation({
    mutationFn: (data: Filters) => apiClient.config.filters.update(data)
  });
  
  const saveBroadbandMutation = useMutation({
    mutationFn: (data: BroadbandSettings) => apiClient.config.broadband.update(data)
  });
  
  const handleSaveAll = async () => {
    try {
      await Promise.all([
        saveLocationsMutation.mutateAsync(locations),
        saveFiltersMutation.mutateAsync(filters),
        saveBroadbandMutation.mutateAsync(broadband)
      ]);
      
      queryClient.invalidateQueries({ queryKey: ['config-locations'] });
      queryClient.invalidateQueries({ queryKey: ['config-filters'] });
      queryClient.invalidateQueries({ queryKey: ['config-broadband'] });
      
      toast.success('Configuration saved');
      setHasChanges(false);
    } catch (err) {
      toast.error('Failed to save configuration');
    }
  };
  
  const startMutation = useMutation({
    mutationFn: () => apiClient.scrape.start({}),
    onSuccess: () => {
      toast.success('Scraping started');
      queryClient.invalidateQueries({ queryKey: ['scrape-status'] });
    },
    onError: (err) => toast.error(`Failed to start: ${err.message}`)
  });
  
  const stopMutation = useMutation({
    mutationFn: () => apiClient.scrape.stop(),
    onSuccess: () => {
      toast.info('Scraping stopped');
      queryClient.invalidateQueries({ queryKey: ['scrape-status'] });
    },
    onError: (err) => toast.error(`Failed to stop: ${err.message}`)
  });
  
  const addZone = () => {
    if (!newZone.name || !newZone.postcode) {
      toast.error('Name and postcode required');
      return;
    }
    setLocations([...locations, newZone]);
    setNewZone({ name: '', postcode: '', radius: 5 });
    setHasChanges(true);
  };
  
  const removeZone = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
    setHasChanges(true);
  };
  
  const togglePropertyType = (type: string) => {
    const current = filters.propertyTypes || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ ...filters, propertyTypes: updated });
    setHasChanges(true);
  };
  
  const isLoading = locLoading || filterLoading || bbLoading;
  const isSaving = saveLocationsMutation.isPending || saveFiltersMutation.isPending || saveBroadbandMutation.isPending;
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (showHistory) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowHistory(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Settings
          </button>
        </div>
        <ScrapeHistory />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Scrape Control</h1>
          <p className="text-muted-foreground mt-1">
            {locations.length} zone{locations.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80"
          >
            <History className="h-4 w-4" />
            History
          </button>
          
          {isRunning ? (
            <button
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {stopMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Stop
            </button>
          ) : (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending || locations.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50"
            >
              {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Scrape
            </button>
          )}
        </div>
      </div>
      
      <ScrapeProgress />
      
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Search Zones
          </div>
          
          <div className="card flex items-center gap-2">
            <input
              type="text"
              placeholder="Zone name"
              value={newZone.name}
              onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
              className="flex-1 input text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addZone()}
            />
            <input
              type="text"
              placeholder="Postcode"
              value={newZone.postcode}
              onChange={(e) => setNewZone({ ...newZone, postcode: e.target.value.toUpperCase() })}
              className="w-24 input text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addZone()}
            />
            <select
              value={newZone.radius}
              onChange={(e) => setNewZone({ ...newZone, radius: Number(e.target.value) })}
              className="w-20 input text-sm"
            >
              {[1, 3, 5, 10, 15, 20, 30, 40].map(r => (
                <option key={r} value={r}>{r} mi</option>
              ))}
            </select>
            <button
              onClick={addZone}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {locations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No zones configured. Add one above to start scraping.
              </div>
            ) : (
              locations.map((loc, index) => (
                <div key={index} className="card py-2 px-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      <MapPin className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{loc.name}</p>
                      <p className="text-xs text-muted-foreground">{loc.postcode} • {loc.radius}mi</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeZone(index)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            Search Filters
          </div>
          
          <div className="card space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Price Range</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice || ''}
                    onChange={(e) => {
                      setFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined });
                      setHasChanges(true);
                    }}
                    className="input w-full pl-6 text-sm"
                  />
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice || ''}
                    onChange={(e) => {
                      setFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined });
                      setHasChanges(true);
                    }}
                    className="input w-full pl-6 text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bedrooms</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="Min"
                  value={filters.minBedrooms || ''}
                  onChange={(e) => {
                    setFilters({ ...filters, minBedrooms: e.target.value ? Number(e.target.value) : undefined });
                    setHasChanges(true);
                  }}
                  className="input flex-1 text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="Max"
                  value={filters.maxBedrooms || ''}
                  onChange={(e) => {
                    setFilters({ ...filters, maxBedrooms: e.target.value ? Number(e.target.value) : undefined });
                    setHasChanges(true);
                  }}
                  className="input flex-1 text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Property Types</label>
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => togglePropertyType(type.id)}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium transition-colors',
                      filters.propertyTypes?.includes(type.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Listed within: {filters.maxDaysSinceAdded || 7} days
              </label>
              <input
                type="range"
                min="1"
                max="14"
                value={filters.maxDaysSinceAdded || 7}
                onChange={(e) => {
                  setFilters({ ...filters, maxDaysSinceAdded: Number(e.target.value) });
                  setHasChanges(true);
                }}
                className="w-full accent-primary"
              />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className={cn('h-4 w-4', broadband.enabled ? 'text-success' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">Min Broadband</span>
              </div>
              <div className="flex items-center gap-2">
                {broadband.enabled && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={broadband.minDownloadSpeed || ''}
                      onChange={(e) => {
                        setBroadband({ ...broadband, minDownloadSpeed: e.target.value ? Number(e.target.value) : undefined });
                        setHasChanges(true);
                      }}
                      placeholder="100"
                      className="w-16 input text-sm text-center"
                    />
                    <span className="text-xs text-muted-foreground">Mbps</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setBroadband({ ...broadband, enabled: !broadband.enabled });
                    setHasChanges(true);
                  }}
                  className={cn(
                    'relative w-10 h-5 rounded-full transition-colors',
                    broadband.enabled ? 'bg-success' : 'bg-muted'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    broadband.enabled && 'translate-x-5'
                  )} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
