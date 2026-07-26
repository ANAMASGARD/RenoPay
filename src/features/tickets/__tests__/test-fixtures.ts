import type { TicketRecord } from '@/features/tickets/ticket-types';

export function sampleIssuedTicket(overrides: Partial<TicketRecord> = {}): TicketRecord {
  return {
    ticketId: 'ticket-demo-1',
    kind: 'issued',
    eventName: 'Fan Club Gate A',
    homeTeam: 'Club',
    awayTeam: 'Rivals',
    venue: 'Stadium',
    gate: '3',
    seatLabel: 'General',
    startAt: '2030-07-12T18:00:00.000Z',
    endAt: '2030-07-12T20:00:00.000Z',
    priceUsdt: '10.00',
    currency: 'USDT_SEPOLIA',
    quantity: 10,
    remainingQuantity: 10,
    receiverAddress: '0xReceiver00000000000000000000000000000001',
    status: 'draft',
    checkInCode: 'ABC123',
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    ...overrides,
  };
}
