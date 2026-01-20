import { describe, test, expect, beforeEach, mock } from 'bun:test';

const mockDb = {
  select: mock(() => mockDb),
  from: mock(() => mockDb),
  where: mock(() => Promise.resolve([])),
};

mock.module('../../src/database/index.js', () => ({
  getDb: () => Promise.resolve(mockDb),
  schema: {
    properties: {
      rightmoveId: 'rightmove_id',
    },
  },
}));

mock.module('../../src/utils/logger.js', () => ({
  log: {
    info: () => {},
    warn: () => {},
    debug: () => {},
    error: () => {},
  },
}));

import { DeduplicationService } from '../../src/services/deduplication.js';

describe('DeduplicationService', () => {
  let service: DeduplicationService;

  beforeEach(() => {
    service = new DeduplicationService();
  });

  describe('filterNewProperties', () => {
    test('filters out properties that exist in the set', () => {
      const properties = [
        { id: '123', title: 'Property 1' },
        { id: '456', title: 'Property 2' },
        { id: '789', title: 'Property 3' },
      ];
      const existingIds = new Set(['123', '789']);

      const { newProperties, skippedCount } = service.filterNewProperties(properties, existingIds);

      expect(newProperties).toHaveLength(1);
      expect(newProperties[0].id).toBe('456');
      expect(skippedCount).toBe(2);
    });

    test('returns all properties when none exist', () => {
      const properties = [
        { id: '123', title: 'Property 1' },
        { id: '456', title: 'Property 2' },
      ];
      const existingIds = new Set<string>();

      const { newProperties, skippedCount } = service.filterNewProperties(properties, existingIds);

      expect(newProperties).toHaveLength(2);
      expect(skippedCount).toBe(0);
    });

    test('returns empty array when all properties exist', () => {
      const properties = [
        { id: '123', title: 'Property 1' },
        { id: '456', title: 'Property 2' },
      ];
      const existingIds = new Set(['123', '456']);

      const { newProperties, skippedCount } = service.filterNewProperties(properties, existingIds);

      expect(newProperties).toHaveLength(0);
      expect(skippedCount).toBe(2);
    });

    test('handles empty input array', () => {
      const properties: { id: string }[] = [];
      const existingIds = new Set(['123']);

      const { newProperties, skippedCount } = service.filterNewProperties(properties, existingIds);

      expect(newProperties).toHaveLength(0);
      expect(skippedCount).toBe(0);
    });
  });

  describe('getExistingIds', () => {
    test('returns empty set for empty input', async () => {
      const result = await service.getExistingIds([]);
      expect(result.size).toBe(0);
    });
  });
});
