import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  loadTickets: vi.fn(),
  addReceivedTicket: vi.fn(),
}));

vi.mock('@/features/tickets/ticket-storage', () => ({
  loadTickets: storageMocks.loadTickets,
  addReceivedTicket: storageMocks.addReceivedTicket,
}));

import { sampleIssuedTicket } from '@/features/tickets/__tests__/test-fixtures';
import {
  buildEncryptedPaymentQrString,
  buildQrPayload,
  parseAndDecryptPaymentQr,
  parseEncryptedPaymentShell,
} from '@/features/tickets/qr-payload';
import {
  buildTicketProofQr,
  parseAndVerifyTicketProof,
} from '@/features/tickets/ticket-proof';
import { encryptJson } from '@/features/tickets/qr-crypto';
import { mintReceivedTicketFromQr } from '@/features/tickets/ticket-mint';
import type { TicketRecord } from '@/features/tickets/ticket-types';

describe('encrypted qr flows', () => {
  beforeEach(() => {
    storageMocks.loadTickets.mockReset();
    storageMocks.addReceivedTicket.mockReset();
    storageMocks.loadTickets.mockResolvedValue([]);
    storageMocks.addReceivedTicket.mockImplementation(async (ticket) => ticket);
  });

  it('encrypts payment QR shell and decrypts to original envelope', async () => {
    const envelope = await buildQrPayload({
      sessionId: 'session-encrypted',
      ticket: sampleIssuedTicket(),
      receiverAddress: '0xReceiver00000000000000000000000000000001',
      expiresAt: Date.now() + 60_000,
    });

    const qrString = await buildEncryptedPaymentQrString(envelope);
    const shell = parseEncryptedPaymentShell(qrString);
    expect(shell?.kind).toBe('renopay-ticket-session-encrypted');
    expect(shell?.sessionId).toBe('session-encrypted');
    expect(qrString).not.toContain('checkInCode');

    const decrypted = await parseAndDecryptPaymentQr(qrString);
    expect(decrypted?.sessionId).toBe(envelope.sessionId);
    expect(decrypted?.checkInCode).toBe(envelope.checkInCode);
    expect(decrypted?.priceUsdt).toBe(envelope.priceUsdt);
  });

  it('mints received ticket with encrypted verification QR', async () => {
    const envelope = await buildQrPayload({
      sessionId: 'session-proof',
      ticket: sampleIssuedTicket(),
      receiverAddress: '0xReceiver00000000000000000000000000000001',
      expiresAt: Date.now() + 60_000,
    });

    const minted = await mintReceivedTicketFromQr({
      payload: envelope,
      txHash: '0xabc123',
      senderAddress: '0xSender0000000000000000000000000000000001',
    });

    expect(minted).not.toBeNull();
    expect(minted?.ticketQrPayload).toBeTruthy();
    expect(minted?.ticketQrPayload).not.toContain('checkInCode');

    const verified = await parseAndVerifyTicketProof(
      minted!.ticketQrPayload!,
      envelope.receiverAddress,
    );
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.proof.ticketId).toBe(envelope.ticketId);
      expect(verified.proof.txHash).toBe('0xabc123');
      expect(verified.proof.checkInCode).toBe(envelope.checkInCode);
    }
  });

  it('builds compact v3 proof QR that is smaller than legacy v2', async () => {
    const ticket: TicketRecord = {
      ...sampleIssuedTicket({ kind: 'received', status: 'transferred' }),
      sessionId: 'session-compact',
      senderAddress: '0xSender0000000000000000000000000000000001',
      txHash: '0xabc123deadbeef',
      receiptId: 'rcpt-compact',
      quantity: 1,
      remainingQuantity: 0,
    };

    const proofQr = await buildTicketProofQr(ticket);
    expect(proofQr).toBeTruthy();
    expect(proofQr!.length).toBeLessThan(950);
    const parsed = JSON.parse(proofQr!) as { v?: number; k?: string };
    expect(parsed.v).toBe(3);
    expect(parsed.k).toBe('p');

    const verified = await parseAndVerifyTicketProof(proofQr!, ticket.receiverAddress);
    expect(verified.ok).toBe(true);
  });

  it('still verifies legacy v2 proof shells', async () => {
    const ticket: TicketRecord = {
      ...sampleIssuedTicket({ kind: 'received', status: 'transferred' }),
      sessionId: 'session-legacy-v2',
      senderAddress: '0xSender0000000000000000000000000000000001',
      txHash: '0xlegacyv2hash',
      receiptId: 'rcpt-legacy-v2',
      quantity: 1,
      remainingQuantity: 0,
    };

    const { buildTicketProofPlaintext } = await import('@/features/tickets/ticket-proof');
    const fullPlaintext = await buildTicketProofPlaintext(ticket);
    expect(fullPlaintext).toBeTruthy();

    const shellBase = {
      v: 2 as const,
      kind: 'renopay-ticket-proof-encrypted' as const,
      ticketId: fullPlaintext!.ticketId,
      sessionId: fullPlaintext!.sessionId,
      receiverAddress: fullPlaintext!.receiverAddress,
    };
    const encrypted = await encryptJson({
      sessionId: fullPlaintext!.sessionId,
      receiverAddress: fullPlaintext!.receiverAddress,
      purpose: 'proof',
      plaintext: fullPlaintext!,
      aad: shellBase,
    });
    const legacyQr = JSON.stringify({ ...shellBase, nonce: encrypted.nonce, ciphertext: encrypted.ciphertext });
    expect(legacyQr.length).toBeGreaterThan(950);

    const verified = await parseAndVerifyTicketProof(legacyQr, ticket.receiverAddress);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.proof.receiptId).toBe('rcpt-legacy-v2');
    }
  });

  it('rejects verification QR scanned by wrong gatekeeper address', async () => {
    const ticket: TicketRecord = {
      ...sampleIssuedTicket({ kind: 'received', status: 'transferred' }),
      sessionId: 'session-wrong-gate',
      senderAddress: '0xSender0000000000000000000000000000000001',
      txHash: '0xdeadbeef',
      receiptId: 'rcpt-test',
      quantity: 1,
      remainingQuantity: 0,
    };

    const proofQr = await buildTicketProofQr(ticket);
    expect(proofQr).toBeTruthy();

    const verified = await parseAndVerifyTicketProof(
      proofQr!,
      '0xWrongGate000000000000000000000000000001',
    );
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.reason).toContain('Wrong club wallet');
    }
  });
});
