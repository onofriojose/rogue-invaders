# Nova Starship Survivor - Developer Guide

## How the Game Works

This project is a survivor-style action game built with React and TypeScript.

The current runtime loop is:

1. `src/index.tsx` mounts the React app.
2. `src/App.tsx` manages screens, save data, and engine lifecycle.
3. `src/game/InputManager.ts` reads keyboard, mouse, and touch input.
4. `src/game/GameEngine.ts` updates gameplay state and renders the canvas each frame.

## Where to Edit Things

### Gameplay Values

Core defaults live in `src/constants.ts`.

Ship starting stats live in `src/data/ships.ts`.

Upgrade definitions currently live in `src/App.tsx`. The refactor backlog moves them into dedicated game data modules later.

### Rendering and Sprites

- Player ship rendering is procedural inside `src/game/GameEngine.ts`.
- Enemy sprite data lives in `src/game/EnemySprites.ts`.

### Persistence

Browser save data is handled by `src/managers/SaveManager.ts`.

## Build Commands

Run locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Packaging Status

- The repository currently targets the web build.
- Native mobile wrappers and offline-first PWA behavior are not configured in the project yet.
