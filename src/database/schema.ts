import { 
  mysqlTable, 
  varchar, 
  int, 
  text, 
  decimal, 
  datetime, 
  boolean,
  json,
  index,
  uniqueIndex
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const properties = mysqlTable('properties', {
  id: int('id').primaryKey().autoincrement(),
  
  rightmoveId: varchar('rightmove_id', { length: 50 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  
  title: varchar('title', { length: 500 }),
  propertyType: varchar('property_type', { length: 100 }),
  propertySubType: varchar('property_sub_type', { length: 100 }),
  address: varchar('address', { length: 500 }),
  postcode: varchar('postcode', { length: 20 }),
  
  price: int('price'),
  priceQualifier: varchar('price_qualifier', { length: 50 }),
  
  bedrooms: int('bedrooms'),
  bathrooms: int('bathrooms'),
  sizeSqFt: int('size_sq_ft'),
  description: text('description'),
  
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  
  agentName: varchar('agent_name', { length: 200 }),
  agentPhone: varchar('agent_phone', { length: 50 }),
  agentAddress: varchar('agent_address', { length: 300 }),
  
  images: text('images'),
  floorplans: text('floorplans'),
  epcUrl: varchar('epc_url', { length: 500 }),
  
  keyFeatures: text('key_features'),
  hasParking: boolean('has_parking'),
  hasGarden: boolean('has_garden'),
  
  tenure: varchar('tenure', { length: 50 }),
  councilTaxBand: varchar('council_tax_band', { length: 10 }),
  annualServiceCharge: int('annual_service_charge'),
  annualGroundRent: int('annual_ground_rent'),
  
  nearestStations: text('nearest_stations'),
  
  broadbandDownload: int('broadband_download'),
  broadbandUpload: int('broadband_upload'),
  broadbandProvider: varchar('broadband_provider', { length: 100 }),
  
  listedDate: datetime('listed_date'),
  firstScrapedAt: datetime('first_scraped_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastScrapedAt: datetime('last_scraped_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  detailScrapedAt: datetime('detail_scraped_at'),
  isActive: boolean('is_active').default(true).notNull(),
  
  isMarked: boolean('is_marked').default(false).notNull(),
  userNotes: text('user_notes'),
  userRating: int('user_rating'),
  userStatus: varchar('user_status', { length: 50 }),
  viewedAt: datetime('viewed_at'),
}, (table) => ({
  rightmoveIdIdx: uniqueIndex('rightmove_id_idx').on(table.rightmoveId),
  postcodeIdx: index('postcode_idx').on(table.postcode),
  priceIdx: index('price_idx').on(table.price),
  bedroomsIdx: index('bedrooms_idx').on(table.bedrooms),
  listedDateIdx: index('listed_date_idx').on(table.listedDate),
  broadbandIdx: index('broadband_idx').on(table.broadbandDownload),
}));

export const scrapeRuns = mysqlTable('scrape_runs', {
  id: int('id').primaryKey().autoincrement(),
  
  searchLocation: varchar('search_location', { length: 200 }).notNull(),
  searchRadius: varchar('search_radius', { length: 50 }),
  searchCriteria: text('search_criteria'),
  
  startedAt: datetime('started_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: datetime('completed_at'),
  status: varchar('status', { length: 50 }).default('running').notNull(),
  
  pagesScraped: int('pages_scraped').default(0).notNull(),
  propertiesFound: int('properties_found').default(0).notNull(),
  newProperties: int('new_properties').default(0).notNull(),
  updatedProperties: int('updated_properties').default(0).notNull(),
  
  lastPageUrl: varchar('last_page_url', { length: 500 }),
  lastPageNumber: int('last_page_number'),
  
  errorMessage: text('error_message'),
}, (table) => ({
  locationIdx: index('location_idx').on(table.searchLocation),
  startedAtIdx: index('started_at_idx').on(table.startedAt),
  statusIdx: index('status_idx').on(table.status),
}));

export const searchConfigs = mysqlTable('search_configs', {
  id: int('id').primaryKey().autoincrement(),
  
  name: varchar('name', { length: 100 }).notNull(),
  locations: json('locations').notNull().$type<Array<{ name: string; postcode: string; radius: number }>>(),
  filters: json('filters').notNull().$type<{
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    maxBedrooms?: number;
    propertyTypes?: string[];
    maxDaysSinceAdded?: number;
  }>(),
  broadband: json('broadband').notNull().$type<{
    enabled: boolean;
    minDownloadSpeed?: number;
    minUploadSpeed?: number;
  }>(),
  scraping: json('scraping').notNull().$type<{
    maxPagesPerLocation: number;
    delayBetweenRequests: number;
    rotateProxyEveryNPages: number;
  }>(),
  
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  isActiveIdx: index('is_active_idx').on(table.isActive),
}));

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
export type ScrapeRun = typeof scrapeRuns.$inferSelect;
export type NewScrapeRun = typeof scrapeRuns.$inferInsert;
export type SearchConfig = typeof searchConfigs.$inferSelect;
export type NewSearchConfig = typeof searchConfigs.$inferInsert;
