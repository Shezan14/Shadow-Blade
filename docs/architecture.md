# Architecture

## Overview

Shadow Blade is a browser-native Three.js game built from small JavaScript ES modules. There is no commercial engine and no framework-managed lifecycle. `src/main.js` is the composition root: it creates the renderer, scene, camera, world, gameplay systems, UI, audio, and performance monitor, then connects them through one animation loop.

## Runtime layers

1. **Platform layer:** Vite serves and bundles ES modules. HTML supplies the canvas and accessible overlay UI. CSS handles menus and HUD animation.
2. **Graphics layer:** `graphics/Renderer.js`, lighting, materials, procedural meshes, fog, shadows, and the particle shader produce the frame.
3. **Simulation layer:** time, physics, collision, movement, combat, enemies, elements, and boss progression update using delta time.
4. **Presentation layer:** camera, procedural character animation, particles, Web Audio, HUD, menus, and debug telemetry turn simulation results into feedback.

Systems exchange small snapshots rather than owning one another's internals. For example, `PlayerCombat.update()` returns attack and resource data. Movement consumes its movement scale, animation consumes attack progress, collision consumes the active hit window, and the HUD consumes normalized health and stamina. This keeps each module easy to explain and test.

## Frame sequence

The frame loop clamps delta time, updates only systems allowed by the current game state, updates visual interpolation and lighting, renders the Three.js scene, then samples `renderer.info`. Paused, victory, and game-over frames receive zero simulation delta. This prevents physics jumps after returning to the tab.

`GameStateManager` is the authority for Main Menu, Playing, Paused, Boss Fight, Game Over, and Victory. Invalid state transitions are rejected. Losing pointer lock or tab visibility pauses active play.

## Design choices

- Procedural geometry avoids model-loading failures and demonstrates modeling directly.
- Custom lightweight physics avoids a large dependency.
- Fixed-capacity particle pooling avoids per-effect object allocation.
- Web Audio synthesis avoids downloaded sound assets.
- Development-only preview query strings isolate bosses and UI screens for demonstrations.
- Automated tests exercise pure rules independently of WebGL, while browser checks validate the integrated render.

This structure is intentionally smaller than a general game engine but still separates rendering, simulation, presentation, and state management clearly enough for maintenance and viva discussion.
