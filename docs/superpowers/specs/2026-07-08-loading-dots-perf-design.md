# Loading Dots + Performance — Design Spec

**Date:** 2026-07-08  
**Status:** Approved for implementation  
**Baseline:** demo UI polish v2

---

## Goal

Give users clear feedback during every async operation (QR generation, P2P join, WDK payment, ticket transfer) with a branded yellow 3-dot animation. Optimize QR rendering and slim payment QR payloads for faster encode and smoother lists.

---

## QR authenticity (not dummy)

Payment QRs encode real JSON via the `qrcode` library:

- `topic` — Hyperswarm room (`renopay-session-<sessionId>`)
- `receiverAddress` — live WDK wallet address
- `sessionId`, `ticketId`, `priceUsdt`, `expiresAt`, `payloadHash`

**Works:** Reno Pay Pay tab on a second device → P2P join → WDK USDT send → ticket transfer.  
**Does not work:** Generic QR apps or other crypto wallets (they expect address/EIP-681, not Reno Pay session JSON).

Two QR kinds unchanged:

| Kind | Scannable on Pay? |
|------|-------------------|
| `renopay-ticket-session` | Yes |
| `renopay-ticket-offer` | No (display only) |

---

## Loader visual spec

**Color:** `RenoPayBrand.primary` (`#F5D033`)  
**Animation:** 3 dots, staggered vertical bounce via `react-native-reanimated`  
**Style:** Solid circles; optional black outline at `md`/`lg` sizes; no blur

### Components

| Component | Use |
|-----------|-----|
| `RenoPayDotsLoader` | Core animation; props: `size` (`sm`\|`md`\|`lg`), optional `label` |
| `RenoPayInlineLoader` | Fixed-height slot replacing content (QR frame, list, button row) |
| `RenoPayLoadingOverlay` | Full-screen dim (`rgba(11,16,11,0.85)`) + dots + uppercase label |

### Placement rules

- **Overlay** for ops >500ms: session start, scan join, ticket create, WDK init
- **Inline** for in-place waits: QR matrix render, list load, pay button, pending transfer
- **No overlay** on live camera preview — only post-scan processing

### Labels

| Context | Label |
|---------|-------|
| Payment QR generation | `GENERATING QR` |
| Post-scan P2P join | `JOINING SESSION` |
| WDK send | inline under PAY button |
| Ticket P2P transfer | `WAITING FOR TICKET` |
| Ticket create | `CREATING TICKET` |
| Initial ticket load | inline in list area |
| WDK init | inline centered |

---

## Performance changes

### A. SVG QR renderer

Replace per-module `<View>` grid (~625 nodes) with `react-native-svg` + run-length encoded `<Rect>` rows.

### B. Slim payment QR payload

QR carries bootstrap fields only:

```json
{
  "v": 1,
  "kind": "renopay-ticket-session",
  "sessionId", "topic", "receiverAddress", "ticketId",
  "priceUsdt", "expiresAt", "payloadHash"
}
```

Display fields (`eventName`, teams, venue, etc.) delivered via extended `SESSION_CREATED` P2P event. Legacy full QR payloads still parse for backward compatibility.

### C. Deferred list QR

`TicketCard` list rows show static QR icon stub — no matrix encode on Gate/Tickets tab open. Real QR only on preview/modals.

### D. Image covers

`expo-image` with `cachePolicy="memory-disk"` and fixed dimensions on list thumbnails.

---

## Centralized busy state

`TicketsP2PProvider` exposes `busyMessage: string | null` during `beginPaymentSession` and `joinPaymentSessionAsSender`. Screen-local state for wallet/pay steps.

---

## Verification checklist

1. Gate → RECEIVE PAYMENT → dots → real QR within ~1s
2. Pay (other phone) → scan → dots during join → confirm with peer connected
3. Pay → PAY → dots during send → dots during transfer → ticket in Tickets
4. Gate → attendee appears
5. Ticket-offer QR on Pay → clear error
6. `npm run verify` passes
7. Gate/Tickets tabs open without jank

---

## Files touched

- Create: `renopay-dots-loader.tsx`, `renopay-inline-loader.tsx`, `renopay-loading-overlay.tsx`
- Refactor: `qr-code-view.tsx`, `qr-payload.ts`, `ticket-events.ts`, `payment-session.ts`
- Wire: `payment-qr-modal.tsx`, `pay.tsx`, `use-payment-flow.ts`, `payment-confirm-card.tsx`, `gate.tsx`, `tickets.tsx`, `create-ticket.tsx`, `wallet-connect-button.tsx`, `index.tsx`, `wdk-provider.native.tsx`, `ticket-card.tsx`, `tickets-p2p-context.tsx`
