import type { Page } from 'playwright';
import type { NewProperty } from '../database/schema.js';
import { log } from '../utils/logger.js';

export async function dismissCookiePopup(page: Page): Promise<void> {
  try {
    const rejectButton = page.locator('button:has-text("Reject all")');
    if (await rejectButton.isVisible({ timeout: 3000 })) {
      await rejectButton.click();
      log.debug('Dismissed cookie popup');
      await page.waitForTimeout(1000);
    }
  } catch {
    log.debug('No cookie popup found or already dismissed');
  }
}

export interface RawPropertyData {
  id: string;
  url: string;
  title?: string;
  propertyType?: string;
  propertySubType?: string;
  address?: string;
  postcode?: string;
  price?: number;
  priceQualifier?: string;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqFt?: number;
  description?: string;
  latitude?: number;
  longitude?: number;
  agentName?: string;
  agentPhone?: string;
  agentAddress?: string;
  images?: string[];
  floorplans?: string[];
  epcUrl?: string;
  keyFeatures?: string[];
  hasParking?: boolean;
  hasGarden?: boolean;
  tenure?: string;
  councilTaxBand?: string;
  annualServiceCharge?: number;
  annualGroundRent?: number;
  nearestStations?: Array<{ name: string; distance: number; types: string[] }>;
  broadbandDownload?: number;
  broadbandUpload?: number;
  broadbandProvider?: string;
  broadbandCheckerUrl?: string;
  listedDate?: Date;
}

interface PageModelProperty {
  id?: string;
  text?: {
    description?: string;
    propertyPhrase?: string;
  };
  prices?: {
    primaryPrice?: string;
    displayPriceQualifier?: string;
  };
  address?: {
    displayAddress?: string;
    outcode?: string;
    incode?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  bedrooms?: number;
  bathrooms?: number;
  sizings?: Array<{ minimumSize?: number; unit?: string }>;
  propertySubType?: string;
  tenure?: {
    tenureType?: string;
  };
  keyFeatures?: string[];
  features?: {
    parking?: Array<{ displayText?: string }>;
    garden?: Array<{ displayText?: string }>;
  };
  images?: Array<{ url?: string }>;
  floorplans?: Array<{ url?: string }>;
  epcGraphs?: Array<{ url?: string }>;
  customer?: {
    branchDisplayName?: string;
    displayAddress?: string;
  };
  contactInfo?: {
    telephoneNumbers?: {
      localNumber?: string;
    };
  };
  livingCosts?: {
    councilTaxBand?: string;
    annualServiceCharge?: number;
    annualGroundRent?: number;
  };
  nearestStations?: Array<{
    name?: string;
    distance?: number;
    unit?: string;
    types?: string[];
  }>;
  broadband?: {
    broadbandCheckerUrl?: string;
  };
  listingHistory?: {
    listingUpdateReason?: string;
  };
}

export async function parseSearchResults(page: Page): Promise<RawPropertyData[]> {
  await dismissCookiePopup(page);

  const properties = await page.evaluate(() => {
    const results: Array<{
      id: string;
      url: string;
      title?: string;
      address?: string;
      price?: number;
      bedrooms?: number;
      bathrooms?: number;
      agentName?: string;
      latitude?: number;
      longitude?: number;
    }> = [];

    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent || '';
      if (content.includes('window.jsonModel')) {
        const match = content.match(/window\.jsonModel\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|$|<)/);
        if (match) {
          try {
            const jsonStr = match[1].replace(/;\s*$/, '');
            const data = JSON.parse(jsonStr);
            
            if (data?.properties) {
              for (const prop of data.properties) {
                results.push({
                  id: String(prop.id),
                  url: `https://www.rightmove.co.uk${prop.propertyUrl || `/properties/${prop.id}`}`,
                  title: prop.propertyTypeFullDescription || prop.displayAddress,
                  address: prop.displayAddress,
                  price: prop.price?.amount,
                  bedrooms: prop.bedrooms,
                  bathrooms: prop.bathrooms,
                  latitude: prop.location?.latitude,
                  longitude: prop.location?.longitude,
                  agentName: prop.customer?.branchDisplayName || prop.customer?.brandTradingName,
                });
              }
            }
            break;
          } catch (e) {
            console.error('Failed to parse JSON model:', e);
          }
        }
      }
    }

    if (results.length === 0) {
      const cards = document.querySelectorAll('[data-test="propertyCard"], .propertyCard, [class*="propertyCard"]');
      
      cards.forEach((card) => {
        try {
          const link = card.querySelector('a[href*="/properties/"]') as HTMLAnchorElement;
          if (!link) return;
          
          const href = link.getAttribute('href') || '';
          const idMatch = href.match(/\/properties\/(\d+)/);
          if (!idMatch) return;
          
          const priceEl = card.querySelector('[class*="price"]');
          const priceText = priceEl?.textContent || '';
          const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || undefined;
          
          const addressEl = card.querySelector('[class*="address"], address');
          const address = addressEl?.textContent?.trim();
          
          const titleEl = card.querySelector('h2, [class*="title"]');
          const title = titleEl?.textContent?.trim();
          
          results.push({
            id: idMatch[1],
            url: href.startsWith('http') ? href : `https://www.rightmove.co.uk${href}`,
            title,
            address,
            price,
          });
        } catch {}
      });
    }

    return results;
  });

  log.debug(`Extracted ${properties.length} properties from page`);
  return properties;
}

export async function parsePropertyDetail(page: Page): Promise<Partial<RawPropertyData>> {
  await dismissCookiePopup(page);

  const data = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent || '';
      if (content.includes('window.PAGE_MODEL')) {
        const match = content.match(/window\.PAGE_MODEL\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<|$)/);
        if (match) {
          try {
            return JSON.parse(match[1].replace(/;\s*$/, ''));
          } catch {}
        }
      }
    }
    return null;
  }) as { propertyData?: PageModelProperty } | null;

  if (!data?.propertyData) {
    log.warn('Could not find PAGE_MODEL on property page');
    return {};
  }

  const p = data.propertyData;
  
  const priceText = p.prices?.primaryPrice || '';
  const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || undefined;

  const postcode = p.address?.outcode && p.address?.incode 
    ? `${p.address.outcode} ${p.address.incode}`
    : p.address?.outcode;

  const listedText = p.listingHistory?.listingUpdateReason || '';
  const dateMatch = listedText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const listedDate = dateMatch 
    ? new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`)
    : undefined;

  const sizings = p.sizings || [];
  const sizeSqFt = sizings.find(s => s.unit === 'sqft')?.minimumSize;

  const result: Partial<RawPropertyData> = {
    id: p.id,
    title: p.text?.propertyPhrase,
    propertySubType: p.propertySubType,
    address: p.address?.displayAddress,
    postcode,
    price,
    priceQualifier: p.prices?.displayPriceQualifier || undefined,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    sizeSqFt,
    description: p.text?.description?.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''),
    latitude: p.location?.latitude,
    longitude: p.location?.longitude,
    agentName: p.customer?.branchDisplayName,
    agentAddress: p.customer?.displayAddress?.replace(/\r\n/g, ', ').trim(),
    agentPhone: p.contactInfo?.telephoneNumbers?.localNumber,
    images: p.images?.map(i => i.url).filter((u): u is string => !!u),
    floorplans: p.floorplans?.map(f => f.url).filter((u): u is string => !!u),
    epcUrl: p.epcGraphs?.[0]?.url,
    keyFeatures: p.keyFeatures?.filter((f): f is string => !!f),
    hasParking: p.features?.parking?.some(f => f.displayText?.toLowerCase() === 'yes'),
    hasGarden: p.features?.garden?.some(f => f.displayText?.toLowerCase() === 'yes'),
    tenure: p.tenure?.tenureType,
    councilTaxBand: p.livingCosts?.councilTaxBand,
    annualServiceCharge: p.livingCosts?.annualServiceCharge || undefined,
    annualGroundRent: p.livingCosts?.annualGroundRent || undefined,
    nearestStations: p.nearestStations?.map(s => ({
      name: s.name || '',
      distance: s.distance || 0,
      types: s.types || [],
    })),
    broadbandCheckerUrl: p.broadband?.broadbandCheckerUrl,
    listedDate,
  };

  return result;
}

export function toNewProperty(raw: RawPropertyData): NewProperty {
  return {
    rightmoveId: raw.id,
    url: raw.url,
    title: raw.title,
    propertyType: raw.propertyType,
    propertySubType: raw.propertySubType,
    address: raw.address,
    postcode: raw.postcode,
    price: raw.price,
    priceQualifier: raw.priceQualifier,
    bedrooms: raw.bedrooms,
    bathrooms: raw.bathrooms,
    sizeSqFt: raw.sizeSqFt,
    description: raw.description,
    latitude: raw.latitude?.toString(),
    longitude: raw.longitude?.toString(),
    agentName: raw.agentName,
    agentPhone: raw.agentPhone,
    agentAddress: raw.agentAddress,
    images: raw.images ? JSON.stringify(raw.images) : undefined,
    floorplans: raw.floorplans ? JSON.stringify(raw.floorplans) : undefined,
    epcUrl: raw.epcUrl,
    keyFeatures: raw.keyFeatures ? JSON.stringify(raw.keyFeatures) : undefined,
    hasParking: raw.hasParking,
    hasGarden: raw.hasGarden,
    tenure: raw.tenure,
    councilTaxBand: raw.councilTaxBand,
    annualServiceCharge: raw.annualServiceCharge,
    annualGroundRent: raw.annualGroundRent,
    nearestStations: raw.nearestStations ? JSON.stringify(raw.nearestStations) : undefined,
    broadbandDownload: raw.broadbandDownload,
    broadbandUpload: raw.broadbandUpload,
    broadbandProvider: raw.broadbandProvider,
    listedDate: raw.listedDate,
  };
}
