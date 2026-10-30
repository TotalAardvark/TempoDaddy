# Feature Requests & Backlog

Tracking file for feature requests, ideas, and backlog tasks.

### Priority Scale
- **P3**: High
- **P2**: Medium-High
- **P1**: Medium-Low
- **P0**: Low

### Complexity Scale
- **C0**: Low (quick fix, simple UI tweak, minor config)
- **C1**: Medium-Low (straightforward component update, basic state/hook)
- **C2**: Medium-High (multi-component coordination, richer data models/media)
- **C3**: High (major architectural addition, external integrations, full subsystems)

---

## Quick Reference Index

### Open Feature Requests

| ID | Title | Priority | Complexity | Status |
|---|---|:---:|:---:|:---:|
| FR-009 | Onboarding experience design for new users | P3 | C2 | Open |
| FR-010 | Text size accessibility (Large Text mode in settings) | P3 | C1 | Open |
| FR-011 | Import/export skills or workouts via QR code | P2 | C1 | Open |
| FR-002 | Keyboard shortcuts helper on footer | P0 | C1 | Open |
| FR-005 | Gamified / motivational rework for Skill Queue naming & labels | P0 | C1 | Open |
| FR-006 | Workout export / import / sharing & browser | P0 | C3 | Open |
| FR-007 | Expanded built-in skills library with folder structure | P0 | C1 | Open |
| FR-008 | Expanded skill functionality (embedded media: image, MIDI, tab, audio, YT) | P0 | C2 | Open |
| FR-014 | Per-skill Tempo Ramp overrides & opt-out | P0 | C1 | Open |

### Completed Feature Requests

| ID | Title | Priority | Complexity | Status |
|---|---|:---:|:---:|:---:|
| FR-012 | Exercise edit capabilities: duplicate and flip (invert hands R<->L) | P3 | C1 | Completed |
| FR-013 | Ensure cyan progress graphs display in phone/PWA/iOS mode on workout summary | P1 | C1 | Completed |
| FR-001 | Cmd+R to refresh on title screen | P0 | C0 | Completed |
| FR-003 | Change "New Personal Best" popup text to cyan | P0 | C0 | Completed |
| FR-004 | Double-tap spacebar to log practice | P0 | C0 | Completed |

---

## Detailed Feature Requests (Open)

### Priority: P3 (High)

#### [FR-009] Onboarding Experience Design for New Users
- **Priority**: P3 (High)
- **Complexity**: C2 (Medium-High)
- **Status**: Open
- **Description**: Design and plan an effective onboarding experience for first-time users. Decisions are still pending exploration and design alignment.
- **Open Questions & Preferences**:
  - What default exercises should be loaded into the Skill Queue from the start?
  - Format/structure: Wizard vs. guided flow vs. short video.
    - *Note/Preference*: Strong preference against greyed-out screen tooltip tours. Current leaning is toward a concise, easily skippable short video/explainer that can be re-accessed anytime via Settings.

#### [FR-010] Text size Accessibility / Large Text Mode
- **Priority**: P3 (High)
- **Complexity**: C1 (Medium-Low)
- **Status**: Open
- **Description**: Add text size adjustment for accessibility, potentially via a toggleable "Large Text" mode in Settings.

---

### Priority: P2 (Medium-High)

#### [FR-011] Import/Export Skills or Workouts via QR Code
- **Priority**: P2 (Medium-High)
- **Complexity**: C1 (Medium-Low)
- **Status**: Open
- **Description**: Add ability to import and export skills or workouts via QR code.
- **Goals & Use Cases**:
  - Frictionless sharing of custom skills/workouts between users.
  - Enable content creation streams for short-form promotional videos for Tempo Daddy (e.g. scan on screen to load routine).
  - Foster community building and collaborative workout sharing.

---

### Priority: P1 (Medium-Low)
*(No open items currently)*

---

### Priority: P0 (Low)

#### [FR-002] Keyboard Shortcuts Helper Footer
- **Priority**: P0 (Low)
- **Complexity**: C1 (Medium-Low)
- **Status**: Open
- **Description**: Add a visible keyboard shortcut reference/helper banner or legend on the main screen (likely in the footer) for easy discoverability.

#### [FR-005] Gamified / Motivational Skill Queue Labeling
- **Priority**: P0 (Low)
- **Complexity**: C1 (Medium-Low)
- **Status**: Open
- **Description**: Rework terminology, titles, and labels around the Skill Queue to make it feel more gamified, engaging, and motivational.

#### [FR-006] Workout Export / Import / Sharing
- **Priority**: P0 (Low)
- **Complexity**: C3 (High)
- **Status**: Open
- **Description**:
  - Enable individual user profiles to save, export, import, and share multiple workouts.
  - Implement a dedicated workout browser within the Skills Queue.

#### [FR-007] Expanded Built-In Skills Library
- **Priority**: P0 (Low)
- **Complexity**: C1 (Medium-Low)
- **Status**: Open
- **Description**:
  - Broaden the default built-in skill repertoire.
  - Introduce an organized folder/category hierarchy for intuitive browsing.

#### [FR-008] Rich Media Skill Functionality
- **Priority**: P0 (Low)
- **Complexity**: C2 (Medium-High)
- **Status**: Open
- **Description**:
  - Enhance "Skill Info" beyond basic sticking patterns.
  - Support embedding rich media such as images, MIDI files, tab notations, sound clips, or YouTube video snippets.

#### [FR-014] Per-Skill Tempo Ramp Overrides & Opt-Out
- **Priority**: P0 (Low)
- **Complexity**: C1 (Medium-Low)
- **Status**: Open
- **Description**:
  - Provide optional per-skill overrides for Tempo Ramp (Inherit Global, Custom Ramp, or Disabled for that exercise).
  - Keeps friction low via progressive disclosure in the skill edit interface while enabling custom warmup runways (or disabling ramps on groove/microtiming drills).
- **Design & Technical Plan**:
  - See detailed specification and UX architecture in [docs/plans/tempo_ramp_per_skill_plan.md](file:///Users/pablo/Documents/antigravity/cool-heisenberg/docs/plans/tempo_ramp_per_skill_plan.md) (also archived in brain artifacts [tempo_ramp_per_skill_plan.md](file:///Users/pablo/.gemini/antigravity/brain/34e9ee6e-9ead-4cc3-82cc-db376e5eb707/tempo_ramp_per_skill_plan.md)).

---

## Completed Features

#### [FR-012] Exercise Edit Capabilities: Duplicate and Flip
- **Priority**: P3 (High)
- **Complexity**: C1 (Medium-Low)
- **Status**: Completed
- **Description**: Add exercise management actions:
  - **Duplicate**: Clone an existing exercise in place within the queue, auto-switching into edit mode for the newly cloned exercise with smooth visual feedback.
  - **Flip / Invert**: Invert sticking patterns (preserving case: `R` <-> `L`, `r` <-> `l`) and intelligently update title leads (`(Left)` / `(Right)`).

#### [FR-013] Phone / PWA / Native iOS Workout Summary Graphs & PB Celebrations
- **Priority**: P1 (Medium-Low)
- **Complexity**: C1 (Medium-Low)
- **Status**: Completed
- **Description**:
  - Ensured cyan progress graphs render cleanly across mobile views (PWA standalone, phone viewports, and native iOS wrappers).
  - Replaced static queue text with a dynamic summary of newly smashed personal bests from that session.
  - Replaced "Daily Routine Complete" with a cyan lifetime PB trophy badge showing animated count-up (`previous total` -> `current total`) and `+x` pill.

#### [FR-001] Cmd+R Refresh Behavior
- **Priority**: P0 (Low)
- **Complexity**: C0 (Low)
- **Status**: Completed
- **Description**: Allow `Cmd+R` / `Ctrl+R` on the title screen to trigger a browser refresh rather than immediately starting a practice session.

#### [FR-003] Cyan Color for "New Personal Best"
- **Priority**: P0 (Low)
- **Complexity**: C0 (Low)
- **Status**: Completed
- **Description**: Update the "New Personal Best" congratulatory text in the popup modal to render in cyan with matching glow styling.

#### [FR-004] Double-Tap Spacebar to Log Practice
- **Priority**: P0 (Low)
- **Complexity**: C0 (Low)
- **Status**: Completed
- **Description**: 
  - **In Practice Screen**: Single tap Space waits 250ms (standard responsive double-tap delay window); if no second tap occurs, metronome toggles play/pause. Double tap Space within 250ms immediately triggers "Done (Log Performance)" and opens the confirmation modal.
  - **In Confirmation Dialog**: Single tap Space or Enter confirms and logs session; Esc cancels and returns to exercise; `+/-` adjusts final BPM.
