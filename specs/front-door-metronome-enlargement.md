# Feature Specification: Front Door Metronome Card Element Enlargement

## 1. User Story
As a user visiting the Tempo Daddy Front Door page (`/`):
1. I want the Metronome Daddy icon and the giant BPM numerals on Card 0 (the Quick Metronome card) to be visually larger and more prominent.
2. I want the BPM numbers scaled up ~20% with sleek display sans typography framed in the upper apparatus.
3. I want the Metronome Daddy icon scaled down ~10% and centered in the upper apparatus to balance negative space above the thumbdial.
4. I want the overall numbers + metronome visual element to remain centered in roughly the same place on the card, with the glowing amber pulse halo scaled up to frame the larger metronome.

---

## 2. Acceptance Criteria (AC)

- [x] **AC1: BPM Number Font Scaling (+20% Scale & Sleek Display Sans Typography)**
  - Font family switched from `font-mono` to `font-sans font-black tracking-tighter tabular-nums` for sculpted, modern geometric display curves.
  - Font size clamp increased to `text-[clamp(11.5rem,38vw,22rem)] landscape:text-[clamp(10rem,28vw,18rem)]`.
  - Shifted UP vertically (`-translate-y-[4.125rem] sm:-translate-y-[5.25rem] landscape:-translate-y-[3.75rem]`) to frame cleanly above the metronome.
  - When BPM is 100 or greater (3 digits), shifted 9px to the left (`-translate-x-[9px]`) so visual weight of 3-digit numbers remains centered.

- [x] **AC2: Metronome Daddy Icon Scaling (-10% Reduction for Optimal Proportions)**
  - Icon dimensions adjusted:
    - Mobile: `w-[15.75rem] h-[15.75rem]` (~252px).
    - Tablet / Desktop: `sm:w-[20.5rem] sm:h-[20.5rem]` (~328px).
    - Landscape: `landscape:w-[18.875rem] landscape:h-[18.875rem]` (~302px).
  - Shifted DOWN vertically (`translate-y-[4.125rem] sm:translate-y-[5.25rem] landscape:translate-y-[3.75rem]`) by an equal distance to cleanly separate from the BPM numerals.

- [x] **AC3: Proportional Amber Pulse Halo Scaling & Focus Ring Refinement**
  - Amber halo ring centered with `top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+1.5rem)] sm:-translate-y-[calc(50%+2rem)] landscape:-translate-y-[calc(50%+1.25rem)]` and sized to `w-[20.5rem] h-[20.5rem] sm:w-[26rem] sm:h-[26rem] landscape:w-[23rem] landscape:h-[23rem]` to encompass the upward-shifted BPM numbers and upper metronome frame.
  - Trigger focus ring set to `rounded-full` to eliminate boxy squircle focus outlines.

- [x] **AC4: Layout Balance & Equal ~8% Negative Space Architecture**
  - Thumbdial and hint firmly anchored at bottom of card (`shrink-0`).
  - Upper apparatus zone (`flex-1 min-h-0 flex items-center justify-center`) distributes equal ~8% negative space on all 4 sides (top of card, top of thumbdial, left, right).
  - Card 0 landscape width calibrated to `landscape:max-w-xl` for unified stage framing.
  - The combined apparatus remains well-centered within Card 0.
  - Spacing between the metronome, "Tap to start metronome" hint, and horizontal thumbdial breathes comfortably without pushing controls off-screen or causing scroll clipping.

---

## 3. Affected Files
1. `specs/front-door-metronome-enlargement.md` (Specification)
2. `src/components/FrontDoorScreen.tsx` (Enlarged numerals, metronome icon, and amber halo classes)
3. `src/components/__tests__/FrontDoorScreen.test.tsx` (Update or add unit test assertions confirming class hierarchy and layout integrity)
