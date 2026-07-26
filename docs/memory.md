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
- **Map tab:** Live Mapbox globe with direct Sepolia `MatchPosted` log discovery, red event pins, marker detail cards, availability, kickoff time, and WDK purchase action. While focused, Map polls every **2 seconds** with incremental recent-block log queries; the first open still performs a full deployment→head scan. Capacity RPCs run on full refresh and for the selected pin only — not on every poll tick. Expect new pins within ~2–4s after Sepolia indexes the club UserOp. Requires `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` and the public registry address below.
- **Marker persistence:** Map markers are cached in AsyncStorage and rehydrated from locally saved ticket locations before RPC sync. On-chain matches remain the source of truth when available, while cached/local pins survive app updates and temporary indexing/RPC gaps.
- **Map purchase checkout:** `BUY 1` routes into the fan Pay tab with an on-screen checkout QR and explicit confirmation. A successful `MatchSale.buy` mints an encrypted, hash-verified entry proof QR locally; no ticket is shown before a WDK transaction hash exists.
- **Club verification:** Verify opens the same Expo camera scanner used by Pay. It decrypts and hash-checks the proof QR, enforces the event end time, and consumes each proof once in local gate storage. Issued also watches `TicketsPurchased` logs directly and lists observed buyers without a backend.
- **Club templates/location:** Ticket creation includes 13 demo templates (10 Indian stadium locations), Mapbox venue search suggestions, direct latitude/longitude entry, exact pin zooming, and a red selected-location marker.
- **On-chain match registry:** `RenoPayMatchRegistry` is deployed on Sepolia at `0x5311831CDD2Cd7089e0433dA80C5e160Bed7e9a3` (deployment block `11353499`). Source is `contracts/src/RenoPayMatchRegistry.sol`; deployment helper is `scripts/deploy-match-registry.mjs`.
- **Fast publish behavior:** WDK may return a UserOperation hash before public RPC indexing. Ticket creation saves immediately after WDK accepts the transaction and stores `registryTxHash`; receipt/event lookup is opportunistic, and Map log discovery picks up `MatchPosted` asynchronously. Do not reintroduce a long blocking receipt wait in the create flow.
- **Marker regression fix:** Persist `draft.location` on issued tickets, render AsyncStorage/cache pins before any network request, read storage directly when Map gains focus, retry unresolved registry hashes through the WDK UserOperation receipt API, query registry logs with bounded parallelism and RPC racing, and fail over across Sepolia providers. Incremental discovery scans only the last ~3,000 blocks (with overlap) after the initial full sync. This prevents stale provider state and indexing races from hiding pins.
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

- `npm run verify` passed: Expo lint, TypeScript, and **55 Vitest tests**.
- Tests cover payment preflight/send, QR validation/encryption, payment sessions, treasury swap helpers, wallet utilities, map utils, match-storage, registry incremental discovery, and USDT funding / paymaster error helpers.
- WDK bundle regenerated successfully.
- Registry deployment bytecode was verified on Sepolia after deployment. Public app configuration lives in ignored `.env.local` as `EXPO_PUBLIC_MATCH_REGISTRY_ADDRESS`, `EXPO_PUBLIC_MATCH_REGISTRY_DEPLOYMENT_BLOCK`, and `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.

### Local standalone APK (not published)

Latest local build includes **2s Map incremental discovery** (fast on-chain pins). It was **not** uploaded to GitHub — sideload from disk only.

| Field | Value |
|---|---|
| **Absolute path** | `/home/linux/Downloads/RenoPay/android/app/build/outputs/apk/release/app-release.apk` |
| **Relative path** | `android/app/build/outputs/apk/release/app-release.apk` |
| **Size** | 198 MB |
| **SHA-256** | `47f680a7449b06bc93f1f6dc51b54451475c619c5f6433aabcf3c6176e939cd0` |
| **Package ID** | `com.anonymous.renopay` |
| **Rebuild** | `source scripts/android-env.sh && set -a && source .env.local && set +a && npm run android:standalone-apk` |

**Sideload (USB):**

```bash
adb install -r /home/linux/Downloads/RenoPay/android/app/build/outputs/apk/release/app-release.apk
```

**Previous GitHub release (older build):** https://github.com/ANAMASGARD/RenoPay/releases/tag/v1.0.1 (`renopay-1.0.1.apk`) — Candide USDT funding hint, create-ticket preflight, clearer paymaster errors. Does **not** include 2s Map polling.

## Fast Map discovery (how it works)

No central database — every Fan Map phone reads Sepolia `MatchPosted` logs from `RenoPayMatchRegistry` directly.

| Phase | Behavior |
|---|---|
| **Map opens** | Full log scan from deployment block → chain head; fetch `remaining()` for all pins |
| **While focused** | Poll every **2 seconds**; incremental scan of last ~3,000 blocks (64-block overlap) |
| **Background ticks** | Skip capacity RPCs — only merge new pins; soft status (`N LIVE MATCHES · SYNCING`) |
| **Pin selected** | Fetch `MatchSale.remaining()` for that sale only |
| **RPC** | Race publicnode + drpc + configured URL; first OK wins |
| **Persistence** | `@renopay/published_matches_v1` cache + `@renopay/match_discovery_last_block_v1` cursor |

**Expectation:** new club pins appear on Fan Map within ~2–4s after Sepolia indexes the UserOp — not before chain inclusion. Club phone still sees its own pin immediately via local ticket cache.

**Key files:** `src/features/matches/registry.ts` (`computeIncrementalFromBlock`, `fetchPublishedMatches`), `src/features/matches/match-storage.ts`, `src/app/(tabs)/map.tsx`.

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

- **Install locally:** sideload `app-release.apk` from the path above (or use `npm run android:device` for dev client + Metro). Do **not** expect GitHub Releases to have this build — it stays on disk until explicitly published.
- Unlock wallet → Settings → COPY ADDRESS → Candide mock USDT faucet → confirm USDT balance &gt; 0 before Create Ticket.
- **Map demo (two phones):** Fan leaves **Map** tab open. Club publishes a ticket. Fan should see the red pin within ~2–4s without leaving Map.
- Fast create path: select an Indian stadium template, confirm the red pin/venue, publish, and continue immediately after WDK accepts the UserOperation.
- If the registry alert appears, restart Metro with `npm start -- --clear`; standalone APKs must be rebuilt after `.env.local` changes.
- `SEPOLIA_DEPLOYER_PRIVATE_KEY` is deployment-only and must never be committed or shipped in the app.

## Recent engineering notes

- Fast on-chain Map discovery is implemented in app code only — **no new registry contract / redeploy**. Same Sepolia address `0x5311831CDD2Cd7089e0433dA80C5e160Bed7e9a3`.
- Vitest covers `computeIncrementalFromBlock` in `src/features/matches/__tests__/registry-discovery.test.ts`.
- Do not claim sub-second visibility before Sepolia indexes the UserOp; honest SLA is ~2–4s after inclusion while Map stays focused.
