import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import { decryptJson, encryptJson, normalizeReceiverAddress } from '@/features/tickets/qr-crypto';
import { shortAddress } from '@/features/tickets/payment-helpers';
import type { TicketRecord } from '@/features/tickets/ticket-types';

const PROOF_KIND = 'renopay-ticket-proof-encrypted' as const;
const COMPACT_PROOF_KIND = 'p' as const;
/** v2 shells above this length are reminted to compact v3 on modal open. */
export const LEGACY_PROOF_QR_LENGTH_THRESHOLD = 950;

export const ticketProofPlaintextSchema = z.object({
  ticketId: z.string().min(1),
  sessionId: z.string().min(1),
  receiverAddress: z.string().min(1),
  senderAddress: z.string().min(1),
  txHash: z.string().min(1),
  receiptId: z.string().min(1),
  checkInCode: z.string().min(1),
  eventName: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  venue: z.string().min(1),
  gate: z.string().min(1),
  seatLabel: z.string().min(1),
  priceUsdt: z.string().min(1),
  endAt: z.string().min(1).optional(),
  paidAt: z.string().min(1),
  payloadHash: z.string().min(1),
});

export const encryptedTicketProofShellSchema = z.object({
  v: z.literal(2),
  kind: z.literal(PROOF_KIND),
  ticketId: z.string().min(1),
  sessionId: z.string().min(1),
  receiverAddress: z.string().min(1),
  nonce: z.string().min(1),
  ciphertext: z.string().min(1),
});

export const compactTicketProofShellSchema = z.object({
  v: z.literal(3),
  k: z.literal(COMPACT_PROOF_KIND),
  i: z.string().min(1),
  sid: z.string().min(1),
  rcv: z.string().min(1),
  n: z.string().min(1),
  ct: z.string().min(1),
});

const compactTicketProofCipherSchema = z.object({
  s: z.string().min(1),
  t: z.string().min(1),
  r: z.string().min(1),
  c: z.string().min(1),
  e: z.string().min(1),
  h: z.string().min(1),
  a: z.string().min(1),
  v: z.string().min(1),
  g: z.string().min(1),
  seat: z.string().min(1),
  p: z.string().min(1),
  end: z.string().min(1).optional(),
  paid: z.string().min(1),
  hash: z.string().min(1),
});

export type TicketProofPlaintext = z.infer<typeof ticketProofPlaintextSchema>;
export type EncryptedTicketProofShell = z.infer<typeof encryptedTicketProofShellSchema>;
export type CompactTicketProofShell = z.infer<typeof compactTicketProofShellSchema>;

const PROOF_HASH_FIELD_ORDER = [
  'ticketId',
  'sessionId',
  'receiverAddress',
  'senderAddress',
  'txHash',
  'receiptId',
  'checkInCode',
  'eventName',
  'homeTeam',
  'awayTeam',
  'venue',
  'gate',
  'seatLabel',
  'priceUsdt',
  'endAt',
  'paidAt',
] as const;

type ProofShell = EncryptedTicketProofShell | CompactTicketProofShell;

function pickProofHashFields(source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PROOF_HASH_FIELD_ORDER) {
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

async function hashProofFields(source: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify(pickProofHashFields(source));
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
}

function buildLegacyProofShellAad(shell: EncryptedTicketProofShell): Record<string, unknown> {
  return {
    v: shell.v,
    kind: shell.kind,
    ticketId: shell.ticketId,
    sessionId: shell.sessionId,
    receiverAddress: normalizeReceiverAddress(shell.receiverAddress),
  };
}

function buildCompactProofShellAad(shell: CompactTicketProofShell): Record<string, unknown> {
  return {
    v: shell.v,
    k: shell.k,
    i: shell.i,
    sid: shell.sid,
    rcv: normalizeReceiverAddress(shell.rcv),
  };
}

function shellTicketId(shell: ProofShell): string {
  return shell.v === 3 ? shell.i : shell.ticketId;
}

function shellSessionId(shell: ProofShell): string {
  return shell.v === 3 ? shell.sid : shell.sessionId;
}

function shellReceiverAddress(shell: ProofShell): string {
  return shell.v === 3 ? shell.rcv : shell.receiverAddress;
}

function shellNonce(shell: ProofShell): string {
  return shell.v === 3 ? shell.n : shell.nonce;
}

function shellCiphertext(shell: ProofShell): string {
  return shell.v === 3 ? shell.ct : shell.ciphertext;
}

function buildProofShellAad(shell: ProofShell): Record<string, unknown> {
  return shell.v === 3 ? buildCompactProofShellAad(shell) : buildLegacyProofShellAad(shell);
}

function compactCipherFromPlaintext(plaintext: TicketProofPlaintext): z.infer<typeof compactTicketProofCipherSchema> {
  return {
    s: plaintext.senderAddress,
    t: plaintext.txHash,
    r: plaintext.receiptId,
    c: plaintext.checkInCode,
    e: plaintext.eventName,
    h: plaintext.homeTeam,
    a: plaintext.awayTeam,
    v: plaintext.venue,
    g: plaintext.gate,
    seat: plaintext.seatLabel,
    p: plaintext.priceUsdt,
    end: plaintext.endAt,
    paid: plaintext.paidAt,
    hash: plaintext.payloadHash,
  };
}

function expandCompactCipherPlaintext(
  shell: CompactTicketProofShell,
  compact: z.infer<typeof compactTicketProofCipherSchema>,
): TicketProofPlaintext {
  return {
    ticketId: shell.i,
    sessionId: shell.sid,
    receiverAddress: normalizeReceiverAddress(shell.rcv),
    senderAddress: compact.s,
    txHash: compact.t,
    receiptId: compact.r,
    checkInCode: compact.c,
    eventName: compact.e,
    homeTeam: compact.h,
    awayTeam: compact.a,
    venue: compact.v,
    gate: compact.g,
    seatLabel: compact.seat,
    priceUsdt: compact.p,
    endAt: compact.end,
    paidAt: compact.paid,
    payloadHash: compact.hash,
  };
}

function parseProofShell(parsed: unknown): ProofShell | null {
  const compact = compactTicketProofShellSchema.safeParse(parsed);
  if (compact.success) {
    return compact.data;
  }
  const legacy = encryptedTicketProofShellSchema.safeParse(parsed);
  return legacy.success ? legacy.data : null;
}

export function isProofQrPayload(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) {
    return false;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return false;
    }
    const record = parsed as Record<string, unknown>;
    if (record.v === 3 && record.k === COMPACT_PROOF_KIND) {
      return true;
    }
    return record.kind === PROOF_KIND;
  } catch {
    return false;
  }
}

export function needsProofRemint(ticket: TicketRecord): boolean {
  if (!ticket.ticketQrPayload) {
    return false;
  }
  const trimmed = ticket.ticketQrPayload.trim();
  if (trimmed.length >= LEGACY_PROOF_QR_LENGTH_THRESHOLD) {
    return true;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const shell = parseProofShell(parsed);
    return shell?.v === 2;
  } catch {
    return true;
  }
}

export function canBuildTicketProof(ticket: TicketRecord): boolean {
  return (
    ticket.kind === 'received' &&
    typeof ticket.sessionId === 'string' &&
    ticket.sessionId.length > 0 &&
    typeof ticket.txHash === 'string' &&
    ticket.txHash.length > 0 &&
    typeof ticket.senderAddress === 'string' &&
    ticket.senderAddress.length > 0 &&
    typeof ticket.receiptId === 'string' &&
    ticket.receiptId.length > 0
  );
}

export async function buildTicketProofPlaintext(ticket: TicketRecord): Promise<TicketProofPlaintext | null> {
  if (!canBuildTicketProof(ticket) || !ticket.sessionId || !ticket.txHash || !ticket.senderAddress || !ticket.receiptId) {
    return null;
  }

  const body: Record<string, unknown> = {
    ticketId: ticket.ticketId,
    sessionId: ticket.sessionId,
    receiverAddress: normalizeReceiverAddress(ticket.receiverAddress),
    senderAddress: ticket.senderAddress,
    txHash: ticket.txHash,
    receiptId: ticket.receiptId,
    checkInCode: ticket.checkInCode,
    eventName: ticket.eventName,
    homeTeam: ticket.homeTeam,
    awayTeam: ticket.awayTeam,
    venue: ticket.venue,
    gate: ticket.gate,
    seatLabel: ticket.seatLabel,
    priceUsdt: ticket.priceUsdt,
    endAt: ticket.endAt,
    paidAt: ticket.updatedAt,
  };
  const payloadHash = await hashProofFields(body);
  const parsed = ticketProofPlaintextSchema.safeParse({ ...body, payloadHash });
  return parsed.success ? parsed.data : null;
}

async function buildCompactProofShellString(plaintext: TicketProofPlaintext): Promise<string | null> {
  const shellBase = {
    v: 3 as const,
    k: COMPACT_PROOF_KIND,
    i: plaintext.ticketId,
    sid: plaintext.sessionId,
    rcv: plaintext.receiverAddress,
  };

  const encrypted = await encryptJson({
    sessionId: plaintext.sessionId,
    receiverAddress: plaintext.receiverAddress,
    purpose: 'proof',
    plaintext: compactCipherFromPlaintext(plaintext),
    aad: shellBase,
  });

  const shell: CompactTicketProofShell = {
    ...shellBase,
    n: encrypted.nonce,
    ct: encrypted.ciphertext,
  };

  return JSON.stringify(shell);
}

/** Gate-ready verification QR — compact v3 ciphertext for reliable camera scans. */
export async function buildTicketProofQr(ticket: TicketRecord): Promise<string | null> {
  const plaintext = await buildTicketProofPlaintext(ticket);
  if (!plaintext) {
    return null;
  }
  return buildCompactProofShellString(plaintext);
}

export function getProofPurchaseKey(proof: Pick<TicketProofPlaintext, 'receiptId' | 'txHash'>): string {
  const receiptId = proof.receiptId?.trim();
  if (receiptId) return receiptId;
  const txHash = proof.txHash?.trim();
  if (txHash) return txHash;
  throw new Error('Proof missing purchase key.');
}

export async function verifyTicketProofPlaintext(proof: TicketProofPlaintext): Promise<boolean> {
  const { payloadHash, ...rest } = proof;
  const expected = await hashProofFields(rest as Record<string, unknown>);
  return expected === payloadHash;
}

async function decryptProofShell(shell: ProofShell): Promise<TicketProofPlaintext | null> {
  const decrypted = decryptJson<Record<string, unknown>>({
    sessionId: shellSessionId(shell),
    receiverAddress: shellReceiverAddress(shell),
    purpose: 'proof',
    nonce: shellNonce(shell),
    ciphertext: shellCiphertext(shell),
    aad: buildProofShellAad(shell),
  });

  if (!decrypted) {
    return null;
  }

  if (shell.v === 3) {
    const compact = compactTicketProofCipherSchema.safeParse(decrypted);
    if (!compact.success) {
      return null;
    }
    const proof = expandCompactCipherPlaintext(shell, compact.data);
    const parsed = ticketProofPlaintextSchema.safeParse(proof);
    return parsed.success ? parsed.data : null;
  }

  const proof = ticketProofPlaintextSchema.safeParse(decrypted);
  return proof.success ? proof.data : null;
}

/** Gatekeeper scan-to-verify entry point. Accepts legacy v2 and compact v3 proof shells. */
export async function parseAndVerifyTicketProof(
  raw: string,
  gatekeeperAddress: string,
): Promise<{ ok: true; proof: TicketProofPlaintext } | { ok: false; reason: string }> {
  try {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) {
      return {
        ok: false,
        reason: 'QR could not be read as a Reno Pay proof. Ask the fan to open the large verification QR in Tickets (not the small card preview).',
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      return {
        ok: false,
        reason: 'QR scan was incomplete. Hold steady and scan the large fan verification QR again.',
      };
    }

    const shell = parseProofShell(parsed);
    if (!shell) {
      const maybeKind = typeof parsed === 'object' && parsed && 'kind' in parsed
        ? String((parsed as { kind?: unknown }).kind ?? '')
        : '';
      if (maybeKind.includes('session') || maybeKind.includes('payment') || maybeKind.includes('offer')) {
        return {
          ok: false,
          reason: 'That is a payment/offer QR. Scan the fan verification QR from Tickets instead.',
        };
      }
      return { ok: false, reason: 'Not a Reno Pay ticket verification QR.' };
    }

    const normalizedGatekeeper = normalizeReceiverAddress(gatekeeperAddress);
    const issuer = normalizeReceiverAddress(shellReceiverAddress(shell));
    if (issuer !== normalizedGatekeeper) {
      return {
        ok: false,
        reason: `Wrong club wallet. Ticket issuer is ${shortAddress(shellReceiverAddress(shell))}; this phone is ${shortAddress(gatekeeperAddress)}. Unlock the issuer wallet, then scan again.`,
      };
    }

    const proof = await decryptProofShell(shell);
    if (!proof) {
      return { ok: false, reason: 'Unable to decrypt ticket proof — QR may be damaged. Ask the fan to reopen the large verification QR.' };
    }

    if (proof.ticketId !== shellTicketId(shell) || proof.sessionId !== shellSessionId(shell)) {
      return { ok: false, reason: 'Ticket proof metadata mismatch.' };
    }

    const validHash = await verifyTicketProofPlaintext(proof);
    if (!validHash) {
      return { ok: false, reason: 'Ticket proof integrity check failed.' };
    }

    if (proof.endAt && new Date(proof.endAt).getTime() <= Date.now()) {
      return { ok: false, reason: 'This ticket has expired (event end time passed).' };
    }

    return { ok: true, proof };
  } catch {
    return { ok: false, reason: 'Invalid ticket verification QR.' };
  }
}
