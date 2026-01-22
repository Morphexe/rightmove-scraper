import { Property } from './PropertyModal';
import { cn, formatPrice, formatDate } from '../../lib/utils';

const formatMins = (mins: number | null | undefined) => {
  if (!mins) return '-';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h${remainingMins}m` : `${hours}h`;
};

const getDaysOnMarket = (property: Property) => {
  const dateStr = property.listedDate || property.firstScrapedAt;
  if (!dateStr) return null;
  const listed = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - listed.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

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
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        {properties.map((property) => {
          const images = property.images ? JSON.parse(property.images) : [];
          const thumbnail = images[0] || null;
          const imageCount = images.length;
          const daysOnMarket = getDaysOnMarket(property);
          const airportCommute = property.commuteTimes?.find(c => c.name.toLowerCase().includes('airport'));
          const cityCommute = property.commuteTimes?.find(c => 
            c.name.toLowerCase().includes('city') || c.name.toLowerCase().includes('piccadilly')
          );
          
          return (
            <div 
              key={property.id} 
              className={cn(
                "group relative rounded-xl border bg-white dark:bg-zinc-900 overflow-hidden transition-all hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer",
                property.isMarked 
                  ? "border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800" 
                  : "border-zinc-200 dark:border-zinc-800"
              )}
              onClick={() => onSelect(property)}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="relative w-full sm:w-56 md:w-64 h-40 sm:h-auto sm:aspect-[4/3] flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                  {thumbnail ? (
                    <img 
                      src={thumbnail} 
                      alt={property.title || 'Property'} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {imageCount > 1 && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 text-xs font-medium bg-black/60 text-white rounded-md backdrop-blur-sm">
                      {imageCount} photos
                    </div>
                  )}
                  
                  {daysOnMarket !== null && (
                    <div className={cn(
                      "absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded-md",
                      daysOnMarket <= 3 ? "bg-green-500 text-white" :
                      daysOnMarket <= 7 ? "bg-yellow-500 text-black" :
                      daysOnMarket <= 14 ? "bg-orange-500 text-white" :
                      "bg-red-500 text-white"
                    )}>
                      {daysOnMarket}d
                    </div>
                  )}
                  
                  {property.isMarked && (
                    <div className="absolute top-2 left-2 p-1.5 bg-amber-400 text-white rounded-full shadow-lg">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 p-4 sm:p-5 flex flex-col min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(property.price)}
                      </span>
                      {property.userStatus && property.userStatus !== 'new' && (
                        <span className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-full capitalize border",
                          statusStyles[property.userStatus] || "bg-zinc-100 text-zinc-500 border-zinc-200"
                        )}>
                          {property.userStatus}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMark(property.id, !property.isMarked);
                        }}
                        className={cn(
                          "p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                          property.isMarked ? "text-amber-500" : "text-zinc-400"
                        )}
                        title={property.isMarked ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg className={cn("w-5 h-5", property.isMarked ? "fill-current" : "fill-none stroke-current")} viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this property?')) {
                            onDelete(property.id);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors"
                        title="Delete property"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base leading-snug mb-1 line-clamp-1">
                    {property.title || property.address || `Property #${property.id}`}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                    {property.address && property.title ? property.address : null}
                    {property.postcode && <span className="font-mono ml-1">{property.postcode}</span>}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    {property.bedrooms && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="font-medium">{property.bedrooms}</span> bed
                      </span>
                    )}
                    {property.bathrooms && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        <span className="font-medium">{property.bathrooms}</span> bath
                      </span>
                    )}
                    {property.sizeSqFt && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <span className="font-medium">{property.sizeSqFt.toLocaleString()}</span> sq ft
                      </span>
                    )}
                    {property.propertyType && (
                      <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium capitalize">
                        {property.propertyType}
                      </span>
                    )}
                    {property.tenure && (
                      <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium capitalize">
                        {property.tenure}
                      </span>
                    )}
                  </div>
                  
                  {property.description && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-500 line-clamp-2 mb-3 leading-relaxed">
                      {property.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    {property.broadbandDownload ? (
                      <div className="flex items-center gap-1">
                        <svg className={cn(
                          "w-3.5 h-3.5",
                          property.broadbandDownload >= 500 ? "text-green-500" : 
                          property.broadbandDownload >= 100 ? "text-amber-500" : "text-red-500"
                        )} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                        </svg>
                        <span className={cn(
                          "font-semibold",
                          property.broadbandDownload >= 500 ? "text-green-600 dark:text-green-400" : 
                          property.broadbandDownload >= 100 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {property.broadbandDownload}Mb
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-400">No BB</span>
                    )}

                    {property.enrichedAt && (
                      <>
                        {(property.nearestAldiWalkMins || property.nearestLidlWalkMins || property.nearestCoopWalkMins) && (
                          <div className="flex items-center gap-1 text-zinc-500">
                            <span className="font-medium">Shops:</span>
                            {property.nearestAldiWalkMins && <span className="text-blue-500">A:{formatMins(property.nearestAldiWalkMins)}</span>}
                            {property.nearestLidlWalkMins && <span className="text-yellow-600">L:{formatMins(property.nearestLidlWalkMins)}</span>}
                            {property.nearestCoopWalkMins && <span className="text-green-600">C:{formatMins(property.nearestCoopWalkMins)}</span>}
                          </div>
                        )}

                        {property.nearestStationWalkMins && (
                          <div className="flex items-center gap-1 text-zinc-500">
                            <span className="font-medium">Stn:</span>
                            <span>{formatMins(property.nearestStationWalkMins)}</span>
                          </div>
                        )}

                        {airportCommute && (
                          <div className="flex items-center gap-1 text-zinc-500">
                            <span className="font-medium">MAN:</span>
                            <span>{formatMins(airportCommute.drivingMins)}</span>
                          </div>
                        )}

                        {cityCommute && (
                          <div className="flex items-center gap-1 text-zinc-500">
                            <span className="font-medium">City:</span>
                            <span>{formatMins(cityCommute.drivingMins)}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    <span className="text-zinc-400 font-mono ml-auto">
                      {formatDate(property.listedDate || property.firstScrapedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-1 py-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-sm text-zinc-500">
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
