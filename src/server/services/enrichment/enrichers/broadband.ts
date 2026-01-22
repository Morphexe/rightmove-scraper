import type { Enricher, EnrichmentContext, EnrichmentResult } from '../types.js';
import { BroadbandChecker } from '../../broadband/checker.js';

export class BroadbandEnricher implements Enricher {
  name = 'broadband';
  private checker: BroadbandChecker;

  constructor(checker?: BroadbandChecker) {
    this.checker = checker || new BroadbandChecker();
  }

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    const { property } = context;
    
    if (!property.postcode) {
      return {};
    }

    if (property.broadbandDownload && property.broadbandDownload > 0) {
      return {};
    }

    const speed = await this.checker.checkSpeed(property.postcode);

    if (!speed.available) {
      return {};
    }

    return {
      broadbandDownload: Math.round(speed.downloadSpeed),
      broadbandUpload: Math.round(speed.uploadSpeed),
      broadbandProvider: speed.provider || speed.technology,
    };
  }
}
