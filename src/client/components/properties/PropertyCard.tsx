import { 
  Wifi, Train, Car, Bed, Bath, Square,
  Heart, ExternalLink, ShoppingCart, Sparkles, Loader2,
  Plane, Clock, Building2
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@client/api/client';
import { cn } from '@client/lib/utils';
import { toast } from 'sonner';

interface Property {
  id: number;
  rightmoveId: string;
  url: string;
  title?: string | null;
  address?: string | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sizeSqFt?: number | null;
  images?: string | null;
  broadbandDownload?: number | null;
  nearestStationName?: string | null;
  nearestStationWalkMins?: number | null;
  nearestAldiName?: string | null;
  nearestAldiWalkMins?: number | null;
  nearestLidlName?: string | null;
  nearestLidlWalkMins?: number | null;
  nearestCoopName?: string | null;
  nearestCoopWalkMins?: number | null;
  nearestPostOfficeWalkMins?: number | null;
  nearestDentistWalkMins?: number | null;
  nearestHospitalWalkMins?: number | null;
  nearestGpWalkMins?: number | null;
  commuteTimes?: Array<{ name: string; drivingMins: number; transitMins?: number }> | null;
  isMarked?: boolean;
  enrichedAt?: string | null;
  listedDate?: string | null;
  firstScrapedAt?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}

interface PropertyCardProps {
  property: Property;
  onOpenDetail?: (property: Property) => void;
}

export function PropertyCard({ property, onOpenDetail }: PropertyCardProps) {
  const queryClient = useQueryClient();
  
  const images = property.images ? JSON.parse(property.images) : [];
  const mainImage = images[0];
  
  const markMutation = useMutation({
    mutationFn: () => apiClient.properties.update(property.id, { isMarked: !property.isMarked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties-grouped'] });
      toast.success(property.isMarked ? 'Removed from favorites' : 'Added to favorites');
    }
  });
  
  const enrichMutation = useMutation({
    mutationFn: () => apiClient.properties.enrich(property.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties-grouped'] });
      toast.success('Property enriched with location data');
    },
    onError: (err) => toast.error(`Enrichment failed: ${err.message}`)
  });
  
  const canEnrich = property.latitude && property.longitude && !property.enrichedAt;
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'GBP',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  const formatMins = (mins?: number | null) => {
    if (!mins) return null;
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h${remainingMins}m` : `${hours}h`;
  };

  const getDaysOnMarket = () => {
    const dateStr = property.listedDate || property.firstScrapedAt;
    if (!dateStr) return null;
    const listed = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - listed.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysOnMarket = getDaysOnMarket();

  const hasGroceryData = property.nearestAldiWalkMins || property.nearestLidlWalkMins || property.nearestCoopWalkMins;
  const airportCommute = property.commuteTimes?.find(c => c.name.toLowerCase().includes('airport'));
  const cityCommute = property.commuteTimes?.find(c => 
    c.name.toLowerCase().includes('city') || c.name.toLowerCase().includes('piccadilly')
  );
  
  return (
    <div className={cn(
      "card hover:border-primary/50 transition-all group",
      property.isMarked && "border-primary/30 bg-primary/5"
    )}>
      <div className="flex gap-4">
        {mainImage && (
          <div 
            className="w-36 h-28 rounded-md overflow-hidden flex-shrink-0 cursor-pointer relative"
            onClick={() => onOpenDetail?.(property)}
          >
            <img 
              src={mainImage} 
              alt={property.title || 'Property'} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            {daysOnMarket !== null && (
              <div className={cn(
                "absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                daysOnMarket <= 3 ? "bg-green-500 text-white" :
                daysOnMarket <= 7 ? "bg-yellow-500 text-black" :
                daysOnMarket <= 14 ? "bg-orange-500 text-white" :
                "bg-red-500 text-white"
              )}>
                {daysOnMarket}d
              </div>
            )}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {property.price && (
                  <span className="font-bold text-lg text-primary">
                    {formatPrice(property.price)}
                  </span>
                )}
                {property.bedrooms && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Bed className="h-3.5 w-3.5" />
                    {property.bedrooms}
                  </span>
                )}
                {property.bathrooms && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Bath className="h-3.5 w-3.5" />
                    {property.bathrooms}
                  </span>
                )}
                {property.sizeSqFt && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Square className="h-3.5 w-3.5" />
                    {property.sizeSqFt}
                  </span>
                )}
                {property.broadbandDownload && (
                  <span className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    property.broadbandDownload >= 500 ? "text-green-500" : 
                    property.broadbandDownload >= 100 ? "text-yellow-500" : "text-red-500"
                  )}>
                    <Wifi className="h-3.5 w-3.5" />
                    {property.broadbandDownload}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {property.address || property.title}
              </p>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {canEnrich && (
                <button
                  onClick={() => enrichMutation.mutate()}
                  disabled={enrichMutation.isPending}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  title="Enrich with location data"
                >
                  {enrichMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              )}
              <button
                onClick={() => markMutation.mutate()}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <Heart className={cn(
                  "h-4 w-4",
                  property.isMarked ? "fill-red-500 text-red-500" : "text-muted-foreground"
                )} />
              </button>
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </div>
          
          {property.enrichedAt && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs">
              {hasGroceryData && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <ShoppingCart className="h-3 w-3" />
                  <span className="flex gap-1.5">
                    {property.nearestAldiWalkMins && (
                      <span className="text-blue-500">A:{formatMins(property.nearestAldiWalkMins)}</span>
                    )}
                    {property.nearestLidlWalkMins && (
                      <span className="text-yellow-600">L:{formatMins(property.nearestLidlWalkMins)}</span>
                    )}
                    {property.nearestCoopWalkMins && (
                      <span className="text-green-600">C:{formatMins(property.nearestCoopWalkMins)}</span>
                    )}
                  </span>
                </div>
              )}
              
              {property.nearestStationWalkMins && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Train className="h-3 w-3" />
                  <span>{formatMins(property.nearestStationWalkMins)}</span>
                  {property.nearestStationName && (
                    <span className="text-muted-foreground/60 max-w-[100px] truncate">
                      {property.nearestStationName}
                    </span>
                  )}
                </div>
              )}
              
              {airportCommute && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Plane className="h-3 w-3" />
                  <span>{formatMins(airportCommute.drivingMins)}</span>
                  {airportCommute.transitMins && (
                    <span className="text-muted-foreground/60">
                      ({formatMins(airportCommute.transitMins)})
                    </span>
                  )}
                </div>
              )}
              
              {cityCommute && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{formatMins(cityCommute.drivingMins)}</span>
                  {cityCommute.transitMins && (
                    <span className="text-muted-foreground/60">
                      ({formatMins(cityCommute.transitMins)})
                    </span>
                  )}
                </div>
              )}

              {property.nearestGpWalkMins && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-[10px]">GP</span>
                  <span>{formatMins(property.nearestGpWalkMins)}</span>
                </div>
              )}
            </div>
          )}

          {!property.enrichedAt && canEnrich && (
            <p className="text-xs text-muted-foreground/60 mt-2 italic">
              Click sparkle to enrich with location data
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
