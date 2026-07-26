# Reno Pay — project memory

Current engineering handoff for the WDK-only ticket-payment gateway.

---

## Current product state

- **Track:** Tether WDK. The app is a decentralized football ticket-payment gateway; it has no Reno Pay backend and no Hyperswarm/P2P runtime.
- **Settlement:** Sender uses WDK ERC-4337 to send Candide Sepolia mock USD₮ to the receiver wallet.
- **Ticket delivery:** Receiver creates an encrypted, hash-verified payment QR. Sender scans it locally, sees the ticket data, pays, and mints a local ticket only after WDK returns a transaction hash.
- **Receiver fulfillment:** The receiver polls Sepolia mock-USDT `Transfer` logs from the QR session's start block; on matching receiver and exact amount, it saves an attendee locally.
- **Storage:** Tickets, payment sessions, and attendees are stored in AsyncStorage on their respective phones. No central ticket inventory or payment database exists.
- **Persona shell:** The app uses an explicit `choose-mode` step, then keeps the active shell role-specific. Fan tabs are `Pay`, `Tickets`, `Map`, `Settings`. Club tabs are `Gate`, `Verify`, `Issued`, `Settings`. `Settings` stays rightmost in both shells. Implemented with `SwipeTabs.Protected` guards in `src/app/(tabs)/_layout.tsx`, `useOnlyUserDefinedScreens: true` in `swipe-tabs.tsx`, and a persona allowlist in `glass-tab-bar.tsx`. Treasury is stack-only at `/treasury` (Club Settings), not a tab.
- **Public repo:** https://github.com/ANAMASGARD/RenoPay — DoraHacks BUIDL and hackathon submission should describe WDK + QR + local mint + chain watcher, **not** Hyperswarm/P2P ticket transfer (that path is not in the current app).
- **Map tab:** Live Mapbox globe with direct Sepolia `MatchPosted` log discovery, red event pins, marker detail cards, availability, kickoff time, and WDK purchase action. It requires `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` and the public registry address below.
- **Marker persistence:** Map markers are cached in AsyncStorage and rehydrated from locally saved ticket locations before RPC sync. On-chain matches remain the source of truth when available, while cached/local pins survive app updates and temporary indexing/RPC gaps.
- **Map purchase checkout:** `BUY 1` routes into the fan Pay tab with an on-screen checkout QR and explicit confirmation. A successful `MatchSale.buy` mints an encrypted, hash-verified entry proof QR locally; no ticket is shown before a WDK transaction hash exists.
- **Club verification:** Verify opens the same Expo camera scanner used by Pay. It decrypts and hash-checks the proof QR, enforces the event end time, and consumes each proof once in local gate storage. Issued also watches `TicketsPurchased` logs directly and lists observed buyers without a backend.
- **Club templates/location:** Ticket creation includes 13 demo templates (10 Indian stadium locations), Mapbox venue search suggestions, direct latitude/longitude entry, exact pin zooming, and a red selected-location marker.
- **On-chain match registry:** `RenoPayMatchRegistry` is deployed on Sepolia at `0x5311831CDD2Cd7089e0433dA80C5e160Bed7e9a3` (deployment block `11353499`). Source is `contracts/src/RenoPayMatchRegistry.sol`; deployment helper is `scripts/deploy-match-registry.mjs`.
- **Fast publish behavior:** WDK may return a UserOperation hash before public RPC indexing. Ticket creation saves immediately after WDK accepts the transaction and stores `registryTxHash`; receipt/event lookup is opportunistic, and Map log discovery picks up `MatchPosted` asynchronously. Do not reintroduce a long blocking receipt wait in the create flow.
- **Marker regression fix:** Persist `draft.location` on issued tickets, render AsyncStorage/cache pins before any network request, read storage directly when Map gains focus, retry unresolved registry hashes through the WDK UserOperation receipt API, query registry log ranges with bounded parallelism, and fail over across Sepolia RPC providers. This prevents stale provider state and indexing races from hiding pins.
- **Wallet funding UX:** Settings shows Candide Sepolia mock USDT only (not ETH), with a **FUND WALLET (CANDIDE)** link. Create Ticket preflights USDT balance before registry publish. `pm_getPaymasterData failed` is mapped to faucet guidance via `formatWdkErrorMessage` / `assertFundedForWdkDemo` in `payment-helpers.ts`.

## Critical WDK configuration

- **Expo / RN:** Expo SDK 54, React Native 0.81.5, React 19.1.0. Do not upgrade to SDK 57.
- **Network:** Ethereum Sepolia, chain ID `11155111`.
- **Mock USD₮ contract:** `0xd077a400968890eacc75cdc901f0356c943e4fdb`.
- **Bundler / paymaster:** Candide public v3 endpoints; Safe modules version must remain `'0.3.0'`.
- **Fee mode:** paymaster-token mode. Sender needs mock USD₮ for ticket price plus network fee; Sepolia ETH is not required for the intended demo path.
- **Demo ceiling:** `SEPOLIA_DEMO_TRANSFER_MAX_FEE_ATOMIC = 20_000_000` (20 test USD₮) in `src/config/wdk.ts`. It is intentionally testnet-only and is applied by both WDK and Reno Pay preflight.
- **Contract-call ceiling:** `SEPOLIA_DEMO_TRANSACTION_MAX_FEE_ATOMIC = 20_000_000` covers WDK ERC-4337 calldata calls (registry publish and approval + `MatchSale.buy`).
- **Fee boundary:** WDK rejects fee quotes `>= transferMaxFee`; Reno Pay preflight matches that condition exactly, preventing an avoidable WDK submission failure.

## Wallet funding (common confusion)

- Settings balance is **Candide mock USDT**, never native Sepolia ETH.
- Google Cloud / other ETH faucets can succeed on-chain while the app still shows **0** — that is expected.
- Correct path: Settings → COPY ADDRESS → https://dashboard.candide.dev/faucet → mint mock USDT to the **in-app** address → wait ~30–60s → refresh Settings.
- Do not fund a MetaMask/browser wallet unless it is the same address shown in Reno Pay Settings.

## Payment flow

1. Receiver creates a ticket and opens **Receive Payment** on Gate.
2. The payment QR contains the full encrypted ticket envelope, receiver wallet, price, session ID, expiry, and integrity data.
3. Sender scans from Pay. Ticket-offer display QRs are rejected; only payment QRs are accepted.
4. Sender presses **Pay & Unlock Ticket**. The app performs balance and `quoteTransfer()` preflight, then displays the exact network-fee quote.
5. Sender confirms. `sendSepoliaUsdtPayment()` calls WDK `send()` for a real ERC-4337 USDT transfer.
6. Only a successful WDK result with `hash` mints the sender's ticket. A failed or absent hash does not create one.
7. Receiver chain watcher sees the matching USDT Transfer log, writes the attendee, and shows **Payment verified**.

## Important source files

| Area | Path |
|---|---|
| WDK configuration | `src/config/wdk.ts` |
| WDK provider / lazy polyfills | `src/features/wdk/wdk-provider.native.tsx` |
| Payment preflight and send | `src/features/tickets/payment-send.ts` |
| USDT asset, balance, fee helpers | `src/features/tickets/payment-helpers.ts` |
| Sender state machine | `src/hooks/use-payment-flow.ts` |
| Payment QR parsing/encryption | `src/features/tickets/qr-payload.ts`, `qr-crypto.ts` |
| Local ticket mint/proof | `src/features/tickets/ticket-mint.ts`, `ticket-proof.ts` |
| Receiver chain watcher | `src/features/tickets/chain-payment-watcher.ts`, `src/hooks/use-receiver-chain-watcher.ts` |
| Local ticket/session storage | `src/features/tickets/tickets-context.tsx`, `ticket-storage.ts` |
| Persona tab shell | `src/app/(tabs)/_layout.tsx`, `src/components/navigation/swipe-tabs.tsx`, `glass-tab-bar.tsx` |
| Match registry / Map | `src/features/matches/registry.ts`, `match-storage.ts`, `src/app/(tabs)/map.tsx` |
| Match sale watcher | `src/hooks/use-match-sale-watcher.ts` |
| Proof QR / gate verify | `src/features/tickets/ticket-proof.ts`, `src/app/(tabs)/attendees.tsx` |

## Verification and release

- `npm run verify` passed: Expo lint, TypeScript, and **51 Vitest tests**.
- Tests cover payment preflight/send, QR validation/encryption, payment sessions, treasury swap helpers, wallet utilities, map utils, match-storage, and USDT funding / paymaster error helpers.
- WDK bundle regenerated successfully.
- Registry deployment bytecode was verified on Sepolia after deployment. Public app configuration lives in ignored `.env.local` as `EXPO_PUBLIC_MATCH_REGISTRY_ADDRESS`, `EXPO_PUBLIC_MATCH_REGISTRY_DEPLOYMENT_BLOCK`, and `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.
- Standalone release APK built successfully:
  - `android/app/build/outputs/apk/release/app-release.apk`
  - 198 MB
  - SHA-256: `cde03d59db0bec33d5c23f42ce09c0a856353633f73172cd4a0eee86efd4b5f8`
  - GitHub release: https://github.com/ANAMASGARD/RenoPay/releases/tag/v1.0.1 (`renopay-1.0.1.apk`) — includes Candide USDT funding hint, create-ticket USDT preflight, and clearer paymaster errors.
  - Rebuild with `npm run android:standalone-apk` after JS or env changes.

## Commands

```bash
npm run verify
npm start
npm run android:device
npm run android:recover
npm run android:standalone-apk
```

`android:standalone-apk` creates the shareable APK with the JavaScript bundle embedded; it does not need Metro after installation. Use `android:recover` only after native, plugin, or app-config changes.

## Physical-device verification still required

The build and automated checks are complete, but the final external proof must happen on two real phones:

1. Fund sender with more than `20 USD₮ + displayed WDK fee` from the Candide Sepolia faucet (not Google ETH faucet).
2. Receiver opens a 20 USD₮ payment QR.
3. Sender scans, reviews the exact fee, approves, and receives a local ticket with the real transaction hash.
4. Receiver waits for the Sepolia `Transfer` log and confirms the attendee appears.

Do not describe the app as “100% offline USDT.” QR transfer and local ticket storage are device-local; blockchain settlement and receiver verification require internet.
The one-time proof consume marker is currently local to the verifying gate device. A globally shared cross-device check-in requires adding and deploying a registry check-in method; do not claim that the present local marker is a chain-wide revocation.

## Latest demo handoff

- Install `renopay-1.0.1.apk` from GitHub Releases; unlock wallet; Settings → COPY ADDRESS → Candide mock USDT faucet; confirm USDT balance &gt; 0 before Create Ticket.
- Fast demo path: select an Indian stadium template, confirm the red pin/venue, publish the ticket, and continue immediately after the WDK UserOperation is accepted. Sepolia log indexing can lag; the app treats this as asynchronous rather than showing a false save failure.
- If the registry alert appears, restart Metro with `npm start -- --clear`; standalone APKs must be rebuilt after env changes.
- `SEPOLIA_DEPLOYER_PRIVATE_KEY` is deployment-only and must never be committed or shipped in the app. Remove it from `.env.local` after deployments.
