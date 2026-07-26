# Reno Pay Dual-Track Design Spec

**Date:** 2026-07-07  
**Project:** Reno Pay — football group tipping on Expo SDK 57  
**Hackathon tracks:** WDK (wallet) + Pears Stack (P2P)

## Product

Reno Pay lets football fans create watch-party tip pools for a match. Fans join a decentralized P2P room, pledge USDT amounts, and the pool creator settles on-chain via a self-custodial WDK wallet.

**Important:** Pledges are coordination-only. No escrow. Funds move only when the pool creator sends a WDK transaction.

## Trust Model

| Role | Capability |
|------|------------|
| Pool creator | Creates room, broadcasts `POOL_CREATED`, may call `send()` to settle |
| Fan | Joins room, broadcasts `TIP_PLEDGED` |
| System | `TIP_SETTLED` broadcast after WDK tx confirms on Sepolia |

Only the wallet address that created the pool may settle. UI enforces this by comparing `creator` from `POOL_CREATED` with the local WDK address.

## Architecture

```
Football UI
├── WdkAppProvider → HRPC → WDK Bare worklet → Sepolia USDT
└── p2p-room.ts → bare-ipc → P2P Bare worklet → Hyperswarm topic
```

- WDK worklet: managed internally by `WdkAppProvider`
- P2P worklet: lazy-started when Pools tab mounts (second `Worklet` instance)
- Pool state: derived from validated `TipPoolEvent[]` via reducer — screens never parse raw JSON

## TipPoolEvent Contract

All P2P messages are JSON strings validated with zod at the IPC boundary.

```typescript
type TipPoolEvent = {
  v: 1
  eventId: string   // crypto.randomUUID()
  roomId: string    // Hyperswarm topic / pool id
  ts: number        // Date.now()
} & (
  | { type: 'POOL_CREATED'; matchLabel: string; targetUsdt: string; creator: string }
  | { type: 'TIP_PLEDGED'; from: string; amount: string }
  | { type: 'TIP_SETTLED'; txHash: string; recipient: string }
)
```

- `amount` / `targetUsdt`: decimal strings in USDT human units (e.g. `"5.00"`)
- Invalid messages are dropped silently with console warning
- Duplicate `eventId` values are ignored

## Pool State Reducer

```typescript
type PoolPhase = 'open' | 'settling' | 'settled'

type PoolViewModel = {
  roomId: string
  matchLabel: string
  targetUsdt: string
  creator: string
  phase: PoolPhase
  pledges: { from: string; amount: string }[]
  totalPledged: string
  txHash?: string
  recipient?: string
  peerCount: number
}

function reducePoolState(
  events: TipPoolEvent[],
  localAddress: string | null,
  peerCount: number,
  pendingTxHash?: string
): PoolViewModel | null
```

Phase transitions:
- `open` → default after `POOL_CREATED`
- `settling` → creator taps Settle, WDK `send()` in flight
- `settled` → `TIP_SETTLED` received or local tx confirms

## P2P Module API (`src/services/p2p/p2p-room.ts`)

```typescript
joinRoom(topic: string): void
leaveRoom(): void
broadcast(event: TipPoolEvent): void
subscribe(callback: (event: TipPoolEvent) => void): () => void
useP2PRoom(): { peerCount, events, joinRoom, leaveRoom, broadcast, isActive }
```

Worklet entry uses Hyperswarm only (no Hypercore for MVP). Commands over bare-ipc:
- `join` → join topic hash
- `broadcast` → send JSON to all connected peers
- `peers` → return connection count

## WDK Configuration

- Network: Sepolia testnet (chainId 11155111)
- Bundle: generated via `wdk-worklet-bundler generate` → `./.wdk`
- Biometrics: disabled during dev (`requireBiometrics={false}`)

## UI Screens

| Tab | Content |
|-----|---------|
| Home | Wallet status, create/unlock, link to Pools |
| Pools | Inline create form + active pool (pledge, settle) |
| Explore | Unchanged starter (optional peer count footer) |

## Demo Script (3 min)

1. Device A: create wallet, unlock, open Pools, create "World Cup Final" pool
2. Device B: join same room topic, pledge 5 USDT
3. Device A: see pledge, tap Settle, confirm WDK tx
4. Both devices: `TIP_SETTLED` appears with tx hash

## Build Requirements

```bash
npm install
npx wdk-worklet-bundler generate
npm run pack:p2p
npx expo prebuild --platform android
npx expo run:android
```

Never use Expo Go. Android API 29+ required.

## Out of Scope (MVP)

- Hypercore replication
- Escrow / smart contract pools
- Multi-chain support
- iOS build verification

## External Services

- Sepolia RPC: `https://rpc.sepolia.org`
- Candide bundler/paymaster (public)
- Hyperswarm DHT (decentralized, no API key)
