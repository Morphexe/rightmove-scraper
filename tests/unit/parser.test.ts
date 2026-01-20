import { describe, test, expect } from 'bun:test';
import { toNewProperty, type RawPropertyData } from '../../src/scraper/parser.js';

describe('toNewProperty', () => {
  test('converts raw property data to database entity', () => {
    const raw: RawPropertyData = {
      id: '12345',
      url: 'https://www.rightmove.co.uk/properties/12345',
      title: '3 bedroom semi-detached house',
      propertyType: 'semi-detached',
      address: '123 Test Street, London',
      postcode: 'SW1A 1AA',
      price: 450000,
      priceQualifier: 'Guide Price',
      bedrooms: 3,
      bathrooms: 2,
      description: 'A lovely property',
      latitude: 51.5074,
      longitude: -0.1278,
      agentName: 'Test Estate Agents',
      agentPhone: '020 1234 5678',
      images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      features: ['Garden', 'Garage', 'Central Heating'],
      listedDate: new Date('2024-01-15'),
    };

    const result = toNewProperty(raw);

    expect(result.rightmoveId).toBe('12345');
    expect(result.url).toBe('https://www.rightmove.co.uk/properties/12345');
    expect(result.title).toBe('3 bedroom semi-detached house');
    expect(result.price).toBe(450000);
    expect(result.bedrooms).toBe(3);
    expect(result.bathrooms).toBe(2);
    expect(result.latitude).toBe('51.5074');
    expect(result.longitude).toBe('-0.1278');
    expect(result.images).toBe(JSON.stringify(['https://example.com/img1.jpg', 'https://example.com/img2.jpg']));
    expect(result.features).toBe(JSON.stringify(['Garden', 'Garage', 'Central Heating']));
  });

  test('handles minimal raw property data', () => {
    const raw: RawPropertyData = {
      id: '12345',
      url: 'https://www.rightmove.co.uk/properties/12345',
    };

    const result = toNewProperty(raw);

    expect(result.rightmoveId).toBe('12345');
    expect(result.url).toBe('https://www.rightmove.co.uk/properties/12345');
    expect(result.title).toBeUndefined();
    expect(result.price).toBeUndefined();
    expect(result.images).toBeUndefined();
  });

  test('handles undefined arrays correctly', () => {
    const raw: RawPropertyData = {
      id: '12345',
      url: 'https://www.rightmove.co.uk/properties/12345',
      images: undefined,
      features: undefined,
    };

    const result = toNewProperty(raw);

    expect(result.images).toBeUndefined();
    expect(result.features).toBeUndefined();
  });

  test('handles empty arrays correctly', () => {
    const raw: RawPropertyData = {
      id: '12345',
      url: 'https://www.rightmove.co.uk/properties/12345',
      images: [],
      features: [],
    };

    const result = toNewProperty(raw);

    expect(result.images).toBe('[]');
    expect(result.features).toBe('[]');
  });
});
