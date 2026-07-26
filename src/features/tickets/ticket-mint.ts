import { createReceiptId, hasTicketEnvelope, type QrPayload } from '@/features/tickets/qr-payload';
import { buildTicketProofQr } from '@/features/tickets/ticket-proof';
import { receivedTicketFromTransfer } from '@/features/tickets/ticket-transfer';
import { addReceivedTicket, loadTickets } from '@/features/tickets/ticket-storage';
import type { TicketRecord } from '@/features/tickets/ticket-types';

export function canMintTicketLocally(payload: QrPayload): boolean {
  return hasTicketEnvelope(payload);
}

export async function mintReceivedTicketFromQr(params: {
  payload: QrPayload;
  txHash: string;
  senderAddress: string;
}): Promise<TicketRecord | null> {
  if (!hasTicketEnvelope(params.payload)) {
    return null;
  }

  const existing = await loadTickets();
  const duplicate = existing.find(
    (ticket) =>
      ticket.kind === 'received' &&
      ticket.ticketId === params.payload.ticketId &&
      ticket.sessionId === params.payload.sessionId,
  );
  if (duplicate) {
    return duplicate;
  }

  const receiptId = createReceiptId();
  const transferPayload = {
    ticketId: params.payload.ticketId,
    eventName: params.payload.eventName,
    homeTeam: params.payload.homeTeam,
    awayTeam: params.payload.awayTeam,
    venue: params.payload.venue,
    gate: params.payload.gate,
    seatLabel: params.payload.seatLabel,
    startAt: params.payload.startAt,
    endAt: params.payload.endAt,
    priceUsdt: params.payload.priceUsdt,
    checkInCode: params.payload.checkInCode,
    txHash: params.txHash,
    imageUri: params.payload.imageUri,
  };

  const ticket = receivedTicketFromTransfer(
    {
      sessionId: params.payload.sessionId,
      senderAddress: params.senderAddress,
      receiverAddress: params.payload.receiverAddress,
      receiptId,
    },
    transferPayload,
  );

  const ticketQrPayload = await buildTicketProofQr(ticket);
  const ticketWithProof = ticketQrPayload ? { ...ticket, ticketQrPayload } : ticket;

  await addReceivedTicket(ticketWithProof);
  return ticketWithProof;
}
