import { useState } from 'react';
import { 
  Wifi, Train, Car, MapPin, Bed, Bath, Square,
  Heart, ExternalLink, ChevronDown, ChevronUp,
  Building2, Stethoscope, Mail, ShoppingCart, Sparkles, Loader2
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
  nearestPostOfficeWalkMins?: number | null;
  nearestDentistWalkMins?: number | null;
  nearestHospitalWalkMins?: number | null;
  nearestGpWalkMins?: number | null;
  commuteTimes?: Array<{ name: string; drivingMins: number; transitMins?: number }> | null;
  isMarked?: boolean;
  enrichedAt?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}

interface PropertyCardProps {
  property: Property;
  onOpenDetail?: (property: Property) => void;
}

export function PropertyCard({ property, onOpenDetail }: PropertyCardProps) {
  const [expanded, setExpanded] = useState(false);
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
  
  const formatDistance = (mins?: number | null) => {
    if (!mins) return null;
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h${remainingMins}m` : `${hours}h`;
  };
  
  return (
    <div className={cn(
      "card hover:border-primary/50 transition-all group",
      property.isMarked && "border-primary/30 bg-primary/5"
    )}>
      <div className="flex gap-4">
        {mainImage && (
          <div 
            className="w-32 h-24 rounded-md overflow-hidden flex-shrink-0 cursor-pointer"
            onClick={() => onOpenDetail?.(property)}
          >
            <img 
              src={mainImage} 
              alt={property.title || 'Property'} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
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
                    {property.sizeSqFt} sqft
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
          
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
            {property.broadbandDownload && (
              <span className={cn(
                "flex items-center gap-1",
                property.broadbandDownload >= 500 ? "text-green-500" : 
                property.broadbandDownload >= 100 ? "text-yellow-500" : "text-red-500"
              )}>
                <Wifi className="h-3 w-3" />
                {property.broadbandDownload} Mbps
              </span>
            )}
            
            {property.nearestStationWalkMins && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Train className="h-3 w-3" />
                {formatDistance(property.nearestStationWalkMins)} walk
              </span>
            )}
            
            {property.commuteTimes?.map((commute, i) => (
              <span key={i} className="flex items-center gap-1 text-muted-foreground">
                <Car className="h-3 w-3" />
                {commute.name}: {formatDistance(commute.drivingMins)}
                {commute.transitMins && ` (${formatDistance(commute.transitMins)} transit)`}
              </span>
            ))}
          </div>
          
          {property.enrichedAt && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Less' : 'More'} details
            </button>
          )}
        </div>
      </div>
      
      {expanded && property.enrichedAt && (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {(property.nearestAldiWalkMins || property.nearestLidlWalkMins) && (
            <div className="flex items-start gap-2">
              <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Groceries</p>
                {property.nearestAldiWalkMins && (
                  <p className="text-muted-foreground">ALDI: {formatDistance(property.nearestAldiWalkMins)}</p>
                )}
                {property.nearestLidlWalkMins && (
                  <p className="text-muted-foreground">LIDL: {formatDistance(property.nearestLidlWalkMins)}</p>
                )}
              </div>
            </div>
          )}
          
          {property.nearestStationWalkMins && (
            <div className="flex items-start gap-2">
              <Train className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Station</p>
                <p className="text-muted-foreground">{property.nearestStationName}</p>
                <p className="text-muted-foreground">{formatDistance(property.nearestStationWalkMins)} walk</p>
              </div>
            </div>
          )}
          
          {(property.nearestGpWalkMins || property.nearestDentistWalkMins || property.nearestHospitalWalkMins) && (
            <div className="flex items-start gap-2">
              <Stethoscope className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Healthcare</p>
                {property.nearestGpWalkMins && (
                  <p className="text-muted-foreground">GP: {formatDistance(property.nearestGpWalkMins)}</p>
                )}
                {property.nearestDentistWalkMins && (
                  <p className="text-muted-foreground">Dentist: {formatDistance(property.nearestDentistWalkMins)}</p>
                )}
                {property.nearestHospitalWalkMins && (
                  <p className="text-muted-foreground">Hospital: {formatDistance(property.nearestHospitalWalkMins)}</p>
                )}
              </div>
            </div>
          )}
          
          {property.nearestPostOfficeWalkMins && (
            <div className="flex items-start gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Post Office</p>
                <p className="text-muted-foreground">{formatDistance(property.nearestPostOfficeWalkMins)} walk</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
