import { Camera, MapView, PointAnnotation, setAccessToken, type Camera as CameraRef } from '@rnmapbox/maps';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RenoPayBrand, NeoBrutalShadow } from '@/constants/renopay-brand';
import { buildMapboxPlaceSearchUrl, MAP_INITIAL_CAMERA, MAP_SEARCH_ZOOM, hasMapboxAccessToken, parseMapboxPlaceSearchResults, type MapboxPlaceSearchResult } from '@/features/map/map-utils';
import type { EventLocation } from '@/features/tickets/ticket-types';

const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (hasMapboxAccessToken(token)) void setAccessToken(token!.trim());

export function EventLocationPicker({ value, onChange }: { value?: EventLocation; onChange: (location: EventLocation) => void }) {
  const cameraRef = useRef<CameraRef>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MapboxPlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  useEffect(() => {
    if (!value) return;
    setLatitudeText(String(value.latitude)); setLongitudeText(String(value.longitude));
    cameraRef.current?.setCamera({ centerCoordinate: [value.longitude, value.latitude], zoomLevel: 14, animationDuration: 800, animationMode: 'flyTo' });
  }, [value]);
  const search = async () => {
    if (!query.trim() || !token) return;
    setSearching(true); setError(null);
    try {
      const response = await fetch(buildMapboxPlaceSearchUrl(query, token));
      if (!response.ok) throw new Error('Mapbox search failed');
      const next = parseMapboxPlaceSearchResults(await response.json());
      setResults(next); if (!next.length) setError('NO STADIUM OR VENUE FOUND');
    } catch { setError('SEARCH COULD NOT CONNECT'); } finally { setSearching(false); }
  };
  const applyCoordinates = () => {
    const latitude = Number(latitudeText); const longitude = Number(longitudeText);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) { setError('ENTER VALID LATITUDE AND LONGITUDE'); return; }
    onChange({ latitude, longitude, label: 'Coordinate pin' }); setError(null);
    cameraRef.current?.setCamera({ centerCoordinate: [longitude, latitude], zoomLevel: MAP_SEARCH_ZOOM, animationDuration: 800, animationMode: 'flyTo' });
  };
  const choose = (place: MapboxPlaceSearchResult) => {
    onChange({ longitude: place.coordinate[0], latitude: place.coordinate[1], label: place.fullAddress });
    setQuery(place.name); setResults([]);
    cameraRef.current?.setCamera({ centerCoordinate: place.coordinate, zoomLevel: MAP_SEARCH_ZOOM, animationDuration: 800, animationMode: 'flyTo' });
  };
  if (!hasMapboxAccessToken(token)) {
    return <View style={styles.missing}><Text style={styles.copy}>ADD A MAPBOX PUBLIC TOKEN TO SELECT THE PUBLIC EVENT PIN.</Text></View>;
  }
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>EVENT LOCATION — TAP THE MAP TO DROP THE PUBLIC PIN</Text>
      <View style={styles.searchRow}>
        <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} placeholder="Search Indian stadium or venue" placeholderTextColor={RenoPayBrand.muted} style={styles.searchInput} returnKeyType="search" />
        <Pressable accessibilityRole="button" onPress={() => void search()} style={styles.searchButton}>{searching ? <ActivityIndicator color={RenoPayBrand.border} /> : <Text style={styles.searchButtonText}>GO</Text>}</Pressable>
      </View>
      <View style={styles.coordinateRow}>
        <TextInput value={latitudeText} onChangeText={setLatitudeText} placeholder="Latitude" placeholderTextColor={RenoPayBrand.muted} keyboardType="decimal-pad" style={styles.coordinateInput} />
        <TextInput value={longitudeText} onChangeText={setLongitudeText} placeholder="Longitude" placeholderTextColor={RenoPayBrand.muted} keyboardType="decimal-pad" style={styles.coordinateInput} />
        <Pressable accessibilityRole="button" onPress={applyCoordinates} style={styles.coordinateButton}><Text style={styles.searchButtonText}>PIN</Text></Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {results.map((place) => <Pressable key={place.id} onPress={() => choose(place)} style={styles.result}><Text style={styles.resultName}>{place.name}</Text><Text style={styles.resultAddress}>{place.fullAddress}</Text></Pressable>)}
      <MapView style={styles.map} styleURL="mapbox://styles/mapbox/satellite-streets-v12" onPress={(event) => onChange({ longitude: event.geometry.coordinates[0], latitude: event.geometry.coordinates[1], label: 'Map pin' })}>
        <Camera ref={cameraRef} defaultSettings={MAP_INITIAL_CAMERA} />
        {value ? <PointAnnotation id="event-pin" coordinate={[value.longitude, value.latitude]}><View style={styles.redPin}><View style={styles.redPinCore} /></View></PointAnnotation> : null}
      </MapView>
      <Text style={styles.copy}>{value ? `${value.label ?? 'Selected venue'} · ${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)} — PUBLIC ON SEPOLIA` : 'NO PIN SELECTED'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12, borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 12, overflow: 'hidden', backgroundColor: RenoPayBrand.backgroundElevated, ...NeoBrutalShadow.sm },
  label: { padding: 10, color: RenoPayBrand.primary, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  map: { height: 190 },
  copy: { padding: 10, color: RenoPayBrand.muted, fontSize: 11, fontWeight: '800', lineHeight: 16 },
  searchRow: { flexDirection: 'row', gap: 6, padding: 10, paddingBottom: 6 },
  searchInput: { flex: 1, height: 42, borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 8, paddingHorizontal: 10, color: RenoPayBrand.foreground, backgroundColor: RenoPayBrand.background, fontSize: 12 },
  searchButton: { width: 48, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 8, backgroundColor: RenoPayBrand.primary },
  searchButtonText: { color: RenoPayBrand.border, fontSize: 11, fontWeight: '900' },
  coordinateRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingBottom: 6 },
  coordinateInput: { flex: 1, height: 36, borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 8, paddingHorizontal: 8, color: RenoPayBrand.foreground, backgroundColor: RenoPayBrand.background, fontSize: 11 },
  coordinateButton: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 8, backgroundColor: RenoPayBrand.primary },
  error: { paddingHorizontal: 10, paddingBottom: 6, color: RenoPayBrand.primary, fontSize: 10, fontWeight: '900' },
  result: { marginHorizontal: 10, marginBottom: 4, padding: 8, borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 8, backgroundColor: RenoPayBrand.accentGreen },
  resultName: { color: RenoPayBrand.foreground, fontSize: 12, fontWeight: '900' },
  resultAddress: { color: RenoPayBrand.muted, fontSize: 10, marginTop: 2 },
  redPin: { width: 28, height: 28, borderRadius: 16, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#D71920', alignItems: 'center', justifyContent: 'center' },
  redPinCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  missing: { marginBottom: 12, borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 12, backgroundColor: RenoPayBrand.backgroundElevated },
});
