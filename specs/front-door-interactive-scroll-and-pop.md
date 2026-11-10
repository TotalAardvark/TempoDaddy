# Feature Specification: Front Door Interactive Metronome Pop & Apparatus-Aware Scroll Navigation

## 1. User Story
As a user visiting the Tempo Daddy Front Door page (`/`):
1. I want the Metronome Daddy icon to feel lively and inviting, with an elevated hover pop (`scale-[1.06]`) and an energetic spring pop/bounce animation when clicked, so that its physical interactivity is immediately obvious and delightful.
2. When my mouse is hovered over any visual element of the metronome apparatus (the Metronome Daddy icon, the giant BPM numerals, the skeuomorphic horizontal thumbdial, or the amber disc), scrolling should directly adjust the metronome BPM (`scroll up` = BPM up, `scroll down` = BPM down) without triggering card navigation.
3. When scrolling anywhere else on the screen (including the negative space / margins of the metronome card, tour guide cards, headers, footers, and background), scrolling should seamlessly cycle through the carousel cards (`scroll down / right` = next card, `scroll up / left` = previous card) with smooth gesture throttling.

---

## 2. Acceptance Criteria (AC)

- [ ] **AC1: Metronome Icon Enhanced Hover Pop & Click Bounce**
  - Hovering over the Metronome Daddy icon increases its scale from `scale-[1.02]` to `scale-[1.06]` with smooth cubic transitions.
  - Clicking the Metronome Daddy icon triggers an energetic, spring-overshoot pop/bounce animation (`animate-metronome-bounce` keyframe) that rebounds before settling back.
  
- [ ] **AC2: Apparatus-Targeted BPM Scroll (Scroll Up = BPM Up, Scroll Down = BPM Down)**
  - Scrolling while the mouse cursor is over any visual element of the metronome apparatus adjusts the BPM:
    - Over the Metronome Daddy icon (`metronome-daddy-trigger`).
    - Over the giant BPM readout (`hero-bpm-display`).
    - Over the amber disc / ring (`metronome-amber-ring`).
    - Over the skeuomorphic horizontal dial (`horizontal-thumb-dial`).
  - Scroll up increases BPM (clamped at `MAX_BPM = 300`).
  - Scroll down decreases BPM (clamped at `MIN_BPM = 30`).
  - Apparatus scroll events call `e.stopPropagation()` so they never propagate to the carousel navigation handler.

- [ ] **AC3: Screen & Negative-Space Carousel Scroll Navigation**
  - Scrolling on any part of the screen NOT part of the metronome apparatus cycles through the carousel cards:
    - Scrolling on the stage background, padding margins, header, and footer.
    - Scrolling on the negative space of the Metronome Daddy card (e.g., corners and empty padding outside the apparatus).
    - Scrolling anywhere on Tour Cards (Cards 1–7).
  - Scroll down or right advances to the next card (`goToNextCard`).
  - Scroll up or left returns to the previous card (`goToPrevCard`).
  - Carousel scrolling is debounced/cooldown-throttled (~350ms) to ensure one deliberate scroll gesture advances exactly one card without chaotic spinning.
  - If a modal is open (`isModalOpen === true`), carousel scroll navigation is disabled.

---

## 3. Affected Files

1. `specs/front-door-interactive-scroll-and-pop.md` (Specification document - created)
2. `src/index.css` (Add `@keyframes metronomePopBounce` and `.animate-metronome-bounce` spring animation)
3. `src/components/FrontDoorScreen.tsx`:
   - Add click-bounce state (`isIconBouncing`) and animation handler to `metronome-daddy-trigger`.
   - Update hover scale to `group-hover:scale-[1.06]`.
   - Ensure `hero-bpm-display` span and `metronome-amber-ring` have pointer events enabled and attach `handleApparatusWheel`.
   - Add `handleCarouselWheel` to outer FrontDoorScreen container with cooldown throttling and modal guard.
4. `src/components/__tests__/FrontDoorScreen.test.tsx` (Add deterministic unit tests verifying AC1, AC2, and AC3).

---

## 4. Acceptance Tests & Edge Cases

### Test Cases
1. **Apparatus Wheel on Metronome Icon:**
   - Render Front Door at BPM 120.
   - Fire wheel event with `deltaY: -100` (scroll up) on `screen.getByTestId('metronome-daddy-trigger')`.
   - Expect BPM to increase to 121 (or step).
   - Expect active card index to remain `0`.
2. **Apparatus Wheel on Giant BPM Numbers:**
   - Fire wheel event with `deltaY: 100` (scroll down) on `screen.getByTestId('hero-bpm-display')`.
   - Expect BPM to decrease.
   - Expect active card index to remain `0`.
3. **Apparatus Wheel on Amber Disc:**
   - Fire wheel event on `screen.getByTestId('metronome-amber-ring')`.
   - Expect BPM to adjust accordingly.
   - Expect active card index to remain `0`.
4. **Negative Space & Outer Screen Carousel Wheel:**
   - Fire wheel event with `deltaY: 100` on the main container or negative space of the card.
   - Expect card index to advance from 0 to 1.
   - Fire rapid successive wheel events within cooldown; expect card index to stay at 1 until cooldown expires.
   - Fire wheel event with `deltaY: -100`; expect card index to return to 0.
5. **Modal Guard:**
   - Render Front Door with `isModalOpen={true}`.
   - Fire wheel event on outer container; verify active card index does not change.
6. **Icon Click Bounce & Hover Classes:**
   - Verify hover class includes `scale-[1.06]`.
   - Click metronome trigger and verify `animate-metronome-bounce` is applied during the bounce phase.

---

## 5. Potential Risks & Edge Cases

- **Trackpad High-Frequency Events:** Trackpads emit continuous streams of floating-point delta events. A cooldown timer (`lastCarouselWheelTimeRef`) and delta threshold ensure trackpad swipes advance only one card at a time smoothly.
- **Negative Space Hit-Testing:** If `hero-bpm-display` has a full-width container (`w-full`), clicks/scrolls in empty margin space could accidentally be caught by the apparatus. Solution: keep the positioning container `pointer-events-none` and attach pointer events and `onWheel` directly to the rendered numerical content (`<span className="pointer-events-auto">`).
- **Modal Interference:** When user opens settings, playlists, or sync modals, scroll events in the modal must not cause background cards to shuffle. Guarding `if (isModalOpen) return;` prevents this cleanly.

---

### Mid-Flight Adjustments & Additions
1. **New Repo Startup Kit Alignment:**
   - Updated `AGENTS.md` to include Dev Server command and Invariant 9 (Branch & Worktree Hygiene).
   - Added `skills/deploy/SKILL.md` and `.agents/skills/deploy/SKILL.md`.
   - Updated `skills/spec-workflow/SKILL.md` and `.agents/skills/spec-workflow/SKILL.md` with step 4 branch initialization.
2. **Deterministic Test Verification:**
   - Added automated tests in `src/components/__tests__/FrontDoorScreen.test.tsx` verifying:
     - Hover scale `group-hover:scale-[1.06]` and click bounce animation `animate-metronome-bounce`.
     - Apparatus scrolling on Metronome Daddy trigger, giant BPM number, and amber disc with card position isolation.
     - Global carousel scrolling on screen root with cooldown throttling and modal guard.

