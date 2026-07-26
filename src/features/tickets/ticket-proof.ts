import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import { decryptJson, encryptJson, normalizeReceiverAddress } from '@/features/tickets/qr-crypto';
import type { TicketRecord } from '@/features/tickets/ticket-types';

const PROOF_KIND = 'renopay-ticket-proof-encrypted' as const;

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

export type TicketProofPlaintext = z.infer<typeof ticketProofPlaintextSchema>;
export type EncryptedTicketProofShell = z.infer<typeof encryptedTicketProofShellSchema>;

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

function buildProofShellAad(shell: EncryptedTicketProofShell): Record<string, unknown> {
  return {
    v: shell.v,
    kind: shell.kind,
    ticketId: shell.ticketId,
    sessionId: shell.sessionId,
    receiverAddress: normalizeReceiverAddress(shell.receiverAddress),
  };
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

/** Gate-ready verification QR — ciphertext hides fan/event details until gatekeeper decrypts. */
export async function buildTicketProofQr(ticket: TicketRecord): Promise<string | null> {
  const plaintext = await buildTicketProofPlaintext(ticket);
  if (!plaintext) {
    return null;
  }

  const shellBase = {
    v: 2 as const,
    kind: PROOF_KIND,
    ticketId: plaintext.ticketId,
    sessionId: plaintext.sessionId,
    receiverAddress: plaintext.receiverAddress,
  };

  const encrypted = await encryptJson({
    sessionId: plaintext.sessionId,
    receiverAddress: plaintext.receiverAddress,
    purpose: 'proof',
    plaintext,
    aad: shellBase,
  });

  const shell: EncryptedTicketProofShell = {
    ...shellBase,
    nonce: encrypted.nonce,
    ciphertext: encrypted.ciphertext,
  };

  return JSON.stringify(shell);
}

export async function verifyTicketProofPlaintext(proof: TicketProofPlaintext): Promise<boolean> {
  const { payloadHash, ...rest } = proof;
  const expected = await hashProofFields(rest as Record<string, unknown>);
  return expected === payloadHash;
}

/** Future gatekeeper scan-to-verify entry point. */
export async function parseAndVerifyTicketProof(
  raw: string,
  gatekeeperAddress: string,
): Promise<{ ok: true; proof: TicketProofPlaintext } | { ok: false; reason: string }> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const shell = encryptedTicketProofShellSchema.safeParse(parsed);
    if (!shell.success) {
      return { ok: false, reason: 'Not a Reno Pay ticket verification QR.' };
    }

    const normalizedGatekeeper = normalizeReceiverAddress(gatekeeperAddress);
    if (normalizeReceiverAddress(shell.data.receiverAddress) !== normalizedGatekeeper) {
      return { ok: false, reason: 'This ticket was not issued by your gate session.' };
    }

    const decrypted = decryptJson<Record<string, unknown>>({
      sessionId: shell.data.sessionId,
      receiverAddress: shell.data.receiverAddress,
      purpose: 'proof',
      nonce: shell.data.nonce,
      ciphertext: shell.data.ciphertext,
      aad: buildProofShellAad(shell.data),
    });

    if (!decrypted) {
      return { ok: false, reason: 'Unable to decrypt ticket proof — QR may be damaged.' };
    }

    const proof = ticketProofPlaintextSchema.safeParse(decrypted);
    if (!proof.success) {
      return { ok: false, reason: 'Decrypted ticket proof is malformed.' };
    }

    if (proof.data.ticketId !== shell.data.ticketId || proof.data.sessionId !== shell.data.sessionId) {
      return { ok: false, reason: 'Ticket proof metadata mismatch.' };
    }

    const validHash = await verifyTicketProofPlaintext(proof.data);
    if (!validHash) {
      return { ok: false, reason: 'Ticket proof integrity check failed.' };
    }

    if (proof.data.endAt && new Date(proof.data.endAt).getTime() <= Date.now()) {
      return { ok: false, reason: 'This ticket has expired.' };
    }

    return { ok: true, proof: proof.data };
  } catch {
    return { ok: false, reason: 'Invalid ticket verification QR.' };
  }
}
