import { describe, expect, it } from 'vitest';

import {
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  buildMapboxPlaceSearchUrl,
  getNextZoom,
  hasMapboxAccessToken,
  parseMapboxPlaceSearchResults,
} from '@/features/map/map-utils';

describe('map utilities', () => {
  it('accepts Mapbox public access tokens only', () => {
    expect(hasMapboxAccessToken('pk.example-token')).toBe(true);
    expect(hasMapboxAccessToken('sk.private-token')).toBe(false);
    expect(hasMapboxAccessToken(undefined)).toBe(false);
  });

  it('keeps custom zoom controls within the supported range', () => {
    expect(getNextZoom(MAP_MAX_ZOOM, 'in')).toBe(MAP_MAX_ZOOM);
    expect(getNextZoom(MAP_MIN_ZOOM, 'out')).toBe(MAP_MIN_ZOOM);
    expect(getNextZoom(4, 'in')).toBe(5);
    expect(getNextZoom(4, 'out')).toBe(3);
  });

  it('builds a temporary Mapbox forward-geocoding query', () => {
    expect(buildMapboxPlaceSearchUrl('London, UK', 'pk.test-token')).toBe(
      'https://api.mapbox.com/search/geocode/v6/forward?q=London%2C+UK&limit=5&autocomplete=true&access_token=pk.test-token',
    );
  });

  it('keeps only complete coordinate results from Mapbox', () => {
    expect(
      parseMapboxPlaceSearchResults({
        features: [
          {
            id: 'london',
            geometry: { coordinates: [-0.1276, 51.5072] },
            properties: { name: 'London', full_address: 'London, England, United Kingdom' },
          },
          { id: 'invalid', geometry: { coordinates: [] }, properties: { name: 'Invalid' } },
        ],
      }),
    ).toEqual([
      {
        id: 'london',
        name: 'London',
        fullAddress: 'London, England, United Kingdom',
        coordinate: [-0.1276, 51.5072],
      },
    ]);
  });
});
