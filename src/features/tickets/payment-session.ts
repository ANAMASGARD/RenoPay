import {
  buildEncryptedPaymentQrString,
  buildQrPayload,
  createReceiptId,
  createSessionId,
  isQrExpired,
  parseAndDecryptPaymentQr,
  type QrPayload,
  type QrPayloadEnvelope,
} from '@/features/tickets/qr-payload';
import {
  getTicketById,
  isSessionPaid,
  savePaymentSession,
  upsertTicket,
} from '@/features/tickets/ticket-storage';
import type { AttendeeRecord, PaymentSession, TicketRecord } from '@/features/tickets/ticket-types';

export const SESSION_TTL_MS = 15 * 60 * 1000;

export type PaymentFulfillment = {
  attendee: AttendeeRecord;
  updatedTicket: TicketRecord;
};

export type PaymentSubmitted = {
  sessionId: string;
  senderAddress: string;
  amountUsdt: string;
  txHash: string;
  eventId: string;
};

export type ValidateSessionResult =
  | { ok: true; payload: QrPayload }
  | { ok: false; reason: string };

export async function validateAndJoinSession(raw: string): Promise<ValidateSessionResult> {
  const trimmed = raw.trim();
  const parsed = await parseAndDecryptPaymentQr(trimmed);
  if (!parsed) {
    return { ok: false, reason: 'This QR is not a Reno Pay payment session.' };
  }

  if (isQrExpired(parsed)) {
    return { ok: false, reason: 'This payment QR has expired. Ask the receiver to generate a fresh one.' };
  }

  const alreadyPaid = await isSessionPaid(parsed.sessionId);
  if (alreadyPaid) {
    return { ok: false, reason: 'This session was already settled.' };
  }

  const liveTicket = await getTicketById(parsed.ticketId);
  if (liveTicket) {
    if (liveTicket.sessionId !== parsed.sessionId) {
      return {
        ok: false,
        reason: 'This QR was replaced. Ask the receiver to generate a fresh one.',
      };
    }
    if (liveTicket.status !== 'awaiting_payment') {
      return { ok: false, reason: 'This ticket is no longer awaiting payment.' };
    }
  }

  return { ok: true, payload: parsed };
}

export function canFulfillPayment(ticket: TicketRecord, payment: PaymentSubmitted): boolean {
  if (!payment.txHash || payment.txHash.trim() === '') {
    return false;
  }
  if (!payment.senderAddress || payment.senderAddress === 'unknown') {
    return false;
  }
  if (payment.amountUsdt !== ticket.priceUsdt) {
    return false;
  }
  return ticket.sessionId === payment.sessionId && ticket.kind === 'issued';
}

export async function startPaymentSession(params: {
  ticket: TicketRecord;
  priceUsdt: string;
  receiverAddress: string;
}): Promise<{
  ticket: TicketRecord;
  payload: QrPayloadEnvelope;
  qrString: string;
}> {
  const sessionId = createSessionId();
  const pricedTicket: TicketRecord = {
    ...params.ticket,
    priceUsdt: params.priceUsdt,
    updatedAt: new Date().toISOString(),
  };
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = await buildQrPayload({
    sessionId,
    ticket: pricedTicket,
    receiverAddress: params.receiverAddress,
    expiresAt,
  });
  const qrString = await buildEncryptedPaymentQrString(payload);
  const nextTicket: TicketRecord = {
    ...pricedTicket,
    status: 'awaiting_payment',
    sessionId,
    qrPayload: qrString,
    qrHash: payload.payloadHash,
    updatedAt: new Date().toISOString(),
  };
  await upsertTicket(nextTicket);

  const paymentSession: PaymentSession = {
    sessionId,
    ticketId: nextTicket.ticketId,
    qrPayload: qrString,
    qrHash: payload.payloadHash,
    expiresAt,
    createdAt: new Date().toISOString(),
  };
  await savePaymentSession(paymentSession);

  return {
    ticket: nextTicket,
    payload,
    qrString,
  };
}

export function clearSessionFields(ticket: TicketRecord): TicketRecord {
  return {
    ...ticket,
    sessionId: undefined,
    qrPayload: undefined,
    qrHash: undefined,
    status: ticket.remainingQuantity > 0 ? 'draft' : ticket.status,
    updatedAt: new Date().toISOString(),
  };
}

export function fulfillPayment(params: {
  ticket: TicketRecord;
  payment: PaymentSubmitted;
  receiverAddress: string;
}): PaymentFulfillment {
  const receiptId = createReceiptId();
  const attendee: AttendeeRecord = {
    attendeeId: `att-${params.payment.eventId}`,
    ticketId: params.ticket.ticketId,
    sessionId: params.payment.sessionId,
    senderAddress: params.payment.senderAddress,
    amountUsdt: params.payment.amountUsdt,
    txHash: params.payment.txHash,
    receiptId,
    paidAt: new Date().toISOString(),
  };
  const remaining = Math.max(0, params.ticket.remainingQuantity - 1);
  let updatedTicket: TicketRecord = {
    ...params.ticket,
    status: remaining > 0 ? 'awaiting_payment' : 'transferred',
    remainingQuantity: remaining,
    senderAddress: params.payment.senderAddress,
    receiptId,
    txHash: params.payment.txHash,
    updatedAt: new Date().toISOString(),
  };

  if (remaining > 0) {
    updatedTicket = clearSessionFields(updatedTicket);
  }

  return { attendee, updatedTicket };
}

export function createPaymentEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
