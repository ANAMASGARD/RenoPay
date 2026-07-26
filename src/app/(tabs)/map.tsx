import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Atmosphere, Camera, MapView, PointAnnotation, setAccessToken, type Camera as CameraRef, type MapState } from '@rnmapbox/maps';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RenoPayBrand, NeoBrutalShadow } from '@/constants/renopay-brand';
import {
  MAP_ATMOSPHERE_STYLE,
  MAP_INITIAL_CAMERA,
  MAP_SEARCH_ZOOM,
  buildMapboxPlaceSearchUrl,
  getNextZoom,
  hasMapboxAccessToken,
  parseMapboxPlaceSearchResults,
  type MapboxPlaceSearchResult,
} from '@/features/map/map-utils';
import { fetchPublishedMatches, fetchRemainingCapacity, getPublishedMatchFromTransaction, isMatchRegistryConfigured, type EvmAccountExtension, type PublishedMatch } from '@/features/matches/registry';
import { loadCachedMatches, matchFromTicket, mergeMatches, saveCachedMatches } from '@/features/matches/match-storage';
import { loadTickets, upsertTicket } from '@/features/tickets/ticket-storage';
import { useAccount } from '@/features/wdk/wdk-hooks';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (hasMapboxAccessToken(mapboxAccessToken)) {
  void setAccessToken(mapboxAccessToken!.trim());
}

type MapStatus =
  | { kind: 'loading'; message: string }
  | { kind: 'ready'; message: string }
  | { kind: 'error'; message: string; action?: 'reload' };

export default function MapScreen() {
  const cameraRef = useRef<CameraRef>(null);
  const router = useRouter();
  const isFocused = useIsFocused();
  const [cameraZoom, setCameraZoom] = useState(MAP_INITIAL_CAMERA.zoomLevel);
  const [mapReloadKey, setMapReloadKey] = useState(0);
  const [status, setStatus] = useState<MapStatus>({ kind: 'loading', message: 'LOADING THE PITCH...' });
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapboxPlaceSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<PublishedMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<PublishedMatch | null>(null);
  const account = useAccount({ network: 'ethereum', accountIndex: 0 }) as unknown as { address: string | null; extension: <T extends object>() => T };
  const { extension } = account;
  const extensionRef = useRef(extension);
  extensionRef.current = extension;

  const hasToken = hasMapboxAccessToken(mapboxAccessToken);

  const refreshMatches = useCallback(async () => {
    const tickets = await loadTickets();
    const cached = await loadCachedMatches();
    const localMatches = tickets.map(matchFromTicket).filter((match): match is PublishedMatch => Boolean(match));
    // Render durable local/cached pins before any RPC or bundler request.
    // A slow UserOperation lookup must never leave the map visually empty.
    const durableFallback = mergeMatches(cached, localMatches);
    if (durableFallback.length > 0) setMatches(durableFallback);

    const pendingTickets = tickets.filter((ticket) => ticket.registryTxHash && (!ticket.matchId || !ticket.matchSaleAddress));
    const resolvedPending = await Promise.all(pendingTickets.map(async (ticket) => {
      try {
        const resolved = await Promise.race([
          getPublishedMatchFromTransaction(ticket.registryTxHash!, extensionRef.current<EvmAccountExtension>()),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);
        if (resolved) {
          await upsertTicket({ ...ticket, matchId: resolved.matchId, matchSaleAddress: resolved.saleAddress, location: resolved.location, updatedAt: new Date().toISOString() });
          return resolved;
        }
      } catch {
        // Keep the local pin visible while the UserOperation propagates.
      }
      return null;
    }));
    const resolvedLocalMatches = mergeMatches(
      localMatches,
      resolvedPending.filter((match): match is PublishedMatch => Boolean(match)),
    );

    try {
      const discovered = isMatchRegistryConfigured() ? await fetchPublishedMatches() : [];
      const withCapacity = await Promise.all(discovered.map(async (match) => ({ ...match, remaining: match.saleAddress ? await fetchRemainingCapacity(match.saleAddress).catch(() => undefined) : match.remaining })));
      const nextMatches = mergeMatches(cached, resolvedLocalMatches, withCapacity);
      setMatches(nextMatches);
      await saveCachedMatches(nextMatches);
    } catch {
      setMatches(durableFallback);
      setStatus({ kind: 'error', message: durableFallback.length > 0 ? 'SHOWING SAVED MATCH PINS — LIVE SYNC RETRYING.' : 'MATCHES COULD NOT SYNC. CHECK YOUR CONNECTION.', action: 'reload' });
    }
  }, []);

  useEffect(() => { if (isFocused) void refreshMatches(); }, [isFocused, refreshMatches]);

  const changeZoom = (direction: 'in' | 'out') => {
    const nextZoom = getNextZoom(cameraZoom, direction);
    cameraRef.current?.zoomTo(nextZoom, 300);
    setCameraZoom(nextZoom);
  };

  const openSearch = () => {
    setSearchError(null);
    setSearchResults([]);
    setIsSearchVisible(true);
  };

  const searchPlaces = async () => {
    const searchText = query.trim();
    if (!searchText || !mapboxAccessToken) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const response = await fetch(buildMapboxPlaceSearchUrl(searchText, mapboxAccessToken));
      if (!response.ok) {
        throw new Error(`Mapbox search failed with ${response.status}`);
      }

      const results = parseMapboxPlaceSearchResults(await response.json());
      setSearchResults(results);
      if (results.length === 0) setSearchError('NO PLACES FOUND. TRY A CITY, STADIUM, OR ADDRESS.');
    } catch {
      setSearchError('SEARCH COULD NOT CONNECT. CHECK YOUR INTERNET AND TRY AGAIN.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = (place: MapboxPlaceSearchResult) => {
    Keyboard.dismiss();
    setIsSearchVisible(false);
    cameraRef.current?.setCamera({
      centerCoordinate: place.coordinate,
      zoomLevel: MAP_SEARCH_ZOOM,
      pitch: 0,
      animationDuration: 1200,
      animationMode: 'flyTo',
    });
    setCameraZoom(MAP_SEARCH_ZOOM);
    setStatus({ kind: 'ready', message: `MAP CENTERED: ${place.name.toUpperCase()}` });
  };

  const buySelectedMatch = () => {
    if (!selectedMatch || !account.address) { Alert.alert('Wallet required', 'Connect your wallet before buying a match ticket.'); return; }
    if ((selectedMatch.remaining ?? 0) < 1) { Alert.alert('Sold out', 'This event is sold out.'); return; }
    if (!selectedMatch.saleAddress) { Alert.alert('Purchase unavailable', 'This saved marker is waiting for its on-chain sale address to sync.'); return; }
    router.push({ pathname: '/pay', params: {
      saleAddress: selectedMatch.saleAddress,
      matchId: selectedMatch.matchId,
      eventName: selectedMatch.eventName,
      homeTeam: selectedMatch.homeTeam,
      awayTeam: selectedMatch.awayTeam,
      venue: selectedMatch.venue,
      priceUsdt: selectedMatch.priceUsdt,
      capacity: String(selectedMatch.capacity),
      remaining: String(selectedMatch.remaining ?? selectedMatch.capacity),
      startAt: selectedMatch.startAt,
      clubAddress: selectedMatch.clubAddress,
    }} as never);
  };

  const handleMapReady = () => setStatus({ kind: 'ready', message: 'SEARCH A PLACE OR DRAG THE GLOBE' });
  const handleCameraChanged = (state: MapState) => setCameraZoom(state.properties.zoom);

  if (!hasToken) {
    return (
      <MapShell>
        <View style={styles.setupCard}>
          <MaterialCommunityIcons name="key-alert-outline" size={42} color={RenoPayBrand.primary} />
          <Text style={styles.setupTitle}>MAP TOKEN NEEDED</Text>
          <Text style={styles.setupCopy}>Add a Mapbox public token to EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local, then reload Reno Pay.</Text>
        </View>
      </MapShell>
    );
  }

  return (
    <MapShell>
      <MapView
        key={mapReloadKey}
        style={StyleSheet.absoluteFill}
        styleURL="mapbox://styles/mapbox/satellite-streets-v12"
        projection="globe"
        preferredFramesPerSecond={60}
        requestDisallowInterceptTouchEvent
        logoEnabled
        attributionEnabled
        compassEnabled={false}
        scaleBarEnabled={false}
        onDidFinishLoadingMap={handleMapReady}
        onDidFailLoadingMap={() => setStatus({ kind: 'error', message: 'THE MAP COULD NOT LOAD. CHECK YOUR CONNECTION.', action: 'reload' })}
        onCameraChanged={handleCameraChanged}>
        <Camera ref={cameraRef} defaultSettings={MAP_INITIAL_CAMERA} minZoomLevel={0.7} maxZoomLevel={18} />
        <Atmosphere style={MAP_ATMOSPHERE_STYLE} />
        {matches.map((match) => <PointAnnotation key={match.matchId} id={match.matchId} coordinate={[match.location.longitude, match.location.latitude]} onSelected={() => { setSelectedMatch(match); cameraRef.current?.setCamera({ centerCoordinate: [match.location.longitude, match.location.latitude], zoomLevel: MAP_SEARCH_ZOOM, animationDuration: 900, animationMode: 'flyTo' }); }}><View style={styles.redMatchPin}><View style={styles.redMatchCore} /></View></PointAnnotation>)}
      </MapView>

      <View pointerEvents="none" style={styles.topOverlay}>
        <View style={styles.titlePlate}>
          <Text style={styles.title}>MATCH MAP</Text>
          <Text style={styles.subtitle}>GLOBAL KICKOFF VIEW</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.zoomRail}>
          <MapControl icon="plus" label="Zoom in" onPress={() => changeZoom('in')} />
          <View style={styles.controlDivider} />
          <MapControl icon="minus" label="Zoom out" onPress={() => changeZoom('out')} />
        </View>
        <MapControl icon="magnify" label="Search for a location" onPress={openSearch} primary />
      </View>

      <View style={styles.bottomOverlay}>
        <View style={[styles.statusPlate, status.kind === 'error' && styles.statusError]}>
          <MaterialCommunityIcons name={status.kind === 'error' ? 'alert-circle-outline' : status.kind === 'loading' ? 'radar' : 'earth'} size={17} color={status.kind === 'error' ? RenoPayBrand.foreground : RenoPayBrand.primary} />
          <Text style={styles.statusText}>{status.message}</Text>
          {status.kind === 'error' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Reload map" onPress={() => { setStatus({ kind: 'loading', message: 'RELOADING THE PITCH...' }); setMapReloadKey((key) => key + 1); }} style={styles.statusAction}>
              <Text style={styles.statusActionText}>RELOAD</Text>
            </Pressable>
          ) : null}
        </View>
        {selectedMatch ? <View style={styles.matchCard}><Text style={styles.matchTitle}>{selectedMatch.eventName}</Text><Text style={styles.matchCopy}>{selectedMatch.homeTeam} vs {selectedMatch.awayTeam}</Text><Text style={styles.matchCopy}>{selectedMatch.venue} · {selectedMatch.priceUsdt} USDT</Text><Text style={styles.matchCopy}>KICKOFF: {new Date(selectedMatch.startAt).toLocaleString()}</Text><Text style={styles.matchCopy}>{selectedMatch.remaining ?? '…'} / {selectedMatch.capacity} SEATS LEFT</Text><View style={styles.matchActions}><Pressable accessibilityRole="button" onPress={buySelectedMatch} style={styles.matchBuy}><Text style={styles.matchCloseText}>BUY 1</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setSelectedMatch(null)} style={styles.matchClose}><Text style={styles.matchCloseText}>CLOSE</Text></Pressable></View></View> : null}
      </View>

      <PlaceSearchModal
        visible={isSearchVisible}
        query={query}
        results={searchResults}
        isSearching={isSearching}
        error={searchError}
        onChangeQuery={setQuery}
        onClose={() => { Keyboard.dismiss(); setIsSearchVisible(false); }}
        onSearch={() => void searchPlaces()}
        onSelect={selectPlace}
      />
    </MapShell>
  );
}

function PlaceSearchModal({ visible, query, results, isSearching, error, onChangeQuery, onClose, onSearch, onSelect }: {
  visible: boolean;
  query: string;
  results: MapboxPlaceSearchResult[];
  isSearching: boolean;
  error: string | null;
  onChangeQuery: (value: string) => void;
  onClose: () => void;
  onSearch: () => void;
  onSelect: (place: MapboxPlaceSearchResult) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={24} style={styles.keyboardAvoider}>
        <View style={styles.searchPanel}>
          <View style={styles.searchHeader}>
            <View>
              <Text style={styles.searchTitle}>FIND A PLACE</Text>
              <Text style={styles.searchHint}>SEARCH A CITY, STADIUM, OR ADDRESS</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close place search" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={RenoPayBrand.border} />
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              autoFocus
              accessibilityLabel="Location search query"
              value={query}
              onChangeText={onChangeQuery}
              onSubmitEditing={onSearch}
              placeholder="e.g. Wembley Stadium"
              placeholderTextColor={RenoPayBrand.muted}
              returnKeyType="search"
              style={styles.searchInput}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Search places" onPress={onSearch} disabled={!query.trim() || isSearching} style={({ pressed }) => [styles.searchButton, (!query.trim() || isSearching) && styles.searchButtonDisabled, pressed && styles.controlPressed]}>
              {isSearching ? <ActivityIndicator color={RenoPayBrand.border} /> : <MaterialCommunityIcons name="magnify" size={25} color={RenoPayBrand.border} />}
            </Pressable>
          </View>
          {error ? <Text style={styles.searchFeedback}>{error}</Text> : null}
          {results.map((place) => (
            <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={`Center map on ${place.name}`} onPress={() => onSelect(place)} style={({ pressed }) => [styles.placeResult, pressed && styles.resultPressed]}>
              <MaterialCommunityIcons name="map-marker" size={22} color={RenoPayBrand.primary} />
              <View style={styles.placeCopy}>
                <Text numberOfLines={1} style={styles.placeName}>{place.name}</Text>
                <Text numberOfLines={2} style={styles.placeAddress}>{place.fullAddress}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-top-right" size={20} color={RenoPayBrand.foreground} />
            </Pressable>
          ))}
          {!isSearching && !error && results.length === 0 ? <Text style={styles.searchFeedback}>SEARCH RESULTS ARE TEMPORARY AND ARE NOT SAVED BY MESHiPAY.</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MapShell({ children }: { children: React.ReactNode }) {
  return <SafeAreaView edges={['top']} style={styles.container}>{children}</SafeAreaView>;
}

function MapControl({ icon, label, onPress, primary = false }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.controlButton, primary && styles.primaryControl, pressed && styles.controlPressed]}>
      <MaterialCommunityIcons name={icon} size={primary ? 28 : 30} color={RenoPayBrand.border} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: RenoPayBrand.background },
  topOverlay: { position: 'absolute', top: 12, left: 16, right: 88 },
  titlePlate: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 9, borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 10, backgroundColor: RenoPayBrand.glass, ...NeoBrutalShadow.sm },
  title: { color: RenoPayBrand.primary, fontSize: 19, fontWeight: '900', letterSpacing: 1.3 },
  subtitle: { marginTop: 2, color: RenoPayBrand.foreground, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  controls: { position: 'absolute', top: 116, right: 16, gap: 14, alignItems: 'center' },
  zoomRail: { overflow: 'hidden', borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 12, backgroundColor: RenoPayBrand.cream, ...NeoBrutalShadow.md },
  controlDivider: { height: 2, backgroundColor: RenoPayBrand.border },
  controlButton: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: RenoPayBrand.cream },
  primaryControl: { borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 14, backgroundColor: RenoPayBrand.primary, ...NeoBrutalShadow.md },
  controlPressed: { transform: [{ translateX: 3 }, { translateY: 3 }], shadowOpacity: 0, elevation: 0 },
  bottomOverlay: { position: 'absolute', right: 16, bottom: Platform.select({ android: 106, default: 96 }), left: 16 },
  statusPlate: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 12, backgroundColor: RenoPayBrand.glass, ...NeoBrutalShadow.sm },
  statusError: { backgroundColor: RenoPayBrand.accentGreen },
  statusText: { flex: 1, color: RenoPayBrand.foreground, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  statusAction: { paddingHorizontal: 8, paddingVertical: 5, borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 6, backgroundColor: RenoPayBrand.primary },
  statusActionText: { color: RenoPayBrand.border, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  matchCard: { marginTop: 10, borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 12, backgroundColor: RenoPayBrand.backgroundElevated, padding: 12, ...NeoBrutalShadow.sm },
  matchTitle: { color: RenoPayBrand.primary, fontSize: 15, fontWeight: '900' },
  matchCopy: { color: RenoPayBrand.foreground, marginTop: 3, fontSize: 11, fontWeight: '700' },
  matchClose: { alignSelf: 'flex-end', marginTop: 8, borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 6, backgroundColor: RenoPayBrand.primary, paddingHorizontal: 8, paddingVertical: 4 },
  matchCloseText: { color: RenoPayBrand.border, fontSize: 10, fontWeight: '900' },
  matchActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  matchBuy: { borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 6, backgroundColor: RenoPayBrand.primary, paddingHorizontal: 8, paddingVertical: 4 },
  redMatchPin: { width: 30, height: 30, borderRadius: 18, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#D71920', alignItems: 'center', justifyContent: 'center' },
  redMatchCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  setupCard: { alignSelf: 'center', width: '86%', marginTop: '52%', alignItems: 'center', padding: 24, borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 14, backgroundColor: RenoPayBrand.backgroundElevated, ...NeoBrutalShadow.md },
  setupTitle: { marginTop: 14, color: RenoPayBrand.primary, fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  setupCopy: { marginTop: 8, color: RenoPayBrand.muted, fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.56)' },
  keyboardAvoider: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.56)' },
  searchPanel: { minHeight: 430, maxHeight: '86%', paddingTop: 26, paddingHorizontal: 18, paddingBottom: 22, borderTopWidth: 3, borderColor: RenoPayBrand.border, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: RenoPayBrand.backgroundElevated, ...NeoBrutalShadow.md },
  searchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  searchTitle: { color: RenoPayBrand.primary, fontSize: 21, fontWeight: '900', letterSpacing: 1.1 },
  searchHint: { marginTop: 3, color: RenoPayBrand.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 10, backgroundColor: RenoPayBrand.cream },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1, height: 52, paddingHorizontal: 13, borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 10, color: RenoPayBrand.foreground, backgroundColor: RenoPayBrand.background, fontSize: 15, fontWeight: '700' },
  searchButton: { width: 54, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: RenoPayBrand.border, borderRadius: 10, backgroundColor: RenoPayBrand.primary, ...NeoBrutalShadow.sm },
  searchButtonDisabled: { opacity: 0.55 },
  searchFeedback: { marginTop: 16, color: RenoPayBrand.muted, fontSize: 11, fontWeight: '800', lineHeight: 16, letterSpacing: 0.4 },
  placeResult: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 12, borderWidth: 2, borderColor: RenoPayBrand.border, borderRadius: 10, backgroundColor: RenoPayBrand.accentGreen },
  resultPressed: { transform: [{ translateY: 2 }] },
  placeCopy: { flex: 1 },
  placeName: { color: RenoPayBrand.foreground, fontSize: 14, fontWeight: '900' },
  placeAddress: { marginTop: 2, color: RenoPayBrand.muted, fontSize: 11, fontWeight: '600', lineHeight: 15 },
});
