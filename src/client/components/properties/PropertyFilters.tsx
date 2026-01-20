import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

export interface FilterState {
  search: string;
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  maxBeds: string;
  minBroadband: string;
  viewStatus: 'all' | 'new' | 'viewed';
  isMarked: boolean;
  userStatus: string;
  sortBy: string;
}

interface PropertyFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  className?: string;
}

export function PropertyFilters({ filters, onChange, className }: PropertyFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onChange({ ...filters, search: localSearch });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, filters, onChange]);

  const handleChange = (key: keyof FilterState, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className={cn("p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800", className)}>
      <div className="flex flex-col gap-4">
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search address, title..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
             <FilterSelect 
              value={filters.sortBy} 
              onChange={(v) => handleChange('sortBy', v)}
              options={[
                { label: 'Newest Listed', value: 'listed_desc' },
                { label: 'Oldest Listed', value: 'listed_asc' },
                { label: 'Price (Low to High)', value: 'price_asc' },
                { label: 'Price (High to Low)', value: 'price_desc' },
                { label: 'Broadband Speed', value: 'broadband_desc' },
              ]}
            />
            
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />

            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700">
              {(['all', 'new', 'viewed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleChange('viewStatus', status)}
                  className={cn(
                    "px-3 py-1 text-sm font-medium rounded-md transition-all capitalize",
                    filters.viewStatus === status
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleChange('isMarked', !filters.isMarked)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
                filters.isMarked
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
                  : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              )}
            >
              <span className={filters.isMarked ? "fill-current" : ""}>★</span>
              Starred
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-2">
          <div className="col-span-2 md:col-span-1 space-y-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => handleChange('minPrice', e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded focus:border-emerald-500 outline-none"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => handleChange('maxPrice', e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 space-y-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Bedrooms</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minBeds}
                onChange={(e) => handleChange('minBeds', e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded focus:border-emerald-500 outline-none"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxBeds}
                onChange={(e) => handleChange('maxBeds', e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 space-y-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Broadband (Mbps)</label>
            <input
              type="number"
              placeholder="Min Speed"
              value={filters.minBroadband}
              onChange={(e) => handleChange('minBroadband', e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="col-span-2 md:col-span-1 space-y-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</label>
             <FilterSelect 
              value={filters.userStatus} 
              onChange={(v) => handleChange('userStatus', v)}
              options={[
                { label: 'Any Status', value: '' },
                { label: 'New', value: 'new' },
                { label: 'Interested', value: 'interested' },
                { label: 'Contacted', value: 'contacted' },
                { label: 'Viewed', value: 'viewed' },
                { label: 'Rejected', value: 'rejected' },
              ]}
            />
          </div>
          
           <div className="col-span-2 md:col-span-2 flex items-end justify-end">
             <button
                onClick={() => onChange({
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
                })}
                className="text-xs text-zinc-500 hover:text-red-500 transition-colors underline decoration-dotted"
             >
               Reset Filters
             </button>
           </div>

        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: { label: string, value: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-3 py-1.5 md:py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer pr-8 text-zinc-700 dark:text-zinc-300"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
