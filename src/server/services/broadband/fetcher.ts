import { log } from '../../utils/logger.js';

export interface BroadbandData {
  downloadSpeed: number;
  uploadSpeed: number;
  provider?: string;
}

interface CompareTheMarketResponse {
  packages?: Array<{
    speed?: {
      download?: number;
      upload?: number;
    };
    provider?: {
      name?: string;
    };
  }>;
}

export async function fetchBroadbandFromUrl(broadbandCheckerUrl: string): Promise<BroadbandData | null> {
  try {
    const response = await fetch(broadbandCheckerUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      log.debug(`Broadband API returned ${response.status}`);
      return null;
    }

    const data = await response.json() as CompareTheMarketResponse;
    
    if (!data.packages?.length) {
      return null;
    }

    let maxDownload = 0;
    let maxUpload = 0;
    let fastestProvider: string | undefined;

    for (const pkg of data.packages) {
      const download = pkg.speed?.download || 0;
      const upload = pkg.speed?.upload || 0;

      if (download > maxDownload) {
        maxDownload = download;
        maxUpload = upload;
        fastestProvider = pkg.provider?.name;
      }
    }

    if (maxDownload === 0) {
      return null;
    }

    return {
      downloadSpeed: maxDownload,
      uploadSpeed: maxUpload,
      provider: fastestProvider,
    };
  } catch (error) {
    log.debug(`Failed to fetch broadband data: ${error}`);
    return null;
  }
}
