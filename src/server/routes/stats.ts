import { Elysia } from 'elysia';
import { sql, eq, isNull, isNotNull } from 'drizzle-orm';
import { getDb, schema } from '../database/index.js';
import { isProxyEnabled } from '../config/index.js';

export const statsRoutes = new Elysia({ prefix: '/api/stats' })
  .get('/overview', async () => {
    const db = await getDb();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalResult,
      newTodayResult,
      markedResult,
      unseenResult,
      statusCounts
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(schema.properties),
      db.select({ count: sql<number>`count(*)` }).from(schema.properties)
        .where(sql`${schema.properties.firstScrapedAt} >= ${today}`),
      db.select({ count: sql<number>`count(*)` }).from(schema.properties)
        .where(eq(schema.properties.isMarked, true)),
      db.select({ count: sql<number>`count(*)` }).from(schema.properties)
        .where(isNull(schema.properties.viewedAt)),
      db.select({
        status: schema.properties.userStatus,
        count: sql<number>`count(*)`
      })
        .from(schema.properties)
        .where(isNotNull(schema.properties.userStatus))
        .groupBy(schema.properties.userStatus)
    ]);
    
    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      if (row.status) {
        byStatus[row.status] = row.count;
      }
    }
    
    return {
      totalProperties: totalResult[0].count,
      newToday: newTodayResult[0].count,
      marked: markedResult[0].count,
      unseen: unseenResult[0].count,
      byStatus
    };
  })
  
  .get('/database', async () => {
    const db = await getDb();
    
    const [propertiesCount, runsCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(schema.properties),
      db.select({ count: sql<number>`count(*)` }).from(schema.scrapeRuns)
    ]);
    
    return {
      tables: {
        properties: propertiesCount[0].count,
        scrapeRuns: runsCount[0].count
      }
    };
  })
  
  .get('/proxy', () => {
    return {
      enabled: isProxyEnabled(),
      status: isProxyEnabled() ? 'active' : 'disabled'
    };
  });
