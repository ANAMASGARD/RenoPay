import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PublishedMatch } from '@/features/matches/registry';
import type { TicketRecord } from '@/features/tickets/ticket-types';

const MATCH_CACHE_KEY = '@renopay/published_matches_v1';
const LAST_SEEN_BLOCK_KEY = '@renopay/match_discovery_last_block_v1';

const DEMO_STADIUMS = [
  ['Sawai Mansingh Stadium', 26.9124, 75.7873],
  ['Jawaharlal Nehru Stadium, New Delhi', 28.6139, 77.209],
  ['Wankhede Stadium', 19.0607, 72.8562],
  ['Eden Gardens', 22.5646, 88.3433],
  ['M Chinnaswamy Stadium', 12.9788, 77.5996],
  ['GMC Balayogi Athletic Stadium', 17.4103, 78.3436],
  ['Jawaharlal Nehru Stadium, Kochi', 10.0498, 76.3627],
  ['Shree Shiv Chhatrapati Sports Complex', 18.5954, 73.7388],
  ['Narendra Modi Stadium', 23.0917, 72.597],
  ['Indira Gandhi Athletic Stadium', 26.1258, 91.7612],
  ['Jawaharlal Nehru Stadium, Chennai', 13.0627, 80.2792],
  ['Ambedkar Stadium', 28.6372, 77.2431],
] as const;

function isPublishedMatch(value: unknown): value is PublishedMatch {
  if (!value || typeof value !== 'object') return false;
  const match = value as Partial<PublishedMatch>;
  return typeof match.matchId === 'string' && typeof match.eventName === 'string' &&
    typeof match.venue === 'string' && typeof match.saleAddress === 'string' &&
    typeof match.location?.latitude === 'number' && typeof match.location?.longitude === 'number';
}

export async function loadCachedMatches(): Promise<PublishedMatch[]> {
  try {
    const raw = await AsyncStorage.getItem(MATCH_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(parsed) ? parsed.filter(isPublishedMatch) : [];
  } catch {
    return [];
  }
}

export async function saveCachedMatches(matches: PublishedMatch[]): Promise<void> {
  await AsyncStorage.setItem(MATCH_CACHE_KEY, JSON.stringify(matches));
}

export async function loadLastSeenBlock(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SEEN_BLOCK_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveLastSeenBlock(block: number): Promise<void> {
  if (!Number.isFinite(block) || block < 0) return;
  await AsyncStorage.setItem(LAST_SEEN_BLOCK_KEY, String(block));
}

/** Rehydrates a map marker from a locally persisted ticket while RPC indexing catches up. */
export function matchFromTicket(ticket: TicketRecord): PublishedMatch | null {
  const normalizedVenue = ticket.venue.toLowerCase();
  const knownStadium = DEMO_STADIUMS.find(([name]) => normalizedVenue.includes(name.toLowerCase()));
  const location = ticket.location ?? (knownStadium ? { latitude: knownStadium[1], longitude: knownStadium[2], label: knownStadium[0] } : undefined);
  if (!location) return null;
  return {
    matchId: ticket.matchId ?? `local-${ticket.ticketId}`,
    saleAddress: ticket.matchSaleAddress ?? '',
    clubAddress: ticket.receiverAddress,
    eventName: ticket.eventName,
    homeTeam: ticket.homeTeam,
    awayTeam: ticket.awayTeam,
    venue: ticket.venue,
    location,
    startAt: ticket.startAt,
    priceUsdt: ticket.priceUsdt,
    priceAtomic: '0',
    capacity: ticket.quantity,
    remaining: ticket.remainingQuantity,
  };
}

export function mergeMatches(...groups: PublishedMatch[][]): PublishedMatch[] {
  const merged = new Map<string, PublishedMatch>();
  for (const group of groups) {
    for (const match of group) {
      const matchingEntry = [...merged.entries()].find(([, previous]) =>
        (match.saleAddress && previous.saleAddress && match.saleAddress.toLowerCase() === previous.saleAddress.toLowerCase()) ||
        (match.matchId && previous.matchId && match.matchId === previous.matchId) ||
        (match.eventName === previous.eventName && match.venue === previous.venue &&
          Math.abs(match.location.latitude - previous.location.latitude) < 0.00001 &&
          Math.abs(match.location.longitude - previous.location.longitude) < 0.00001),
      );
      const key = matchingEntry?.[0] ?? (match.matchId || match.saleAddress || `${match.location.latitude}:${match.location.longitude}:${match.eventName}`);
      const previous = matchingEntry?.[1];
      merged.set(key, previous ? { ...previous, ...match, saleAddress: match.saleAddress || previous.saleAddress, matchId: match.matchId || previous.matchId } : match);
    }
  }
  return [...merged.values()];
}
