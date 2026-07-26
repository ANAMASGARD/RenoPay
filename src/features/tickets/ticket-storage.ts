import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildTicketOfferQr, createCheckInCode, createReceiptId } from '@/features/tickets/qr-payload';
import { buildTicketProofQr } from '@/features/tickets/ticket-proof';
import type {
  AttendeeRecord,
  PaymentSession,
  TicketDraftInput,
  TicketRecord,
} from '@/features/tickets/ticket-types';
import type { PublishedMatch } from '@/features/matches/registry';

const TICKETS_KEY = '@renopay/tickets_v2';
const ATTENDEES_KEY = '@renopay/attendees_v1';
const SESSIONS_KEY = '@renopay/sessions_v1';
const PAID_SESSIONS_KEY = '@renopay/paid_sessions_v1';
const CONSUMED_PROOFS_KEY = '@renopay/consumed_proofs_v1';

function nowIso(): string {
  return new Date().toISOString();
}

function parseArray<T>(raw: string | null, guard: (item: unknown) => item is T): T[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(guard);
  } catch {
    return [];
  }
}

function isTicketRecord(item: unknown): item is TicketRecord {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as TicketRecord).ticketId === 'string' &&
    typeof (item as TicketRecord).eventName === 'string'
  );
}

function isAttendeeRecord(item: unknown): item is AttendeeRecord {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as AttendeeRecord).attendeeId === 'string'
  );
}

export async function loadTickets(): Promise<TicketRecord[]> {
  const raw = await AsyncStorage.getItem(TICKETS_KEY);
  return parseArray(raw, isTicketRecord);
}

export async function saveTickets(tickets: TicketRecord[]): Promise<void> {
  await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

export async function loadAttendees(): Promise<AttendeeRecord[]> {
  const raw = await AsyncStorage.getItem(ATTENDEES_KEY);
  return parseArray(raw, isAttendeeRecord);
}

export async function saveAttendees(attendees: AttendeeRecord[]): Promise<void> {
  await AsyncStorage.setItem(ATTENDEES_KEY, JSON.stringify(attendees));
}

export async function clearTicketData(): Promise<void> {
  await AsyncStorage.multiRemove([TICKETS_KEY, ATTENDEES_KEY, SESSIONS_KEY, PAID_SESSIONS_KEY, CONSUMED_PROOFS_KEY]);
}

export async function isTicketProofConsumed(ticketId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(CONSUMED_PROOFS_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.includes(ticketId);
  } catch {
    return false;
  }
}

export async function consumeTicketProof(ticketId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(CONSUMED_PROOFS_KEY);
  let consumed: string[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    consumed = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    consumed = [];
  }
  if (!consumed.includes(ticketId)) {
    await AsyncStorage.setItem(CONSUMED_PROOFS_KEY, JSON.stringify([ticketId, ...consumed]));
  }
}

export async function loadPaidSessions(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PAID_SESSIONS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function isSessionPaid(sessionId: string): Promise<boolean> {
  const paid = await loadPaidSessions();
  return paid.includes(sessionId);
}

export async function markSessionPaid(sessionId: string): Promise<void> {
  const paid = await loadPaidSessions();
  if (paid.includes(sessionId)) {
    return;
  }
  await AsyncStorage.setItem(PAID_SESSIONS_KEY, JSON.stringify([sessionId, ...paid]));
}

function isPaymentSession(item: unknown): item is PaymentSession {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as PaymentSession).sessionId === 'string'
  );
}

export async function loadPaymentSessions(): Promise<PaymentSession[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  return parseArray(raw, isPaymentSession);
}

export async function savePaymentSession(session: PaymentSession): Promise<void> {
  const sessions = await loadPaymentSessions();
  const index = sessions.findIndex((item) => item.sessionId === session.sessionId);
  const next = [...sessions];
  if (index >= 0) {
    next[index] = session;
  } else {
    next.unshift(session);
  }
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
}

export async function getPaymentSession(sessionId: string): Promise<PaymentSession | null> {
  const sessions = await loadPaymentSessions();
  return sessions.find((item) => item.sessionId === sessionId) ?? null;
}

export function createTicketFromDraft(
  input: TicketDraftInput,
  receiverAddress: string,
): TicketRecord {
  const timestamp = nowIso();
  return {
    ticketId: `ticket-${Date.now()}`,
    kind: 'issued',
    eventName: input.eventName.trim(),
    homeTeam: input.homeTeam.trim(),
    awayTeam: input.awayTeam.trim(),
    venue: input.venue.trim(),
    gate: input.gate.trim(),
    seatLabel: input.seatLabel.trim(),
    startAt: input.startAt,
    endAt: input.endAt,
    priceUsdt: input.priceUsdt.trim(),
    currency: 'USDT_SEPOLIA',
    quantity: input.quantity,
    remainingQuantity: input.quantity,
    location: input.location,
    receiverAddress,
    status: 'draft',
    checkInCode: createCheckInCode(),
    notes: input.notes?.trim(),
    imageUri: input.imageUri,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function createTicketFromDraftWithQr(
  input: TicketDraftInput,
  receiverAddress: string,
): Promise<TicketRecord> {
  const ticket = createTicketFromDraft(input, receiverAddress);
  const offerQr = await buildTicketOfferQr({ ticket, receiverAddress });
  return {
    ...ticket,
    ticketQrPayload: JSON.stringify(offerQr),
  };
}

export async function upsertTicket(ticket: TicketRecord): Promise<TicketRecord[]> {
  const tickets = await loadTickets();
  const index = tickets.findIndex((item) => item.ticketId === ticket.ticketId);
  const next = [...tickets];
  if (index >= 0) {
    next[index] = ticket;
  } else {
    next.unshift(ticket);
  }
  await saveTickets(next);
  return next;
}

export async function getTicketById(ticketId: string): Promise<TicketRecord | null> {
  const tickets = await loadTickets();
  return tickets.find((ticket) => ticket.ticketId === ticketId) ?? null;
}

export async function addReceivedTicket(ticket: TicketRecord): Promise<TicketRecord[]> {
  const tickets = await loadTickets();
  const next = [{ ...ticket, kind: 'received' as const }, ...tickets];
  await saveTickets(next);
  return next;
}

/** Local proof after a decentralized MatchSale purchase; no inventory is stored remotely. */
export async function mintReceivedTicketFromMatch(params: { match: PublishedMatch; quantity: number; senderAddress: string; txHash: string }): Promise<TicketRecord[]> {
  const timestamp = nowIso();
  const sessionId = `match-${params.match.matchId}`;
  const ticket: TicketRecord = {
    ticketId: `match-${params.match.matchId}-${params.txHash.slice(2, 10)}`,
    kind: 'received', eventName: params.match.eventName, homeTeam: params.match.homeTeam, awayTeam: params.match.awayTeam,
    venue: params.match.venue, gate: 'EVENT GATE', seatLabel: `${params.quantity} GENERAL ADMISSION`,
    startAt: params.match.startAt,
    endAt: new Date(new Date(params.match.startAt).getTime() + 2 * 60 * 60 * 1000).toISOString(),
    priceUsdt: params.match.priceUsdt,
    currency: 'USDT_SEPOLIA', quantity: params.quantity, remainingQuantity: params.quantity,
    receiverAddress: params.match.clubAddress, senderAddress: params.senderAddress, sessionId, receiptId: createReceiptId(), txHash: params.txHash,
    status: 'transferred', checkInCode: createCheckInCode(), location: params.match.location,
    matchSaleAddress: params.match.saleAddress, matchId: params.match.matchId, createdAt: timestamp, updatedAt: timestamp,
  };
  const proofQr = await buildTicketProofQr(ticket);
  return addReceivedTicket(proofQr ? { ...ticket, ticketQrPayload: proofQr } : ticket);
}

export async function addAttendee(attendee: AttendeeRecord): Promise<AttendeeRecord[]> {
  const attendees = await loadAttendees();
  const next = [attendee, ...attendees];
  await saveAttendees(next);
  return next;
}
