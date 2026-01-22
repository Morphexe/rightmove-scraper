import { EnrichmentPipeline } from './pipeline.js';
import { 
  BroadbandEnricher, 
  GroceryEnricher, 
  TransportEnricher, 
  HealthcareEnricher, 
  CommuteEnricher 
} from './enrichers/index.js';
import type { EnrichmentConfig, CommutePoint } from './types.js';

export * from './types.js';
export * from './pipeline.js';
export * from './enrichers/index.js';

export const MANCHESTER_COMMUTE_POINTS: CommutePoint[] = [
  { name: 'Manchester Airport', lat: 53.3588, lng: -2.2727 },
  { name: 'Manchester Piccadilly', lat: 53.4774, lng: -2.2309 },
  { name: 'Manchester City Centre', lat: 53.4808, lng: -2.2426 },
];

export function createDefaultPipeline(config?: Partial<EnrichmentConfig>): EnrichmentPipeline {
  const pipeline = new EnrichmentPipeline({
    commutePoints: MANCHESTER_COMMUTE_POINTS,
    groceryStores: ['ALDI', 'LIDL', 'COOP', 'Co-op'],
    maxSearchRadiusMeters: 10000,
    ...config,
  });

  pipeline.registerMany([
    new BroadbandEnricher(),
    new GroceryEnricher(),
    new TransportEnricher(),
    new HealthcareEnricher(),
    new CommuteEnricher(),
  ]);

  return pipeline;
}

export function createCustomPipeline(
  enricherNames: string[],
  config?: Partial<EnrichmentConfig>
): EnrichmentPipeline {
  const pipeline = new EnrichmentPipeline({
    commutePoints: MANCHESTER_COMMUTE_POINTS,
    groceryStores: ['ALDI', 'LIDL', 'COOP', 'Co-op'],
    maxSearchRadiusMeters: 10000,
    ...config,
  });

  const enricherMap: Record<string, () => InstanceType<typeof BroadbandEnricher | typeof GroceryEnricher | typeof TransportEnricher | typeof HealthcareEnricher | typeof CommuteEnricher>> = {
    broadband: () => new BroadbandEnricher(),
    grocery: () => new GroceryEnricher(),
    transport: () => new TransportEnricher(),
    healthcare: () => new HealthcareEnricher(),
    commute: () => new CommuteEnricher(),
  };

  for (const name of enricherNames) {
    const factory = enricherMap[name];
    if (factory) {
      pipeline.register(factory());
    }
  }

  return pipeline;
}
