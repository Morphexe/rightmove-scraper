import { eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '../database/index.js';
import { log } from '../utils/logger.js';

export class DeduplicationService {
  async getExistingIds(rightmoveIds: string[]): Promise<Set<string>> {
    if (rightmoveIds.length === 0) return new Set();

    const db = await getDb();
    const existing = await db
      .select({ rightmoveId: schema.properties.rightmoveId })
      .from(schema.properties)
      .where(inArray(schema.properties.rightmoveId, rightmoveIds));

    return new Set(existing.map(p => p.rightmoveId));
  }

  async isPropertyExists(rightmoveId: string): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .select({ id: schema.properties.id })
      .from(schema.properties)
      .where(eq(schema.properties.rightmoveId, rightmoveId))
      .limit(1);

    return result.length > 0;
  }

  filterNewProperties<T extends { id: string }>(
    properties: T[],
    existingIds: Set<string>
  ): { newProperties: T[]; skippedCount: number } {
    const newProperties = properties.filter(p => !existingIds.has(p.id));
    const skippedCount = properties.length - newProperties.length;

    if (skippedCount > 0) {
      log.info(`Skipped ${skippedCount} already-scraped properties`);
    }

    return { newProperties, skippedCount };
  }
}
