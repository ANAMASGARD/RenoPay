# Role-specific Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Fan and Club users focused, role-specific bottom navigation with subtle Lottie active-icon animation.

**Architecture:** Drive the navigator from the persisted `AppPersona`. Share the existing ticket and settings data while filtering lists by ticket kind. Move Treasury behind the Club Settings route and make the bottom bar a four-or-fewer equal-cell layout.

**Tech Stack:** Expo SDK 54, Expo Router, React Native, Lottie React Native, existing Reno Pay tokens and `SwipeTabs`.

---

### Task 1: Role-specific route composition

**Files:** Modify `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/tickets.tsx`; create `src/app/(tabs)/issued.tsx` and `src/app/(tabs)/club-settings.tsx`.

- [ ] Render Fan tabs as `pay`, `tickets`, `settings` and Club tabs as `gate`, `attendees`, `issued`, `club-settings`.
- [ ] Filter Fan tickets to `kind === 'received'`; filter Issued tickets to `kind === 'issued'`.
- [ ] Route the Club Settings treasury row to the existing Treasury screen; retain wallet and mode-switch controls.

### Task 2: Neo-brutalist tab bar and Lottie

**Files:** Modify `src/components/navigation/glass-tab-bar.tsx`, `package.json`, `package-lock.json`; create local Lottie icon assets and a focused-tab icon wrapper.

- [ ] Install the SDK-compatible `lottie-react-native` package.
- [ ] Render all labels on one fixed baseline with equal cell widths and no vertical layout shift.
- [ ] Keep inactive icons static; render a 24px local Lottie loop only within the focused yellow, black-bordered icon tile.
- [ ] Use only `RenoPayBrand` and hard offset shadows.

### Task 3: Verification

**Files:** Modify/add Vitest tests for persona tab configuration and ticket-kind filtering.

- [ ] Verify each persona exposes only its allowed route names and at most four tabs.
- [ ] Verify Fan filters received tickets and Club filters issued tickets.
- [ ] Run `npm run verify`; run `npm run android:recover` after the native Lottie dependency change.
