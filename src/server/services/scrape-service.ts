import { BrowserManager, buildSearchUrl, resolveLocationIdentifier, parseSearchResults, parsePropertyDetail, toNewProperty, dismissCookiePopup, type SearchCriteria, type RawPropertyData } from '../scraper/index.js';
import { DeduplicationService } from './deduplication.js';
import { ScrapeTracker } from './scrape-tracker.js';
import { PropertyService } from './property-service.js';
import { fetchBroadbandFromUrl } from './broadband/index.js';
import { ConfigService, type FullSearchConfig } from './config-service.js';
import { isProxyEnabled } from '../config/index.js';
import { ProxyManager } from '../proxy/index.js';
import { broadcastProgress, updateScrapeState, resetScrapeState, scrapeState } from '../websocket/scrape-progress.js';
import { log } from '../utils/logger.js';
import { getDb, schema } from '../database/index.js';
import { desc, eq } from 'drizzle-orm';

interface ScrapeOptions {
  locations?: string[];
  skipDetails?: boolean;
  noBroadband?: boolean;
}

export class ScrapeService {
  private abortController: AbortController | null = null;
  private configService = new ConfigService();
  
  async startScrape(options: ScrapeOptions = {}) {
    if (scrapeState.isRunning) {
      throw new Error('Scrape already in progress');
    }
    
    this.abortController = new AbortController();
    resetScrapeState();
    updateScrapeState({ isRunning: true });
    
    this.runScrape(options, this.abortController.signal)
      .catch(err => {
        log.error('Scrape failed:', err);
        broadcastProgress({ type: 'error', data: { message: String(err) } });
      })
      .finally(() => {
        updateScrapeState({ isRunning: false });
        broadcastProgress({ type: 'complete' });
      });
    
    return { status: 'started' };
  }
  
  async stopScrape() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    return { success: true };
  }
  
  getStatus() {
    return {
      isRunning: scrapeState.isRunning,
      currentLocation: scrapeState.currentLocation,
      progress: scrapeState.progress
    };
  }
  
  private async runScrape(options: ScrapeOptions, signal: AbortSignal) {
    const config = await this.configService.getActiveConfig();
    if (!config) {
      throw new Error('No active configuration found');
    }
    
    let proxyManager: ProxyManager | undefined;
    if (isProxyEnabled()) {
      proxyManager = new ProxyManager('GB');
      log.info('Proxy enabled - using NordVPN SOCKS5');
    }
    
    const browserManager = new BrowserManager(proxyManager);
    const deduplicationService = new DeduplicationService();
    const scrapeTracker = new ScrapeTracker();
    const propertyService = new PropertyService();
    
    const minBroadband = config.broadband.enabled && !options.noBroadband
      ? config.broadband.minDownloadSpeed
      : undefined;
    
    const locationsToScrape = options.locations && options.locations.length > 0
      ? config.locations.filter(loc => options.locations!.includes(loc.name))
      : config.locations;
    
    try {
      await browserManager.launch();
      const resolvePage = await browserManager.newPage();
      await dismissCookiePopup(resolvePage);
      
      // Scrape all locations in parallel
      const scrapePromises = locationsToScrape.map(location => 
        this.scrapeLocation({
          location,
          config,
          browserManager,
          deduplicationService,
          scrapeTracker,
          propertyService,
          minBroadband,
          resolvePage,
          signal
        })
      );
      
      const results = await Promise.allSettled(scrapePromises);
      
      // Log results
      results.forEach((result, index) => {
        const location = locationsToScrape[index];
        if (result.status === 'fulfilled') {
          log.info(`Location ${location.name} completed`, result.value);
        } else {
          log.error(`Location ${location.name} failed: ${result.reason}`);
        }
      });
      
      const successfulLocations = results.filter(r => r.status === 'fulfilled').length;
      log.info(`\n=== All locations scraped: ${successfulLocations}/${locationsToScrape.length} successful ===`);
      
    } finally {
      await browserManager.close();
    }
  }
  
  private async scrapeLocation(params: {
    location: Location;
    config: FullSearchConfig;
    browserManager: BrowserManager;
    deduplicationService: DeduplicationService;
    scrapeTracker: ScrapeTracker;
    propertyService: PropertyService;
    minBroadband?: number;
    resolvePage: Awaited<ReturnType<BrowserManager['newPage']>>;
    signal: AbortSignal;
  }): Promise<{
    pagesScraped: number;
    propertiesFound: number;
    newProperties: number;
    updatedProperties: number;
  }> {
    const { location, config, browserManager, deduplicationService, scrapeTracker, propertyService, minBroadband, resolvePage, signal } = params;
    
    if (signal.aborted) {
      return { pagesScraped: 0, propertiesFound: 0, newProperties: 0, updatedProperties: 0 };
    }
    
    updateScrapeState({ currentLocation: location.name });
    log.info(`\n=== Scraping location: ${location.name} (${location.postcode}) ===`);
    
    const locationIdentifier = await resolveLocationIdentifier(resolvePage, location.postcode);
    if (!locationIdentifier) {
      log.warn(`Could not resolve location: ${location.postcode}, skipping`);
      return { pagesScraped: 0, propertiesFound: 0, newProperties: 0, updatedProperties: 0 };
    }
    
    const criteria: SearchCriteria = {
      locationIdentifier,
      radius: location.radius,
      minPrice: config.filters.minPrice,
      maxPrice: config.filters.maxPrice,
      minBedrooms: config.filters.minBedrooms,
      maxBedrooms: config.filters.maxBedrooms,
      propertyTypes: config.filters.propertyTypes,
      maxDaysSinceAdded: config.filters.maxDaysSinceAdded,
      sortType: 'mostRecent',
    };
    
    const runId = await scrapeTracker.startRun({
      searchLocation: location.postcode,
      searchRadius: String(location.radius),
      searchCriteria: JSON.stringify(criteria),
    });
    
    let stats = {
      pagesScraped: 0,
      propertiesFound: 0,
      newProperties: 0,
      updatedProperties: 0,
    };
    
    const maxPages = config.scraping.maxPagesPerLocation;
    const searchPage = await browserManager.newPage();
    const detailPage = config.broadband.enabled && !params.signal.aborted ? await browserManager.newPage() : null;
    
    try {
      for (let pageNum = 0; pageNum < maxPages; pageNum++) {
        if (signal.aborted) break;
        
        const url = buildSearchUrl(criteria, pageNum);
        log.info(`Scraping page ${pageNum + 1}/${maxPages}`);
        
        updateScrapeState({
          progress: {
            ...scrapeState.progress,
            currentPage: pageNum + 1,
            totalPages: maxPages
          }
        });
        
        await searchPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await searchPage.waitForSelector('[data-test="propertyCard"], .propertyCard, [class*="propertyCard"]', { timeout: 15000 }).catch(() => {});
        await searchPage.waitForTimeout(config.scraping.delayBetweenRequests);
        
        const rawProperties = await parseSearchResults(searchPage);
        log.info(`Found ${rawProperties.length} properties on page`);
        
        if (rawProperties.length === 0) {
          log.info('No more properties found, moving to next location');
          break;
        }
        
        const uniqueRawProperties = rawProperties.filter((p, i, arr) => 
          arr.findIndex(x => x.id === p.id) === i
        );
        
        stats.propertiesFound += uniqueRawProperties.length;
        updateScrapeState({
          progress: { ...scrapeState.progress, propertiesFound: stats.propertiesFound }
        });
        
        const existingIds = await deduplicationService.getExistingIds(uniqueRawProperties.map(p => p.id));
        const { newProperties: filteredProperties } = deduplicationService.filterNewProperties(uniqueRawProperties, existingIds);
        
        const propertiesToSave: RawPropertyData[] = [];
        
        for (const prop of filteredProperties) {
          if (signal.aborted) break;
          
          if (detailPage) {
            const detailed = await this.scrapePropertyDetails(
              detailPage,
              prop,
              config.scraping.delayBetweenRequests,
              minBroadband
            );
            if (detailed) {
              propertiesToSave.push(detailed);
            }
          } else {
            propertiesToSave.push(prop);
          }
        }
        
        if (propertiesToSave.length > 0) {
          const newPropertyEntities = propertiesToSave.map(p => ({
            ...toNewProperty(p),
            searchZone: location.name
          }));
          const { inserted, skipped } = await propertyService.bulkInsert(newPropertyEntities);
          
          stats.newProperties += inserted;
          stats.updatedProperties += skipped;
          
          updateScrapeState({
            progress: { ...scrapeState.progress, newProperties: stats.newProperties }
          });
        }
        
        stats.pagesScraped++;
        updateScrapeState({
          progress: { ...scrapeState.progress, pagesScraped: stats.pagesScraped }
        });
        
        await scrapeTracker.updateProgress(runId, {
          pagesScraped: stats.pagesScraped,
          lastPageNumber: pageNum,
          lastPageUrl: url,
        });
      }
      
      await scrapeTracker.completeRun(runId, stats);
      log.info(`Location ${location.name} completed`, stats);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await scrapeTracker.failRun(runId, errorMessage);
      log.error(`Location ${location.name} failed: ${errorMessage}`);
      throw error; // Re-throw to mark as failed in Promise.allSettled
    } finally {
      await searchPage.close();
      if (detailPage) await detailPage.close();
    }
    
    return stats;
  }
  
  private async scrapePropertyDetails(
    page: Awaited<ReturnType<BrowserManager['newPage']>>,
    property: RawPropertyData,
    delayMs: number,
    minBroadband?: number,
  ): Promise<RawPropertyData | null> {
    const url = property.url.includes('#') ? property.url : `${property.url}#/?channel=RES_BUY`;
    
    try {
      log.info(`  → Fetching details for: ${property.id}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('script', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(delayMs);
      
      const details = await parsePropertyDetail(page);
      
      const merged: RawPropertyData = {
        ...property,
        ...details,
        id: property.id,
        url: property.url,
      };
      
      if (details.broadbandCheckerUrl) {
        log.debug(`    Fetching broadband data...`);
        const broadband = await fetchBroadbandFromUrl(details.broadbandCheckerUrl);
        if (broadband) {
          merged.broadbandDownload = broadband.downloadSpeed;
          merged.broadbandUpload = broadband.uploadSpeed;
          merged.broadbandProvider = broadband.provider;
          log.info(`    Broadband: ${broadband.downloadSpeed}Mbps down, ${broadband.uploadSpeed}Mbps up`);
          
          if (minBroadband && broadband.downloadSpeed < minBroadband) {
            log.info(`    ✗ Skipped: broadband ${broadband.downloadSpeed}Mbps < ${minBroadband}Mbps min`);
            return null;
          }
        }
      }
      
      return merged;
    } catch (error) {
      log.warn(`  ✗ Failed to fetch details for ${property.id}: ${error}`);
      return property;
    }
  }
  
  async getHistory(query: { page?: number; limit?: number }) {
    const db = await getDb();
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    
    const [runs, countResult] = await Promise.all([
      db
        .select()
        .from(schema.scrapeRuns)
        .orderBy(desc(schema.scrapeRuns.startedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: schema.scrapeRuns.id })
        .from(schema.scrapeRuns)
    ]);
    
    return {
      data: runs,
      pagination: {
        page,
        limit,
        total: countResult.length,
        totalPages: Math.ceil(countResult.length / limit)
      }
    };
  }
  
  async getRunById(id: number) {
    const db = await getDb();
    const result = await db
      .select()
      .from(schema.scrapeRuns)
      .where(eq(schema.scrapeRuns.id, id))
      .limit(1);
    
    return result[0] || null;
  }
}
