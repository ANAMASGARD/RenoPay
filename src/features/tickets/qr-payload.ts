import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import { decryptJson, encryptJson, normalizeReceiverAddress } from '@/features/tickets/qr-crypto';
import type { TicketRecord } from '@/features/tickets/ticket-types';

const currencyLiteral = z.literal('USDT_SEPOLIA');
const PAYMENT_ENCRYPTED_KIND = 'renopay-ticket-session-encrypted' as const;

/** Full payment QR payload — ticket envelope for local mint after WDK pay. */
export const qrPayloadEnvelopeSchema = z.object({
  v: z.literal(1),
  kind: z.literal('renopay-ticket-session'),
  sessionId: z.string().min(1),
  receiverAddress: z.string().min(1),
  ticketId: z.string().min(1),
  priceUsdt: z.string().min(1),
  eventName: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  venue: z.string().min(1),
  gate: z.string().min(1),
  seatLabel: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  currency: currencyLiteral,
  checkInCode: z.string().min(1),
  matchSaleAddress: z.string().min(1).optional(),
  expiresAt: z.number(),
  payloadHash: z.string().min(1),
  imageUri: z.string().optional(),
});

export const ticketOfferQrSchema = z.object({
  v: z.literal(1),
  kind: z.literal('renopay-ticket-offer'),
  ticketId: z.string().min(1),
  receiverAddress: z.string().min(1),
  eventName: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  venue: z.string().min(1),
  gate: z.string().min(1),
  seatLabel: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  priceUsdt: z.string().min(1),
  checkInCode: z.string().min(1),
  currency: currencyLiteral,
  payloadHash: z.string().min(1),
});

export const encryptedPaymentShellSchema = z.object({
  v: z.literal(2),
  kind: z.literal(PAYMENT_ENCRYPTED_KIND),
  sessionId: z.string().min(1),
  receiverAddress: z.string().min(1),
  expiresAt: z.number(),
  nonce: z.string().min(1),
  ciphertext: z.string().min(1),
});

export type QrPayloadEnvelope = z.infer<typeof qrPayloadEnvelopeSchema>;
export type QrPayload = QrPayloadEnvelope;
export type TicketOfferQr = z.infer<typeof ticketOfferQrSchema>;
export type EncryptedPaymentShell = z.infer<typeof encryptedPaymentShellSchema>;

/** @deprecated Use qrPayloadEnvelopeSchema */
export const qrPayloadSchema = qrPayloadEnvelopeSchema;

/** Stable field order for QR hashing — never include imageUri (too large / inconsistent). */
const QR_HASH_FIELD_ORDER = [
  'v',
  'kind',
  'sessionId',
  'receiverAddress',
  'ticketId',
  'priceUsdt',
  'eventName',
  'homeTeam',
  'awayTeam',
  'venue',
  'gate',
  'seatLabel',
  'startAt',
  'endAt',
  'currency',
  'checkInCode',
  'matchSaleAddress',
  'expiresAt',
] as const;

function buildPaymentShellAad(shell: EncryptedPaymentShell): Record<string, unknown> {
  return {
    v: shell.v,
    kind: shell.kind,
    sessionId: shell.sessionId,
    receiverAddress: normalizeReceiverAddress(shell.receiverAddress),
    expiresAt: shell.expiresAt,
  };
}

function pickHashFields(source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of QR_HASH_FIELD_ORDER) {
    const value = source[key];
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (key === 'receiverAddress' && typeof value === 'string') {
      out[key] = normalizeReceiverAddress(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

async function hashPayloadFields(source: Record<string, unknown>): Promise<string> {
  return hashCanonical(pickHashFields(source));
}

export function serializeQrPayload(payload: QrPayloadEnvelope): string {
  const { payloadHash, ...body } = payload;
  const ordered = pickHashFields(body as Record<string, unknown>);
  return JSON.stringify({ ...ordered, payloadHash });
}

/** Receiver-facing payment QR — ciphertext hides ticket envelope until fan decrypts locally. */
export async function buildEncryptedPaymentQrString(envelope: QrPayloadEnvelope): Promise<string> {
  const shellBase = {
    v: 2 as const,
    kind: PAYMENT_ENCRYPTED_KIND,
    sessionId: envelope.sessionId,
    receiverAddress: envelope.receiverAddress,
    expiresAt: envelope.expiresAt,
  };

  const encrypted = await encryptJson({
    sessionId: envelope.sessionId,
    receiverAddress: envelope.receiverAddress,
    purpose: 'payment',
    plaintext: envelope,
    aad: shellBase,
  });

  const shell: EncryptedPaymentShell = {
    ...shellBase,
    nonce: encrypted.nonce,
    ciphertext: encrypted.ciphertext,
  };

  return JSON.stringify(shell);
}

export function isEncryptedPaymentShell(raw: unknown): raw is EncryptedPaymentShell {
  return encryptedPaymentShellSchema.safeParse(raw).success;
}

export function parseEncryptedPaymentShell(raw: string): EncryptedPaymentShell | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = encryptedPaymentShellSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }
    return {
      ...result.data,
      receiverAddress: normalizeReceiverAddress(result.data.receiverAddress),
    };
  } catch {
    return null;
  }
}

export function decryptPaymentShell(shell: EncryptedPaymentShell): QrPayloadEnvelope | null {
  const decrypted = decryptJson<Record<string, unknown>>({
    sessionId: shell.sessionId,
    receiverAddress: shell.receiverAddress,
    purpose: 'payment',
    nonce: shell.nonce,
    ciphertext: shell.ciphertext,
    aad: buildPaymentShellAad(shell),
  });

  if (!decrypted) {
    return null;
  }

  const envelope = qrPayloadEnvelopeSchema.safeParse(decrypted);
  if (!envelope.success) {
    return null;
  }

  return {
    ...envelope.data,
    receiverAddress: normalizeReceiverAddress(envelope.data.receiverAddress),
  };
}

/** Decrypt v2 payment QR or fall back to legacy v1 plaintext envelope. */
export async function parseAndDecryptPaymentQr(raw: string): Promise<QrPayloadEnvelope | null> {
  const trimmed = raw.trim();
  const shell = parseEncryptedPaymentShell(trimmed);
  if (shell) {
    const decrypted = decryptPaymentShell(shell);
    if (!decrypted) {
      return null;
    }
    if (decrypted.sessionId !== shell.sessionId) {
      return null;
    }
    if (normalizeReceiverAddress(decrypted.receiverAddress) !== shell.receiverAddress) {
      return null;
    }
    if (decrypted.expiresAt !== shell.expiresAt) {
      return null;
    }
    const validHash = await verifyQrPayload(decrypted);
    return validHash ? decrypted : null;
  }

  const legacy = parseQrPayload(trimmed);
  if (!legacy) {
    return null;
  }
  const validHash = await verifyQrPayload(legacy);
  return validHash ? legacy : null;
}

async function hashCanonical(payload: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify(payload);
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
}

export function hasTicketEnvelope(payload: QrPayload): payload is QrPayloadEnvelope {
  return (
    typeof payload.checkInCode === 'string' &&
    typeof payload.eventName === 'string' &&
    typeof payload.homeTeam === 'string' &&
    typeof payload.awayTeam === 'string' &&
    typeof payload.venue === 'string' &&
    typeof payload.gate === 'string' &&
    typeof payload.seatLabel === 'string' &&
    typeof payload.startAt === 'string' &&
    typeof payload.endAt === 'string' &&
    payload.currency === 'USDT_SEPOLIA'
  );
}

export async function buildQrPayload(params: {
  sessionId: string;
  ticket: TicketRecord;
  receiverAddress: string;
  expiresAt: number;
}): Promise<QrPayloadEnvelope> {
  const body: Record<string, unknown> = {
    v: 1,
    kind: 'renopay-ticket-session',
    sessionId: params.sessionId,
    receiverAddress: normalizeReceiverAddress(params.receiverAddress),
    ticketId: params.ticket.ticketId,
    priceUsdt: params.ticket.priceUsdt,
    eventName: params.ticket.eventName,
    homeTeam: params.ticket.homeTeam,
    awayTeam: params.ticket.awayTeam,
    venue: params.ticket.venue,
    gate: params.ticket.gate,
    seatLabel: params.ticket.seatLabel,
    startAt: params.ticket.startAt,
    endAt: params.ticket.endAt,
    currency: 'USDT_SEPOLIA',
    checkInCode: params.ticket.checkInCode,
    matchSaleAddress: params.ticket.matchSaleAddress,
    expiresAt: params.expiresAt,
  };
  const payloadHash = await hashPayloadFields(body);
  const payload = { ...(body as Omit<QrPayloadEnvelope, 'payloadHash'>), payloadHash };
  return payload;
}

export async function buildTicketOfferQr(params: {
  ticket: TicketRecord;
  receiverAddress: string;
}): Promise<TicketOfferQr> {
  const base = {
    v: 1 as const,
    kind: 'renopay-ticket-offer' as const,
    ticketId: params.ticket.ticketId,
    receiverAddress: params.receiverAddress,
    eventName: params.ticket.eventName,
    homeTeam: params.ticket.homeTeam,
    awayTeam: params.ticket.awayTeam,
    venue: params.ticket.venue,
    gate: params.ticket.gate,
    seatLabel: params.ticket.seatLabel,
    startAt: params.ticket.startAt,
    endAt: params.ticket.endAt,
    priceUsdt: params.ticket.priceUsdt,
    checkInCode: params.ticket.checkInCode,
    currency: 'USDT_SEPOLIA' as const,
  };
  const payloadHash = await hashCanonical(base);
  return { ...base, payloadHash };
}

export function parseQrPayload(raw: string): QrPayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'object' && parsed !== null) {
      const kind = (parsed as { kind?: string }).kind;
      if (kind === 'renopay-ticket-offer' || kind === PAYMENT_ENCRYPTED_KIND) {
        return null;
      }
    }

    const envelope = qrPayloadEnvelopeSchema.safeParse(parsed);
    if (envelope.success) {
      const data = envelope.data;
      return {
        ...data,
        receiverAddress: normalizeReceiverAddress(data.receiverAddress),
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function parseTicketOfferQr(raw: string): TicketOfferQr | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = ticketOfferQrSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

export async function verifyQrPayload(payload: QrPayload): Promise<boolean> {
  const { payloadHash, ...rest } = payload;
  const restRecord = rest as Record<string, unknown>;

  const canonicalExpected = await hashPayloadFields(restRecord);
  if (canonicalExpected === payloadHash) {
    return true;
  }

  const legacyEnvelope = { ...restRecord };
  delete legacyEnvelope.imageUri;
  const envelopeExpected = await hashCanonical(legacyEnvelope);
  if (envelopeExpected === payloadHash) {
    return true;
  }

  return false;
}

export function isQrExpired(payload: QrPayload, now = Date.now()): boolean {
  return payload.expiresAt < now;
}

export function createSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createReceiptId(): string {
  return `rcpt-${Date.now().toString(36)}`;
}

export function createCheckInCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
