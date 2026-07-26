# Demo UI Polish — Design Spec

**Date:** 2026-07-08  
**Status:** Approved for implementation  
**Branch baseline:** `70c81e8`

---

## Goal

Make Reno Pay demo-ready by hiding testnet/WDK/role chrome from the main UI while keeping the existing backend unchanged (Sepolia WDK USDT + Hyperswarm P2P + AsyncStorage). Users should experience a polished football ticketing app: create tickets on Gate, receive payments via QR, scan and pay on Pay — without seeing "Sepolia", "fake USDT", "WDK", or Sender/Receiver role pickers.

---

## Session-derived role model

**Problem:** `useUserRole` (AsyncStorage) gates P2P event handling. Hiding the role picker breaks payment fulfillment.

**Solution:** Replace persisted user role with **session-scoped role** in `TicketsP2PProvider`:

```ts
activeSession: { sessionId: string; role: 'receiver' | 'sender' } | null
```

| Action | Role set |
|--------|----------|
| `beginPaymentSession()` | `receiver` for that `sessionId` |
| Successful QR scan + join on Pay tab | `sender` for that `sessionId` |
| `leaveRoom()` or session expiry | clear `activeSession` |

**Event routing:**

- `PAYMENT_SUBMITTED` → fulfill only if `activeSession.role === 'receiver'` AND `activeSession.sessionId === event.sessionId` AND local issued ticket matches
- `TICKET_TRANSFERRED` → persist received ticket only if `activeSession.role === 'sender'` AND not locally issued as same `ticketId`

Delete `useUserRole` and all UI references. P2P `HELLO` events still carry `role: 'receiver' | 'sender'` for protocol compatibility.

---

## Two QR types

| Kind | Purpose | Scannable on Pay? |
|------|---------|-------------------|
| `renopay-ticket-offer` | Display identity QR at ticket creation (ticketId, event metadata, checkInCode) | No — show "Not a payment QR" |
| `renopay-ticket-session` | Active payment session (sessionId, topic, price, 15 min TTL) | Yes |

Payment QR generated only on **RECEIVE PAYMENT**. Ticket offer QR generated at creation. Image URI never encoded in QR payloads.

---

## Wallet UX

**Component:** `WalletConnectButton` owns `useWalletSetup` + `SeedPhraseModal`.

| WDK status | UI |
|------------|-----|
| `NO_WALLET` / `LOCKED` | **CONNECT TETHER WALLET** primary CTA |
| `READY` | Compact truncated address row |

**Placement:** Pay (when not connected), Settings (always), Gate (banner when not connected only).

`WalletStatusCard` becomes presentational: title **WALLET**, no Sepolia badge, no "WDK".

Sepolia/testnet strings removed from user-facing copy. Internal `currency: 'USDT_SEPOLIA'` unchanged.

---

## Component boundaries

| Screen / module | Max responsibility |
|-----------------|-------------------|
| `gate.tsx` | Create ticket CTA, ticket list, attendees — &lt;200 lines |
| `pay.tsx` | Thin renderer; logic in `usePaymentFlow` |
| `payment-session.ts` | Session start, validate, fulfill, bootstrap events |
| `ticket-event-handler.ts` | Pure event reducer |
| `WalletConnectButton` | All wallet create/restore/unlock |
| `PaymentQrModal` | Full-screen receive-payment QR + expiry/regenerate |

---

## Ticket image + duration

- `expo-image-picker` for cover image (`imageUri` on `TicketRecord`)
- Duration selector (1h/2h/3h) sets `endAt` from `startAt`
- P2P `TICKET_TRANSFERRED` payload extended with optional `imageUri`

---

## Session hardening

- `canFulfillPayment(ticket, event)` validates amount, txHash, senderAddress
- After partial sale (`remainingQuantity > 0`), clear stale session fields so next RECEIVE PAYMENT generates fresh QR
- Persist active sessions via `SESSIONS_KEY` in AsyncStorage
- `validateAndJoinSession(raw)` centralizes QR validation for Pay flow

---

## Approval checklist

1. Gate: Connect wallet → Create ticket with image → ticket in list
2. Gate: RECEIVE PAYMENT → full-screen QR
3. Pay: Connect wallet → SCAN QR CODE → pay → ticket in Tickets tab
4. Gate: Attendee appears
5. No "Sepolia", "fake USDT", "WDK", or role picker in main tabs
6. Scanning ticket-offer QR shows clear error on Pay tab
