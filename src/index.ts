import { Command } from 'commander';
import { getConfig, getSearchConfig, isProxyEnabled, setHeadedMode } from './config/index.js';
import { ProxyManager } from './proxy/index.js';
import { BrowserManager, buildSearchUrl, resolveLocationIdentifier, parseSearchResults, parsePropertyDetail, toNewProperty, dismissCookiePopup, type SearchCriteria, type RawPropertyData } from './scraper/index.js';
import { DeduplicationService, ScrapeTracker, PropertyService, BroadbandChecker, fetchBroadbandFromUrl } from './services/index.js';
import { closeDb } from './database/index.js';
import { log } from './utils/logger.js';

interface ScrapeOptions {
  config?: string;
  headed?: boolean;
  location?: string;
  noBroadband?: boolean;
  skipDetails?: boolean;
}

async function scrapePropertyDetails(
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
        log.info(`    Broadband: ${broadband.downloadSpeed}Mbps down, ${broadband.uploadSpeed}Mbps up (${broadband.provider || 'unknown'})`);
        
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

async function scrape(options: ScrapeOptions): Promise<void> {
  if (options.headed) {
    setHeadedMode(true);
  }
  
  const searchConfig = getSearchConfig(options.config);

  let proxyManager: ProxyManager | undefined;
  if (isProxyEnabled()) {
    proxyManager = new ProxyManager('GB');
    log.info('Proxy enabled - using NordVPN SOCKS5');
  } else {
    log.info('Proxy disabled - running without VPN (configure NORDVPN_USERNAME/PASSWORD to enable)');
  }

  const browserManager = new BrowserManager(proxyManager);
  const deduplicationService = new DeduplicationService();
  const scrapeTracker = new ScrapeTracker();
  const propertyService = new PropertyService();
  
  const minBroadband = searchConfig.broadband.enabled && !options.noBroadband
    ? searchConfig.broadband.minDownloadSpeed
    : undefined;

  if (minBroadband) {
    log.info(`Broadband filter enabled: min ${minBroadband}Mbps download`);
  }

  const locationsToScrape = options.location
    ? [{ name: options.location, postcode: options.location, radius: 5 }]
    : searchConfig.locations;

  try {
    await browserManager.launch();

    const resolvePage = await browserManager.newPage();
    await dismissCookiePopup(resolvePage);

    // Scrape all locations in parallel
    const scrapePromises = locationsToScrape.map(location => 
      scrapeLocation({
        location,
        searchConfig,
        browserManager,
        deduplicationService,
        scrapeTracker,
        propertyService,
        minBroadband,
        resolvePage
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
    await closeDb();
  }
}

interface LocationScrapeParams {
  location: { name: string; postcode: string; radius: number };
  searchConfig: ReturnType<typeof getSearchConfig>;
  browserManager: BrowserManager;
  deduplicationService: DeduplicationService;
  scrapeTracker: ScrapeTracker;
  propertyService: PropertyService;
  minBroadband?: number;
  resolvePage: Awaited<ReturnType<BrowserManager['newPage']>>;
}

async function scrapeLocation(params: LocationScrapeParams): Promise<{
  pagesScraped: number;
  propertiesFound: number;
  newProperties: number;
  updatedProperties: number;
}> {
  const { location, searchConfig, browserManager, deduplicationService, scrapeTracker, propertyService, minBroadband, resolvePage } = params;
  
  log.info(`\n=== Scraping location: ${location.name} (${location.postcode}) ===`);
  
  log.info(`Resolving location identifier for: ${location.postcode}`);
  const locationIdentifier = await resolveLocationIdentifier(resolvePage, location.postcode);
  
  if (!locationIdentifier) {
    log.warn(`Could not resolve location: ${location.postcode}, skipping`);
    return { pagesScraped: 0, propertiesFound: 0, newProperties: 0, updatedProperties: 0 };
  }
  log.info(`Resolved to: ${locationIdentifier}`);
  
  const criteria: SearchCriteria = {
    locationIdentifier,
    radius: location.radius,
    minPrice: searchConfig.filters.minPrice,
    maxPrice: searchConfig.filters.maxPrice,
    minBedrooms: searchConfig.filters.minBedrooms,
    maxBedrooms: searchConfig.filters.maxBedrooms,
    propertyTypes: searchConfig.filters.propertyTypes,
    maxDaysSinceAdded: searchConfig.filters.maxDaysSinceAdded,
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

  const maxPages = searchConfig.scraping.maxPagesPerLocation;
  const searchPage = await browserManager.newPage();
  const detailPage = await browserManager.newPage();

  try {
    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const url = buildSearchUrl(criteria, pageNum);
      log.info(`Scraping page ${pageNum + 1}/${maxPages}: ${url}`);

      await searchPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await searchPage.waitForSelector('[data-test="propertyCard"], .propertyCard, [class*="propertyCard"]', { timeout: 15000 }).catch(() => {});
      await searchPage.waitForTimeout(searchConfig.scraping.delayBetweenRequests);

      const rawProperties = await parseSearchResults(searchPage);
      log.info(`Found ${rawProperties.length} raw properties on page`);
      
      if (rawProperties.length === 0) {
        log.info('No more properties found, moving to next location');
        break;
      }

      const uniqueRawProperties = rawProperties.filter((p, i, arr) => 
        arr.findIndex(x => x.id === p.id) === i
      );
      
      stats.propertiesFound += uniqueRawProperties.length;

      const existingIds = await deduplicationService.getExistingIds(uniqueRawProperties.map(p => p.id));
      const { newProperties: filteredProperties } = deduplicationService.filterNewProperties(uniqueRawProperties, existingIds);

      log.info(`${filteredProperties.length} new properties to process (${existingIds.size} already in DB)`);

      const propertiesToSave: RawPropertyData[] = [];

      for (const prop of filteredProperties) {
        const detailed = await scrapePropertyDetails(
          detailPage,
          prop,
          searchConfig.scraping.delayBetweenRequests,
          minBroadband,
        );
        if (detailed) {
          propertiesToSave.push(detailed);
        }
      }

      if (propertiesToSave.length > 0) {
        const newPropertyEntities = propertiesToSave.map(toNewProperty);
        const { inserted, skipped } = await propertyService.bulkInsert(newPropertyEntities);

        stats.newProperties += inserted;
        stats.updatedProperties += skipped;
        log.info(`Saved ${inserted} new, ${skipped} skipped`);
      }

      stats.pagesScraped++;

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
    throw error;
  } finally {
    await searchPage.close();
    await detailPage.close();
  }
  
  return stats;
}

async function checkBroadband(postcode: string): Promise<void> {
  const searchConfig = getSearchConfig();
  const checker = new BroadbandChecker(
    searchConfig.broadband.minDownloadSpeed,
    searchConfig.broadband.minUploadSpeed
  );

  log.info(`Checking broadband speed for: ${postcode}`);
  const speed = await checker.checkSpeed(postcode);

  console.log('\nBroadband Speed Results:');
  console.log(`  Postcode: ${speed.postcode}`);
  console.log(`  Download: ${speed.downloadSpeed} Mbps`);
  console.log(`  Upload: ${speed.uploadSpeed} Mbps`);
  console.log(`  Technology: ${speed.technology || 'unknown'}`);
  console.log(`  Meets requirements: ${checker.meetsRequirements(speed) ? 'YES' : 'NO'}`);
}

async function scrapeOne(propertyId: string, options: { headed?: boolean }): Promise<void> {
  if (options.headed) {
    setHeadedMode(true);
  }

  const browserManager = new BrowserManager();
  
  try {
    await browserManager.launch();
    const page = await browserManager.newPage();
    
    const url = `https://www.rightmove.co.uk/properties/${propertyId}#/?channel=RES_BUY`;
    log.info(`Fetching: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await dismissCookiePopup(page);
    
    const details = await parsePropertyDetail(page);
    
    if (details.broadbandCheckerUrl) {
      log.info('Fetching broadband data...');
      const broadband = await fetchBroadbandFromUrl(details.broadbandCheckerUrl);
      if (broadband) {
        details.broadbandDownload = broadband.downloadSpeed;
        details.broadbandUpload = broadband.uploadSpeed;
        details.broadbandProvider = broadband.provider;
      }
    }
    
    console.log('\n=== Property Details ===');
    console.log(JSON.stringify(details, null, 2));
    
  } finally {
    await browserManager.close();
  }
}

const program = new Command();

program
  .name('rightmove-scraper')
  .description('Personal property research tool for RightMove')
  .version('1.0.0');

program
  .command('scrape')
  .description('Scrape properties from RightMove using config.json')
  .option('-c, --config <path>', 'Path to config.json file')
  .option('-l, --location <postcode>', 'Override: scrape single location only')
  .option('--headed', 'Run in headed mode (visible browser)')
  .option('--no-broadband', 'Skip broadband speed filtering')
  .option('--skip-details', 'Skip visiting individual property pages (faster, less data)')
  .action(scrape);

program
  .command('check-broadband <postcode>')
  .description('Check broadband speed for a postcode')
  .action(checkBroadband);

program
  .command('scrape-one <propertyId>')
  .description('Scrape a single property by ID (for testing)')
  .option('--headed', 'Run in headed mode (visible browser)')
  .action(scrapeOne);

program.parse();
