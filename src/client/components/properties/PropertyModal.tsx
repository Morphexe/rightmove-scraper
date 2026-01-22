import { useState, useEffect } from 'react';
import { cn, formatPrice, formatDate } from '../../lib/utils';
import { ImageGallery } from './ImageGallery';

export interface Property {
  id: number;
  rightmoveId: string;
  url: string;
  title: string | null;
  address: string | null;
  postcode: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  broadbandDownload: number | null;
  broadbandUpload: number | null;
  broadbandProvider: string | null;
  images: string | null;
  description: string | null;
  agentName: string | null;
  agentPhone: string | null;
  firstScrapedAt: Date | string;
  listedDate: Date | string | null;
  userStatus: string | null;
  userRating: number | null;
  userNotes: string | null;
  isMarked: boolean;
  viewedAt: Date | string | null;
  propertyType: string | null;
  sizeSqFt: number | null;
  tenure: string | null;
  keyFeatures: string | null;
  nearestStationName: string | null;
  nearestStationWalkMins: number | null;
  nearestAldiWalkMins: number | null;
  nearestLidlWalkMins: number | null;
  nearestCoopWalkMins: number | null;
  nearestGpWalkMins: number | null;
  nearestHospitalWalkMins: number | null;
  commuteTimes: Array<{ name: string; drivingMins: number; transitMins?: number }> | null;
  enrichedAt: string | null;
}

interface PropertyModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: number, data: Partial<Property>) => void;
}

export function PropertyModal({ property, isOpen, onClose, onUpdate }: PropertyModalProps) {
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState('new');

  useEffect(() => {
    if (property) {
      setNotes(property.userNotes || '');
      setRating(property.userRating || 0);
      setStatus(property.userStatus || 'new');
    }
  }, [property]);

  if (!isOpen || !property) return null;

  const images = property.images ? JSON.parse(property.images) : [];
  const features = property.keyFeatures ? JSON.parse(property.keyFeatures) : [];

  const getDaysOnMarket = () => {
    const dateStr = property.listedDate || property.firstScrapedAt;
    if (!dateStr) return null;
    const listed = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - listed.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatListedDate = () => {
    const dateStr = property.listedDate || property.firstScrapedAt;
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatMins = (mins: number | null) => {
    if (!mins) return null;
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  const daysOnMarket = getDaysOnMarket();
  const listedDateStr = formatListedDate();

  const handleSave = () => {
    onUpdate(property.id, {
      userNotes: notes,
      userRating: rating,
      userStatus: status
    });
    onClose();
  };

  const statusColors: Record<string, string> = {
    interested: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    contacted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    viewed: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    new: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-zinc-200 dark:border-zinc-800">
        
        <div className="w-full md:w-2/3 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50">
          <div className="p-6 space-y-8">
            <ImageGallery images={images} />
            
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                    {property.title || property.address}
                  </h2>
                  {daysOnMarket !== null && (
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-semibold flex flex-col items-center",
                      daysOnMarket <= 3 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                      daysOnMarket <= 7 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
                      daysOnMarket <= 14 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" :
                      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    )}>
                      <span className="text-lg">{daysOnMarket}</span>
                      <span className="text-[10px] uppercase tracking-wide">days</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="text-3xl font-light text-emerald-600 dark:text-emerald-400">
                    {formatPrice(property.price)}
                  </span>
                  {property.postcode && (
                    <span className="px-2 py-0.5 rounded text-sm font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                      {property.postcode}
                    </span>
                  )}
                  {listedDateStr && (
                    <span className="text-sm text-zinc-500">
                      Listed {listedDateStr}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-dashed border-zinc-200 dark:border-zinc-800">
                <Metric label="Bedrooms" value={property.bedrooms} icon="🛏" />
                <Metric label="Bathrooms" value={property.bathrooms} icon="🚿" />
                <Metric label="Size" value={property.sizeSqFt ? `${property.sizeSqFt} sq ft` : null} icon="📐" />
                <Metric label="Tenure" value={property.tenure} icon="📜" />
              </div>

              {features.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400">Key Features</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {property.description && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400">Description</h3>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
                    {property.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/3 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full max-h-[50vh] md:max-h-full overflow-y-auto">
          <div className="p-6 space-y-8 flex-1">
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400">My Notes</h3>
              
              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-500">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['new', 'interested', 'contacted', 'viewed', 'rejected'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={cn(
                        "px-3 py-2 text-xs font-medium rounded-md border transition-all capitalize",
                        status === s
                          ? statusColors[s] || "bg-zinc-100 border-zinc-300"
                          : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-500">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={cn(
                        "text-2xl transition-transform hover:scale-110 focus:outline-none",
                        rating >= star ? "grayscale-0" : "grayscale opacity-20"
                      )}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-500">Private Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you think?"
                  className="w-full h-32 p-3 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                />
              </div>
            </div>

            {property.enrichedAt && (
              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400">Location Data</h3>
                
                {(property.nearestAldiWalkMins || property.nearestLidlWalkMins || property.nearestCoopWalkMins) && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-2">Supermarkets</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {property.nearestAldiWalkMins && (
                        <div className="text-center">
                          <span className="font-bold text-blue-600">{formatMins(property.nearestAldiWalkMins)}</span>
                          <p className="text-blue-500/70">ALDI</p>
                        </div>
                      )}
                      {property.nearestLidlWalkMins && (
                        <div className="text-center">
                          <span className="font-bold text-yellow-600">{formatMins(property.nearestLidlWalkMins)}</span>
                          <p className="text-yellow-500/70">LIDL</p>
                        </div>
                      )}
                      {property.nearestCoopWalkMins && (
                        <div className="text-center">
                          <span className="font-bold text-green-600">{formatMins(property.nearestCoopWalkMins)}</span>
                          <p className="text-green-500/70">COOP</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {property.nearestStationWalkMins && (
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                    <p className="text-xs font-medium text-purple-800 dark:text-purple-400">Nearest Station</p>
                    <p className="text-sm font-bold text-purple-900 dark:text-purple-300">
                      {property.nearestStationName}
                    </p>
                    <p className="text-xs text-purple-600/70">{formatMins(property.nearestStationWalkMins)} walk</p>
                  </div>
                )}

                {property.commuteTimes && property.commuteTimes.length > 0 && (
                  <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
                    <p className="text-xs font-medium text-orange-800 dark:text-orange-400 mb-2">Commute Times</p>
                    <div className="space-y-1.5">
                      {property.commuteTimes.map((commute, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-orange-700 dark:text-orange-300">{commute.name}</span>
                          <span className="text-orange-900 dark:text-orange-200 font-medium">
                            {formatMins(commute.drivingMins)}
                            {commute.transitMins && (
                              <span className="text-orange-500/70 ml-1">
                                ({formatMins(commute.transitMins)} transit)
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(property.nearestGpWalkMins || property.nearestHospitalWalkMins) && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
                    <p className="text-xs font-medium text-rose-800 dark:text-rose-400 mb-1">Healthcare</p>
                    <div className="flex gap-4 text-xs">
                      {property.nearestGpWalkMins && (
                        <span className="text-rose-600">GP: {formatMins(property.nearestGpWalkMins)}</span>
                      )}
                      {property.nearestHospitalWalkMins && (
                        <span className="text-rose-600">Hospital: {formatMins(property.nearestHospitalWalkMins)}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400">Agent Details</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-serif font-bold">
                  {property.agentName?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{property.agentName || 'Unknown Agent'}</p>
                  <p className="text-xs text-zinc-500">{property.agentPhone}</p>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400">Connectivity</h3>
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚀</span>
                  <div>
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400">Estimated Speed</p>
                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                      {property.broadbandDownload ? `${property.broadbandDownload} Mbps` : 'Unknown'}
                    </p>
                  </div>
                </div>
                {property.broadbandProvider && (
                  <span className="text-xs font-mono text-emerald-600/70">{property.broadbandProvider}</span>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 space-y-3">
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-medium rounded-lg transition-colors"
            >
              View on Rightmove ↗
            </a>
            <button
              onClick={handleSave}
              className="flex items-center justify-center w-full py-3 px-4 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 backdrop-blur-sm transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string, value: string | number | null, icon: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col items-center justify-center p-3 text-center rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-xs text-zinc-400 uppercase tracking-wide">{label}</span>
      <span className="font-medium text-zinc-900 dark:text-zinc-200">{value}</span>
    </div>
  );
}
