import type { Enricher, EnrichmentContext, EnrichmentResult } from '../types.js';
import { GooglePlacesService } from '../../google/places.js';

export class TransportEnricher implements Enricher {
  name = 'transport';
  private placesService: GooglePlacesService;

  constructor(placesService?: GooglePlacesService) {
    this.placesService = placesService || new GooglePlacesService();
  }

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    const { coordinates } = context;
    const result: EnrichmentResult = {};

    const station = await this.placesService.findNearestTrainStation(
      coordinates.lat,
      coordinates.lng
    );

    if (station) {
      result.nearestStationName = station.name;
      result.nearestStationDistance = station.distanceMeters;
      result.nearestStationWalkMins = station.walkingMinutes;
    }

    return result;
  }
}
