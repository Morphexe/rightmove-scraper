import { log } from '../utils/logger.js';

export interface BroadbandSpeed {
  postcode: string;
  downloadSpeed: number;
  uploadSpeed: number;
  provider?: string;
  technology?: string;
  available: boolean;
}

export class BroadbandChecker {
  private cache: Map<string, BroadbandSpeed> = new Map();
  private minDownloadSpeed: number;
  private minUploadSpeed?: number;

  constructor(minDownloadSpeed: number = 500, minUploadSpeed?: number) {
    this.minDownloadSpeed = minDownloadSpeed;
    this.minUploadSpeed = minUploadSpeed;
  }

  async checkSpeed(postcode: string): Promise<BroadbandSpeed> {
    const normalized = postcode.toUpperCase().replace(/\s+/g, '');
    
    if (this.cache.has(normalized)) {
      return this.cache.get(normalized)!;
    }

    try {
      const speed = await this.fetchBroadbandData(normalized);
      this.cache.set(normalized, speed);
      return speed;
    } catch (error) {
      log.warn(`Failed to check broadband for ${postcode}: ${error}`);
      return {
        postcode: normalized,
        downloadSpeed: 0,
        uploadSpeed: 0,
        available: false,
      };
    }
  }

  private async fetchBroadbandData(postcode: string): Promise<BroadbandSpeed> {
    const outcode = postcode.replace(/\d[A-Z]{2}$/, '').trim();
    
    const response = await fetch(
      `https://www.broadbandspeedchecker.co.uk/broadband-speeds/${outcode.toLowerCase()}.html`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        },
      }
    );

    if (!response.ok) {
      return this.getEstimatedSpeed(postcode);
    }

    const html = await response.text();
    
    const downloadMatch = html.match(/Average Download Speed[^>]*>[\s\S]*?(\d+(?:\.\d+)?)\s*Mbps/i);
    const uploadMatch = html.match(/Average Upload Speed[^>]*>[\s\S]*?(\d+(?:\.\d+)?)\s*Mbps/i);

    const downloadSpeed = downloadMatch ? parseFloat(downloadMatch[1]) : 0;
    const uploadSpeed = uploadMatch ? parseFloat(uploadMatch[1]) : 0;

    if (downloadSpeed === 0) {
      return this.getEstimatedSpeed(postcode);
    }

    return {
      postcode,
      downloadSpeed,
      uploadSpeed,
      available: true,
    };
  }

  private getEstimatedSpeed(postcode: string): BroadbandSpeed {
    const londonOutcodes = ['EC', 'WC', 'SW', 'SE', 'NW', 'N', 'E', 'W'];
    const outcode = postcode.slice(0, 2).toUpperCase();
    
    const isLondon = londonOutcodes.some(o => outcode.startsWith(o));
    
    return {
      postcode,
      downloadSpeed: isLondon ? 900 : 300,
      uploadSpeed: isLondon ? 100 : 30,
      technology: 'estimated',
      available: true,
    };
  }

  meetsRequirements(speed: BroadbandSpeed): boolean {
    if (!speed.available) return false;
    
    if (speed.downloadSpeed < this.minDownloadSpeed) {
      return false;
    }
    
    if (this.minUploadSpeed && speed.uploadSpeed < this.minUploadSpeed) {
      return false;
    }
    
    return true;
  }

  async filterByBroadband<T extends { postcode?: string }>(
    properties: T[]
  ): Promise<{ passed: T[]; failed: T[] }> {
    const passed: T[] = [];
    const failed: T[] = [];

    for (const property of properties) {
      if (!property.postcode) {
        passed.push(property);
        continue;
      }

      const speed = await this.checkSpeed(property.postcode);
      
      if (this.meetsRequirements(speed)) {
        passed.push(property);
      } else {
        failed.push(property);
        log.debug(
          `Property at ${property.postcode} failed broadband check: ` +
          `${speed.downloadSpeed}Mbps down (need ${this.minDownloadSpeed}Mbps)`
        );
      }
    }

    if (failed.length > 0) {
      log.info(`Filtered out ${failed.length} properties due to insufficient broadband speed`);
    }

    return { passed, failed };
  }
}
