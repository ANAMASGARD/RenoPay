# Reno Pay

Decentralized **football gate payments & ticketing** for the [Tether Developers Cup](https://dorahacks.io). One app, two hackathon tracks:

- **WDK** — self-custodial Sepolia USDT wallet; real on-chain payments
- **Pears Stack** — Hyperswarm P2P for session sync and ticket transfer (no Reno Pay backend)

Money moves on-chain. Tickets move device-to-device over encrypted P2P. QR codes bootstrap the session only.

---

## Prerequisites

- **Node.js 18+**
- **Android SDK** (API 29+, compile 36) — see [AGENTS.md](./AGENTS.md)
- **Physical Android phone(s)** — arm64 (e.g. Pixel 8a). **Do not use Expo Go.**

```bash
source scripts/android-env.sh   # sets ANDROID_HOME, JAVA_HOME
```

---

## First-time setup

```bash
git clone <repo-url>
cd renopay
npm install --legacy-peer-deps
npm run generate:wdk    # WDK worklet bundle
npm run pack:p2p        # Hyperswarm P2P worklet bundle
```

---

## Run locally (USB dev — two phones demo)

### Option A — one command (recommended)

Builds native dev client, installs via USB, forwards Metro:

```bash
source scripts/android-env.sh
npm run android:device
```

Repeat on a second phone (set `export ANDROID_SERIAL=<device-id>` if both are plugged in).

### Option B — Metro + fast JS reload

**Terminal 1 — Metro (leave running):**

```bash
source scripts/android-env.sh
export REACT_NATIVE_PACKAGER_HOSTNAME=localhost
adb reverse tcp:8081 tcp:8081
npm start
```

**Terminal 2 — install native app (first time or after native/plugin changes):**

```bash
source scripts/android-env.sh
npm run android:device
```

Open the **renopay** app (not Expo Go). Shake → **Reload** after JS-only edits.

### When to run `android:recover`

Required after native plugin changes, `app.json` icons, stale native/JS mismatch, or missing bundles:

```bash
source scripts/android-env.sh
npm run android:recover
```

---

## Standalone release APK (no Metro — demo / LocalSend)

Build once on your laptop, share `app-release.apk` to any arm64 Android phone. **Internet required** on phones (Sepolia + Hyperswarm). No env vars on device.

```bash
cd renopay
source scripts/android-env.sh

npm install --legacy-peer-deps
npm run generate:wdk
npm run pack:p2p
npm run build:bare-kit
bash scripts/patch-bare-kit-android-vm.sh
npx expo prebuild --clean --platform android

cd android
./gradlew assembleRelease
```

**APK output:**

```
android/app/build/outputs/apk/release/app-release.apk
```

Install on each phone (enable “Install unknown apps” for your file sender). Open **renopay** — no laptop or Metro needed.

If release signing fails, try:

```bash
npx expo run:android --variant release --no-install --no-bundler
find android/app/build/outputs/apk -name "*.apk"
```

---

## App tabs

| Tab | Role |
|-----|------|
| **Gate** | Receiver — create tickets, show payment QR, view attendees |
| **Pay** | Sender — scan payment QR, pay USDT, receive ticket |
| **Tickets** | Local ticket drawer (received + issued) |
| **Settings** | Wallet, P2P status, clear local data |

Swipe left/right between tabs (WhatsApp-style); bottom nav stays in sync.

---

## Two-phone demo script (~3 min)

1. **Phone A (Gate):** Connect Tether Wallet → Create ticket → **Receive Payment** → show QR
2. **Phone B (Pay):** Connect wallet → **Scan QR Code** → confirm amount → **Pay & Unlock Ticket**
3. **Phone B:** Ticket appears under **Tickets → Received**
4. **Phone A:** Attendee listed under **Gate → Attendees**

Both phones need internet. Payment QR must be scanned **inside Reno Pay Pay tab** (not Google Pay / generic camera).

---

## Architecture

```
Expo Router UI
├── WDK worklet → Sepolia USDT (self-custodial send)
└── P2P worklet → Hyperswarm topic rooms (session + ticket events)
```

- `src/config/wdk.ts` — Sepolia USDT, `safeModulesVersion: '0.3.0'`
- `src/features/tickets/` — QR payloads, payment session, P2P ticket store
- `src/services/p2p/p2p-worklet.entry.js` — Hyperswarm swarm

Full agent runbook: **[AGENTS.md](./AGENTS.md)**

Design specs: `docs/superpowers/specs/`

---

## Verify

```bash
npm run verify   # lint + typecheck
```

---

## External services

| Service | Use |
|---------|-----|
| Sepolia RPC | On-chain USDT settlement |
| Candide bundler | ERC-4337 (WDK) |
| Hyperswarm DHT | P2P discovery (decentralized) |

No Reno Pay backend. No API keys in `.env` — config is in source (`src/config/wdk.ts`).

---

## License

MIT (see repository license file)
