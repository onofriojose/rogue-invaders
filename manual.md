# Nova Starship Survivor - Developer Guide

## 🎮 How the Game Works

This is a "Reverse Bullet Hell" (Survivor-like) game built with **React** and **TypeScript**. 
The core loop consists of:
1. **Input**: A Virtual Joystick (`InputManager.ts`) drives the player.
2. **Engine**: A dedicated `GameEngine` class (`GameEngine.ts`) runs on `requestAnimationFrame` to update positions, handle collisions, and render to the `<canvas>`.
3. **UI**: React triggers overlays for "Level Up" or "Game Over" based on the Engine's state.

## 🛠️ How to Edit the Game

### 1. Game Balance & Parameters
All gameplay numbers are centralized in `src/constants.ts`. You can tweak these values to drastically change the game feel.

**File:** `src/constants.ts`
```typescript
export const SETTINGS = {
    PLAYER: {
        BASE_SPEED: 250,      // How fast the ship moves
        BASE_HP: 100,         // Starting health
        FRICTION: 0.92,       // Lower = more "drift" in space
        PICKUP_RANGE: 100,    // Distance to magnetize XP gems
    },
    WEAPON: {
        FIRE_RATE: 0.4,       // Seconds between shots (Lower = faster)
        PROJECTILE_COUNT: 1,  // Number of bullets per shot
        DAMAGE: 20,           // Damage per bullet
    },
    ENEMY: {
        SPAWN_RATE_START: 1.5,// Initial spawn delay
        SPAWN_RATE_MIN: 0.1,  // Maximum chaos (0.1s per enemy!)
        BASE_SPEED: 100,      // Enemy chaser speed
    }
    // ... colors and world settings
};
```

### 2. Editing Sprites (Visuals)
Currently, all graphics are **procedurally drawn** using the HTML5 Canvas API in `src/game/GameEngine.ts`. This keeps the game lightweight (single file build).

**To change the Player Ship:**
Look for `drawEntity` calls or the `render` method in `GameEngine.ts`.
```typescript
// Example: Player Drawing Logic
ctx.beginPath();
ctx.moveTo(0, -20);    // Tip of the ship
ctx.lineTo(15, 20);    // Right wing
ctx.lineTo(0, 10);     // Engine indent
ctx.lineTo(-15, 20);   // Left wing
ctx.closePath();
ctx.stroke();
```
*To use an image instead:*
1. Load an image in `GameEngine` constructor: `this.shipImg = new Image(); this.shipImg.src = '...';`
2. Replace the drawing lines above with: `ctx.drawImage(this.shipImg, -width/2, -height/2);`

**To change Enemy Pixel Art:**
Enemies use small rectangles to simulate pixel art.
Search for `if (e.spriteType === 0)` in `GameEngine.ts` to see how squares and "crab" shapes are drawn.

### 3. Adding New Upgrades
Upgrades are defined in `src/App.tsx` inside the `UPGRADES_LIST` array.

**Structure:**
```typescript
{
    id: 'my_new_upgrade',
    title: 'Super Cannon',
    desc: 'Doubles damage but lowers fire rate.',
    rarity: 'epic', // 'common', 'rare', 'epic', 'legendary' (affects border color)
    apply: (stats: GameStats) => {
        // Modify the stats object directly
        stats.damage *= 2;
        stats.fireRate *= 1.5; 
    }
}
```
Just add a new object to the list, and it will automatically appear in the randomization pool!

## 📦 Building & Deploying
1. **Run Locally**: `npm run dev`
2. **Build for Web**: `npm run build` (Output is in `dist/` folder)
