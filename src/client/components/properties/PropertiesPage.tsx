import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Play, Sparkles, Loader2, LayoutGrid, Table, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/client';
import { PropertyFilters, type FilterState } from './PropertyFilters';
import { PropertyTable } from './PropertyTable';
import { PropertyModal, type Property } from './PropertyModal';
import { PropertyCard } from './PropertyCard';
import { toast } from 'sonner';
import { cn } from '@client/lib/utils';

type ViewMode = 'cards' | 'table';

interface PropertyZone {
  name: string;
  count: number;
  properties: Property[];
}

export function PropertiesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    minPrice: '',
    maxPrice: '',
    minBeds: '',
    maxBeds: '',
    minBroadband: '',
    viewStatus: 'all',
    isMarked: false,
    userStatus: '',
    sortBy: 'listed_desc'
  });

  const buildFilterParams = () => {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.minBeds) params.minBedrooms = filters.minBeds;
    if (filters.maxBeds) params.maxBedrooms = filters.maxBeds;
    if (filters.minBroadband) params.minBroadband = filters.minBroadband;
    if (filters.isMarked) params.isMarked = 'true';
    if (filters.userStatus) params.userStatus = filters.userStatus;
    if (filters.viewStatus !== 'all') params.viewedStatus = filters.viewStatus;
    return params;
  };

  const { data: groupedData, isLoading: isLoadingGrouped, refetch: refetchGrouped } = useQuery({
    queryKey: ['properties-grouped', filters],
    queryFn: async () => {
      const response = await apiClient.properties.grouped(buildFilterParams());
      if (response.error) {
        throw new Error(response.error.value as string || 'Failed to fetch properties');
      }
      return response.data as { zones: PropertyZone[] };
    },
    enabled: viewMode === 'cards'
  });

  const { data: tableData, isLoading: isLoadingTable } = useQuery({
    queryKey: ['properties', page, filters],
    queryFn: async () => {
      const params = { 
        ...buildFilterParams(), 
        page: page.toString(), 
        limit: '20' 
      };
      const response = await apiClient.properties.list(params);
      if (response.error) {
        throw new Error(response.error.value as string || 'Failed to fetch properties');
      }
      return response.data as { data: Property[]; pagination: { totalPages: number } };
    },
    enabled: viewMode === 'table'
  });

  const { data: enrichmentStats } = useQuery({
    queryKey: ['enrichment-stats'],
    queryFn: async () => {
      const response = await apiClient.properties.enrichmentStats();
      return response.data as { total: number; enriched: number; pending: number };
    }
  });

  const enrichAllMutation = useMutation({
    mutationFn: () => apiClient.properties.enrichAll(10),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties-grouped'] });
      queryClient.invalidateQueries({ queryKey: ['enrichment-stats'] });
      const result = data.data as { enriched: number };
      toast.success(`Enriched ${result.enriched} properties`);
    },
    onError: (err) => toast.error(`Enrichment failed: ${err.message}`)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Property> }) => {
      const response = await apiClient.properties.update(id, data);
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties-grouped'] });
      toast.success('Property updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.properties.delete(id);
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties-grouped'] });
      toast.success('Property deleted');
    }
  });

  const toggleZone = (zoneName: string) => {
    setExpandedZones(prev => {
      const next = new Set(prev);
      if (next.has(zoneName)) {
        next.delete(zoneName);
      } else {
        next.add(zoneName);
      }
      return next;
    });
  };

  const zones = groupedData?.zones || [];
  const totalProperties = zones.reduce((sum, z) => sum + z.count, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none space-y-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Properties</h1>
            <p className="text-muted-foreground mt-1">
              {totalProperties} properties across {zones.length} zones
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {enrichmentStats && enrichmentStats.pending > 0 && (
              <button
                onClick={() => enrichAllMutation.mutate()}
                disabled={enrichAllMutation.isPending}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg",
                  "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
                  "disabled:opacity-50"
                )}
              >
                {enrichAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Enrich {enrichmentStats.pending} pending
              </button>
            )}
            
            <button
              onClick={() => refetchGrouped()}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </button>
            
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'cards' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'table' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <Table className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        <PropertyFilters 
          filters={filters} 
          onChange={(newFilters) => {
            setFilters(newFilters);
            setPage(1); 
          }} 
        />
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === 'cards' ? (
          isLoadingGrouped ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No properties found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or run a scrape
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {zones.map((zone) => {
                const isExpanded = expandedZones.has(zone.name) || zones.length === 1;
                const displayProperties = isExpanded ? zone.properties : zone.properties.slice(0, 3);
                
                return (
                  <div key={zone.name} className="space-y-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer group"
                      onClick={() => toggleZone(zone.name)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h2 className="font-semibold">{zone.name}</h2>
                          <p className="text-sm text-muted-foreground">
                            {zone.count} {zone.count === 1 ? 'property' : 'properties'}
                          </p>
                        </div>
                      </div>
                      
                      {zone.properties.length > 3 && (
                        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {isExpanded ? 'Show less' : `Show all ${zone.count}`}
                        </button>
                      )}
                    </div>
                    
                    <div className="grid gap-3">
                      {displayProperties.map((property) => (
                        <PropertyCard 
                          key={property.id} 
                          property={property}
                          onOpenDetail={setSelectedProperty}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <PropertyTable
            properties={tableData?.data || []}
            isLoading={isLoadingTable}
            page={page}
            totalPages={tableData?.pagination?.totalPages || 1}
            onPageChange={setPage}
            onSelect={setSelectedProperty}
            onMark={(id, isMarked) => updateMutation.mutate({ id, data: { isMarked } })}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        )}
      </div>

      <PropertyModal
        property={selectedProperty}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onUpdate={(id, data) => updateMutation.mutate({ id, data })}
      />
    </div>
  );
}
