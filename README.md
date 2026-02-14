# Frogger Clone (Desktop Browser)

A lightweight Frogger-style game built with plain **HTML/CSS/JavaScript** and rendered on a **canvas**.
No frameworks, no external assets, and works offline once files are on disk.

Designed for a simple desktop flow: download the folder, open `index.html`, then click **Play**.

## Run

### Option 1: Open directly
1. Open `index.html` in a desktop browser (double-click).
2. Click the on-screen **Play** button (or press **Enter**).

### Option 2: Tiny local server (recommended)
From this folder:

```bash
python3 -m http.server 8000
```

Then visit: `http://localhost:8000`

## Controls

- Move: **Arrow keys** or **WASD**
- Pause/Resume: **P** or **Esc**
- Restart run: **R**
- Start from launcher screen: **Enter** (or click **Play**)

## Rules

- Start at the bottom center and reach one of the 5 home slots at the top.
- Road lanes (cars): touching any vehicle costs 1 life and resets your frog.
- River lanes: ride logs/turtles. If you are in river water without a platform, you lose a life.
- Homes can only be filled once. Reaching an already filled/invalid top spot costs a life.
- Fill all 5 homes to advance to the next level.
- Each level increases lane/platform movement speed slightly.
- A short 3-2-1 countdown appears at each level start and after each death.

## Notes on implementation choices

- Grid: **13 columns × 15 rows**.
- Movement is discrete/tile-based by keypress (classic Frogger feel).
- Obstacle movement uses delta-time (`requestAnimationFrame`) for smooth, machine-independent animation.
- Lightweight death feedback includes a brief flash and subtle shake.
