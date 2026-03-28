# Nova Starship Survivor Refactor Backlog

This document turns the audit into an execution plan we can work through without doing a risky big-bang rewrite.

## Goals

- Fix correctness bugs before changing game feel.
- Keep the game playable after every phase.
- Move gameplay tuning out of large imperative code blocks and into data.
- Break the engine into systems that are easy to test and extend.
- Add stronger game feel, clearer sector identity, and truthful product packaging.

## Working Rules

- `npm run build` must pass at the end of every ticket batch.
- No new `@ts-ignore` in gameplay code.
- Avoid balance changes while extracting code unless the ticket explicitly calls for it.
- Prefer small PRs with behavior parity, then follow with tuning PRs.
- Update docs and naming when the implementation changes.

## Definition of Done

A phase is only done when:

- the build passes;
- the manual regression checklist passes;
- docs affected by the phase are updated;
- the public game still feels coherent on desktop and mobile;
- there are no known blockers for the next phase.

## Recommended Execution Order

1. Phase 0: Baseline and guardrails
2. Phase 1: Critical bug fixes
3. Phase 2: Engine modularization
4. Phase 3: Data-driven systems
5. Phase 4: Sector progression and encounter pacing
6. Phase 5: Audio and game feel
7. Phase 6: Narrative and terminology pass
8. Phase 7: UI, mobile, and packaging
9. Phase 8: QA hardening and release gates

Phases 4-7 can partially overlap after Phase 3 is stable.

## Suggested PR Strategy

- PR 1: Baseline docs + naming/package cleanup
- PR 2: Runtime bug fixes
- PR 3: Engine core extraction
- PR 4: Combat/spawn/collision extraction
- PR 5: Rendering extraction
- PR 6: Data-driven progression and content tables
- PR 7: Sector pacing redesign
- PR 8: Audio and feedback
- PR 9: UI/mobile/PWA pass
- PR 10: Tests, profiling, and release cleanup

## Progress Log

- 2026-03-28 Batch 1 complete: `REF-003`, `BUG-101`, `BUG-102`, `BUG-103`, `BUG-104`
- 2026-03-28 Batch 2 complete: `BUG-105`
- 2026-03-28 Batch 3 complete: extracted `src/game/systems/CombatSystem.ts` and `src/game/systems/BossSystem.ts`; `GameEngine.ts` now delegates combat and boss responsibilities through typed context wrappers
- 2026-03-28 Batch 4 complete: extracted `src/game/systems/CollisionSystem.ts` and `src/game/systems/ProjectileSystem.ts`; tuned early-game spawn pacing and enemy firing cadence after manual playtest feedback
- 2026-03-28 Batch 5 complete: extracted `src/game/systems/SpawnSystem.ts` and `src/game/systems/EnvironmentSystem.ts`; `GameEngine.ts` now delegates sector timing, spawn rules, wind, obstacles, and beacon spawning through typed wrappers
- 2026-03-28 Batch 6 complete: extracted `src/game/render/WorldRenderer.ts` and `src/game/render/HudRenderer.ts`; nerfed the boss encounter pacing with fewer early guards, slower reinforcements, and softer HP scaling
- 2026-03-28 Batch 7 complete: removed legacy render remnants from `GameEngine.ts` and slimmed `App.tsx` into screen components plus externalized upgrade data to close Phase 2

## Phase 0: Baseline and Guardrails

### REF-001: Create a manual regression checklist

- Priority: P0
- Size: S
- Depends on: none
- Files:
  - `docs/regression-checklist.md`
- Deliverables:
  - A repeatable test route for menu, hangar, ship select, run start, level up, boss spawn, beacon, sector clear, death, and save persistence.
- Acceptance criteria:
  - A fresh tester can run the checklist in 10-15 minutes.
  - The checklist includes expected results and bug note fields.

### REF-002: Add a lightweight debug overlay and runtime metrics

- Priority: P1
- Size: M
- Depends on: REF-001
- Files:
  - `src/game/GameEngine.ts`
  - `src/game/debug/DebugOverlay.ts`
  - `src/types.ts`
- Deliverables:
  - Toggleable overlay with FPS, entity counts, sector, boss state, and current timers.
- Acceptance criteria:
  - Overlay can be enabled without changing gameplay behavior.
  - Overlay is hidden by default in production.

### REF-003: Align product naming and packaging claims

- Priority: P0
- Size: S
- Status: done
- Depends on: none
- Files:
  - `README.md`
  - `manual.md`
  - `mobile_guide.md`
  - `public/manifest.json`
  - `index.html`
- Deliverables:
  - Consistent use of "Nova Starship Survivor".
  - Removal of stale icon and PWA claims that are not implemented yet.
- Acceptance criteria:
  - No "Rogue Invaders" references remain unless intentionally preserved as legacy notes.
  - `index.html` does not reference missing assets.

## Phase 1: Critical Bug Fixes

### BUG-101: Fix hybrid input state reset

- Priority: P0
- Size: S
- Status: done
- Depends on: REF-001
- Files:
  - `src/game/InputManager.ts`
- Deliverables:
  - Touch/mouse release resets interaction state cleanly and keyboard movement still works afterward.
- Acceptance criteria:
  - Touch -> keyboard and mouse -> keyboard transitions both work reliably.
  - Dash input still works from touch button and space bar.

### BUG-102: Fix world-space projectile culling

- Priority: P0
- Size: S
- Status: done
- Depends on: REF-001
- Files:
  - `src/game/GameEngine.ts`
- Deliverables:
  - Enemy projectiles are culled relative to the camera or by lifetime, not raw world origin.
- Acceptance criteria:
  - Projectiles remain valid when the player has traveled far from spawn origin.
  - No large buildup of off-screen projectiles occurs.

### BUG-103: Normalize enemy and boss cooldown units

- Priority: P0
- Size: M
- Status: done
- Depends on: REF-001
- Files:
  - `src/game/GameEngine.ts`
  - `src/types.ts`
- Deliverables:
  - All combat timers use one unit consistently, preferably seconds.
- Acceptance criteria:
  - Boss-specific attack timing is not overridden by generic enemy shooter logic.
  - Cooldowns are readable and documented near their definitions.

### BUG-104: Make hitboxes respect actual enemy size

- Priority: P0
- Size: S
- Status: done
- Depends on: REF-001
- Files:
  - `src/game/GameEngine.ts`
  - `src/types.ts`
- Deliverables:
  - Projectile, body, and dash collision checks use a unified radius helper.
- Acceptance criteria:
  - Swarmers, tanks, elites, and bosses all feel visually fair to hit.
  - No duplicate hardcoded radii remain in collision branches.

### BUG-105: Centralize boss damage and death resolution

- Priority: P0
- Size: M
- Status: done
- Depends on: BUG-103, BUG-104
- Files:
  - `src/game/GameEngine.ts`
  - `src/game/systems/CombatSystem.ts`
- Deliverables:
  - One code path for applying damage, shield handling, death rewards, and boss HUD sync.
- Acceptance criteria:
  - `NUKE`, bullets, shield ticks, and collisions all update boss HP consistently.
  - Boss death always triggers reward, beacon, flash, and sector transition once.

### BUG-106: Remove debug noise and unsafe typing in hot paths

- Priority: P1
- Size: S
- Depends on: BUG-105
- Files:
  - `src/game/GameEngine.ts`
  - `src/types.ts`
- Deliverables:
  - Remove runtime `console.log` noise and replace `@ts-ignore` usages with typed helpers.
- Acceptance criteria:
  - No `@ts-ignore` remains in the engine.
  - Debug output is behind a debug flag if still needed.

## Phase 2: Engine Modularization

### ENG-201: Introduce core engine folders and state boundaries

- Priority: P0
- Size: M
- Depends on: Phase 1 complete
- Files:
  - `src/game/core/GameEngine.ts`
  - `src/game/core/GameState.ts`
  - `src/game/entities/*.ts`
  - `src/types.ts`
- Deliverables:
  - Shared state and entity definitions split from rendering and behavior.
- Acceptance criteria:
  - `GameEngine` becomes an orchestrator rather than a monolith.
  - Public API used by `App.tsx` remains stable.

### ENG-202: Extract player and input systems

- Priority: P0
- Size: M
- Depends on: ENG-201
- Files:
  - `src/game/systems/PlayerSystem.ts`
  - `src/game/systems/InputSystem.ts`
  - `src/game/InputManager.ts`
- Deliverables:
  - Player movement, dash logic, and input consumption no longer live inside the main engine file.
- Acceptance criteria:
  - Movement behavior is unchanged except for already-fixed bugs.
  - Dash cooldown and invulnerability are easy to inspect in one place.

### ENG-203: Extract combat and collision systems

- Priority: P0
- Size: L
- Status: done
- Depends on: ENG-201
- Files:
  - `src/game/systems/CombatSystem.ts`
  - `src/game/systems/CollisionSystem.ts`
  - `src/game/systems/ProjectileSystem.ts`
- Deliverables:
  - Projectile spawning, damage application, and collision rules are separated from render code.
- Acceptance criteria:
  - All combat outcomes are preserved under the regression checklist.
  - Collision helpers are shared and typed.

### ENG-204: Extract spawn, boss, and environment systems

- Priority: P0
- Size: L
- Status: done
- Depends on: ENG-201
- Files:
  - `src/game/systems/SpawnSystem.ts`
  - `src/game/systems/BossSystem.ts`
  - `src/game/systems/EnvironmentSystem.ts`
- Deliverables:
  - Sector timer, spawn rules, boss AI, wind, obstacles, and beacons are isolated into separate systems.
- Acceptance criteria:
  - Sector progression can be changed without opening renderer code.
  - Boss logic has a clear entry point per boss archetype.

### ENG-205: Extract rendering into world and HUD layers

- Priority: P0
- Size: L
- Status: done
- Depends on: ENG-201
- Files:
  - `src/game/render/WorldRenderer.ts`
  - `src/game/render/HudRenderer.ts`
  - `src/game/render/SpriteCache.ts`
  - `src/game/EnemySprites.ts`
- Deliverables:
  - Rendering code separated by responsibility.
- Acceptance criteria:
  - World rendering and HUD rendering can be changed independently.
  - Sprite cache behavior remains identical.

### ENG-206: Slim `App.tsx` into screen components

- Priority: P1
- Size: M
- Status: done
- Depends on: ENG-201
- Files:
  - `src/App.tsx`
  - `src/components/screens/MenuScreen.tsx`
  - `src/components/screens/HangarScreen.tsx`
  - `src/components/screens/RunSummaryOverlay.tsx`
  - `src/game/data/upgrades.ts`
- Deliverables:
  - Screen layout, menu text, and upgrade data leave `App.tsx`.
- Acceptance criteria:
  - `App.tsx` mostly wires screens, save state, and engine lifecycle.

## Phase 3: Data-Driven Systems

### SYS-301: Move upgrades into declarative data

- Priority: P0
- Size: S
- Depends on: ENG-206
- Files:
  - `src/game/data/upgrades.ts`
  - `src/App.tsx`
  - `src/types.ts`
- Deliverables:
  - Upgrade definitions stored outside React view code.
- Acceptance criteria:
  - Upgrade randomization still works.
  - Upgrade metadata can be reused by UI and docs.

### SYS-302: Create enemy, boss, power-up, and ship definition tables

- Priority: P0
- Size: M
- Depends on: ENG-203, ENG-204
- Files:
  - `src/game/data/enemies.ts`
  - `src/game/data/bosses.ts`
  - `src/game/data/powerups.ts`
  - `src/data/ships.ts`
- Deliverables:
  - Per-archetype stats, colors, behaviors, and rewards leave hardcoded logic branches.
- Acceptance criteria:
  - Adding a new archetype requires little or no engine branching.

### SYS-303: Create a progression model

- Priority: P0
- Size: M
- Depends on: SYS-302
- Files:
  - `src/game/data/progression.ts`
  - `src/constants.ts`
  - `src/game/systems/SpawnSystem.ts`
- Deliverables:
  - Sector duration, enemy caps, spawn intervals, XP curve, dark matter rewards, and boss cadence live in one place.
- Acceptance criteria:
  - No progression-critical `Math.random` or tuning constants remain buried across systems without a definition source.

### SYS-304: Add validation helpers for design data

- Priority: P1
- Size: S
- Depends on: SYS-301, SYS-302, SYS-303
- Files:
  - `src/game/data/validators.ts`
  - `src/game/data/*.ts`
- Deliverables:
  - Runtime or test-time validation for missing IDs, duplicate IDs, negative values, and impossible curves.
- Acceptance criteria:
  - Bad content definitions fail early and clearly.

### SYS-305: Extend save versioning and migration support

- Priority: P1
- Size: S
- Depends on: SYS-301, SYS-302
- Files:
  - `src/managers/SaveManager.ts`
- Deliverables:
  - Save schema version and migration path for new settings like audio, debug, and future unlocks.
- Acceptance criteria:
  - Older saves load safely into the new schema.

## Phase 4: Sector Progression and Encounter Pacing

### DES-401: Replace implicit pacing with sector scripts

- Priority: P0
- Size: L
- Depends on: SYS-303
- Files:
  - `src/game/data/sectors.ts`
  - `src/game/systems/SpawnSystem.ts`
  - `src/game/systems/EnvironmentSystem.ts`
- Deliverables:
  - Sector definitions describe encounter beats, rest windows, special events, and boss lead-in.
- Acceptance criteria:
  - Each sector has a recognizable beginning, escalation, and climax.

### DES-402: Add reward windows and readable event timing

- Priority: P1
- Size: M
- Depends on: DES-401
- Files:
  - `src/game/systems/SpawnSystem.ts`
  - `src/game/systems/BossSystem.ts`
  - `src/game/render/HudRenderer.ts`
- Deliverables:
  - Moments of relief after bosses, better signaling for beacon opportunities, and cleaner pre-boss ramp.
- Acceptance criteria:
  - Players can identify when to chase rewards versus when to survive pressure.

### DES-403: Onboarding pass for sectors 1-3

- Priority: P1
- Size: M
- Depends on: DES-401
- Files:
  - `src/game/data/sectors.ts`
  - `src/game/data/enemies.ts`
  - `src/game/data/upgrades.ts`
- Deliverables:
  - Early game teaches movement, dash, swarmers, ranged enemies, and beacons in a readable order.
- Acceptance criteria:
  - First 5 minutes feel fair and legible on a fresh save.

### DES-404: Boss readability and identity pass

- Priority: P1
- Size: M
- Depends on: DES-401
- Files:
  - `src/game/data/bosses.ts`
  - `src/game/systems/BossSystem.ts`
  - `src/game/render/WorldRenderer.ts`
- Deliverables:
  - Stronger telegraphs, clearer role separation, and boss-specific reward presentation.
- Acceptance criteria:
  - Each boss communicates its threat pattern visually before damage lands.

## Phase 5: Audio and Game Feel

### AV-501: Add a lightweight audio manager

- Priority: P1
- Size: M
- Depends on: Phase 2 stable
- Files:
  - `src/audio/AudioManager.ts`
  - `src/audio/audioEvents.ts`
  - `src/App.tsx`
- Deliverables:
  - Central audio API for SFX, music layers, mute, and volume.
- Acceptance criteria:
  - Audio is optional and fails gracefully if browser audio is blocked.

### AV-502: Hook core gameplay events to audio

- Priority: P1
- Size: M
- Depends on: AV-501
- Files:
  - `src/game/systems/CombatSystem.ts`
  - `src/game/systems/BossSystem.ts`
  - `src/game/systems/PlayerSystem.ts`
  - `src/game/core/GameEngine.ts`
- Deliverables:
  - Sounds for shot, hit, dash, pickup, level up, boss spawn, low HP, sector clear, and death.
- Acceptance criteria:
  - Every core player action has immediate audio feedback.

### AV-503: Make sector visuals actually reflect sector state

- Priority: P1
- Size: S
- Depends on: ENG-205, DES-401
- Files:
  - `src/game/render/WorldRenderer.ts`
  - `src/game/render/HudRenderer.ts`
  - `src/game/data/sectors.ts`
- Deliverables:
  - Background, stars, glow, and alerts use current sector palette rather than fixed colors.
- Acceptance criteria:
  - Sector transitions are visible even with no text.

### AV-504: Add player-facing audio settings

- Priority: P2
- Size: S
- Depends on: AV-501, SYS-305
- Files:
  - `src/managers/SaveManager.ts`
  - `src/components/screens/MenuScreen.tsx`
  - `src/audio/AudioManager.ts`
- Deliverables:
  - Mute toggle and master volume persisted to save.
- Acceptance criteria:
  - Settings persist across reloads.

## Phase 6: Narrative and Terminology Pass

### NAR-601: Create a world glossary and content bible

- Priority: P2
- Size: S
- Depends on: SYS-302, DES-404
- Files:
  - `docs/world-glossary.md`
- Deliverables:
  - Definitions for Dark Matter, Void Mass, Singularity, sectors, ships, and bosses.
- Acceptance criteria:
  - UI copy and docs can reference one canonical terminology source.

### NAR-602: Add ship, boss, and sector flavor text

- Priority: P2
- Size: S
- Depends on: NAR-601
- Files:
  - `src/data/ships.ts`
  - `src/game/data/bosses.ts`
  - `src/game/data/sectors.ts`
  - `src/components/screens/HangarScreen.tsx`
- Deliverables:
  - Short identity text that reinforces fantasy without interrupting gameplay.
- Acceptance criteria:
  - Every ship and boss has a consistent role and tone.

### NAR-603: Audit gameplay text and copy consistency

- Priority: P2
- Size: S
- Depends on: NAR-601
- Files:
  - `src/components/**/*.tsx`
  - `src/game/render/HudRenderer.ts`
  - `README.md`
  - `manual.md`
- Deliverables:
  - Unified style and terminology across HUD, overlays, docs, and rewards.
- Acceptance criteria:
  - No conflicting labels remain for the same concept.

## Phase 7: UI, Mobile, and Packaging

### UI-701: Extract inline screen styles into a theme layer

- Priority: P1
- Size: M
- Depends on: ENG-206
- Files:
  - `src/App.tsx`
  - `src/index.css`
  - `src/styles/theme.ts`
  - `src/components/screens/*.tsx`
- Deliverables:
  - Shared tokens for colors, spacing, panel styles, and buttons.
- Acceptance criteria:
  - Screens are easier to tweak without scanning long inline style objects.

### UI-702: Make HUD and mobile controls safe-area aware

- Priority: P1
- Size: M
- Depends on: ENG-205, UI-701
- Files:
  - `index.html`
  - `src/index.css`
  - `src/components/Joystick.tsx`
  - `src/components/DashButton.tsx`
  - `src/game/render/HudRenderer.ts`
- Deliverables:
  - Proper support for notches, landscape safe areas, and control overlap.
- Acceptance criteria:
  - HUD and controls remain usable on common mobile aspect ratios.

### UI-703: Decide PWA strategy and implement honestly

- Priority: P1
- Size: M
- Depends on: REF-003
- Files:
  - `package.json`
  - `vite.config.ts`
  - `public/manifest.json`
  - `src/index.tsx`
  - `README.md`
- Deliverables:
  - Either real PWA support with service worker and install flow, or removal of unsupported PWA claims.
- Acceptance criteria:
  - Product docs match actual behavior.

### UI-704: Finalize web app assets and metadata

- Priority: P2
- Size: S
- Depends on: UI-703
- Files:
  - `public/icon-192.png`
  - `public/icon-512.png`
  - `index.html`
  - `public/manifest.json`
- Deliverables:
  - Correct app icons, theme metadata, title, and splash-friendly manifest values.
- Acceptance criteria:
  - No placeholder web assets remain.

## Phase 8: QA Hardening and Release Gates

### QA-801: Add a test runner and project test script

- Priority: P1
- Size: S
- Depends on: Phase 2 stable
- Files:
  - `package.json`
  - `tsconfig.json`
  - `vitest.config.ts`
- Deliverables:
  - A lightweight test harness for data and manager logic.
- Acceptance criteria:
  - `npm test` or equivalent runs locally.

### QA-802: Add unit tests for save, progression, and validators

- Priority: P1
- Size: M
- Depends on: QA-801, SYS-303, SYS-304, SYS-305
- Files:
  - `src/managers/SaveManager.test.ts`
  - `src/game/data/*.test.ts`
- Deliverables:
  - Tests for save migration, progression curves, duplicate IDs, and invalid values.
- Acceptance criteria:
  - Core content tables fail loudly when malformed.

### QA-803: Add smoke tests for engine invariants

- Priority: P2
- Size: M
- Depends on: ENG-205
- Files:
  - `src/game/core/GameEngine.test.ts`
  - `src/game/systems/*.test.ts`
- Deliverables:
  - Smoke tests for spawning, level-up, boss transition, and no-crash update loops.
- Acceptance criteria:
  - Basic engine invariants can run without a browser canvas render pass.

### QA-804: Create a release checklist with performance budgets

- Priority: P1
- Size: S
- Depends on: AV-503, UI-702
- Files:
  - `docs/release-checklist.md`
- Deliverables:
  - FPS sanity targets, entity count limits, mobile control checks, and content sign-off list.
- Acceptance criteria:
  - Release readiness can be assessed in one pass.

## Immediate Next Batch

If we start implementation now, the first batch should be:

1. `REF-003` product naming and packaging cleanup
2. `BUG-101` hybrid input state reset
3. `BUG-102` projectile culling in world space
4. `BUG-103` cooldown unit normalization
5. `BUG-104` unified collision radii

That gives us a cleaner and safer baseline before the larger system extraction.

## Current File Hotspots

These files deserve special care because they sit on the critical path:

- `src/game/GameEngine.ts`
- `src/game/InputManager.ts`
- `src/App.tsx`
- `src/managers/SaveManager.ts`
- `src/data/ships.ts`
- `src/types.ts`
- `public/manifest.json`
- `README.md`

## Notes for Execution

- Do not mix Phase 2 refactors with Phase 4 balance redesign in the same PR.
- Whenever a system is extracted from `GameEngine.ts`, preserve old method names until the outer API is stable.
- Prefer introducing helpers first, then moving code, then deleting dead paths.
- Once Phase 2 is complete, the old monolithic `src/game/GameEngine.ts` should only coordinate systems and renderers, or be replaced by a slimmer `src/game/core/GameEngine.ts`.
