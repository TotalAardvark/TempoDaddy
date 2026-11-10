# Feature Specification: Front Door Metronome Card Element Enlargement

## 1. User Story
As a user visiting the Tempo Daddy Front Door page (`/`):
1. I want the Metronome Daddy icon and the giant BPM numerals on Card 0 (the Quick Metronome card) to be visually larger and more prominent.
2. I want the BPM numbers to grow ~50% taller from their current baseline so they feel bold and monumental behind the metronome without shifting the baseline downward.
3. I want the Metronome Daddy icon to grow ~75% taller with the apex top of the metronome remaining in the same vertical position, expanding downward into the card.
4. I want the overall numbers + metronome visual element to remain centered in roughly the same place on the card, with the glowing amber pulse halo scaled up to frame the larger metronome.

---

## 2. Acceptance Criteria (AC)

- [x] **AC1: BPM Number Font Scaling (+50% Taller from Baseline)**
  - Font size clamp increased by 1.5x (portrait clamp ~11.25rem–21rem, landscape clamp ~9.75rem–17.25rem).
  - Absolute positioning adjusted upward (`-top-14 sm:-top-20 landscape:-top-16`) so the baseline of the digits remains anchored at its existing vertical location while expanding 50% taller upward without clipping Card 0 bounds.

- [x] **AC2: Metronome Daddy Icon Scaling (+75% Taller, Top-Anchored)**
  - Icon dimensions increased by 1.75x:
    - Mobile: `w-[17.5rem] h-[17.5rem]` (280px × 280px, vs previous 160px).
    - Tablet / Desktop: `w-[22.75rem] h-[22.75rem]` (364px × 364px, vs previous 208px).
    - Landscape: `w-[21rem] h-[21rem]` (336px × 336px, vs previous 192px).
  - Top margin anchor on trigger button preserved (`mt-6 sm:mt-8 landscape:mt-6`) so the apex crown of the metronome maintains its vertical position.

- [x] **AC3: Proportional Amber Pulse Halo Scaling**
  - Amber halo ring expanded to `w-[22rem] h-[22rem] sm:w-[28rem] sm:h-[28rem] landscape:w-[26rem] landscape:h-[26rem]` so its glowing aura frames the enlarged metronome casing.

- [x] **AC4: Layout Balance & Visual Centering**
  - The combined apparatus remains well-centered within Card 0.
  - Spacing between the metronome, "Tap to start metronome" hint, and horizontal thumbdial breathes comfortably without pushing controls off-screen or causing scroll clipping.

---

## 3. Affected Files
1. `specs/front-door-metronome-enlargement.md` (Specification)
2. `src/components/FrontDoorScreen.tsx` (Enlarged numerals, metronome icon, and amber halo classes)
3. `src/components/__tests__/FrontDoorScreen.test.tsx` (Update or add unit test assertions confirming class hierarchy and layout integrity)
