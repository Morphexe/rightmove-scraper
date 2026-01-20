import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2 } from 'lucide-react';
import { apiClient } from '@client/api/client';
import { toast } from 'sonner';
import { cn } from '@client/lib/utils';

interface Filters {
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  propertyTypes?: string[];
  maxDaysSinceAdded?: number;
}

const PROPERTY_TYPES = [
  { id: 'detached', label: 'Detached' },
  { id: 'semi-detached', label: 'Semi-Detached' },
  { id: 'terraced', label: 'Terraced' },
  { id: 'flat', label: 'Flat' },
  { id: 'bungalow', label: 'Bungalow' }
];

export function FilterConfig() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Filters>({});
  
  const { data: filters, isLoading } = useQuery({
    queryKey: ['config-filters'],
    queryFn: async () => {
      const res = await apiClient.config.filters.get();
      return res.data as Filters;
    }
  });
  
  useEffect(() => {
    if (filters) setForm(filters);
  }, [filters]);
  
  const mutation = useMutation({
    mutationFn: (data: Filters) => apiClient.config.filters.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-filters'] });
      toast.success('Filters saved');
    },
    onError: (err) => toast.error(`Failed: ${err.message}`)
  });
  
  const togglePropertyType = (type: string) => {
    const current = form.propertyTypes || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setForm({ ...form, propertyTypes: updated });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-medium mb-4">Price Range</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Min Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <input
                  type="number"
                  value={form.minPrice || ''}
                  onChange={(e) => setForm({ ...form, minPrice: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  className="input w-full pl-7"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Max Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <input
                  type="number"
                  value={form.maxPrice || ''}
                  onChange={(e) => setForm({ ...form, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Any"
                  className="input w-full pl-7"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h3 className="font-medium mb-4">Bedrooms</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Min Beds</label>
              <input
                type="number"
                min="0"
                max="10"
                value={form.minBedrooms || ''}
                onChange={(e) => setForm({ ...form, minBedrooms: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Any"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Max Beds</label>
              <input
                type="number"
                min="0"
                max="10"
                value={form.maxBedrooms || ''}
                onChange={(e) => setForm({ ...form, maxBedrooms: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Any"
                className="input w-full"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <h3 className="font-medium mb-4">Property Types</h3>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => togglePropertyType(type.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                form.propertyTypes?.includes(type.id)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="card">
        <h3 className="font-medium mb-4">Listing Age</h3>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Max days since added: <span className="font-medium text-foreground">{form.maxDaysSinceAdded || 1} day(s)</span>
          </label>
          <input
            type="range"
            min="1"
            max="14"
            value={form.maxDaysSinceAdded || 1}
            onChange={(e) => setForm({ ...form, maxDaysSinceAdded: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1 day</span>
            <span>14 days</span>
          </div>
        </div>
      </div>
      
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
          Save Filters
        </button>
      </div>
    </div>
  );
}
