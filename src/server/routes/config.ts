import { Elysia, t } from 'elysia';
import { ConfigService } from '../services/config-service.js';

const locationSchema = t.Object({
  name: t.String({ minLength: 1 }),
  postcode: t.String({ minLength: 2 }),
  radius: t.Number({ minimum: 0, maximum: 40, default: 5 })
});

const filtersSchema = t.Object({
  minPrice: t.Optional(t.Number()),
  maxPrice: t.Optional(t.Number()),
  minBedrooms: t.Optional(t.Number()),
  maxBedrooms: t.Optional(t.Number()),
  propertyTypes: t.Optional(t.Array(t.String())),
  maxDaysSinceAdded: t.Optional(t.Number({ minimum: 1, maximum: 14 }))
});

const broadbandSchema = t.Object({
  enabled: t.Boolean(),
  minDownloadSpeed: t.Optional(t.Number()),
  minUploadSpeed: t.Optional(t.Number())
});

const scrapingSchema = t.Object({
  maxPagesPerLocation: t.Number({ minimum: 1, maximum: 50 }),
  delayBetweenRequests: t.Number({ minimum: 1000, maximum: 30000 }),
  rotateProxyEveryNPages: t.Number({ minimum: 1, maximum: 20 })
});

const configService = new ConfigService();

export const configRoutes = new Elysia({ prefix: '/api/config' })
  .get('/', async ({ error }) => {
    const config = await configService.getActiveConfig();
    if (!config) return error(404, { error: 'No active config found' });
    return config;
  })
  
  .put('/', async ({ body }) => {
    return configService.updateConfig(body);
  }, { body: t.Partial(t.Object({
    name: t.String(),
    locations: t.Array(locationSchema),
    filters: filtersSchema,
    broadband: broadbandSchema,
    scraping: scrapingSchema
  }))})
  
  .get('/locations', async () => {
    return configService.getLocations();
  })
  
  .post('/locations', async ({ body }) => {
    return configService.addLocation(body);
  }, { body: locationSchema })
  
  .put('/locations/:index', async ({ params, body, error }) => {
    try {
      return await configService.updateLocation(Number(params.index), body);
    } catch (e) {
      return error(400, { error: (e as Error).message });
    }
  }, { 
    params: t.Object({ index: t.String() }),
    body: locationSchema 
  })
  
  .delete('/locations/:index', async ({ params, error }) => {
    try {
      await configService.deleteLocation(Number(params.index));
      return { success: true };
    } catch (e) {
      return error(400, { error: (e as Error).message });
    }
  }, { params: t.Object({ index: t.String() }) })
  
  .get('/filters', async () => {
    return configService.getFilters();
  })
  
  .put('/filters', async ({ body }) => {
    return configService.updateFilters(body);
  }, { body: filtersSchema })
  
  .get('/broadband', async () => {
    return configService.getBroadband();
  })
  
  .put('/broadband', async ({ body }) => {
    return configService.updateBroadband(body);
  }, { body: broadbandSchema })
  
  .get('/scraping', async () => {
    return configService.getScraping();
  })
  
  .put('/scraping', async ({ body }) => {
    return configService.updateScraping(body);
  }, { body: scrapingSchema })
  
  .get('/env', () => {
    return configService.getSafeEnvInfo();
  });
