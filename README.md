# Tempo Daddy 🥁⏱️

**Tempo Daddy** is an intelligent, coach-inspired metronome and structured practice companion built for musicians (drummers, pianists, guitarists, and multi-instrumentalists). 

Rather than functioning as just another passive click-track, Tempo Daddy is designed around deliberate practice principles: progressive tempo ramping, tracking personal bests, sticking patterns, session routines, and persistent practice metrics.

---

## 🎯 Key Features

- **Precision Audio Engine**: High-accuracy Web Audio API scheduling for drift-free metronome playback with clean primary and secondary accents.
- **Subdivision & Meter Control**:
  - Support for quarter notes ($1/4$), eighth notes ($1/8$), sixteenth notes ($1/16$), and triplet feels across meters.
  - Interactive circular dial and manual BPM steppers with instant feedback.
- **Skill Library & Routine Builder**:
  - Organize exercises and rudiments across categories (Drumming, Piano, Guitar, General).
  - Built-in sticking notation displays (e.g., `R L R R L R L L` for paradiddles).
  - Target BPM goals, custom notes, and ability to hibernate or reorder skills.
- **Adaptive Tempo Ramping**:
  - Automatically ramp tempo over a set number of measures (e.g., starting at 80% of your Personal Best and ramping to 90% or beyond).
  - Eliminates manual adjustments during flow state practice.
- **Personal Bests & Progress Tracking**:
  - Automatically logs clean practice runs as new Personal Bests (PBs).
  - Sparklines and visual progress graphs showing tempo progression over time.
  - Practice streak calendars and routine completion summaries with celebration effects.
- **Offline & Local-First**:
  - Session history, skills, and stats persist locally in the browser so you can practice anywhere without an active internet connection.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (or `pnpm` / `yarn`)

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone git@github.com:TotalAardvark/TempoDaddy.git
   cd TempoDaddy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## 🛠️ Built With

- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS v4**
- **Lucide Icons** & **Canvas Confetti**
