import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const envSchema = z.object({
  DATABASE_URL: z.string().url().default('mysql://root:password@localhost:3306/rightmove'),
  
  NORDVPN_USERNAME: z.string().optional(),
  NORDVPN_PASSWORD: z.string().optional(),
  
  BROWSER_MODE: z.enum(['headless', 'headed']).default('headless'),
  
  SCRAPE_DELAY_MS: z.coerce.number().positive().default(3000),
  MAX_PAGES_PER_RUN: z.coerce.number().positive().default(10),
  DEFAULT_LOOKBACK_DAYS: z.coerce.number().positive().default(2),
  
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export const searchConfigSchema = z.object({
  locations: z.array(z.object({
    name: z.string(),
    postcode: z.string(),
    radius: z.number().min(0).max(40).default(5),
  })),
  
  filters: z.object({
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    minBedrooms: z.number().optional(),
    maxBedrooms: z.number().optional(),
    propertyTypes: z.array(z.string()).optional(),
    maxDaysSinceAdded: z.number().min(1).max(14).default(1),
  }).default({}),
  
  broadband: z.object({
    enabled: z.boolean().default(true),
    minDownloadSpeed: z.number().default(500),
    minUploadSpeed: z.number().optional(),
  }).default({}),
  
  scraping: z.object({
    maxPagesPerLocation: z.number().default(10),
    delayBetweenRequests: z.number().default(3000),
    rotateProxyEveryNPages: z.number().default(3),
  }).default({}),
});

export type Config = z.infer<typeof envSchema>;
export type SearchConfig = z.infer<typeof searchConfigSchema>;

let config: Config | null = null;
let searchConfig: SearchConfig | null = null;
let headedOverride: boolean | null = null;

export function setHeadedMode(headed: boolean): void {
  headedOverride = headed;
}

export function getConfig(): Config {
  if (!config) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error('Invalid environment configuration:');
      console.error(parsed.error.format());
      throw new Error('Invalid environment configuration');
    }
    config = parsed.data;
  }
  return config;
}

export function getSearchConfig(configPath?: string): SearchConfig {
  if (!searchConfig) {
    const path = configPath || join(process.cwd(), 'config.json');
    
    if (!existsSync(path)) {
      throw new Error(`Config file not found: ${path}. Copy config.sample.json to config.json`);
    }
    
    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    const parsed = searchConfigSchema.safeParse(raw);
    
    if (!parsed.success) {
      console.error('Invalid search configuration:');
      console.error(parsed.error.format());
      throw new Error('Invalid search configuration');
    }
    
    searchConfig = parsed.data;
  }
  return searchConfig;
}

export function isHeadless(): boolean {
  if (headedOverride !== null) {
    return !headedOverride;
  }
  return getConfig().BROWSER_MODE === 'headless';
}

export function isProxyEnabled(): boolean {
  const cfg = getConfig();
  return !!(cfg.NORDVPN_USERNAME && cfg.NORDVPN_PASSWORD);
}
