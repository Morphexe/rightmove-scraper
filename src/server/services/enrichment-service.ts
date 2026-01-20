import { eq, isNull, and } from 'drizzle-orm';
import { getDb, schema } from '../database/index.js';
import { GooglePlacesService, type CommuteResult } from './google/places.js';
import { ConfigService } from './config-service.js';
import { log } from '../utils/logger.js';

export class EnrichmentService {
  private googlePlaces: GooglePlacesService;
  private configService: ConfigService;
  
  constructor() {
    this.googlePlaces = new GooglePlacesService();
    this.configService = new ConfigService();
  }
  
  async enrichProperty(propertyId: number): Promise<boolean> {
    const db = await getDb();
    
    const [property] = await db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, propertyId))
      .limit(1);
    
    if (!property) {
      log.warn(`Property ${propertyId} not found`);
      return false;
    }
    
    if (!property.latitude || !property.longitude) {
      log.warn(`Property ${propertyId} has no coordinates`);
      return false;
    }
    
    const lat = Number(property.latitude);
    const lng = Number(property.longitude);
    
    const config = await this.configService.getActiveConfig();
    const commutePoints = config?.commutePoints || [];
    
    log.info(`Enriching property ${propertyId} at ${lat}, ${lng}`);
    
    const [
      trainStation,
      aldi,
      lidl,
      postOffice,
      dentist,
      hospital,
      gp,
    ] = await Promise.all([
      this.googlePlaces.findNearestTrainStation(lat, lng),
      this.googlePlaces.findNearestGroceryByName(lat, lng, 'ALDI'),
      this.googlePlaces.findNearestGroceryByName(lat, lng, 'LIDL'),
      this.googlePlaces.findNearbyPlaces(lat, lng, 'postOffice', 5000).then(r => r[0]),
      this.googlePlaces.findNearbyPlaces(lat, lng, 'dentist', 5000).then(r => r[0]),
      this.googlePlaces.findNearbyPlaces(lat, lng, 'hospital', 10000).then(r => r[0]),
      this.googlePlaces.findNearbyPlaces(lat, lng, 'doctor', 5000).then(r => r[0]),
    ]);
    
    const commuteTimes: Array<{ name: string; drivingMins: number; transitMins?: number }> = [];
    
    for (const point of commutePoints) {
      const commute = await this.googlePlaces.getCommuteTime(
        lat, lng,
        point.lat, point.lng,
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
    
    await db
      .update(schema.properties)
      .set({
        enrichedAt: new Date(),
        
        nearestStationName: trainStation?.name,
        nearestStationDistance: trainStation?.distanceMeters,
        nearestStationWalkMins: trainStation?.walkingMinutes,
        
        nearestAldiName: aldi?.name,
        nearestAldiDistance: aldi?.distanceMeters,
        nearestAldiWalkMins: aldi?.walkingMinutes,
        
        nearestLidlName: lidl?.name,
        nearestLidlDistance: lidl?.distanceMeters,
        nearestLidlWalkMins: lidl?.walkingMinutes,
        
        nearestPostOfficeDistance: postOffice?.distanceMeters,
        nearestPostOfficeWalkMins: postOffice?.walkingMinutes,
        
        nearestDentistDistance: dentist?.distanceMeters,
        nearestDentistWalkMins: dentist?.walkingMinutes,
        
        nearestHospitalDistance: hospital?.distanceMeters,
        nearestHospitalWalkMins: hospital?.walkingMinutes,
        
        nearestGpDistance: gp?.distanceMeters,
        nearestGpWalkMins: gp?.walkingMinutes,
        
        commuteTimes: commuteTimes.length > 0 ? commuteTimes : null,
      })
      .where(eq(schema.properties.id, propertyId));
    
    log.info(`Enriched property ${propertyId}`);
    return true;
  }
  
  async enrichUnenrichedProperties(limit: number = 10): Promise<number> {
    const db = await getDb();
    
    const properties = await db
      .select({ id: schema.properties.id })
      .from(schema.properties)
      .where(and(
        isNull(schema.properties.enrichedAt),
        schema.properties.latitude !== null,
        schema.properties.longitude !== null
      ))
      .limit(limit);
    
    let enrichedCount = 0;
    
    for (const property of properties) {
      try {
        const success = await this.enrichProperty(property.id);
        if (success) enrichedCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        log.error(`Failed to enrich property ${property.id}: ${error}`);
      }
    }
    
    return enrichedCount;
  }
  
  async getEnrichmentStats(): Promise<{
    total: number;
    enriched: number;
    pending: number;
    withCoordinates: number;
  }> {
    const db = await getDb();
    
    const [total] = await db
      .select({ count: schema.properties.id })
      .from(schema.properties);
    
    const [enriched] = await db
      .select({ count: schema.properties.id })
      .from(schema.properties)
      .where(schema.properties.enrichedAt !== null);
    
    const [withCoords] = await db
      .select({ count: schema.properties.id })
      .from(schema.properties)
      .where(and(
        schema.properties.latitude !== null,
        schema.properties.longitude !== null
      ));
    
    const totalCount = total?.count || 0;
    const enrichedCount = enriched?.count || 0;
    const withCoordsCount = withCoords?.count || 0;
    
    return {
      total: totalCount,
      enriched: enrichedCount,
      pending: withCoordsCount - enrichedCount,
      withCoordinates: withCoordsCount,
    };
  }
}
