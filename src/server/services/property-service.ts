import { eq } from 'drizzle-orm';
import { getDb, schema } from '../database/index.js';
import type { NewProperty, Property } from '../database/schema.js';
import { log } from '../utils/logger.js';

export class PropertyService {
  async upsertProperty(property: NewProperty): Promise<{ isNew: boolean; id: number }> {
    const db = await getDb();

    const existing = await db
      .select({ id: schema.properties.id })
      .from(schema.properties)
      .where(eq(schema.properties.rightmoveId, property.rightmoveId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.properties)
        .set({
          ...property,
          lastScrapedAt: new Date(),
        })
        .where(eq(schema.properties.id, existing[0].id));
      
      return { isNew: false, id: existing[0].id };
    }

    const result = await db.insert(schema.properties).values(property);
    return { isNew: true, id: Number(result[0].insertId) };
  }

  async bulkInsert(properties: NewProperty[]): Promise<{ inserted: number; skipped: number }> {
    if (properties.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const db = await getDb();
    let inserted = 0;
    let skipped = 0;

    for (const property of properties) {
      try {
        const result = await this.upsertProperty(property);
        if (result.isNew) {
          inserted++;
        } else {
          skipped++;
        }
      } catch (error) {
        log.error(`Failed to insert property ${property.rightmoveId}: ${error}`);
        skipped++;
      }
    }

    log.info(`Bulk insert complete: ${inserted} new, ${skipped} updated/skipped`);
    return { inserted, skipped };
  }

  async markInactive(rightmoveIds: string[]): Promise<number> {
    if (rightmoveIds.length === 0) return 0;

    const db = await getDb();
    const result = await db
      .update(schema.properties)
      .set({ isActive: false })
      .where(eq(schema.properties.isActive, true));

    return Number(result[0].affectedRows || 0);
  }

  async getPropertyByRightmoveId(rightmoveId: string): Promise<Property | null> {
    const db = await getDb();
    const results = await db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.rightmoveId, rightmoveId))
      .limit(1);

    return results[0] || null;
  }
}
