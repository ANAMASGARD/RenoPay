export const MAP_INITIAL_CAMERA = {
  centerCoordinate: [20, 20] as [number, number],
  zoomLevel: 1.2,
  pitch: 0,
  heading: 0,
};

export const MAP_SEARCH_ZOOM = 11;
export const MAP_MIN_ZOOM = 0.7;
export const MAP_MAX_ZOOM = 18;
export const MAP_ATMOSPHERE_STYLE = {
  color: 'rgb(186, 210, 235)',
  highColor: 'rgb(36, 92, 223)',
  horizonBlend: 0.02,
  spaceColor: 'rgb(11, 11, 25)',
  starIntensity: 0.6,
};

export type MapboxPlaceSearchResult = {
  id: string;
  name: string;
  fullAddress: string;
  coordinate: [number, number];
};

type MapboxFeature = {
  id?: unknown;
  geometry?: { coordinates?: unknown };
  properties?: { name?: unknown; full_address?: unknown; place_formatted?: unknown };
};

export function hasMapboxAccessToken(token: string | undefined): boolean {
  return Boolean(token?.trim().startsWith('pk.'));
}

export function getNextZoom(currentZoom: number, direction: 'in' | 'out'): number {
  const delta = direction === 'in' ? 1 : -1;
  return Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, currentZoom + delta));
}

export function buildMapboxPlaceSearchUrl(query: string, accessToken: string): string {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: '5',
    autocomplete: 'true',
    access_token: accessToken.trim(),
  });

  return `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`;
}

export function parseMapboxPlaceSearchResults(payload: unknown): MapboxPlaceSearchResult[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { features?: unknown }).features)) {
    return [];
  }

  return (payload as { features: MapboxFeature[] }).features.flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    const [longitude, latitude] = Array.isArray(coordinates) ? coordinates : [];
    const name = feature.properties?.name;
    const fullAddress = feature.properties?.full_address ?? feature.properties?.place_formatted;

    if (
      typeof feature.id !== 'string' ||
      typeof longitude !== 'number' ||
      typeof latitude !== 'number' ||
      typeof name !== 'string' ||
      typeof fullAddress !== 'string'
    ) {
      return [];
    }

    return [{ id: feature.id, name, fullAddress, coordinate: [longitude, latitude] as [number, number] }];
  });
}
