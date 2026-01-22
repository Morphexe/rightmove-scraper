import type { Enricher, EnrichmentContext, EnrichmentResult } from '../types.js';
import { GooglePlacesService } from '../../google/places.js';

export class HealthcareEnricher implements Enricher {
  name = 'healthcare';
  private placesService: GooglePlacesService;

  constructor(placesService?: GooglePlacesService) {
    this.placesService = placesService || new GooglePlacesService();
  }

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    const { coordinates, config } = context;
    const result: EnrichmentResult = {};

    const [dentist, hospital, gp, postOffice] = await Promise.all([
      this.placesService.findNearbyPlaces(coordinates.lat, coordinates.lng, 'dentist', config.maxSearchRadiusMeters),
      this.placesService.findNearbyPlaces(coordinates.lat, coordinates.lng, 'hospital', config.maxSearchRadiusMeters),
      this.placesService.findNearbyPlaces(coordinates.lat, coordinates.lng, 'doctor', config.maxSearchRadiusMeters),
      this.placesService.findNearbyPlaces(coordinates.lat, coordinates.lng, 'postOffice', config.maxSearchRadiusMeters),
    ]);

    if (dentist[0]) {
      result.nearestDentistDistance = dentist[0].distanceMeters;
      result.nearestDentistWalkMins = dentist[0].walkingMinutes;
    }

    if (hospital[0]) {
      result.nearestHospitalDistance = hospital[0].distanceMeters;
      result.nearestHospitalWalkMins = hospital[0].walkingMinutes;
    }

    if (gp[0]) {
      result.nearestGpDistance = gp[0].distanceMeters;
      result.nearestGpWalkMins = gp[0].walkingMinutes;
    }

    if (postOffice[0]) {
      result.nearestPostOfficeDistance = postOffice[0].distanceMeters;
      result.nearestPostOfficeWalkMins = postOffice[0].walkingMinutes;
    }

    return result;
  }
}
