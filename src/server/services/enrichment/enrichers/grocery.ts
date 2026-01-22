import type { Enricher, EnrichmentContext, EnrichmentResult } from '../types.js';
import { GooglePlacesService } from '../../google/places.js';

export class GroceryEnricher implements Enricher {
  name = 'grocery';
  private placesService: GooglePlacesService;

  constructor(placesService?: GooglePlacesService) {
    this.placesService = placesService || new GooglePlacesService();
  }

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    const { coordinates, config } = context;
    const result: EnrichmentResult = {};

    const searchPromises = config.groceryStores.map(async (storeName) => {
      const store = await this.placesService.findNearestGroceryByName(
        coordinates.lat,
        coordinates.lng,
        storeName
      );
      return { storeName: storeName.toUpperCase().replace('-', ''), store };
    });

    const stores = await Promise.all(searchPromises);

    for (const { storeName, store } of stores) {
      if (!store) continue;

      const normalizedName = storeName.replace(/CO-?OP/i, 'COOP');

      switch (normalizedName) {
        case 'ALDI':
          result.nearestAldiName = store.name;
          result.nearestAldiDistance = store.distanceMeters;
          result.nearestAldiWalkMins = store.walkingMinutes;
          break;
        case 'LIDL':
          result.nearestLidlName = store.name;
          result.nearestLidlDistance = store.distanceMeters;
          result.nearestLidlWalkMins = store.walkingMinutes;
          break;
        case 'COOP':
          result.nearestCoopName = store.name;
          result.nearestCoopDistance = store.distanceMeters;
          result.nearestCoopWalkMins = store.walkingMinutes;
          break;
      }
    }

    return result;
  }
}
