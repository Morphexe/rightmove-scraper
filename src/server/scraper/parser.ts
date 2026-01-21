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
  summary?: string;
  distance?: number;
  formattedDistance?: string;
}

interface NextJsProperty {
  id: number;
  bedrooms: number;
  bathrooms: number;
  summary: string;
  displayAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  images: Array<{
    srcUrl: string;
    url: string;
    caption: string;
  }>;
  propertySubType: string;
  tenure?: {
    tenureType: string;
  };
  price?: {
    amount: number;
    displayPriceQualifier?: string;
  };
  customer?: {
    branchDisplayName?: string;
    brandTradingName?: string;
    displayAddress?: string;
    telephoneNumbers?: {
      localNumber?: string;
    };
  };
  distance?: number;
  propertyUrl: string;
  propertyTypeFullDescription?: string;
  keyFeatures?: string[];
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

  const nextData = await page.evaluate(() => {
    const script = document.querySelector('#__NEXT_DATA__');
    if (script && script.textContent) {
      try {
        const data = JSON.parse(script.textContent);
        if (data?.props?.pageProps?.searchResults?.properties) {
          return data.props.pageProps.searchResults;
        }
      } catch {}
    }
    return null;
  });

  if (nextData && nextData.properties && nextData.properties.length > 0) {
    const properties: RawPropertyData[] = nextData.properties.map((prop: NextJsProperty) => ({
      id: String(prop.id),
      url: `https://www.rightmove.co.uk${prop.propertyUrl}`,
      title: prop.propertyTypeFullDescription || prop.displayAddress,
      propertyType: prop.propertySubType,
      propertySubType: prop.propertySubType,
      address: prop.displayAddress,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      latitude: prop.location?.latitude,
      longitude: prop.location?.longitude,
      agentName: prop.customer?.branchDisplayName || prop.customer?.brandTradingName,
      images: prop.images?.map((img: { srcUrl: string }) => img.srcUrl),
      summary: prop.summary,
      distance: prop.distance,
      price: prop.price?.amount,
      priceQualifier: prop.price?.displayPriceQualifier,
      agentAddress: prop.customer?.displayAddress,
      agentPhone: prop.customer?.telephoneNumbers?.localNumber,
      tenure: prop.tenure?.tenureType,
      keyFeatures: prop.keyFeatures,
    }));

    log.debug(`Extracted ${properties.length} properties from __NEXT_DATA__`);
    return properties;
  }

  const jsonModelProperties = await page.evaluate(() => {
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

    return results;
  });

  if (jsonModelProperties.length > 0) {
    log.debug(`Extracted ${jsonModelProperties.length} properties from window.jsonModel`);
    return jsonModelProperties;
  }

  const domProperties = await page.evaluate(() => {
    const results: Array<{
      id: string;
      url: string;
      title?: string;
      address?: string;
      price?: number;
    }> = [];

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

    return results;
  });

  log.debug(`Extracted ${domProperties.length} properties from DOM`);
  return domProperties;
}

export async function parsePropertyDetail(page: Page): Promise<Partial<RawPropertyData>> {
  await dismissCookiePopup(page);

  // First try __NEXT_DATA__ (Next.js rendering)
  const nextData = await page.evaluate(() => {
    const script = document.querySelector('#__NEXT_DATA__');
    if (script && script.textContent) {
      try {
        const data = JSON.parse(script.textContent);
        if (data?.props?.pageProps?.propertyData) {
          return { propertyData: data.props.pageProps.propertyData };
        }
      } catch {}
    }
    return null;
  });

  if (nextData?.propertyData) {
    const p = nextData.propertyData;
    const postcode = p.address?.outcode && p.address?.incode 
      ? `${p.address.outcode} ${p.address.incode}`
      : p.address?.outcode;

    return {
      id: String(p.id),
      title: p.text?.propertyPhrase,
      propertySubType: p.propertySubType,
      address: p.address?.displayAddress,
      postcode,
      price: p.prices?.primaryPrice ? parseInt(p.prices.primaryPrice.replace(/[^0-9]/g, ''), 10) : undefined,
      priceQualifier: p.prices?.displayPriceQualifier,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sizeSqFt: p.sizings?.find((s: { unit?: string }) => s.unit === 'sqft')?.minimumSize,
      description: p.text?.description?.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''),
      latitude: p.location?.latitude,
      longitude: p.location?.longitude,
      agentName: p.customer?.branchDisplayName,
      agentAddress: p.customer?.displayAddress?.replace(/\r\n/g, ', ').trim(),
      agentPhone: p.contactInfo?.telephoneNumbers?.localNumber,
      images: p.images?.map((i: { url?: string }) => i.url).filter((u): u is string => !!u),
      floorplans: p.floorplans?.map((f: { url?: string }) => f.url).filter((u): u is string => !!u),
      epcUrl: p.epcGraphs?.[0]?.url,
      keyFeatures: p.keyFeatures?.filter((f): f is string => !!f),
      hasParking: p.features?.parking?.some((f: { displayText?: string }) => f.displayText?.toLowerCase() === 'yes'),
      hasGarden: p.features?.garden?.some((f: { displayText?: string }) => f.displayText?.toLowerCase() === 'yes'),
      tenure: p.tenure?.tenureType,
      councilTaxBand: p.livingCosts?.councilTaxBand,
      annualServiceCharge: p.livingCosts?.annualServiceCharge,
      annualGroundRent: p.livingCosts?.annualGroundRent,
      nearestStations: p.nearestStations?.map((s: { name?: string; distance?: number; types?: string[] }) => ({
        name: s.name || '',
        distance: s.distance || 0,
        types: s.types || [],
      })),
      broadbandCheckerUrl: p.broadband?.broadbandCheckerUrl,
    };
  }

  // Try window.PAGE_MODEL (legacy rendering)
  const pageModelData = await page.evaluate(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (window as any).PAGE_MODEL;
      if (data?.propertyData) {
        return { propertyData: data.propertyData };
      }
    } catch {
      // PAGE_MODEL not accessible
    }
    return null;
  }) as { propertyData?: PageModelProperty } | null;

  if (pageModelData?.propertyData) {
    const p = pageModelData.propertyData;
    
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

    return {
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
  }

  // Fallback: Extract from rendered DOM
  log.debug('Extracting property details from rendered DOM');

  const domData = await page.evaluate(() => {
    const result: Partial<RawPropertyData> = {};

    // Description - Rightmove uses various selectors
    const descriptionSelectors = [
      '[data-testid="description"]',
      '.property-description',
      '.description-content',
      '[class*="description"]',
      '.rm-description',
      '#property-description',
    ];
    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        result.description = el.textContent.trim();
        break;
      }
    }

    // Bedrooms
    const bedsSelectors = [
      '[data-testid="bedrooms"]',
      '[data-testid="bedroom-count"]',
      '[class*="bedroom"] span',
      '.bedroom-number',
      '.property-bedrooms',
    ];
    for (const selector of bedsSelectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent || '';
      const beds = parseInt(text.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(beds)) {
        result.bedrooms = beds;
        break;
      }
    }

    // Bathrooms
    const bathsSelectors = [
      '[data-testid="bathrooms"]',
      '[data-testid="bathroom-count"]',
      '[class*="bathroom"] span',
      '.bathroom-number',
      '.property-bathrooms',
    ];
    for (const selector of bathsSelectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent || '';
      const baths = parseInt(text.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(baths)) {
        result.bathrooms = baths;
        break;
      }
    }

    // Price
    const priceSelectors = [
      '[data-testid="price"]',
      '.property-price',
      '.price-main',
      '[class*="price"]',
      '.amount',
    ];
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent || '';
      const price = parseInt(text.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(price) && price > 0) {
        result.price = price;
        break;
      }
    }

    // Address
    const addressSelectors = [
      '[data-testid="address"]',
      '.property-address',
      '.address-display',
      '[class*="address"]',
    ];
    for (const selector of addressSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        result.address = el.textContent.trim();
        break;
      }
    }

    // Agent
    const agentSelectors = [
      '[data-testid="agent"]',
      '.agent-name',
      '.branch-name',
      '[class*="agent"]',
    ];
    for (const selector of agentSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        result.agentName = el.textContent.trim();
        break;
      }
    }

    // Images
    const imageSelectors = [
      '[data-testid="property-image"]',
      '.property-image img',
      '.gallery-image img',
      '[class*="image"] img',
      '.swiper-slide img',
    ];
    const imageEls = document.querySelectorAll(imageSelectors.join(','));
    result.images = Array.from(imageEls)
      .map((img) => (img as HTMLImageElement).src)
      .filter((src) => src && (src.startsWith('http') || src.startsWith('//')));

    // Key Features
    const featureSelectors = [
      '[data-testid="key-feature"]',
      '.key-feature',
      '.feature-item',
      '[class*="feature"]',
      '.property-features li',
    ];
    const featureEls = document.querySelectorAll(featureSelectors.join(','));
    result.keyFeatures = Array.from(featureEls)
      .map((el) => el.textContent?.trim())
      .filter(Boolean);

    // Postcode from address
    if (result.address) {
      const postcodeMatch = result.address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i);
      if (postcodeMatch) {
        result.postcode = postcodeMatch[0].toUpperCase();
      }
    }

    return result;
  });

  if (domData.description || domData.bedrooms) {
    log.debug('Successfully extracted data from rendered DOM');
    return domData;
  }

  log.warn('Could not find property data in any format');
  return {};
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
