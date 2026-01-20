import { Property } from './PropertyModal';
import { cn, formatPrice, formatDate } from '../../lib/utils';

interface PropertyTableProps {
  properties: Property[];
  onSelect: (property: Property) => void;
  onMark: (id: number, isMarked: boolean) => void;
  onDelete: (id: number) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function PropertyTable({ 
  properties, 
  onSelect, 
  onMark, 
  onDelete,
  page,
  totalPages,
  onPageChange,
  isLoading
}: PropertyTableProps) {
  
  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-zinc-400 animate-pulse">
        Loading properties...
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center text-zinc-400 gap-2 border-t border-zinc-200 dark:border-zinc-800">
        <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p>No properties found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs uppercase tracking-wider text-zinc-500 font-medium">
              <th className="p-4 w-16"></th>
              <th className="p-4">Property</th>
              <th className="p-4 w-32">Price</th>
              <th className="p-4 w-24">Specs</th>
              <th className="p-4 w-32">Broadband</th>
              <th className="p-4 w-32">Status</th>
              <th className="p-4 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {properties.map((property) => {
              const images = property.images ? JSON.parse(property.images) : [];
              const thumbnail = images[0] || null;
              
              return (
                <tr 
                  key={property.id} 
                  className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  onClick={() => onSelect(property)}
                >
                  <td className="p-4">
                    <div className="w-16 h-12 rounded-md bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative border border-zinc-200 dark:border-zinc-700">
                      {thumbnail ? (
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                           📷
                        </div>
                      )}
                      {property.isMarked && (
                        <div className="absolute top-0 right-0 p-0.5 bg-amber-400 text-white rounded-bl-md shadow-sm">
                          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4 max-w-md">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {property.title || property.address || `Property #${property.id}`}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">
                      {property.postcode} • Listed {formatDate(property.firstScrapedAt)}
                    </div>
                  </td>
                  
                  <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400">
                    {formatPrice(property.price)}
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="flex items-center gap-1" title="Bedrooms">
                        🛏 {property.bedrooms || '-'}
                      </span>
                      <span className="flex items-center gap-1" title="Bathrooms">
                        🚿 {property.bathrooms || '-'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    {property.broadbandDownload ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          {property.broadbandDownload} Mbps
                        </span>
                        {property.broadbandProvider && (
                          <span className="text-[10px] text-zinc-400 truncate max-w-[100px]">
                            {property.broadbandProvider}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-300">-</span>
                    )}
                  </td>
                  
                  <td className="p-4">
                    {property.userStatus && property.userStatus !== 'new' && (
                      <span className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full capitalize border",
                        statusStyles[property.userStatus] || "bg-zinc-100 text-zinc-500 border-zinc-200"
                      )}>
                        {property.userStatus}
                      </span>
                    )}
                    {(!property.userStatus || property.userStatus === 'new') && (
                      <span className="text-xs text-zinc-400">New</span>
                    )}
                  </td>
                  
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMark(property.id, !property.isMarked);
                        }}
                        className={cn(
                          "p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                          property.isMarked ? "text-amber-500" : "text-zinc-400"
                        )}
                        title={property.isMarked ? "Unstar" : "Star"}
                      >
                         ★
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this property?')) {
                            onDelete(property.id);
                          }
                        }}
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-sm text-zinc-500">
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  interested: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  contacted: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  viewed: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  rejected: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
};
