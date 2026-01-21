import { Elysia, t } from 'elysia';
import { eq, desc, asc, sql, like, and, or, isNull, isNotNull, gte, lte, type SQL } from 'drizzle-orm';
import { getDb, schema, type Property } from '../database/index.js';
import { EnrichmentService } from '../services/enrichment-service.js';

const propertyFiltersSchema = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 20, maximum: 100 })),
  sortBy: t.Optional(t.String({ default: 'lastScrapedAt' })),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')], { default: 'desc' })),
  minPrice: t.Optional(t.Numeric()),
  maxPrice: t.Optional(t.Numeric()),
  minBedrooms: t.Optional(t.Numeric()),
  maxBedrooms: t.Optional(t.Numeric()),
  minBroadband: t.Optional(t.Numeric()),
  isMarked: t.Optional(t.String()),
  userStatus: t.Optional(t.String()),
  viewedStatus: t.Optional(t.Union([t.Literal('new'), t.Literal('seen'), t.Literal('all')])),
  search: t.Optional(t.String())
});

const propertyUpdateSchema = t.Object({
  isMarked: t.Optional(t.Boolean()),
  userNotes: t.Optional(t.String()),
  userRating: t.Optional(t.Number({ minimum: 0, maximum: 5 })),
  userStatus: t.Optional(t.String()),
  viewedAt: t.Optional(t.String())
});

function buildWhereConditions(filters: Record<string, unknown>): SQL | undefined {
  const conditions: SQL[] = [];
  
  if (filters.minPrice !== undefined) {
    conditions.push(gte(schema.properties.price, Number(filters.minPrice)));
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(lte(schema.properties.price, Number(filters.maxPrice)));
  }
  if (filters.minBedrooms !== undefined) {
    conditions.push(gte(schema.properties.bedrooms, Number(filters.minBedrooms)));
  }
  if (filters.maxBedrooms !== undefined) {
    conditions.push(lte(schema.properties.bedrooms, Number(filters.maxBedrooms)));
  }
  if (filters.minBroadband !== undefined) {
    conditions.push(gte(schema.properties.broadbandDownload, Number(filters.minBroadband)));
  }
  if (filters.isMarked === 'true') {
    conditions.push(eq(schema.properties.isMarked, true));
  } else if (filters.isMarked === 'false') {
    conditions.push(eq(schema.properties.isMarked, false));
  }
  if (filters.userStatus && filters.userStatus !== '') {
    conditions.push(eq(schema.properties.userStatus, String(filters.userStatus)));
  }
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(
      or(
        like(schema.properties.title, searchTerm),
        like(schema.properties.address, searchTerm),
        like(schema.properties.postcode, searchTerm)
      )!
    );
  }
  if (filters.viewedStatus === 'new') {
    conditions.push(isNull(schema.properties.viewedAt));
  } else if (filters.viewedStatus === 'seen') {
    conditions.push(isNotNull(schema.properties.viewedAt));
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export const propertyRoutes = new Elysia({ prefix: '/api/properties' })
  .get('/', async ({ query }) => {
    const db = await getDb();
    const filters = query;
    const page = Number(filters.page) || 1;
    const limit = Math.min(Number(filters.limit) || 20, 100);
    const offset = (page - 1) * limit;
    
    const whereConditions = buildWhereConditions(filters);
    
    const sortColumn = (schema.properties as Record<string, unknown>)[filters.sortBy || 'lastScrapedAt'] || schema.properties.lastScrapedAt;
    const orderFn = filters.sortOrder === 'asc' ? asc : desc;
    
    const [properties, countResult] = await Promise.all([
      db
        .select()
        .from(schema.properties)
        .where(whereConditions)
        .orderBy(orderFn(sortColumn as typeof schema.properties.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.properties)
        .where(whereConditions)
    ]);
    
    return {
      data: properties,
      pagination: {
        page,
        limit,
        total: countResult[0].count,
        totalPages: Math.ceil(countResult[0].count / limit)
      }
    };
  }, { query: propertyFiltersSchema })
  
  .delete('/', async () => {
    const db = await getDb();
    await db.delete(schema.properties);
    return { success: true, message: 'All properties deleted' };
  })
  
  .get('/grouped', async ({ query }) => {
    const db = await getDb();
    const filters = query;
    
    const whereConditions = buildWhereConditions(filters);
    
    const properties = await db
      .select()
      .from(schema.properties)
      .where(whereConditions)
      .orderBy(desc(schema.properties.lastScrapedAt));
    
    const grouped: Record<string, typeof properties> = {};
    
    for (const property of properties) {
      const zone = property.searchZone || 'Unknown';
      if (!grouped[zone]) {
        grouped[zone] = [];
      }
      grouped[zone].push(property);
    }
    
    return {
      zones: Object.entries(grouped).map(([zone, props]) => ({
        name: zone,
        count: props.length,
        properties: props
      }))
    };
  }, { query: propertyFiltersSchema })
  
  .post('/enrich-all', async ({ query }) => {
    const limit = Number(query.limit) || 10;
    
    try {
      const enrichmentService = new EnrichmentService();
      const enrichedCount = await enrichmentService.enrichUnenrichedProperties(limit);
      const stats = await enrichmentService.getEnrichmentStats();
      
      return {
        enriched: enrichedCount,
        stats
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, { query: t.Object({ limit: t.Optional(t.String()) }) })
  
  .get('/enrichment-stats', async () => {
    try {
      const enrichmentService = new EnrichmentService();
      return await enrichmentService.getEnrichmentStats();
    } catch (e) {
      return { error: (e as Error).message };
    }
  })
  
  .get('/:id', async ({ params, error }) => {
    const db = await getDb();
    const propertyId = Number(params.id);
    
    if (isNaN(propertyId)) {
      return error(400, { error: 'Invalid property ID' });
    }
    
    const result = await db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, propertyId))
      .limit(1);
    
    if (result.length === 0) {
      return error(404, { error: 'Property not found' });
    }
    
    return result[0];
  }, { params: t.Object({ id: t.String() }) })
  
  .patch('/:id', async ({ params, body, error }) => {
    const db = await getDb();
    const propertyId = Number(params.id);
    
    if (isNaN(propertyId)) {
      return error(400, { error: 'Invalid property ID' });
    }
    
    const updates: Partial<Property> = {};
    if (body.isMarked !== undefined) updates.isMarked = body.isMarked;
    if (body.userNotes !== undefined) updates.userNotes = body.userNotes;
    if (body.userRating !== undefined) updates.userRating = body.userRating;
    if (body.userStatus !== undefined) updates.userStatus = body.userStatus;
    if (body.viewedAt !== undefined) updates.viewedAt = new Date(body.viewedAt);
    
    if (Object.keys(updates).length === 0) {
      return error(400, { error: 'No valid fields to update' });
    }
    
    await db
      .update(schema.properties)
      .set(updates)
      .where(eq(schema.properties.id, propertyId));
    
    const result = await db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, propertyId))
      .limit(1);
    
    return result[0];
  }, { 
    params: t.Object({ id: t.String() }),
    body: propertyUpdateSchema
  })
  
  .post('/:id/viewed', async ({ params, error }) => {
    const db = await getDb();
    const propertyId = Number(params.id);
    
    if (isNaN(propertyId)) {
      return error(400, { error: 'Invalid property ID' });
    }
    
    await db
      .update(schema.properties)
      .set({ viewedAt: new Date() })
      .where(eq(schema.properties.id, propertyId));
    
    const result = await db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, propertyId))
      .limit(1);
    
    return result[0];
  }, { params: t.Object({ id: t.String() }) })
  
  .post('/:id/enrich', async ({ params, error }) => {
    const propertyId = Number(params.id);
    
    if (isNaN(propertyId)) {
      return error(400, { error: 'Invalid property ID' });
    }
    
    try {
      const enrichmentService = new EnrichmentService();
      const success = await enrichmentService.enrichProperty(propertyId);
      
      if (!success) {
        return error(400, { error: 'Failed to enrich property' });
      }
      
      const db = await getDb();
      const result = await db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.id, propertyId))
        .limit(1);
      
      return result[0];
    } catch (e) {
      return error(500, { error: (e as Error).message });
    }
  }, { params: t.Object({ id: t.String() }) })

  .delete('/all', async () => {
    const db = await getDb();
    await db.delete(schema.properties);
    return { success: true, message: 'All properties deleted' };
  })
  
  .delete('/:id', async ({ params, error }) => {
    const db = await getDb();
    const propertyId = Number(params.id);
    
    if (isNaN(propertyId)) {
      return error(400, { error: 'Invalid property ID' });
    }
    
    await db
      .delete(schema.properties)
      .where(eq(schema.properties.id, propertyId));
    
    return { success: true, deletedId: propertyId };
  }, { params: t.Object({ id: t.String() }) });
