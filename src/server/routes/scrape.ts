import { Elysia, t } from 'elysia';
import { ScrapeService } from '../services/scrape-service.js';

const scrapeService = new ScrapeService();

const scrapeStartSchema = t.Object({
  locations: t.Optional(t.Array(t.String())),
  skipDetails: t.Optional(t.Boolean()),
  noBroadband: t.Optional(t.Boolean())
});

export const scrapeRoutes = new Elysia({ prefix: '/api/scrape' })
  .post('/start', async ({ body, error }) => {
    try {
      return await scrapeService.startScrape(body);
    } catch (e) {
      return error(400, { error: (e as Error).message });
    }
  }, { body: scrapeStartSchema })
  
  .post('/stop', async () => {
    return scrapeService.stopScrape();
  })
  
  .get('/status', () => {
    return scrapeService.getStatus();
  })
  
  .get('/history', async ({ query }) => {
    return scrapeService.getHistory({
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20
    });
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String())
    })
  })
  
  .get('/runs/:id', async ({ params, error }) => {
    const run = await scrapeService.getRunById(Number(params.id));
    if (!run) {
      return error(404, { error: 'Scrape run not found' });
    }
    return run;
  }, { params: t.Object({ id: t.String() }) });
