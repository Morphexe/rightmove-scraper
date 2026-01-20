import type { Page } from 'playwright';
import { log } from '../utils/logger.js';
import { dismissCookiePopup } from './parser.js';

export interface SearchCriteria {
  locationIdentifier: string;
  radius?: number;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  propertyTypes?: string[];
  sortType?: 'mostRecent' | 'highestPrice' | 'lowestPrice';
  maxDaysSinceAdded?: number;
}

const PROPERTY_TYPE_MAP: Record<string, string> = {
  detached: 'detached',
  semiDetached: 'semi-detached',
  terraced: 'terraced',
  flat: 'flat',
  bungalow: 'bungalow',
};

const SORT_TYPE_MAP: Record<string, string> = {
  mostRecent: '6',
  highestPrice: '2',
  lowestPrice: '1',
};

export function buildSearchUrl(criteria: SearchCriteria, page: number = 0): string {
  const baseUrl = 'https://www.rightmove.co.uk/property-for-sale/find.html';
  const params = new URLSearchParams();

  params.set('searchType', 'SALE');
  params.set('locationIdentifier', criteria.locationIdentifier);
  params.set('radius', (criteria.radius ?? 0).toString());
  params.set('sortType', SORT_TYPE_MAP[criteria.sortType || 'mostRecent'] || '6');
  params.set('_includeSSTC', 'on');

  if (criteria.minPrice !== undefined) {
    params.set('minPrice', criteria.minPrice.toString());
  }

  if (criteria.maxPrice !== undefined) {
    params.set('maxPrice', criteria.maxPrice.toString());
  }

  if (criteria.minBedrooms !== undefined) {
    params.set('minBedrooms', criteria.minBedrooms.toString());
  }

  if (criteria.maxBedrooms !== undefined) {
    params.set('maxBedrooms', criteria.maxBedrooms.toString());
  }

  if (criteria.propertyTypes && criteria.propertyTypes.length > 0) {
    const types = criteria.propertyTypes
      .map(t => PROPERTY_TYPE_MAP[t] || t)
      .join(',');
    params.set('propertyTypes', types);
  }

  if (criteria.maxDaysSinceAdded !== undefined) {
    params.set('maxDaysSinceAdded', criteria.maxDaysSinceAdded.toString());
  }

  if (page > 0) {
    params.set('index', (page * 24).toString());
  }

  return `${baseUrl}?${params.toString()}`;
}

export function extractLocationIdentifier(postcodeOrArea: string): string {
  const cleaned = postcodeOrArea.toUpperCase().replace(/\s+/g, '');
  
  if (/^[A-Z]{1,2}[0-9][0-9A-Z]?$/.test(cleaned)) {
    return `OUTCODE^${cleaned}`;
  }
  
  if (/^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/.test(postcodeOrArea.toUpperCase())) {
    return `POSTCODE^${cleaned.replace(/\s/g, '')}`;
  }
  
  return `REGION^${cleaned}`;
}

export async function resolveLocationIdentifier(page: Page, searchText: string): Promise<string | null> {
  try {
    await page.goto('https://www.rightmove.co.uk/', { waitUntil: 'networkidle', timeout: 30000 });
    await dismissCookiePopup(page);
    
    await page.click('button:has-text("Buy")');
    await page.waitForTimeout(500);
    
    const input = page.locator('input[name="locationSearch"]').first();
    await input.fill(searchText);
    await page.waitForTimeout(1000);
    
    const searchBtn = page.locator('button:has-text("Search")').first();
    await searchBtn.click();
    
    await page.waitForURL(/property-for-sale/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    const match = currentUrl.match(/locationIdentifier=([^&]+)/);
    
    if (match) {
      const identifier = decodeURIComponent(match[1]);
      log.debug(`Resolved "${searchText}" to: ${identifier}`);
      return identifier;
    }
    
    const pageModel = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || '';
        if (content.includes('window.jsonModel')) {
          const jsonMatch = content.match(/window\.jsonModel\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|$|<)/);
          if (jsonMatch) {
            try {
              return JSON.parse(jsonMatch[1].replace(/;\s*$/, ''));
            } catch {}
          }
        }
      }
      return null;
    }) as { searchParameters?: { locationIdentifier?: string } } | null;
    
    if (pageModel?.searchParameters?.locationIdentifier) {
      log.debug(`Resolved "${searchText}" via JSON model to: ${pageModel.searchParameters.locationIdentifier}`);
      return pageModel.searchParameters.locationIdentifier;
    }
    
    log.warn(`Could not resolve location identifier for: ${searchText}`);
    return null;
  } catch (error) {
    log.error(`Failed to resolve location "${searchText}": ${error}`);
    return null;
  }
}
