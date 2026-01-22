import type { Enricher, EnrichmentContext, EnrichmentResult } from '../types.js';
import { GooglePlacesService } from '../../google/places.js';

export class CommuteEnricher implements Enricher {
  name = 'commute';
  private placesService: GooglePlacesService;

  constructor(placesService?: GooglePlacesService) {
    this.placesService = placesService || new GooglePlacesService();
  }

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    const { coordinates, config } = context;
    
    if (config.commutePoints.length === 0) {
      return {};
    }

    const commuteTimes: Array<{ name: string; drivingMins: number; transitMins?: number }> = [];

    for (const point of config.commutePoints) {
      const commute = await this.placesService.getCommuteTime(
        coordinates.lat,
        coordinates.lng,
        point.lat,
        point.lng,
        point.name
      );

      if (commute) {
        commuteTimes.push({
          name: commute.destination,
          drivingMins: commute.drivingMinutes,
          transitMins: commute.transitMinutes,
        });
      }
    }

    return {
      commuteTimes: commuteTimes.length > 0 ? commuteTimes : null,
    };
  }
}
