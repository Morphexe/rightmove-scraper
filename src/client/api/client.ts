import { treaty } from '@elysiajs/eden';
import type { App } from '../../server/index.js';

export const api = treaty<App>(window.location.origin);

export const apiClient = {
  properties: {
    list: (params?: Record<string, unknown>) => 
      api.api.properties.get({ query: params as Record<string, string> }),
    grouped: (params?: Record<string, unknown>) =>
      api.api.properties.grouped.get({ query: params as Record<string, string> }),
    get: (id: number) => 
      api.api.properties({ id: String(id) }).get(),
    update: (id: number, data: Record<string, unknown>) => 
      api.api.properties({ id: String(id) }).patch(data),
    markViewed: (id: number) => 
      api.api.properties({ id: String(id) }).viewed.post(),
    enrich: (id: number) =>
      api.api.properties({ id: String(id) }).enrich.post(),
    enrichAll: (limit?: number) =>
      api.api.properties['enrich-all'].post({ query: limit ? { limit: String(limit) } : {} }),
    enrichmentStats: () =>
      api.api.properties['enrichment-stats'].get(),
    delete: (id: number) => 
      api.api.properties({ id: String(id) }).delete(),
    deleteAll: () => 
      api.api.properties.delete()
  },
  
  scrape: {
    start: (options?: { locations?: string[]; skipDetails?: boolean; noBroadband?: boolean }) => 
      api.api.scrape.start.post(options || {}),
    stop: () => 
      api.api.scrape.stop.post(),
    status: () => 
      api.api.scrape.status.get(),
    history: (params?: { page?: string; limit?: string }) => 
      api.api.scrape.history.get({ query: params })
  },
  
  config: {
    get: () => api.api.config.get(),
    update: (data: Record<string, unknown>) => api.api.config.put(data),
    locations: {
      list: () => api.api.config.locations.get(),
      add: (loc: { name: string; postcode: string; radius: number }) => 
        api.api.config.locations.post(loc),
      update: (index: number, loc: { name: string; postcode: string; radius: number }) => 
        api.api.config.locations({ index: String(index) }).put(loc),
      delete: (index: number) => 
        api.api.config.locations({ index: String(index) }).delete()
    },
    filters: {
      get: () => api.api.config.filters.get(),
      update: (data: Record<string, unknown>) => api.api.config.filters.put(data)
    },
    broadband: {
      get: () => api.api.config.broadband.get(),
      update: (data: { enabled: boolean; minDownloadSpeed?: number; minUploadSpeed?: number }) => 
        api.api.config.broadband.put(data)
    },
    scraping: {
      get: () => api.api.config.scraping.get(),
      update: (data: { maxPagesPerLocation: number; delayBetweenRequests: number; rotateProxyEveryNPages: number }) => 
        api.api.config.scraping.put(data)
    },
    env: () => api.api.config.env.get()
  },
  
  stats: {
    overview: () => api.api.stats.overview.get(),
    database: () => api.api.stats.database.get(),
    proxy: () => api.api.stats.proxy.get()
  }
};
