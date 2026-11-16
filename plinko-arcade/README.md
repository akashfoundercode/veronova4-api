# Plinko! Premium Arcade

React + Vite + Tailwind + Matter.js + Framer Motion + Lucide. JavaScript only (.js / .jsx).

## Run
```bash
npm install
npm run dev      # development
npm run build    # outputs a single self-contained dist/index.html
```

## Structure
- `src/engine/PlinkoEngine.js` – Matter.js physics + Canvas rendering (pegs, trail, particles)
- `src/context/GameContext.jsx` – global state (Context + reducer), LocalStorage save
- `src/config/gameConfig.js` – all balance numbers, slots, investments
- `src/components/` – Header, BoardPanel, RightPanel, panels/*, ui/*

## How it plays
- DROP IT! costs 5 coins; the ball's value × the slot multiplier is paid out.
- Free Tier I ball on a cooldown. Space bar also drops.
- SLOTS / UNIFY upgrades cost coins. CASHOUT turns coins into SP.
- INVEST (10 milestones, bought in order with SP) adds special pegs, extra balls, auto-drop, etc.
- ASCEND (needs 5 investments) resets everything for a permanent reward multiplier.

Balance lives in `gameConfig.js`. Progress is saved under the `plinko-arcade-save-v1` LocalStorage key.
