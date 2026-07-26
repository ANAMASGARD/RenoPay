# Reno Pay — Agent runbook

Decentralized **football-themed local payments & ticketing** for the [Tether Developers Cup](https://dorahacks.io). One app, two roles — **Receiver** (gatekeeper) and **Sender** (fan/payer).

**Repository:** https://github.com/ANAMASGARD/RenoPay

Human overview and demo script: [README.md](./README.md).

---

## Mission

Build a **real-world fan payment + ticket gateway** where:

- **No Reno Pay backend** stores who paid whom or holds ticket inventory.
- **WDK (Tether)** moves **USDT** on-chain — self-custodial wallet, user holds keys.
- **Payment QR** embeds the full hash-verified ticket envelope (event, gate, seat, check-in code, price, receiver address).
- **All tickets and receipts** are stored **locally on each phone**.
- The app uses a one-time persona choice and then keeps a role-specific shell. Fan UI and club UI do not mix actions.

**Hackathon track (semifinal):** **WDK** — self-custodial USDT payments + QR-bootstrap ticketing. Theme: football — stadium gates, watch parties, local club matches.

### Value proposition

| Layer | Job |
|-------|-----|
| **WDK** | Fan pays USDT to gatekeeper wallet on Sepolia |
| **Payment QR** | Hash-verified ticket envelope — fan scans before pay |
| **Local mint** | After WDK `send()`, fan phone saves ticket from QR + `txHash` |
| **Chain watcher** | Receiver phone detects USDT transfer → Attendees list |
| **Local storage** | Fan **Tickets** tab; gatekeeper **Attendees** list |

**Do not claim** “100% offline USDT.” Internet is needed for chain settlement. **Do claim** “WDK self-custodial USDT + QR-bootstrap tickets — no vendor database.”
Proof QR consumption is local to the verifying gate device until a registry check-in method is deployed; do not describe the current gate marker as chain-wide revocation across both phones.

---

## User flows (target product)

### First launch

1. **Onboarding** (`src/app/index.tsx`) — shown every open until WDK wallet is `READY` (unlocked). Matches `Onboarding-Screen.png` layout; mascot from `onboarding-mascot-crop.png`. GET STARTED → `/home`.
2. The app redirects to **`/choose-mode`** when the wallet is ready and no persona is stored yet. User picks either **Fan** or **Club** once.
3. User **creates/unlocks WDK wallet** (Sepolia testnet for demo) on `/home`.
4. The selected persona determines the shell. Fan UI and club UI stay separated until the user switches persona from Settings.

### Receiver (gatekeeper)

1. Creates a **ticket** (event, gate, price, check-in code).
2. Taps **Receive Payment** — QR encodes full hash-verified ticket envelope + receiver wallet.
3. Watches Sepolia for incoming USDT (`useReceiverChainWatcher`).
4. Uses the club shell: bottom nav is `Gate`, `Verify`, `Issued`, `Settings`. No pay action appears in this shell. **Attendees/Verify** stays local after on-chain payment is detected.

### Sender (fan/payer)

1. Taps **Scan** → camera opens → scans gate **payment QR** (not ticket display QR).
2. Confirms event details and price from QR envelope.
3. **WDK `send()`** pays USDT on Sepolia.
4. Uses the fan shell: bottom nav is `Pay`, `Tickets`, `Map`, `Settings`. No create/issued/verify actions appear in this shell. **Ticket minted locally** from QR + `txHash` → **Tickets** tab.

### Optional polish (post-MVP)

- **Radar-style** nearby receiver discovery (visual list of peers in same topic or BLE later).
- Persona switching from Settings without reinstalling app.

---

## Architecture

```
Football UI (Expo Router)
├── RenoPayWdkProvider → .wdk-bundle → HRPC → WDK worklet → Sepolia USDT (payments)
└── TicketsProvider → payment session + chain watcher + AsyncStorage (tickets/attendees)
```

**Split of responsibility (invariants for agents):**

- **Never** send ticket inventory through a Reno Pay backend — local storage only.
- **Money = WDK** on-chain USDT; **ticket delivery = QR envelope + local mint** after payment.
- **Receiver fulfillment** = Sepolia `Transfer` log polling (`chain-payment-watcher.ts`).

---

## Design pattern language

**Visual identity:** Dark football-pitch UI — **Neo Brutalism** structure + **Glass UI** accents. Playful mascot, serious crypto copy. Reference mock: `assets/images/FIFA.png`; onboarding reference: `assets/images/Onboarding-Screen.png`.

### Pattern rules (follow on every new screen)

1. **Build screens in code** — reference PNGs are layout guides only. Never stretch a full mock PNG as the screen background (causes wrong mascot scale, non-interactive overlays, and broken safe areas).
2. **Tokens first** — import colors and shadows from `src/constants/renopay-brand.ts` (`RenoPayBrand`, `NeoBrutalShadow`). Do not hardcode hex values in screen files.
3. **Reuse primitives** — `NeoBrutalButton` for primary CTAs; `ThemedText` / `ThemedView` for secondary screens until bespoke components exist.
4. **Hard shadows, not blur** — offset black shadows (`shadowRadius: 0`, `shadowOpacity: 1`) or a sibling `View` behind the element. Avoid soft iOS drop shadows.
5. **Borders are loud** — `borderWidth: 2–3`, `borderColor: RenoPayBrand.border` (`#000`).
6. **Corners** — slight radius only (`borderRadius: 10–16`). No pill buttons except segmented controls.
7. **Dark pitch atmosphere** — background `#0B100B`, subtle green pitch lines / honeycomb via decorative layers (`OnboardingBackground` pattern), not busy photo textures.
8. **Mascot assets** — use cropped poses from `MASCOUTS-RENO PAY.png` (e.g. `onboarding-mascot-crop.png`). One mascot per hero area.
9. **App icon** — `assets/images/football.png` is the canonical logo. Regenerate `icon.png` / adaptive icons if the source changes; rebuild native after `app.json` icon edits.
10. **Light mode** — out of scope. Default `StatusBar` to `light` on dark screens.

### Color tokens (`src/constants/renopay-brand.ts`)

| Token | Hex | Use |
|-------|-----|-----|
| `background` | `#0B100B` | Screen base, splash, adaptive icon bg |
| `backgroundElevated` | `#141A14` | Cards, inputs |
| `primary` | `#F5D033` | Titles, CTAs, active tab |
| `primaryPressed` | `#E6C020` | Pressed button fill |
| `foreground` | `#FFFFFF` | Body copy |
| `muted` | `#B8C4B8` | Secondary labels |
| `border` | `#000000` | Outlines, shadow blocks |
| `pitchLine` | `#1E3D24` | Field lines, dividers |
| `accentGreen` | `#2D5A34` | Honeycomb, headers |
| `glass` | `rgba(20,26,20,0.72)` | Frosted overlays |

### Typography

| Role | Font (target) | RN fallback today |
|------|---------------|-------------------|
| Display / titles | **Archivo Black** | `fontWeight: '900'`, `textTransform: 'uppercase'`, `letterSpacing: 1–2` |
| Body | **Space Grotesk** | system sans, `fontWeight: '500'` |
| Code / addresses | monospace | `ThemedText type="code"` |

Load Archivo Black + Space Grotesk via `expo-font` in `_layout.tsx` when adding fonts — until then, match weight/size from onboarding (`52px` display, `17px` body).

### Neo-brutal components (copy these patterns)

**Stacked title shadow** (see `onboarding-screen.tsx`):

```tsx
<View style={styles.titleWrap}>
  <Text style={styles.titleShadow}>RENO PAY</Text>
  <Text style={styles.title}>RENO PAY</Text>
</View>
// titleShadow: absolute, color border, translateX/Y +3
// title: color primary, fontWeight 900
```

**CTA with hard under-shadow:**

```tsx
<View style={styles.ctaWrap}>
  <View style={styles.ctaShadow} />
  <NeoBrutalButton label="GET STARTED" onPress={...} />
</View>
// ctaShadow: absolute, bottom -5, backgroundColor border, same borderRadius as button
```

**Primary button** — always `NeoBrutalButton` (`src/components/ui/neo-brutal-button.tsx`): yellow fill, black border, uppercase label, press translates `translateY: 3`.

**Glass card** (future screens): `backgroundColor: RenoPayBrand.glass` + `BlurView` underlay on iOS; keep black border and hard shadow.

**Bottom nav animation** — the active tab icon uses Lottie. Keep the motion subtle and role-filtered so the fan and club shells still feel distinct.

### Asset map

| File | Agent instruction |
|------|-------------------|
| `Onboarding-Screen.png` | Layout reference — **do not** `require()` as full-screen `Image` background |
| `onboarding-mascot-crop.png` | Onboarding hero mascot |
| `MASCOUTS-RENO PAY.png` | Source library for new mascot crops |
| `football.png` | App icon + splash source |
| `FIFA.png` | Multi-screen product mock (wallet, tickets, settings, bottom nav) |

### UI routes

| Route / area | Content | Status |
|--------------|---------|--------|
| `index` (`/`) | Onboarding — wallet gate until `READY` | **Done** |
| `choose-mode` | One-time persona picker: Fan or Club | Done |
| `home` | Wallet create/unlock WDK | Done |
| `gate` | Club QR display + local attendee list | Done — Sepolia USDT watcher |
| `pay` | Fan scan → WDK fee quote → approve → pay | Done |
| `tickets` | Fan’s locally stored, QR-verifiable tickets | Done |
| `map` | Fan Mapbox discovery with durable red match pins, local ticket rehydration, and BUY → Pay checkout | Done |
| `attendees` | Club verification camera: decrypt/hash-check proof QR, then VERIFY or EXPIRE (device-local disposition by purchase key) | Done |
| `issued` | Club-issued tickets plus direct `TicketsPurchased` log watcher | Done |
| `settings` | Wallet address, balance, security, persona switch, logout | Done |

**Onboarding gate (implemented):** `src/app/index.tsx` shows `OnboardingScreen` until `useWdkApp().state.status === 'READY'`. GET STARTED → `/home` for wallet setup. No AsyncStorage “seen onboarding” flag.

Agents: preserve working WDK native stack when restyling screens.

---

## Persona-specific navigation (2026-07-13)

Expo Router auto-registers every file under `(tabs)/`; conditional `{isClub ? <Screen> : null}` is **not** enough. Use:

| Mechanism | File | Purpose |
|-----------|------|---------|
| `useOnlyUserDefinedScreens: true` | `src/components/navigation/swipe-tabs.tsx` | Only declared screens enter the pager |
| `SwipeTabs.Protected guard={…}` | `src/app/(tabs)/_layout.tsx` | Fan vs club route sets |
| Persona allowlist | `src/components/navigation/glass-tab-bar.tsx` | Defensive tab bar filter |
| `key={persona}` on `SwipeTabs` | `_layout.tsx` | Clean remount on mode switch |

**Fan tabs (4):** Pay, Tickets, Map, Settings  
**Club tabs (4):** Create (`gate`), Issued, Verify (`attendees`), Settings  
**Treasury:** stack route `/treasury` only — opened from Club Settings, never a tab.

Do **not** re-add `(tabs)/treasury.tsx`. Do **not** describe Hyperswarm/P2P ticket transfer in hackathon copy; the shipped product is WDK settlement + QR-bootstrap local mint.

---

## Docs (always use versioned sources)

- Expo SDK 54: https://docs.expo.dev/versions/v54.0.0/
- WDK React Native Quickstart: https://docs.wdk.tether.io/start-building/react-native-quickstart
- WDK React Native Starter: https://github.com/tetherto/wdk-starter-react-native
- WDK React Native Core API: https://docs.wdk.tether.io/tools/react-native-core/api-reference
- RetroUI (design reference): https://retroui.dev/docs/installation
- Legacy design spec: `docs/superpowers/specs/2026-07-07-renopay-dual-track-design.md` (superseded by § Mission above for product direction)

---

## Target stack (matches WDK starter)

| Package | Version |
|---------|---------|
| Expo SDK | ~54.0.x |
| React Native | 0.81.5 |
| React | 19.1.0 |
| expo-router | ~6.0.x |

**Do not use Expo SDK 57** with WDK until Tether publishes an official upgrade — SDK 57 / RN 0.86 causes `PlatformConstants` crashes.

---

## Invariants (do not violate)

1. Expo SDK **54** only — not 57
2. Never **Expo Go** — dev client only (`minSdk` 29)
3. `safeModulesVersion: '0.3.0'` in every `ethereum` entry in `src/config/wdk.ts` (see § WDK config trap)
4. Keep `metro.wdk-polyfills.js` — WDK needs Node core polyfills
5. Pin WDK transitive Expo modules via `package.json` `overrides`: `expo-crypto` ~15.x, `expo-local-authentication` ~17.x
6. Lazy-load `react-native-get-random-values` in `_layout.tsx` `useEffect` — never before `expo-router/entry`
7. Do not revert Android native fixes (see table below)
8. WDK track: real **USDT send** via WDK — not mock “paid” UI

---

## Run workflows

Pick one path — `scripts/run-android.sh` already handles `adb reverse`, `REACT_NATIVE_PACKAGER_HOSTNAME=localhost`, device selection, and (on recover) bundle regen + bare-kit rebuild + clean prebuild.

| What changed | Command | Notes |
|--------------|---------|-------|
| JS/TS only | `npm start` | Open **renopay** dev client → shake → Reload |
| First clone / fresh device install | `npm install --legacy-peer-deps` then `npm run android:device` | Generates bundles if missing; builds + installs APK |
| Native plugin, `app.json`, or stale native/JS | `npm run android:recover` | Regenerates WDK bundle, rebuilds bare-kit, clean prebuild, reinstall |
| App icon / splash (`app.json` icon fields) | `npm run android:recover` | Icons are native — prebuild + reinstall required |
| APK already built, native unchanged | `cd android && ./gradlew :app:installDebug` | Fast reinstall only |
| Shareable standalone release APK | `npm run android:standalone-apk` | Regenerates WDK bundle and writes `android/app/build/outputs/apk/release/app-release.apk`; no Metro required |

Before any Android run: `source scripts/android-env.sh`. Optional: `export ANDROID_SERIAL=<device-id>` when multiple devices are connected.

**Metro (Terminal 1 — leave running for JS dev):**

```bash
source scripts/android-env.sh
export REACT_NATIVE_PACKAGER_HOSTNAME=localhost
adb reverse tcp:8081 tcp:8081
npm start
```

**One-time after clone** (if bundles missing and you are not using `android:device` yet):

```bash
npm install --legacy-peer-deps
npm run generate:wdk
```

**Only when nativehelper sources change** (not part of `android:recover`):

```bash
npm run build:nativehelper
```

---

## WDK config trap (Sepolia / ERC-4337)

Every `ethereum` entry in `src/config/wdk.ts` **must** include `safeModulesVersion: '0.3.0'`.
Without it, `AddressService.getAddress` fails with:

`Unsupported safe modules version: undefined` → UI shows `Invalid state transition from error to ready`.

See `@tetherto/wdk-wallet-evm-erc-4337` README — only `'0.3.0'` is supported today.

---

## Android native fixes (Pixel 8a / 16 KB page size)

Do **not** revert these — they fix worklet SIGSEGV and missing `libnativehelper.so`:

| Fix | Location |
|-----|----------|
| 16 KB `libnativehelper.so` bundled at prebuild | `plugins/withNativeHelperLibs.js` |
| Patched `libbare-kit.so` (JVM attach on worker thread) | `scripts/build-bare-kit-lib.sh`, `patches/bare-kit/` |
| `react-native-bare-kit` postinstall patch | `scripts/patch-bare-kit-android-vm.sh` |
| arm64-only APK (Pixel 8a) | `android/gradle.properties`, `app.json` `buildArchs` |
| Metro ignore bare-kit CMake build dir | `metro.config.js` blockList |

After `npm install`, postinstall re-applies the bare-kit patch. Re-run `npm run build:bare-kit` only when native bare-kit sources or patches change.

---

## Global match registry and demo location flow (2026-07-13)

- `contracts/src/RenoPayMatchRegistry.sol` contains the permissionless registry and isolated `MatchSale` contracts. The live Sepolia registry is `0x5311831CDD2Cd7089e0433dA80C5e160Bed7e9a3`, deployed at block `11353499`.
- Public runtime configuration belongs in ignored `.env.local`: `EXPO_PUBLIC_MATCH_REGISTRY_ADDRESS` and `EXPO_PUBLIC_MATCH_REGISTRY_DEPLOYMENT_BLOCK`. `SEPOLIA_DEPLOYER_PRIVATE_KEY` is deployment-only; never commit it, bundle it, or print it.
- `src/components/tickets/ticket-builder-form.tsx` contains 13 demo templates, including 10 Indian stadiums. `src/components/tickets/event-location-picker.tsx` provides Mapbox venue search suggestions, manual coordinates, exact pin selection, automatic zoom, and a red marker.
- `src/app/(tabs)/map.tsx` queries `MatchPosted` logs directly from Sepolia, displays red match pins, event details, kickoff, price, remaining seats, and a WDK purchase action. While focused it polls every **2 seconds** with incremental log queries; full scan on open. `MatchSale.remaining()` is fetched on full refresh and for the selected pin only. Map **BUY 1** opens Pay checkout without a payment QR scan (remote purchase path).
- `src/app/(tabs)/tickets.tsx` offers **View on map** on received tickets via `resolveTicketLocation()` deep link to Map focus params.
- `src/app/(tabs)/pay.tsx` MatchSale checkout mints tickets with real map coordinates passed from Map (not `0,0`).
- `src/features/matches/registry.ts` owns contract ABI, calldata, log decoding, registry publishing, incremental discovery helpers, RPC racing, and batched approval + `buy()` calls. `transactionMaxFee` is separate from the legacy token-transfer `transferMaxFee`.
- Do not make ticket creation block on a public receipt. WDK can return a UserOperation hash before the RPC exposes a receipt; save the local ticket and `registryTxHash` immediately after WDK accepts the publish. Map discovery indexes the event asynchronously via 2s incremental polling — no central database.
- If a fresh dev client does not see the registry, restart Metro with `npm start -- --clear`; a standalone APK must be rebuilt after env changes. `npm run verify` currently passes with 55 tests.

## Verification

```bash
npm run verify   # Expo lint + TypeScript + Vitest (60 tests)
```

---

## Agent behavior

- Read Expo v54 docs before changing native config or `app.json` plugins
- Prefer npm scripts over re-documenting their steps manually
- Keep README.md for humans; keep this file as the **product mission + agent runbook**
- Read `docs/memory.md` at session start for recent UI/native changes and verification status
- When adding UI, follow **§ Design pattern language** — tokens from `renopay-brand.ts`, `NeoBrutalButton`, code-built screens (not full mock PNG backgrounds)
- When adding features, preserve WDK gateway split: **money = WDK on-chain; tickets = QR envelope + local mint**
- Run `npm run verify` before finishing; payment, QR, crypto, and wallet utility tests are in Vitest
- Demo must work on **two physical devices**: receiver QR → sender scan → pay → ticket on sender, attendee on receiver

---

## Demo script (3 min, two phones)

1. **Phone A (Receiver):** unlock wallet → Gate → create a 20 USD₮ ticket → Receive Payment QR.
2. **Phone B (Sender):** unlock wallet → Pay → Scan the payment QR → verify ticket and WDK fee quote.
3. **Sender:** confirms device PIN/biometric → WDK sends real Sepolia mock USD₮.
4. **Both:** fan sees **Tickets**; gatekeeper sees **Attendees** after chain verification.
5. Mention: no central server; Sepolia testnet mock USD₮; ticket data is encrypted in the payment QR and minted locally only after a transaction hash.

6. Fan Map BUY opens Pay checkout (no QR scan). Confirm YES, approve the WDK MatchSale call, then open Tickets → **View on map** to see the stadium pin, or show the encrypted verification QR.
7. Club Verify scans the fan **verification** QR from Tickets (not the Gate payment QR). Choose **VERIFY** or **EXPIRE**; the gatekeeper wallet must match the ticket issuer. Proof is keyed by purchase id so multiple fans can buy the same gate offer.

### Demo wallet funding (gasless USDT)

1. **Settings → COPY ADDRESS** on the **sender** phone (full `0x…`, 42 chars, no spaces).
2. Open **Candide faucet:** https://dashboard.candide.dev/faucet — sign in with Google/GitHub → Sepolia → mint mock **USD₮** to that address.
   Alternate: https://dashboard.pimlico.io/test-erc20-faucet
3. Wait ~30–60s for the mint tx to confirm.
4. Sender needs **ticket price + the displayed WDK network fee** in that Sepolia USD₮ — for a 20 USD₮ ticket, fund more than 20 USD₮. **No Sepolia ETH is required** (ERC-4337 paymaster token mode).
5. If paymaster is unreachable, retry; ETH faucet is optional fallback only.

Token Reno Pay watches/pays with: `0xd077a400968890eacc75cdc901f0356c943e4fdb` (Candide/WDK Sepolia mock USDT).

### Current payment reliability state (2026-07-12)

- WDK fee mode is Candide ERC-4337 paymaster-token mode on Sepolia.
- `SEPOLIA_DEMO_TRANSFER_MAX_FEE_ATOMIC` is `20_000_000` (20 test USD₮) in `src/config/wdk.ts`. This testnet-only ceiling is enforced by WDK and Reno Pay preflight; never present it as a production setting.
- Sender confirmation reads a real `quoteTransfer()` fee first. Reno Pay rejects a fee `>= transferMaxFee`, matching WDK exactly, then sends only through `useAccount().send()`.
- A local sender ticket is minted only after `success === true` and a real `txHash` are returned. The receiver independently polls the mock USDT `Transfer` log from the QR session start block and writes a local attendee record.
- Latest standalone APK: `npm run android:standalone-apk` at 2026-07-13 13:31 IST → `android/app/build/outputs/apk/release/app-release.apk`, 198 MB, SHA-256 `e4c05e0d86694002d1e8d8d7068c4b4a1bbfc4c7eaf18866489e068ee1cc84e9`.
