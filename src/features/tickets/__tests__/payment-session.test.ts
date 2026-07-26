import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  getTicketById: vi.fn(),
  isSessionPaid: vi.fn(),
  savePaymentSession: vi.fn(),
  upsertTicket: vi.fn(),
}));

vi.mock('@/features/tickets/ticket-storage', () => ({
  getTicketById: storageMocks.getTicketById,
  isSessionPaid: storageMocks.isSessionPaid,
  savePaymentSession: storageMocks.savePaymentSession,
  upsertTicket: storageMocks.upsertTicket,
}));

import {
  buildEncryptedPaymentQrString,
  buildQrPayload,
} from '@/features/tickets/qr-payload';
import {
  canFulfillPayment,
  fulfillPayment,
  validateAndJoinSession,
} from '@/features/tickets/payment-session';
import { sampleIssuedTicket } from '@/features/tickets/__tests__/test-fixtures';

describe('payment-session', () => {
  beforeEach(() => {
    storageMocks.getTicketById.mockReset();
    storageMocks.isSessionPaid.mockReset();
    storageMocks.savePaymentSession.mockReset();
    storageMocks.upsertTicket.mockReset();
    storageMocks.isSessionPaid.mockResolvedValue(false);
    storageMocks.getTicketById.mockResolvedValue(null);
  });

  it('validates a fresh payment QR string', async () => {
    const payload = await buildQrPayload({
      sessionId: 'session-valid',
      ticket: sampleIssuedTicket(),
      receiverAddress: '0xReceiver00000000000000000000000000000001',
      expiresAt: Date.now() + 60_000,
    });
    const qrString = await buildEncryptedPaymentQrString(payload);

    const result = await validateAndJoinSession(qrString);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.sessionId).toBe('session-valid');
    }
  });

  it('rejects expired payment QR', async () => {
    const payload = await buildQrPayload({
      sessionId: 'session-expired',
      ticket: sampleIssuedTicket(),
      receiverAddress: '0xReceiver00000000000000000000000000000001',
      expiresAt: Date.now() - 1,
    });
    const result = await validateAndJoinSession(await buildEncryptedPaymentQrString(payload));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('expired');
    }
  });

  it('rejects already-settled session', async () => {
    storageMocks.isSessionPaid.mockResolvedValue(true);
    const payload = await buildQrPayload({
      sessionId: 'session-paid',
      ticket: sampleIssuedTicket(),
      receiverAddress: '0xReceiver00000000000000000000000000000001',
      expiresAt: Date.now() + 60_000,
    });

    const result = await validateAndJoinSession(await buildEncryptedPaymentQrString(payload));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('already settled');
    }
  });

  it('canFulfillPayment requires matching session, amount, and tx hash', () => {
    const ticket = sampleIssuedTicket({
      kind: 'issued',
      sessionId: 'session-1',
      priceUsdt: '10.00',
      status: 'awaiting_payment',
    });

    const valid = canFulfillPayment(ticket, {
      sessionId: 'session-1',
      senderAddress: '0xSender0000000000000000000000000000000001',
      amountUsdt: '10.00',
      txHash: '0xabc',
      eventId: 'evt-1',
    });

    const wrongAmount = canFulfillPayment(ticket, {
      sessionId: 'session-1',
      senderAddress: '0xSender0000000000000000000000000000000001',
      amountUsdt: '9.99',
      txHash: '0xabc',
      eventId: 'evt-2',
    });

    expect(valid).toBe(true);
    expect(wrongAmount).toBe(false);
  });

  it('fulfillPayment decrements inventory and records attendee', () => {
    const ticket = sampleIssuedTicket({
      kind: 'issued',
      sessionId: 'session-fulfill',
      remainingQuantity: 2,
      status: 'awaiting_payment',
    });

    const result = fulfillPayment({
      ticket,
      payment: {
        sessionId: 'session-fulfill',
        senderAddress: '0xSender0000000000000000000000000000000001',
        amountUsdt: ticket.priceUsdt,
        txHash: '0xdeadbeef',
        eventId: 'evt-fulfill',
      },
      receiverAddress: ticket.receiverAddress,
    });

    expect(result.attendee.txHash).toBe('0xdeadbeef');
    expect(result.updatedTicket.remainingQuantity).toBe(1);
    expect(result.updatedTicket.status).toBe('draft');
    expect(result.updatedTicket.sessionId).toBeUndefined();
  });
});
