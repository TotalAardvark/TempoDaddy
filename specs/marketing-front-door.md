# Feature Specification: Unified Front Door ("Metronome Daddy", "Tour Guide Daddy" Carousel & "Enter the Gym" Drawer)

## 1. User Story
As a first-time visitor or returning practitioner opening Tempo Daddy at `/`, I want to land on a clutter-free, adaptive **Unified Front Door** featuring a playful, charismatic "zaddy inspirational gym coach" persona backed by cognitive science and pro-musician practice methodology.

Right at the center of the Front Door is **Metronome Daddy** (Card 0)—an immediately functional, zero-friction standalone metronome with a transparent golden-mustachioed metronome icon, a giant BPM readout layered behind its upper silhouette, a glowing amber confirmation ring when ticking, and a skeuomorphic horizontal thumbdial underneath.

Swiping horizontally (or clicking the peeking side cards in landscape / using arrow keys) loops through **7 Tour Guide Daddy cards** that persuasively reframe the metronome from a cold timekeeper into a relaxing, dopamine-rich cognitive gym. At the bottom of the screen, a centered (non-full-width) drawer tab reading **`ENTER THE GYM [space]`** pokes up; pressing `Space`, clicking, or swiping up smoothly slides **Tempo Daddy** (the full routine/logbook app) up over the viewport.

---

## 2. Spatial & Visual Architecture (Model B)

### 2.1 Card 0: Metronome Daddy (Pure & Minimalist Quick Metronome)
- **Visual Layering (Back to Front):**
  1. **Ambient Amber Ring:** Hidden when paused; smoothly fades in (`opacity-0` -> `opacity-100`) with a warm amber glow around/behind the metronome icon when ticking, pulsing subtly on each beat.
  2. **Giant Background BPM Typography:** High-impact tabular display numeral positioned behind the upper pyramid silhouette of the metronome so it remains clearly legible while partially framed by the metronome's top spire.
  3. **Transparent Golden-Mustache Metronome Icon:** Custom transparent vector/composite rendering of the Tempo Daddy metronome with brushed dark metallic body, swinging golden pendulum arm, and 3D golden handlebar mustache. Tapping/clicking directly on the metronome body toggles playback on/off.
- **Disappearing Onboarding Hint:**
  - Below the metronome icon, display `"Tap to start metronome"` in a subtle, non-interactive label (`pointer-events-none`).
  - As soon as the user activates Metronome Daddy for the first time, the hint smoothly fades out and sets `localStorage.setItem('tempo_daddy_metronome_hint_dismissed', 'true')` so it remains permanently hidden on all subsequent visits.
- **Skeuomorphic Horizontal Thumbdial:**
  - Positioned underneath Metronome Daddy with distinct visual and touch boundaries.
  - Styled like a tactile, machined horizontal thumbwheel with knurled vertical ridges, specular center highlight, recessed side shadows, and a subtle BPM drag sensitivity (~4–6px per BPM).
  - Captures pointer/touch/wheel events (`e.stopPropagation()`) so rolling the thumbdial horizontally adjusts BPM (`MIN_BPM = 30` to `MAX_BPM = 300`) without ever triggering a horizontal carousel swipe.

### 2.2 Cards 1–7: Tour Guide Daddy (Looping Persuasive Flashcards)
The carousel loops seamlessly in both directions (`0 <-> 1 <-> 2 <-> 3 <-> 4 <-> 5 <-> 6 <-> 7 <-> 0`):

1. **Card 1 — The Universal Cognitive Gym (The Paradigm Shift)**
   - **Headline:** *Your Nervous System's Favorite Weight Room.*
   - **Coach Copy:** *"Hey champion. Let Daddy let you in on a little secret: getting ridiculously good at complex motor skills isn't a mystical gift—it's progressive cognitive conditioning, and it feels damn good when you do it right. Tempo Daddy turns intimidating barriers into effortless, relaxing flow states. You bring the curiosity; Daddy handles the cognitive load."*
   - **Visual Widget:** Stylized progressive cognitive loading wave / flow-state meter transitioning from "Tension" to "Relaxed Mastery."

2. **Card 2 — Zero Initiation Fatigue (The Automatic Gym Logbook)**
   - **Headline:** *Leave the Crumpled Notebook in Your Bag.*
   - **Coach Copy:** *"What BPM did you leave off on Tuesday? Who cares—Daddy already wrote it down. No hunting for a pencil, no setup dread, no math. Just tap start and warm up automatically at 80% of your personal best."*
   - **Visual Widget:** Sleek workout log card showing automatic warmup ramp (`96 BPM -> 120 BPM`) and zero-friction 1-tap start preview.

3. **Card 3 — Progress Charts That Freaking Rule**
   - **Headline:** *Watch Your Brain Rewire in Real Time.*
   - **Coach Copy:** *"Day-to-day progress is hard to feel when you're in the trenches. Seeing your velocity plotted out across weeks of micro-sessions? Pure magic. Our signature Teal Progress Charts turn invisible neural adaptation into an undeniable upward climb."*
   - **Visual Widget:** Interactive/live showcase rendering of `TealProgressGraph` with a multi-session upward BPM trajectory and glowing data nodes.

4. **Card 4 — The +1 BPM Dopamine Engine**
   - **Headline:** *+1 BPM Gets a Trophy. Every Single Time.*
   - **Coach Copy:** *"Most people quit because they only celebrate giant leaps. Not in Daddy's gym. Nudge your personal best up by a single beat per minute and we pop the gold hardware—because rewarding tiny, repeatable wins is how you build durable, lifelong change."*
   - **Visual Widget:** Glowing golden Trophy showcase badge with `+1 BPM PR!` celebration callout and weekly/monthly/all-time PR counter preview.

5. **Card 5 — The 2-Minute Streak Calendar**
   - **Headline:** *Two Minutes Counts. Showing Up Is the Whole Game.*
   - **Coach Copy:** *"Only got two minutes before work? Get in here anyway, tiger. Our compact streak calendar lights up whether you grind for an hour or lock in for 120 seconds. Consistency beats heroic burnout ten times out of ten."*
   - **Visual Widget:** Compact 28-day flame streak grid (`🔥`) highlighting daily micro-sessions.

6. **Card 6 — Playlists, Attached Notes & Routine Sharing**
   - **Headline:** *Curate Your Sets. Share the Gains.*
   - **Coach Copy:** *"Build separate playlists for different skill sets, pin sticky coaching notes directly to individual exercises so your cues never get lost, and beam full practice routines via link or QR code to students, friends, and disinterested strangers."*
   - **Visual Widget:** Multi-playlist pill switcher + pinned exercise note card + QR/link share badge.

7. **Card 7 — Hands-Free "Chops God" Keyboard Controls**
   - **Headline:** *Keep Your Hands on Your Craft, Not Your Screen.*
   - **Coach Copy:** *"Once you're in the zone, touching a screen kills the groove. Tempo Daddy is wired for zero-look control so you can focus 100% on turning into a chops god: Space to go, Double-Space to log & advance, and Arrow keys or +/- to dial the heat."*
   - **Visual Widget:** Tactile hardware keycap grid illustrating `[Space]` (Start / Pause), `[Space]×2` (Confirm Set), `[←][→]` / `[+][-]` (1 BPM tap / Hold for +3 turbo).

### 2.3 Adaptive Layout (Portrait vs. Landscape)
- **Portrait Mode (Mobile-First, Zero Clutter):**
  - Strictly `100dvh` (`overflow-hidden`) viewport with generous breathing room.
  - Top bar: Minimal brand wordmark (`TEMPO DADDY`) + compact carousel indicator dots (`8` dots total: Amber dot for Card 0, sleek dots for Cards 1–7).
  - Center stage: Full focus on the active card in a single vertical column; adjacent cards sit just off-screen with subtle edge-peek cues.
  - Bottom center: Compact, non-full-width peeking drawer tab (`START TEMPO DADDY` / `[space]`).
- **Landscape Mode (Wide Stage + Peeking Neighbors):**
  - Wide horizontal stage where the active card sits centered (`max-w-3xl`), while the previous and next cards in the loop peek visibly on the left and right sides (`opacity-40 hover:opacity-75`, clickable to slide directly to that card).
  - Cards 1–7 automatically reflow inside the active card into a balanced **2-column split** (Daddy's headline & coach copy on the left, visual feature showcase widget on the right). Card 0 keeps Metronome Daddy centered on stage.
  - Centered (non-full-width) `"START TEMPO DADDY [space]"` drawer tab pokes up from the bottom edge.

### 2.4 "START TEMPO DADDY" Bottom Drawer & Smart Keyboard Shortcuts
- **Closed Drawer Tab (Front Door Active):**
  - Centered drawer tab anchored to `bottom-0`, widened ~60% (`w-72 sm:w-80 max-w-[92vw]`), rounded top corners (`rounded-t-2xl`), subtle upward chevron, displaying:
    - Line 1: `START TEMPO DADDY`
    - Line 2: `[space]` floating cleanly without a heavy border box
  - Supports click/tap, upward touch-swipe gesture (`deltaY < -30px`), and pressing the `Space` key.
- **Opening the Drawer:**
  - If Card 0's quick metronome is currently playing, it automatically stops cleanly so audio engines never collide.
  - Slides the full Tempo Daddy practice interface (`ColdStartScreen` -> Active Practice / Routine) smoothly up to cover the viewport.
- **Returning to the Front Door:**
  - When on `ColdStartScreen` inside the Gym drawer, a sleek top drawer handle (`⌄ Metronome & Tour`) is rendered at the top center. Clicking it, dragging it down, or pressing `Escape` slides the Gym drawer back down to reveal the Front Door.
- **Smart Context Keyboard Routing (when on Front Door):**
  - `Space`: Prevents default and opens the `"START TEMPO DADDY"` drawer.
  - `+ / =` and `- / _`: Always adjusts Metronome Daddy's BPM (`+1 / -1` on single tap, `+3 / -3` on key hold/repeat).
  - `ArrowLeft` and `ArrowRight`:
    - When Metronome Daddy is **paused**: Cycles the looping carousel to the previous / next card.
    - When Metronome Daddy is **actively ticking**: Adjusts Metronome Daddy's BPM (`-1/+1` tap, `-3/+3` hold).

---

## 3. Acceptance Criteria
- [x] **AC1 (Unified Front Door Default):** Loading the app renders the Front Door with Card 0 (**Metronome Daddy**) centered and the `"START TEMPO DADDY [space]"` drawer tab poking up at the bottom center (non-full-width, widened ~60%).
- [x] **AC2 (Card 0 Layered Visuals & Amber Ring):** Card 0 displays the transparent Golden-Mustache Metronome icon with the large BPM numeral positioned behind its upper silhouette. Tapping the metronome icon starts/stops audio ticks via `MetronomeEngine` and fades in/out a glowing amber ring behind/around the icon.
- [x] **AC3 (Disappearing "Tap to start" Hint):** The `"Tap to start metronome"` text below the icon is non-clickable (`pointer-events-none`), disappears upon the first activation of Metronome Daddy, and stays hidden across reloads via `localStorage` (`tempo_daddy_metronome_hint_dismissed`).
- [x] **AC4 (Skeuomorphic Horizontal Thumbdial):** Dragging or scrolling the horizontal knurled thumbdial underneath Metronome Daddy smoothly increments/decrements BPM within `[30, 300]` and isolates pointer/touch events so it never triggers a carousel card swipe.
- [x] **AC5 (Looping 8-Card Carousel):** Swiping left/right on the card stage, clicking peeking neighbor cards in landscape, or pressing `ArrowLeft`/`ArrowRight` (when paused) loops seamlessly across Card 0 (Metronome Daddy) and Cards 1–7 (Brain Gym, Logbook, Progress Charts, +1 Trophies, 2-Min Streaks, Playlists/Notes/Sharing, Keyboard Shortcuts).
- [x] **AC6 (Adaptive Portrait & Landscape Layouts):** Portrait mode renders a clutter-free single-column card layout; Landscape mode renders a wide stage with peeking left/right neighbor cards and a 2-column internal split on Tour Guide cards.
- [x] **AC7 (Smart Context Keyboard Shortcuts):** On the Front Door, `Space` opens the Gym drawer, `+/-` adjusts BPM, and `ArrowLeft`/`ArrowRight` cycles cards when paused or adjusts BPM when Metronome Daddy is actively ticking.
- [x] **AC8 (Drawer Transition & Audio Handoff):** Opening `"START TEMPO DADDY"` automatically stops the Card 0 metronome if playing and reveals the Gym (`ColdStartScreen`). While on the Front Door, `ColdStartScreen`'s global "any key starts exercise" listener does not prematurely fire. Pressing `Escape` or clicking the top handle on `ColdStartScreen` returns to the Front Door.

---

## 4. Affected Files
- `specs/marketing-front-door.md` *(Create — this specification)*
- `src/components/FrontDoorScreen.tsx` *(Create — looping carousel container, Card 0 Metronome Daddy, Cards 1–7 Tour Guide flashcards, peeking neighbor cards, and bottom `"ENTER THE GYM [space]"` drawer trigger)*
- `src/components/HorizontalThumbDial.tsx` *(Create — skeuomorphic horizontal knurled thumbdial with isolated touch/pointer drag and wheel support)*
- `src/components/MetronomeDaddyIcon.tsx` *(Create — transparent-background vector SVG of the brushed-steel metronome with 3D golden handlebar mustache and animated golden pendulum arm)*
- `src/components/ColdStartScreen.tsx` *(Modify — add optional `onReturnToFrontDoor` top drawer handle and `isActive` guard so its keyboard listener only fires when the Gym drawer is open)*
- `src/App.tsx` *(Modify — integrate `isFrontDoorOpen` state, shared/handoff metronome playback, and deep-link `#import=` handling)*
- `src/components/__tests__/FrontDoorScreen.test.tsx` *(Create — comprehensive unit and integration tests covering AC1–AC8)*

---

## 5. Acceptance Tests
1. **Card 0 Metronome & Hint Dismissal Test:**
   - Render `FrontDoorScreen` with empty `localStorage`.
   - Verify `"Tap to start metronome"` is visible and has `pointer-events-none`.
   - Click the Metronome Daddy icon button -> verify metronome starts, amber ring becomes visible, `"Tap to start metronome"` disappears, and `localStorage.getItem('tempo_daddy_metronome_hint_dismissed') === 'true'`.
   - Re-mount component -> verify `"Tap to start metronome"` is not rendered on subsequent visits.
2. **Skeuomorphic Horizontal Thumbdial Isolation Test:**
   - Simulate pointer down + horizontal drag (`deltaX = +60px`) on `HorizontalThumbDial`.
   - Verify BPM increases proportionally and active carousel index remains at `0` (no swipe leak).
3. **Looping Carousel & Tour Guide Content Test:**
   - Navigate right from Card 0 through Cards 1–7 and verify each card's headline and visual showcase (including dedicated Progress Charts card and Keyboard Shortcuts card), then navigate right once more from Card 7 and verify wrap-around to Card 0.
   - Navigate left from Card 0 and verify wrap-around directly to Card 7.
4. **Smart Context Keyboard Routing Test:**
   - When paused on Card 0: press `ArrowRight` -> advances to Card 1; press `ArrowLeft` -> returns to Card 0; press `+` -> increments BPM by 1.
   - Start Metronome Daddy ticking on Card 0: press `ArrowRight` -> increments BPM by 1 while staying on Card 0; hold/repeat `ArrowRight` -> increments BPM by 3.
5. **Enter the Gym Drawer & Audio Cutoff Test:**
   - While Metronome Daddy is ticking on Card 0, press `Space` (or click `ENTER THE GYM [space]`).
   - Verify Card 0 metronome stops ticking, the Gym view (`ColdStartScreen`) opens without immediately auto-starting the workout on that same `Space` press, and pressing `Escape` (or clicking the top return handle) slides the drawer back down to the Front Door.

---

## 6. Potential Risks & Edge Cases
- **Keyboard Event Collision (`Space` key):** `ColdStartScreen` listens for `keydown` (any key starts the first exercise). If `FrontDoorScreen` opens the Gym drawer on `keydown` of `Space`, we must ensure the same key event does not bubble into `ColdStartScreen` or that `ColdStartScreen` only attaches its `keydown` listener after the drawer is open.
- **Horizontal Touch Gesture vs. Thumbdial Drag:** On mobile touchscreens, dragging the horizontal thumbdial must call `e.stopPropagation()` on `onTouchStart` / `onTouchMove` / `onPointerDown` so the parent carousel swipe detector ignores all gestures originating inside the thumbdial boundary.
- **Playlist Import Deep Links (`#import=...`):** If a user opens a shared playlist link (`/#import=...`), the `ImportPlaylistModal` should still appear seamlessly on top of the screen, and confirming import can take them straight into their newly imported routine in the Gym.
