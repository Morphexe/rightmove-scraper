import { eq, isNull, and, isNotNull, sql } from 'drizzle-orm';
import { getDb, schema } from '../database/index.js';
import { ConfigService } from './config-service.js';
import { log } from '../utils/logger.js';
import { 
  createDefaultPipeline, 
  createCustomPipeline,
  MANCHESTER_COMMUTE_POINTS,
  type EnrichmentConfig,
  type EnrichmentPipelineResult 
} from './enrichment/index.js';

export class EnrichmentService {
  private configService: ConfigService;

  constructor() {
    this.configService = new ConfigService();
  }

  private async getEnrichmentConfig(): Promise<Partial<EnrichmentConfig>> {
    const config = await this.configService.getActiveConfig();
    
    const commutePoints = config?.commutePoints?.length 
      ? config.commutePoints 
      : MANCHESTER_COMMUTE_POINTS;

    return {
      commutePoints,
      groceryStores: ['ALDI', 'LIDL', 'COOP', 'Co-op'],
      maxSearchRadiusMeters: 10000,
    };
  }

  async enrichProperty(propertyId: number): Promise<boolean> {
    const config = await this.getEnrichmentConfig();
    const pipeline = createDefaultPipeline(config);
    
    log.info(`Enriching property ${propertyId} with pipeline: ${pipeline.getRegisteredEnrichers().join(', ')}`);
    
    const result = await pipeline.enrichProperty(propertyId);
    
    if (!result.success && result.errors.length > 0) {
      log.warn(`Property ${propertyId} enrichment had errors: ${result.errors.map(e => e.error).join(', ')}`);
    }
    
    return result.enrichersRun.length > 0;
  }

  async enrichPropertyWithEnrichers(
    propertyId: number, 
    enricherNames: string[]
  ): Promise<EnrichmentPipelineResult> {
    const config = await this.getEnrichmentConfig();
    const pipeline = createCustomPipeline(enricherNames, config);
    
    log.info(`Enriching property ${propertyId} with specific enrichers: ${enricherNames.join(', ')}`);
    
    return pipeline.enrichProperty(propertyId);
  }

  async enrichUnenrichedProperties(limit: number = 10): Promise<number> {
    const db = await getDb();

    const properties = await db
      .select({ id: schema.properties.id })
      .from(schema.properties)
      .where(and(
        isNull(schema.properties.enrichedAt),
        isNotNull(schema.properties.latitude),
        isNotNull(schema.properties.longitude)
      ))
      .limit(limit);

    const config = await this.getEnrichmentConfig();
    const pipeline = createDefaultPipeline(config);
    
    const results = await pipeline.enrichMany(
      properties.map(p => p.id),
      500
    );

    const enrichedCount = results.filter(r => r.enrichersRun.length > 0).length;
    
    log.info(`Batch enrichment complete: ${enrichedCount}/${properties.length} properties enriched`);
    
    return enrichedCount;
  }

  async getEnrichmentStats(): Promise<{
    total: number;
    enriched: number;
    pending: number;
    withCoordinates: number;
  }> {
    const db = await getDb();

    const [stats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        enriched: sql<number>`SUM(CASE WHEN ${schema.properties.enrichedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        withCoordinates: sql<number>`SUM(CASE WHEN ${schema.properties.latitude} IS NOT NULL AND ${schema.properties.longitude} IS NOT NULL THEN 1 ELSE 0 END)`,
      })
      .from(schema.properties);

    const total = Number(stats?.total) || 0;
    const enriched = Number(stats?.enriched) || 0;
    const withCoordinates = Number(stats?.withCoordinates) || 0;

    return {
      total,
      enriched,
      pending: withCoordinates - enriched,
      withCoordinates,
    };
  }
}
