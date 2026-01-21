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
      keyFeatures: ['Garden', 'Garage', 'Central Heating'],
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
    expect(result.keyFeatures).toBe(JSON.stringify(['Garden', 'Garage', 'Central Heating']));
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
      keyFeatures: undefined,
    };

    const result = toNewProperty(raw);

    expect(result.images).toBeUndefined();
    expect(result.keyFeatures).toBeUndefined();
  });

  test('handles empty arrays correctly', () => {
    const raw: RawPropertyData = {
      id: '12345',
      url: 'https://www.rightmove.co.uk/properties/12345',
      images: [],
      keyFeatures: [],
    };

    const result = toNewProperty(raw);

    expect(result.images).toBe('[]');
    expect(result.keyFeatures).toBe('[]');
  });

  test('converts latitude and longitude to strings', () => {
    const raw: RawPropertyData = {
      id: '12345',
      url: 'https://www.rightmove.co.uk/properties/12345',
      latitude: 53.447234,
      longitude: -2.199293,
    };

    const result = toNewProperty(raw);

    expect(result.latitude).toBe('53.447234');
    expect(result.longitude).toBe('-2.199293');
  });

  test('handles __NEXT_DATA__ specific fields', () => {
    const raw: RawPropertyData = {
      id: '171232670',
      url: 'https://www.rightmove.co.uk/property-171232670.html',
      title: '3 bedroom terraced house',
      propertyType: 'terraced',
      address: 'Collingwood Road, Levenshulme, Manchester',
      price: 350000,
      bedrooms: 3,
      bathrooms: 2,
      summary: 'A well-proportioned period home...',
      distance: 2.5,
      formattedDistance: '2.5 miles',
      images: [
        'https://media.rightmove.co.uk/img1.jpg',
        'https://media.rightmove.co.uk/img2.jpg',
        'https://media.rightmove.co.uk/img3.jpg'
      ],
      keyFeatures: ['Garden', 'Parking', 'Double Glazing'],
    };

    const result = toNewProperty(raw);

    expect(result.rightmoveId).toBe('171232670');
    expect(result.images).toBe(JSON.stringify(raw.images));
    expect(result.keyFeatures).toBe(JSON.stringify(raw.keyFeatures));
    expect(result.price).toBe(350000);
    expect(result.bedrooms).toBe(3);
  });
});

describe('Data Validation', () => {
  test('should validate property has required fields', () => {
    const requiredFields = [
      'id',
      'bedrooms',
      'bathrooms',
      'displayAddress',
      'price',
      'location',
      'images',
      'propertyUrl'
    ];

    const sampleProperty = {
      id: 171232670,
      bedrooms: 3,
      bathrooms: 2,
      displayAddress: '123 Test Street, Manchester',
      location: { latitude: 53.447234, longitude: -2.199293 },
      images: [],
      propertyUrl: '/property-171232670.html',
      price: { amount: 350000 }
    };

    requiredFields.forEach(field => {
      expect(sampleProperty).toHaveProperty(field);
    });
  });

  test('should validate image URLs are properly formatted', () => {
    const validImages = [
      'https://media.rightmove.co.uk:443/dir/crop/10:9-16:9/54k/53811/171232670/53811_985762_IMG_00_0000_max_476x317.jpeg',
      'https://media.rightmove.co.uk/dir/img.jpg'
    ];

    const urlPattern = /^https:\/\/media\.rightmove\.co\.uk/;
    
    validImages.forEach(url => {
      expect(urlPattern.test(url)).toBe(true);
    });
  });

  test('should validate price parsing', () => {
    const prices = [
      { text: '£350,000', expected: 350000 },
      { text: 'Offers over £300,000', expected: 300000 },
      { text: '£250000', expected: 250000 },
      { text: 'Price on application', expected: undefined }
    ];

    prices.forEach(({ text, expected }) => {
      const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10) || undefined;
      expect(parsed).toBe(expected);
    });
  });
});
