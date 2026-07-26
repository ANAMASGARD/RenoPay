export type TicketStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'paid'
  | 'transferred'
  | 'checked_in';

export type TicketKind = 'issued' | 'received';

export type TicketRecord = {
  ticketId: string;
  kind: TicketKind;
  eventName: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  gate: string;
  seatLabel: string;
  startAt: string;
  endAt: string;
  priceUsdt: string;
  currency: 'USDT_SEPOLIA';
  quantity: number;
  remainingQuantity: number;
  /** Exact public Mapbox pin selected by the club. */
  location?: EventLocation;
  /** Permissionless MatchSale contract which owns capacity for this event. */
  matchSaleAddress?: string;
  matchId?: string;
  registryTxHash?: string;
  receiverAddress: string;
  senderAddress?: string;
  sessionId?: string;
  qrPayload?: string;
  qrHash?: string;
  receiptId?: string;
  txHash?: string;
  status: TicketStatus;
  checkInCode: string;
  notes?: string;
  imageUri?: string;
  ticketQrPayload?: string;
  checkedInAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type EventLocation = {
  longitude: number;
  latitude: number;
  label?: string;
};

export type AttendeeRecord = {
  attendeeId: string;
  ticketId: string;
  sessionId: string;
  senderAddress: string;
  amountUsdt: string;
  txHash: string;
  receiptId: string;
  paidAt: string;
  quantity?: number;
  matchSaleAddress?: string;
};

export type PaymentSession = {
  sessionId: string;
  ticketId: string;
  qrPayload: string;
  qrHash: string;
  expiresAt: number;
  createdAt: string;
};

export type TicketDraftInput = {
  eventName: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  gate: string;
  seatLabel: string;
  startAt: string;
  endAt: string;
  priceUsdt: string;
  quantity: number;
  location?: EventLocation;
  notes?: string;
  imageUri?: string;
};

export type SessionRole = 'receiver' | 'sender';

export type ActiveSession = {
  sessionId: string;
  role: SessionRole;
  /** Hash-verified receiver address from payment QR (sender role only). */
  receiverAddress?: string;
  /** Sepolia block number when receiver session started (chain demo mode). */
  watchFromBlock?: number;
};
