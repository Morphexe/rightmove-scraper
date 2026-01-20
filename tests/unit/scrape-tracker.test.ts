import { describe, test, expect, beforeEach, mock } from 'bun:test';

mock.module('../../src/config/index.js', () => ({
  getConfig: () => ({
    DEFAULT_LOOKBACK_DAYS: 2,
  }),
}));

mock.module('../../src/utils/logger.js', () => ({
  log: {
    info: () => {},
    warn: () => {},
    debug: () => {},
    error: () => {},
  },
}));

const mockResults: unknown[] = [];
const mockDb = {
  select: mock(() => mockDb),
  from: mock(() => mockDb),
  where: mock(() => mockDb),
  orderBy: mock(() => mockDb),
  limit: mock(() => Promise.resolve(mockResults)),
  insert: mock(() => mockDb),
  values: mock(() => Promise.resolve([{ insertId: 1 }])),
  update: mock(() => mockDb),
  set: mock(() => mockDb),
};

mock.module('../../src/database/index.js', () => ({
  getDb: () => Promise.resolve(mockDb),
  schema: {
    scrapeRuns: {
      id: 'id',
      searchLocation: 'search_location',
      status: 'status',
      completedAt: 'completed_at',
      startedAt: 'started_at',
    },
  },
}));

import { ScrapeTracker } from '../../src/services/scrape-tracker.js';

describe('ScrapeTracker', () => {
  let tracker: ScrapeTracker;

  beforeEach(() => {
    tracker = new ScrapeTracker();
    mockResults.length = 0;
  });

  describe('getLastRunDate', () => {
    test('returns default lookback date when no previous runs exist', async () => {
      const beforeDate = new Date();
      beforeDate.setDate(beforeDate.getDate() - 2);
      
      const result = await tracker.getLastRunDate('SW1A');
      
      expect(result.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime() - 1000);
    });

    test('returns last completed run date when exists', async () => {
      const lastRunDate = new Date('2024-01-15T10:00:00Z');
      mockResults.push({ completedAt: lastRunDate, status: 'completed' });
      
      const result = await tracker.getLastRunDate('SW1A');
      
      expect(result).toEqual(lastRunDate);
    });
  });

  describe('startRun', () => {
    test('creates a new scrape run and returns ID', async () => {
      const runId = await tracker.startRun({
        searchLocation: 'SW1A',
        searchRadius: '5',
        searchCriteria: '{}',
      });

      expect(runId).toBe(1);
    });
  });
});
