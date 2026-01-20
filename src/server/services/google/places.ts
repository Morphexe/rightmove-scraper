import { log } from '../../utils/logger.js';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export interface PlaceResult {
  name: string;
  address: string;
  distanceMeters: number;
  walkingMinutes: number;
  lat: number;
  lng: number;
  placeId: string;
}

export interface CommuteResult {
  destination: string;
  distanceMeters: number;
  drivingMinutes: number;
  transitMinutes?: number;
}

type PlaceType = 
  | 'train_station' 
  | 'supermarket' 
  | 'post_office' 
  | 'dentist' 
  | 'hospital' 
  | 'pharmacy'
  | 'doctor';

const PLACE_TYPE_MAP: Record<string, PlaceType[]> = {
  train: ['train_station'],
  grocery: ['supermarket'],
  postOffice: ['post_office'],
  dentist: ['dentist'],
  hospital: ['hospital'],
  pharmacy: ['pharmacy'],
  doctor: ['doctor'],
};

export class GooglePlacesService {
  private apiKey: string;
  
  constructor() {
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not set in environment');
    }
    this.apiKey = GOOGLE_API_KEY;
  }
  
  async findNearbyPlaces(
    lat: number, 
    lng: number, 
    type: keyof typeof PLACE_TYPE_MAP,
    radiusMeters: number = 5000,
    keyword?: string
  ): Promise<PlaceResult[]> {
    const placeTypes = PLACE_TYPE_MAP[type];
    if (!placeTypes) {
      throw new Error(`Unknown place type: ${type}`);
    }
    
    const results: PlaceResult[] = [];
    
    for (const placeType of placeTypes) {
      const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      url.searchParams.set('location', `${lat},${lng}`);
      url.searchParams.set('radius', String(radiusMeters));
      url.searchParams.set('type', placeType);
      url.searchParams.set('key', this.apiKey);
      
      if (keyword) {
        url.searchParams.set('keyword', keyword);
      }
      
      try {
        const response = await fetch(url.toString());
        const data = await response.json() as { 
          status: string; 
          results: Array<{
            name: string;
            vicinity: string;
            geometry: { location: { lat: number; lng: number } };
            place_id: string;
          }>;
          error_message?: string;
        };
        
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          log.warn(`Google Places API error: ${data.status} - ${data.error_message}`);
          continue;
        }
        
        for (const place of data.results || []) {
          const distanceMeters = this.calculateDistance(
            lat, lng,
            place.geometry.location.lat,
            place.geometry.location.lng
          );
          
          results.push({
            name: place.name,
            address: place.vicinity,
            distanceMeters: Math.round(distanceMeters),
            walkingMinutes: Math.round(distanceMeters / 80),
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            placeId: place.place_id,
          });
        }
      } catch (error) {
        log.error(`Failed to fetch places: ${error}`);
      }
    }
    
    return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }
  
  async findNearestGroceryByName(
    lat: number, 
    lng: number, 
    storeName: string
  ): Promise<PlaceResult | null> {
    const results = await this.findNearbyPlaces(lat, lng, 'grocery', 10000, storeName);
    
    const filtered = results.filter(r => 
      r.name.toLowerCase().includes(storeName.toLowerCase())
    );
    
    return filtered[0] || null;
  }
  
  async findNearestTrainStation(lat: number, lng: number): Promise<PlaceResult | null> {
    const results = await this.findNearbyPlaces(lat, lng, 'train', 10000);
    return results[0] || null;
  }
  
  async getCommuteTime(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    destinationName: string
  ): Promise<CommuteResult | null> {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', `${originLat},${originLng}`);
    url.searchParams.set('destinations', `${destLat},${destLng}`);
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('key', this.apiKey);
    
    try {
      const response = await fetch(url.toString());
      const data = await response.json() as {
        status: string;
        rows: Array<{
          elements: Array<{
            status: string;
            distance: { value: number };
            duration: { value: number };
          }>;
        }>;
        error_message?: string;
      };
      
      if (data.status !== 'OK') {
        log.warn(`Distance Matrix API error: ${data.status} - ${data.error_message}`);
        return null;
      }
      
      const element = data.rows[0]?.elements[0];
      if (!element || element.status !== 'OK') {
        return null;
      }
      
      let transitMinutes: number | undefined;
      try {
        const transitUrl = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
        transitUrl.searchParams.set('origins', `${originLat},${originLng}`);
        transitUrl.searchParams.set('destinations', `${destLat},${destLng}`);
        transitUrl.searchParams.set('mode', 'transit');
        transitUrl.searchParams.set('key', this.apiKey);
        
        const transitResponse = await fetch(transitUrl.toString());
        const transitData = await transitResponse.json() as typeof data;
        
        if (transitData.status === 'OK' && transitData.rows[0]?.elements[0]?.status === 'OK') {
          transitMinutes = Math.round(transitData.rows[0].elements[0].duration.value / 60);
        }
      } catch {
      }
      
      return {
        destination: destinationName,
        distanceMeters: element.distance.value,
        drivingMinutes: Math.round(element.duration.value / 60),
        transitMinutes,
      };
    } catch (error) {
      log.error(`Failed to get commute time: ${error}`);
      return null;
    }
  }
  
  async getWalkingDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<{ distanceMeters: number; walkingMinutes: number } | null> {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', `${originLat},${originLng}`);
    url.searchParams.set('destinations', `${destLat},${destLng}`);
    url.searchParams.set('mode', 'walking');
    url.searchParams.set('key', this.apiKey);
    
    try {
      const response = await fetch(url.toString());
      const data = await response.json() as {
        status: string;
        rows: Array<{
          elements: Array<{
            status: string;
            distance: { value: number };
            duration: { value: number };
          }>;
        }>;
      };
      
      if (data.status !== 'OK') {
        return null;
      }
      
      const element = data.rows[0]?.elements[0];
      if (!element || element.status !== 'OK') {
        return null;
      }
      
      return {
        distanceMeters: element.distance.value,
        walkingMinutes: Math.round(element.duration.value / 60),
      };
    } catch (error) {
      log.error(`Failed to get walking distance: ${error}`);
      return null;
    }
  }
  
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const EARTH_RADIUS_METERS = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }
  
  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
