import { eq } from 'drizzle-orm';
import { getDb, schema, type SearchConfig } from '../database/index.js';
import { getConfig, isProxyEnabled } from '../config/index.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { log } from '../utils/logger.js';

export interface Location {
  name: string;
  postcode: string;
  radius: number;
}

export interface Filters {
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  propertyTypes?: string[];
  maxDaysSinceAdded?: number;
}

export interface BroadbandSettings {
  enabled: boolean;
  minDownloadSpeed?: number;
  minUploadSpeed?: number;
}

export interface ScrapingSettings {
  maxPagesPerLocation: number;
  delayBetweenRequests: number;
  rotateProxyEveryNPages: number;
}

export interface CommutePoint {
  name: string;
  lat: number;
  lng: number;
}

export interface FullSearchConfig {
  id: number;
  name: string;
  locations: Location[];
  filters: Filters;
  broadband: BroadbandSettings;
  scraping: ScrapingSettings;
  commutePoints?: CommutePoint[];
  isActive: boolean;
}

export class ConfigService {
  async getActiveConfig(): Promise<FullSearchConfig | null> {
    const db = await getDb();
    const result = await db
      .select()
      .from(schema.searchConfigs)
      .where(eq(schema.searchConfigs.isActive, true))
      .limit(1);
    
    if (result.length === 0) return null;
    
    const config = result[0];
    return {
      id: config.id,
      name: config.name,
      locations: config.locations as Location[],
      filters: config.filters as Filters,
      broadband: config.broadband as BroadbandSettings,
      scraping: config.scraping as ScrapingSettings,
      commutePoints: config.commutePoints as CommutePoint[] | undefined,
      isActive: config.isActive
    };
  }
  
  async updateConfig(data: Partial<FullSearchConfig>): Promise<FullSearchConfig> {
    const db = await getDb();
    const current = await this.getActiveConfig();
    
    if (!current) {
      throw new Error('No active config found');
    }
    
    const updates: Partial<SearchConfig> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.locations !== undefined) updates.locations = data.locations;
    if (data.filters !== undefined) updates.filters = data.filters;
    if (data.broadband !== undefined) updates.broadband = data.broadband;
    if (data.scraping !== undefined) updates.scraping = data.scraping;
    if (data.commutePoints !== undefined) updates.commutePoints = data.commutePoints;
    
    await db
      .update(schema.searchConfigs)
      .set(updates)
      .where(eq(schema.searchConfigs.id, current.id));
    
    return (await this.getActiveConfig())!;
  }
  
  async getLocations(): Promise<Location[]> {
    const config = await this.getActiveConfig();
    return config?.locations || [];
  }
  
  async addLocation(location: Location): Promise<Location[]> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('No active config');
    
    const locations = [...config.locations, location];
    await this.updateConfig({ locations });
    return locations;
  }
  
  async updateLocation(index: number, location: Location): Promise<Location[]> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('No active config');
    
    if (index < 0 || index >= config.locations.length) {
      throw new Error('Invalid location index');
    }
    
    const locations = [...config.locations];
    locations[index] = location;
    await this.updateConfig({ locations });
    return locations;
  }
  
  async deleteLocation(index: number): Promise<Location[]> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('No active config');
    
    if (index < 0 || index >= config.locations.length) {
      throw new Error('Invalid location index');
    }
    
    const locations = config.locations.filter((_, i) => i !== index);
    await this.updateConfig({ locations });
    return locations;
  }
  
  async getFilters(): Promise<Filters> {
    const config = await this.getActiveConfig();
    return config?.filters || {};
  }
  
  async updateFilters(filters: Filters): Promise<Filters> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('No active config');
    
    const mergedFilters = { ...config.filters, ...filters };
    await this.updateConfig({ filters: mergedFilters });
    return mergedFilters;
  }
  
  async getBroadband(): Promise<BroadbandSettings> {
    const config = await this.getActiveConfig();
    return config?.broadband || { enabled: false };
  }
  
  async updateBroadband(broadband: BroadbandSettings): Promise<BroadbandSettings> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('No active config');
    
    const mergedBroadband = { ...config.broadband, ...broadband };
    await this.updateConfig({ broadband: mergedBroadband });
    return mergedBroadband;
  }
  
  async getScraping(): Promise<ScrapingSettings> {
    const config = await this.getActiveConfig();
    return config?.scraping || { maxPagesPerLocation: 10, delayBetweenRequests: 3000, rotateProxyEveryNPages: 5 };
  }
  
  async updateScraping(scraping: ScrapingSettings): Promise<ScrapingSettings> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('No active config');
    
    const mergedScraping = { ...config.scraping, ...scraping };
    await this.updateConfig({ scraping: mergedScraping });
    return mergedScraping;
  }
  
  async getCommutePoints(): Promise<CommutePoint[]> {
    const config = await this.getActiveConfig();
    return config?.commutePoints || [];
  }
  
  async addCommutePoint(point: CommutePoint): Promise<CommutePoint[]> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('No active config');
    
    const commutePoints = [...(config.commutePoints || []), point];
    await this.updateConfig({ commutePoints });
    return commutePoints;
  }
  
  async updateCommutePoint(index: number, point: CommutePoint): Promise<CommutePoint[]> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('No active config');
    
    const commutePoints = [...(config.commutePoints || [])];
    if (index < 0 || index >= commutePoints.length) {
      throw new Error('Invalid commute point index');
    }
    
    commutePoints[index] = point;
    await this.updateConfig({ commutePoints });
    return commutePoints;
  }
  
  async deleteCommutePoint(index: number): Promise<CommutePoint[]> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('No active config');
    
    const commutePoints = (config.commutePoints || []).filter((_, i) => i !== index);
    await this.updateConfig({ commutePoints });
    return commutePoints;
  }
  
  getSafeEnvInfo() {
    const env = getConfig();
    return {
      browserMode: env.BROWSER_MODE,
      proxyEnabled: isProxyEnabled(),
      scrapeDelayMs: env.SCRAPE_DELAY_MS,
      maxPagesPerRun: env.MAX_PAGES_PER_RUN,
      logLevel: env.LOG_LEVEL
    };
  }
}

async function loadConfigFromFile(): Promise<{
  name: string;
  locations: Location[];
  filters: Filters;
  broadband: BroadbandSettings;
  scraping: ScrapingSettings;
} | null> {
  const configPath = join(process.cwd(), 'config.json');
  
  if (!existsSync(configPath)) {
    log.warn(`Config file not found at ${configPath}`);
    return null;
  }
  
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    return {
      name: 'Default Config',
      locations: raw.locations || [],
      filters: raw.filters || {},
      broadband: raw.broadband || { enabled: false },
      scraping: raw.scraping || { maxPagesPerLocation: 10, delayBetweenRequests: 3000, rotateProxyEveryNPages: 5 }
    };
  } catch (error) {
    log.error(`Failed to load config from file: ${error}`);
    return null;
  }
}

export async function initializeConfig(): Promise<void> {
  const db = await getDb();
  
  // Check if there's already an active config
  const existingConfig = await db
    .select()
    .from(schema.searchConfigs)
    .where(eq(schema.searchConfigs.isActive, true))
    .limit(1);
  
  if (existingConfig.length > 0) {
    log.info('Active config already exists in database, skipping initialization');
    return;
  }
  
  // Try to load config from config.json
  const fileConfig = await loadConfigFromFile();
  
  if (fileConfig) {
    await db.insert(schema.searchConfigs).values({
      name: fileConfig.name,
      locations: fileConfig.locations,
      filters: fileConfig.filters,
      broadband: fileConfig.broadband,
      scraping: fileConfig.scraping,
      isActive: true
    });
    log.info(`Initialized config from config.json with ${fileConfig.locations.length} locations`);
  } else {
    // Create a default config with no locations
    await db.insert(schema.searchConfigs).values({
      name: 'Default Config',
      locations: [],
      filters: {},
      broadband: { enabled: false },
      scraping: { maxPagesPerLocation: 10, delayBetweenRequests: 3000, rotateProxyEveryNPages: 5 },
      isActive: true
    });
    log.warn('No config file found, created empty default config. Please add locations via the UI or config.json');
  }
}
