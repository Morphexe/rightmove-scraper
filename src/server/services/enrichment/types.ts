import type { Property } from '../../database/schema.js';

export interface PropertyCoordinates {
  lat: number;
  lng: number;
}

export interface EnrichmentContext {
  property: Property;
  coordinates: PropertyCoordinates;
  config: EnrichmentConfig;
}

export interface EnrichmentConfig {
  commutePoints: CommutePoint[];
  groceryStores: string[];
  maxSearchRadiusMeters: number;
}

export interface CommutePoint {
  name: string;
  lat: number;
  lng: number;
}

export type EnrichmentResult = Partial<Property>;

export interface Enricher {
  name: string;
  enrich(context: EnrichmentContext): Promise<EnrichmentResult>;
}

export interface EnrichmentPipelineResult {
  propertyId: number;
  success: boolean;
  enrichersRun: string[];
  enrichersFailed: string[];
  updates: EnrichmentResult;
  errors: Array<{ enricher: string; error: string }>;
}
