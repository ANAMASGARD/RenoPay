import { z } from 'zod';

import type { TicketRecord } from '@/features/tickets/ticket-types';

export const ticketTransferPayloadSchema = z.object({
  ticketId: z.string().min(1),
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
  txHash: z.string().min(1),
  imageUri: z.string().optional(),
});

export type TicketTransferPayload = z.infer<typeof ticketTransferPayloadSchema>;

export function toTransferPayload(ticket: TicketRecord, txHash: string): TicketTransferPayload {
  return {
    ticketId: ticket.ticketId,
    eventName: ticket.eventName,
    homeTeam: ticket.homeTeam,
    awayTeam: ticket.awayTeam,
    venue: ticket.venue,
    gate: ticket.gate,
    seatLabel: ticket.seatLabel,
    startAt: ticket.startAt,
    endAt: ticket.endAt,
    priceUsdt: ticket.priceUsdt,
    checkInCode: ticket.checkInCode,
    txHash,
    imageUri: ticket.imageUri,
  };
}

export function receivedTicketFromTransfer(
  event: {
    sessionId: string;
    senderAddress: string;
    receiverAddress: string;
    receiptId: string;
  },
  payload: TicketTransferPayload,
): TicketRecord {
  const now = new Date().toISOString();
  return {
    ticketId: payload.ticketId,
    kind: 'received',
    eventName: payload.eventName,
    homeTeam: payload.homeTeam,
    awayTeam: payload.awayTeam,
    venue: payload.venue,
    gate: payload.gate,
    seatLabel: payload.seatLabel,
    startAt: payload.startAt,
    endAt: payload.endAt,
    priceUsdt: payload.priceUsdt,
    currency: 'USDT_SEPOLIA',
    quantity: 1,
    remainingQuantity: 0,
    receiverAddress: event.receiverAddress,
    senderAddress: event.senderAddress,
    sessionId: event.sessionId,
    receiptId: event.receiptId,
    txHash: payload.txHash,
    status: 'transferred',
    checkInCode: payload.checkInCode,
    imageUri: payload.imageUri,
    createdAt: now,
    updatedAt: now,
  };
}
