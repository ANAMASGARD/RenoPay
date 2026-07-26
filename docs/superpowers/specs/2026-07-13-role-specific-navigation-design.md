# Role-specific navigation design

## Intent

Reno Pay uses one self-custodial wallet but presents a focused workspace for the user’s selected matchday persona. The Fan workspace contains only payment and pass-management tasks. The Club workspace contains only ticket issuing and entry verification tasks. Treasury remains a Club setting, not a primary matchday tab.

## Navigation

### Fan — Pay & Enter

Bottom navigation has three aligned items: **Pay**, **My Tickets**, and **Settings**. Pay opens the scanner/payment flow. My Tickets displays only tickets received by the fan and provides the existing verification-QR and Share Entry Pass actions. Settings contains wallet, backup, mode switching, and support.

### Club — Sell & Protect

Bottom navigation has exactly four aligned items: **Create**, **Verify**, **Issued**, and **Settings**. Create opens the existing ticket issue/payment-QR workflow. Verify shows locally recorded, independently chain-verified attendees. Issued displays only tickets created by the Club. Settings contains wallet/security controls, the Club Treasury entry point, mode switching, and support.

## Visual behavior

The shared bottom bar uses equal-width tab cells, a fixed label baseline, black hard shadows, 2–3px borders, and Reno Pay brand tokens. The focused tab receives the yellow neo-brutalist tile. Only the focused icon plays a short, looping Lottie animation; inactive icons are static to preserve clarity and battery life. The app uses locally bundled Lottie JSON assets, not remotely fetched animations.

## Boundaries

- Fan never sees ticket creation, attendee verification, or Club Treasury controls.
- Club never sees the payment scanner or received-ticket list.
- No screen removes the existing WDK payment, QR encryption, or local ticket-storage behavior.
- The tab bar has at most four items in either persona.
