import { describe, expect, it } from 'vitest';

import {
  buildQrPayload,
  hasTicketEnvelope,
  isQrExpired,
  parseQrPayload,
  parseTicketOfferQr,
  serializeQrPayload,
  verifyQrPayload,
} from '@/features/tickets/qr-payload';
import { sampleIssuedTicket } from '@/features/tickets/__tests__/test-fixtures';

describe('qr-payload', () => {
  it('builds a full envelope that verifies and round-trips through serialize/parse', async () => {
    const expiresAt = Date.now() + 60_000;
    const payload = await buildQrPayload({
      sessionId: 'session-abc',
      ticket: sampleIssuedTicket(),
      receiverAddress: '0xReceiver00000000000000000000000000000001',
      expiresAt,
    });

    expect(hasTicketEnvelope(payload)).toBe(true);
    expect(await verifyQrPayload(payload)).toBe(true);

    const qrString = serializeQrPayload(payload);
    const parsed = parseQrPayload(qrString);
    expect(parsed).not.toBeNull();
    expect(parsed?.sessionId).toBe('session-abc');
    expect(parsed?.checkInCode).toBe('ABC123');
    expect(await verifyQrPayload(parsed!)).toBe(true);
  });

  it('rejects tampered payload hash', async () => {
    const payload = await buildQrPayload({
      sessionId: 'session-tamper',
      ticket: sampleIssuedTicket({ priceUsdt: '10.00' }),
      receiverAddress: '0xReceiver00000000000000000000000000000001',
      expiresAt: Date.now() + 60_000,
    });

    const tampered = { ...payload, priceUsdt: '99.00' };
    expect(await verifyQrPayload(tampered)).toBe(false);
  });

  it('detects expiry', async () => {
    const expiredPayload = await buildQrPayload({
      sessionId: 'session-expired',
      ticket: sampleIssuedTicket(),
      receiverAddress: '0xReceiver00000000000000000000000000000001',
      expiresAt: Date.now() - 1,
    });
    const freshPayload = await buildQrPayload({
      sessionId: 'session-fresh',
      ticket: sampleIssuedTicket(),
      receiverAddress: '0xReceiver00000000000000000000000000000001',
      expiresAt: Date.now() + 60_000,
    });

    expect(isQrExpired(expiredPayload)).toBe(true);
    expect(isQrExpired(freshPayload)).toBe(false);
  });

  it('returns null for ticket-offer QR kind on payment parser', async () => {
    const offer = {
      v: 1,
      kind: 'renopay-ticket-offer',
      ticketId: 'ticket-demo-1',
      receiverAddress: '0xReceiver00000000000000000000000000000001',
      eventName: 'Fan Club Gate A',
      homeTeam: 'Club',
      awayTeam: 'Rivals',
      venue: 'Stadium',
      gate: '3',
      seatLabel: 'General',
      startAt: '2026-07-12T18:00:00.000Z',
      endAt: '2026-07-12T20:00:00.000Z',
      priceUsdt: '10.00',
      checkInCode: 'ABC123',
      currency: 'USDT_SEPOLIA',
      payloadHash: 'deadbeef',
    };

    expect(parseQrPayload(JSON.stringify(offer))).toBeNull();
    expect(parseTicketOfferQr(JSON.stringify(offer))?.kind).toBe('renopay-ticket-offer');
  });
});
