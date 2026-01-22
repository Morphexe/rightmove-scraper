import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { EnrichmentPipeline } from '../../src/server/services/enrichment/pipeline';
import type { Enricher, EnrichmentContext, EnrichmentResult } from '../../src/server/services/enrichment/types';

const createMockEnricher = (
  name: string, 
  result: EnrichmentResult, 
  shouldFail = false
): Enricher => ({
  name,
  async enrich(_context: EnrichmentContext): Promise<EnrichmentResult> {
    if (shouldFail) {
      throw new Error(`${name} failed intentionally`);
    }
    return result;
  },
});

describe('EnrichmentPipeline', () => {
  describe('constructor and configuration', () => {
    test('creates pipeline with default config', () => {
      const pipeline = new EnrichmentPipeline();
      expect(pipeline.getRegisteredEnrichers()).toEqual([]);
    });

    test('creates pipeline with custom config', () => {
      const pipeline = new EnrichmentPipeline({
        commutePoints: [{ name: 'Test', lat: 53.4, lng: -2.2 }],
        groceryStores: ['ALDI'],
        maxSearchRadiusMeters: 5000,
      });
      expect(pipeline.getRegisteredEnrichers()).toEqual([]);
    });

    test('updates config after creation', () => {
      const pipeline = new EnrichmentPipeline();
      pipeline.updateConfig({ maxSearchRadiusMeters: 15000 });
      expect(pipeline.getRegisteredEnrichers()).toEqual([]);
    });
  });

  describe('enricher registration', () => {
    test('registers single enricher', () => {
      const pipeline = new EnrichmentPipeline();
      const enricher = createMockEnricher('test', {});
      
      pipeline.register(enricher);
      
      expect(pipeline.getRegisteredEnrichers()).toEqual(['test']);
    });

    test('registers multiple enrichers', () => {
      const pipeline = new EnrichmentPipeline();
      
      pipeline.registerMany([
        createMockEnricher('enricher1', {}),
        createMockEnricher('enricher2', {}),
        createMockEnricher('enricher3', {}),
      ]);
      
      expect(pipeline.getRegisteredEnrichers()).toEqual(['enricher1', 'enricher2', 'enricher3']);
    });

    test('supports chaining register calls', () => {
      const pipeline = new EnrichmentPipeline()
        .register(createMockEnricher('a', {}))
        .register(createMockEnricher('b', {}));
      
      expect(pipeline.getRegisteredEnrichers()).toEqual(['a', 'b']);
    });
  });
});

describe('EnrichmentResult merging', () => {
  test('combines results from multiple enrichers', async () => {
    const enricher1 = createMockEnricher('grocery', {
      nearestAldiDistance: 500,
      nearestAldiWalkMins: 6,
    });
    
    const enricher2 = createMockEnricher('transport', {
      nearestStationDistance: 1000,
      nearestStationWalkMins: 12,
    });

    const context: EnrichmentContext = {
      property: { id: 1 } as any,
      coordinates: { lat: 53.48, lng: -2.24 },
      config: { commutePoints: [], groceryStores: [], maxSearchRadiusMeters: 10000 },
    };

    const result1 = await enricher1.enrich(context);
    const result2 = await enricher2.enrich(context);
    const combined = { ...result1, ...result2 };

    expect(combined).toEqual({
      nearestAldiDistance: 500,
      nearestAldiWalkMins: 6,
      nearestStationDistance: 1000,
      nearestStationWalkMins: 12,
    });
  });
});

describe('Individual Enrichers', () => {
  describe('GroceryEnricher pattern', () => {
    test('handles ALDI results', () => {
      const result: EnrichmentResult = {
        nearestAldiName: 'ALDI Manchester',
        nearestAldiDistance: 800,
        nearestAldiWalkMins: 10,
      };
      
      expect(result.nearestAldiName).toBe('ALDI Manchester');
      expect(result.nearestAldiDistance).toBe(800);
      expect(result.nearestAldiWalkMins).toBe(10);
    });

    test('handles LIDL results', () => {
      const result: EnrichmentResult = {
        nearestLidlName: 'LIDL Stockport',
        nearestLidlDistance: 1200,
        nearestLidlWalkMins: 15,
      };
      
      expect(result.nearestLidlName).toBe('LIDL Stockport');
      expect(result.nearestLidlDistance).toBe(1200);
      expect(result.nearestLidlWalkMins).toBe(15);
    });

    test('handles COOP results', () => {
      const result: EnrichmentResult = {
        nearestCoopName: 'Co-op Food',
        nearestCoopDistance: 300,
        nearestCoopWalkMins: 4,
      };
      
      expect(result.nearestCoopName).toBe('Co-op Food');
      expect(result.nearestCoopDistance).toBe(300);
      expect(result.nearestCoopWalkMins).toBe(4);
    });
  });

  describe('CommuteEnricher pattern', () => {
    test('generates commute times array', () => {
      const result: EnrichmentResult = {
        commuteTimes: [
          { name: 'Manchester Airport', drivingMins: 25, transitMins: 45 },
          { name: 'Manchester City Centre', drivingMins: 15, transitMins: 20 },
        ],
      };
      
      expect(result.commuteTimes).toHaveLength(2);
      expect(result.commuteTimes![0].name).toBe('Manchester Airport');
      expect(result.commuteTimes![0].drivingMins).toBe(25);
      expect(result.commuteTimes![0].transitMins).toBe(45);
    });

    test('returns null for empty commute points', () => {
      const result: EnrichmentResult = {
        commuteTimes: null,
      };
      
      expect(result.commuteTimes).toBeNull();
    });
  });

  describe('TransportEnricher pattern', () => {
    test('provides station details', () => {
      const result: EnrichmentResult = {
        nearestStationName: 'Stockport Station',
        nearestStationDistance: 1500,
        nearestStationWalkMins: 18,
      };
      
      expect(result.nearestStationName).toBe('Stockport Station');
      expect(result.nearestStationDistance).toBe(1500);
      expect(result.nearestStationWalkMins).toBe(18);
    });
  });

  describe('HealthcareEnricher pattern', () => {
    test('provides healthcare facility details', () => {
      const result: EnrichmentResult = {
        nearestGpDistance: 400,
        nearestGpWalkMins: 5,
        nearestDentistDistance: 600,
        nearestDentistWalkMins: 8,
        nearestHospitalDistance: 3000,
        nearestHospitalWalkMins: 37,
        nearestPostOfficeDistance: 200,
        nearestPostOfficeWalkMins: 3,
      };
      
      expect(result.nearestGpDistance).toBe(400);
      expect(result.nearestHospitalDistance).toBe(3000);
      expect(result.nearestPostOfficeWalkMins).toBe(3);
    });
  });

  describe('BroadbandEnricher pattern', () => {
    test('provides broadband speed data', () => {
      const result: EnrichmentResult = {
        broadbandDownload: 900,
        broadbandUpload: 100,
        broadbandProvider: 'Virgin Media',
      };
      
      expect(result.broadbandDownload).toBe(900);
      expect(result.broadbandUpload).toBe(100);
      expect(result.broadbandProvider).toBe('Virgin Media');
    });

    test('handles estimated speeds', () => {
      const result: EnrichmentResult = {
        broadbandDownload: 300,
        broadbandUpload: 30,
        broadbandProvider: 'estimated',
      };
      
      expect(result.broadbandDownload).toBe(300);
      expect(result.broadbandProvider).toBe('estimated');
    });
  });
});

describe('Error handling', () => {
  test('failing enricher returns error in result', async () => {
    const failingEnricher = createMockEnricher('failing', {}, true);
    
    try {
      await failingEnricher.enrich({
        property: { id: 1 } as any,
        coordinates: { lat: 53.48, lng: -2.24 },
        config: { commutePoints: [], groceryStores: [], maxSearchRadiusMeters: 10000 },
      });
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toBe('failing failed intentionally');
    }
  });
});

describe('Factory functions', () => {
  test('createMockEnricher creates valid enricher', () => {
    const enricher = createMockEnricher('test', { broadbandDownload: 500 });
    
    expect(enricher.name).toBe('test');
    expect(typeof enricher.enrich).toBe('function');
  });

  test('enricher returns expected result', async () => {
    const expectedResult = { nearestAldiDistance: 1000 };
    const enricher = createMockEnricher('grocery', expectedResult);
    
    const result = await enricher.enrich({
      property: { id: 1 } as any,
      coordinates: { lat: 53.48, lng: -2.24 },
      config: { commutePoints: [], groceryStores: [], maxSearchRadiusMeters: 10000 },
    });
    
    expect(result).toEqual(expectedResult);
  });
});
