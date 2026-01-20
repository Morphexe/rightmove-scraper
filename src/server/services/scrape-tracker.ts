import { eq, desc, and } from 'drizzle-orm';
import { getDb, schema } from '../database/index.js';
import type { ScrapeRun, NewScrapeRun } from '../database/schema.js';
import { getConfig } from '../config/index.js';
import { log } from '../utils/logger.js';

export class ScrapeTracker {
  async getLastRun(location: string): Promise<ScrapeRun | null> {
    const db = await getDb();
    const results = await db
      .select()
      .from(schema.scrapeRuns)
      .where(
        and(
          eq(schema.scrapeRuns.searchLocation, location),
          eq(schema.scrapeRuns.status, 'completed')
        )
      )
      .orderBy(desc(schema.scrapeRuns.completedAt))
      .limit(1);

    return results[0] || null;
  }

  async getLastRunDate(location: string): Promise<Date> {
    const config = getConfig();
    const lastRun = await this.getLastRun(location);

    if (lastRun?.completedAt) {
      log.info(`Last successful run for ${location}: ${lastRun.completedAt}`);
      return lastRun.completedAt;
    }

    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() - config.DEFAULT_LOOKBACK_DAYS);
    log.info(`No previous run for ${location}, defaulting to ${config.DEFAULT_LOOKBACK_DAYS} days ago`);
    return defaultDate;
  }

  async startRun(data: Omit<NewScrapeRun, 'id'>): Promise<number> {
    const db = await getDb();
    const result = await db.insert(schema.scrapeRuns).values(data);
    const runId = Number(result[0].insertId);
    log.info(`Started scrape run #${runId} for ${data.searchLocation}`);
    return runId;
  }

  async updateProgress(runId: number, updates: Partial<ScrapeRun>): Promise<void> {
    const db = await getDb();
    await db
      .update(schema.scrapeRuns)
      .set(updates)
      .where(eq(schema.scrapeRuns.id, runId));
  }

  async completeRun(
    runId: number,
    stats: { pagesScraped: number; propertiesFound: number; newProperties: number; updatedProperties: number }
  ): Promise<void> {
    const db = await getDb();
    await db
      .update(schema.scrapeRuns)
      .set({
        status: 'completed',
        completedAt: new Date(),
        ...stats,
      })
      .where(eq(schema.scrapeRuns.id, runId));
    log.info(`Completed scrape run #${runId}`, stats);
  }

  async failRun(runId: number, errorMessage: string): Promise<void> {
    const db = await getDb();
    await db
      .update(schema.scrapeRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorMessage,
      })
      .where(eq(schema.scrapeRuns.id, runId));
    log.error(`Failed scrape run #${runId}: ${errorMessage}`);
  }

  async getInterruptedRun(location: string): Promise<ScrapeRun | null> {
    const db = await getDb();
    const results = await db
      .select()
      .from(schema.scrapeRuns)
      .where(
        and(
          eq(schema.scrapeRuns.searchLocation, location),
          eq(schema.scrapeRuns.status, 'running')
        )
      )
      .orderBy(desc(schema.scrapeRuns.startedAt))
      .limit(1);

    return results[0] || null;
  }
}
