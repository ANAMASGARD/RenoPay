# Role Navigation Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give fans a Map placeholder while enforcing distinct, role-appropriate bottom navigation for fans and clubs.

**Architecture:** `src/app/(tabs)/_layout.tsx` is the sole source of tab membership and order. The custom tab bar maps approved route names to labels and icons. The Map screen is intentionally a static, token-based placeholder with no Mapbox rendering or location permission request.

**Tech Stack:** Expo Router, React Native, TypeScript, MaterialCommunityIcons, Lottie React Native.

---

### Task 1: Define the Fan-only Map tab

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx`
- Modify: `src/components/navigation/glass-tab-bar.tsx`
- Create: `src/app/(tabs)/map.tsx`

- [x] **Step 1: Add the Map route to the custom tab-bar type and icon configuration.**

```tsx
type TabKey = 'pay' | 'gate' | 'tickets' | 'map' | 'attendees' | 'issued' | 'settings';

map: { label: 'MAP', icon: 'map-outline' },
```

- [x] **Step 2: Make each persona's ordered tab list explicit.**

```tsx
// Fan: Pay, Tickets, Map, Settings.
// Club: Create, Verify, Issued, Settings.
{!isClub ? <SwipeTabs.Screen name="map" options={{ title: 'MAP' }} /> : null}
```

- [x] **Step 3: Create the Map placeholder without requesting permissions or rendering a map SDK.**

```tsx
export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>MATCH MAP</Text>
      <Text style={styles.copy}>Club locations and match-day directions will appear here.</Text>
    </View>
  );
}
```

- [x] **Step 4: Run TypeScript validation.**

Run: `npx tsc --noEmit`

Expected: exits with code 0.

### Task 2: Verify the user-facing role boundary

**Files:**
- Verify: `src/app/(tabs)/_layout.tsx`
- Verify: `src/components/navigation/glass-tab-bar.tsx`

- [x] **Step 1: Run the project verification suite.**

Run: `npm run verify`

Expected: Expo lint, TypeScript, and all Vitest tests pass.

- [x] **Step 2: Review the generated navigation order.**

Confirm: Fan routes are `pay`, `tickets`, `map`, `settings`; Club routes are `gate`, `attendees`, `issued`, `settings`; Settings is last in both lists.
