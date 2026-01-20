import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { cors } from '@elysiajs/cors';
import { propertyRoutes } from './routes/properties.js';
import { scrapeRoutes } from './routes/scrape.js';
import { configRoutes } from './routes/config.js';
import { statsRoutes } from './routes/stats.js';
import { scrapeWebSocket } from './websocket/scrape-progress.js';
import { initializeConfig } from './services/config-service.js';

import 'dotenv/config';

// Initialize config from config.json if database is empty
initializeConfig().catch(console.error);

const app = new Elysia()
  .use(cors())
  .use(await staticPlugin({ 
    assets: 'public',
    prefix: '/'
  }))
  .use(propertyRoutes)
  .use(scrapeRoutes)
  .use(configRoutes)
  .use(statsRoutes)
  .use(scrapeWebSocket)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen(process.env.PORT || 3000);

console.log(`🏠 Rightmove Scraper running at http://localhost:${app.server?.port}`);

export type App = typeof app;
