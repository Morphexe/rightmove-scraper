import { describe, test, expect } from 'bun:test';
import { buildSearchUrl, extractLocationIdentifier } from '../../src/scraper/url-builder.js';

describe('extractLocationIdentifier', () => {
  test('extracts outcode from partial postcode (SW1A)', () => {
    const result = extractLocationIdentifier('SW1A');
    expect(result).toBe('OUTCODE^SW1A');
  });

  test('extracts outcode from lowercase partial postcode', () => {
    const result = extractLocationIdentifier('sw1a');
    expect(result).toBe('OUTCODE^SW1A');
  });

  test('extracts postcode from full postcode', () => {
    const result = extractLocationIdentifier('SW1A 1AA');
    expect(result).toBe('POSTCODE^SW1A1AA');
  });

  test('extracts region from area name', () => {
    const result = extractLocationIdentifier('London');
    expect(result).toBe('REGION^LONDON');
  });

  test('handles various outcode formats', () => {
    expect(extractLocationIdentifier('E1')).toBe('OUTCODE^E1');
    expect(extractLocationIdentifier('EC1A')).toBe('OUTCODE^EC1A');
    expect(extractLocationIdentifier('M1')).toBe('OUTCODE^M1');
  });
});

describe('buildSearchUrl', () => {
  test('builds basic search URL with location', () => {
    const url = buildSearchUrl({ locationIdentifier: 'OUTCODE^SW1A' });
    expect(url).toContain('rightmove.co.uk/property-for-sale/find.html');
    expect(url).toContain('locationIdentifier=OUTCODE%5ESW1A');
  });

  test('includes price filters when specified', () => {
    const url = buildSearchUrl({
      locationIdentifier: 'OUTCODE^SW1A',
      minPrice: 200000,
      maxPrice: 500000,
    });
    expect(url).toContain('minPrice=200000');
    expect(url).toContain('maxPrice=500000');
  });

  test('includes bedroom filters when specified', () => {
    const url = buildSearchUrl({
      locationIdentifier: 'OUTCODE^SW1A',
      minBedrooms: 2,
      maxBedrooms: 4,
    });
    expect(url).toContain('minBedrooms=2');
    expect(url).toContain('maxBedrooms=4');
  });

  test('includes radius when specified', () => {
    const url = buildSearchUrl({
      locationIdentifier: 'OUTCODE^SW1A',
      radius: 5,
    });
    expect(url).toContain('radius=5');
  });

  test('handles pagination correctly', () => {
    const page0 = buildSearchUrl({ locationIdentifier: 'OUTCODE^SW1A' }, 0);
    const page1 = buildSearchUrl({ locationIdentifier: 'OUTCODE^SW1A' }, 1);
    const page2 = buildSearchUrl({ locationIdentifier: 'OUTCODE^SW1A' }, 2);

    expect(page0).not.toContain('index=');
    expect(page1).toContain('index=24');
    expect(page2).toContain('index=48');
  });

  test('sets sortType to mostRecent by default', () => {
    const url = buildSearchUrl({ locationIdentifier: 'OUTCODE^SW1A' });
    expect(url).toContain('sortType=6');
  });

  test('excludes SSTC properties', () => {
    const url = buildSearchUrl({ locationIdentifier: 'OUTCODE^SW1A' });
    expect(url).toContain('includeSSTC=false');
  });
});
