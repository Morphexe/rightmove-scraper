import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../database/index.js';
import { log } from '../../utils/logger.js';
import type { 
  Enricher, 
  EnrichmentConfig, 
  EnrichmentContext, 
  EnrichmentResult,
  EnrichmentPipelineResult 
} from './types.js';

const DEFAULT_CONFIG: EnrichmentConfig = {
  commutePoints: [],
  groceryStores: ['ALDI', 'LIDL', 'COOP', 'Co-op'],
  maxSearchRadiusMeters: 10000,
};

export class EnrichmentPipeline {
  private enrichers: Enricher[] = [];
  private config: EnrichmentConfig;

  constructor(config: Partial<EnrichmentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  register(enricher: Enricher): this {
    this.enrichers.push(enricher);
    return this;
  }

  registerMany(enrichers: Enricher[]): this {
    this.enrichers.push(...enrichers);
    return this;
  }

  getRegisteredEnrichers(): string[] {
    return this.enrichers.map(e => e.name);
  }

  updateConfig(config: Partial<EnrichmentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async enrichProperty(propertyId: number): Promise<EnrichmentPipelineResult> {
    const db = await getDb();
    
    const [property] = await db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, propertyId))
      .limit(1);

    if (!property) {
      return {
        propertyId,
        success: false,
        enrichersRun: [],
        enrichersFailed: [],
        updates: {},
        errors: [{ enricher: 'pipeline', error: 'Property not found' }],
      };
    }

    if (!property.latitude || !property.longitude) {
      return {
        propertyId,
        success: false,
        enrichersRun: [],
        enrichersFailed: [],
        updates: {},
        errors: [{ enricher: 'pipeline', error: 'Property has no coordinates' }],
      };
    }

    const context: EnrichmentContext = {
      property,
      coordinates: {
        lat: Number(property.latitude),
        lng: Number(property.longitude),
      },
      config: this.config,
    };

    const enrichersRun: string[] = [];
    const enrichersFailed: string[] = [];
    const errors: Array<{ enricher: string; error: string }> = [];
    let combinedUpdates: EnrichmentResult = {};

    for (const enricher of this.enrichers) {
      try {
        log.debug(`Running enricher: ${enricher.name} for property ${propertyId}`);
        const result = await enricher.enrich(context);
        combinedUpdates = { ...combinedUpdates, ...result };
        enrichersRun.push(enricher.name);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Enricher ${enricher.name} failed for property ${propertyId}: ${errorMessage}`);
        enrichersFailed.push(enricher.name);
        errors.push({ enricher: enricher.name, error: errorMessage });
      }
    }

    if (Object.keys(combinedUpdates).length > 0) {
      combinedUpdates.enrichedAt = new Date();
      
      await db
        .update(schema.properties)
        .set(combinedUpdates)
        .where(eq(schema.properties.id, propertyId));
    }

    log.info(
      `Enriched property ${propertyId}: ${enrichersRun.length} succeeded, ${enrichersFailed.length} failed`
    );

    return {
      propertyId,
      success: enrichersFailed.length === 0,
      enrichersRun,
      enrichersFailed,
      updates: combinedUpdates,
      errors,
    };
  }

  async enrichMany(propertyIds: number[], delayMs: number = 500): Promise<EnrichmentPipelineResult[]> {
    const results: EnrichmentPipelineResult[] = [];

    for (const id of propertyIds) {
      const result = await this.enrichProperty(id);
      results.push(result);
      
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}
