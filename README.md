# Shadow Blade: Rise of the Elements

A browser-based 3D dark-fantasy action game for a Computer Graphics & Animation Lab project. It uses Three.js, skeletal animation, authored low-poly characters, and a lightweight custom gameplay architecture rather than a commercial game engine.

## Current status

The original 11-phase release, Campaign Edition, and Character & World overhaul are complete. The current build has five connected chapters, progressive elemental unlocks, collectible shards, portals, checkpoints, varied waves, scaling difficulty, story panels, a mini-boss chapter, and the final Overlord encounter. The player, normal enemies, and bosses use imported skeletal rigs with authored animation clips. Every chapter has a larger collision-aware footprint populated with modular dungeon scenery instead of primitive landmarks or one reused arena.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

If the browser profile blocks ES modules, open `http://127.0.0.1:5173/?classic=1` to use the equivalent classic compatibility bundle.

## Production build

```bash
npm run build
npm run preview
```

## Testing

```bash
npm test
npm run build
```

The unified test command runs the Phase 3–11 gameplay and release suites.

## Campaign

Every chapter now starts with exploration and elemental-seal objectives. Chapter I is a three-room keep: activate three seals, clear two guard waves, cross the unlocked inner gate, and defeat the Abyss Vanguard. Bosses spawn only when their chamber is reached, and a portal cannot open until the full boss death sequence ends and the reward shard is collected.

1. **Ruined Fire Courtyard** — begin with Fire and break the first enemy line.
2. **Frozen Catacombs** — use the newly unlocked Ice ability against faster and heavier enemies.
3. **Storm Temple** — survive two escalating waves and claim the Wind shard.
4. **Wind Sanctum** — defeat the Abyss Vanguard mini-boss.
5. **Overlord Arena** — combine all four elements against the multi-phase final boss.

Each cleared chapter produces a collectible elemental shard. Collecting it opens a portal and records a local checkpoint. The main menu displays **Continue Journey** whenever a checkpoint is available. Health and stamina refresh between chapters, while enemy health, speed, damage, composition, and wave count increase through the campaign. The courtyard, catacombs, temple, sanctum, and final arena use different rectangular/circular dimensions, routes, solid landmarks, starts, enemy spawns, rewards, and exits.

## Technology

- JavaScript ES modules
- Three.js / WebGL 2
- glTF 2.0 skeletal characters and `AnimationMixer` blending
- HTML5 and CSS3
- Vite

## Architecture

The world upgrade adds `src/characters/RiggedCharacter.js` for asynchronous glTF loading, weapon attachment, animation crossfades, boss animation states, and automatic procedural fallback. `src/physics/WorldCollision.js` provides per-level rectangular/circular boundaries and solid-landmark resolution. `src/scene/CampaignMaps.js` owns five differently shaped playable layouts, while `src/scene/KayKitEnvironment.js` assembles modular walls, entrances, stairs, pillars, torches, rubble, storage props, and treasure into distinct scenes.

- `src/core` — configuration, time, state management, bosses, and performance monitoring
- `src/graphics` — renderer and lighting setup
- `src/scene` — modular arena, environment, decorations, and world composition
- `src/scene/CampaignMaps.js` — five themed procedural layouts and animated reward/portal geometry
- `src/player` — procedural Shadow Warrior model, movement controller, and animation rig
- `src/camera` — smooth third-person orbit, zoom, and follow camera
- `src/physics` — gravity, friction, and arena boundary helpers
- `src/combat` — hitboxes, damage, combo resolution, impact effects, and combat orchestration
- `src/enemies` — procedural enemy models, archetype statistics, and finite-state AI
- `src/enemies/Boss.js` — mini-boss and Elemental Overlord modeling, phases, attacks, and reactions
- `src/core/BossSystem.js` — encounter progression, boss hazards, player damage, and completion signal
- `src/core/GameState.js` — explicit menu, gameplay, pause, boss, defeat, and victory state transitions
- `src/core/PerformanceMonitor.js` — sampled FPS/render telemetry and conservative adaptive resolution
- `src/core/CampaignSystem.js` — chapters, waves, objectives, shards, portals, unlocks, difficulty, and checkpoints
- `src/elements` — Fire, Ice, Lightning, Wind, cooldown orchestration, and elemental effects
- `src/particles` — fixed-capacity GPU particle pool, custom GLSL point-sprite shader, effect presets, dust, ambient motes, and sword trails
- `src/ui` — interpolated HUD, cooldown indicators, encounter announcements, and menu overlays
- `src/audio` — synthesized ambient, combat, movement, elemental, and encounter feedback using Web Audio
- `src/main.js` — application bootstrap and render loop

## Controls

- E - activate a nearby elemental seal or interact with an objective

- WASD — move relative to the camera
- Shift — run
- Space while stationary — jump
- Space while moving — directional dodge
- Mouse — orbit camera
- Mouse wheel — zoom
- Click the arena — capture or recapture the mouse
- Left mouse — sword attack; click during a swing to queue the next combo strike
- Right mouse — block while held
- 1 — Fire projectile, area explosion, and burn damage
- 2 — Ice cone that freezes nearby targets and slows distant targets
- 3 — Lightning chain that strikes and stuns up to three targets
- 4 — Wind dash with low damage and extreme knockback
- Escape — pause or resume the game
- M — mute or restore procedural audio
- F1 — show FPS, draw calls, triangle count, player position, states, particles, and render quality
- F2 — show or hide live collision bounds

Pointer-lock loss also pauses active gameplay so the simulation never advances while input focus is elsewhere.

## Elemental abilities

- Fire emphasizes high area damage and continued burning.
- Ice controls groups through close-range freezing and longer slow effects.
- Lightning is an instant, fast-recharging chain attack with stun.
- Wind combines player mobility with strong directional displacement.

Each ability has an independent cooldown, unique color language, lightweight procedural VFX, and a matching HUD indicator.

## Particle and VFX architecture

The scene owns one fixed-capacity particle pool instead of creating a new Three.js object for every spark. Each pooled particle tracks position, velocity, lifetime, size, rotation, color, opacity, gravity, and drag in typed arrays. A small GLSL shader renders soft circles and rotating diamond sparks as camera-facing point sprites.

Phase 7 effects include fire embers and projectile trails, ice mist, lightning sparks and flashes, wind spirals, running dust, impact sparks, smoke, ambient altar motes, and a sampled sword-tip trail. Expired particles return to the pool for reuse, and the lower-left status line reports the active particle count.

## Boss encounters

The campaign progresses through three enemy chapters, the Abyss Vanguard mini-boss chapter, and the Elemental Overlord finale. The mini-boss uses slam and charge attacks and becomes more aggressive below half health. The final boss changes behavior at 66% and 33% health, using Fire projectiles, Ice cones, delayed Lightning strikes, and Wind shockwaves. Boss attacks use the same blocking, dodge-invulnerability, knockback, particle, and camera-shake systems as normal combat.

During development, `?preview=mini` and `?preview=final` open isolated boss previews for visual inspection and classroom demonstrations. These preview routes are excluded from production behavior.

## Interface and game states

The runtime uses six explicit states: Main Menu, Playing, Paused, Boss Fight, Game Over, and Victory. State changes enable or freeze gameplay systems together, preserve whether normal play or a boss fight was paused, and prevent a long simulation frame when play resumes. Health, stamina, boss health, combo feedback, ability cooldowns, hit confirmation, damage flash, and live particle count are presented through the HUD.

During development, `?preview=pause`, `?preview=gameover`, and `?preview=victory` open isolated interface states for visual verification.

## Polish and performance

Phase 10 adds synthesized Web Audio without external files, including an ambient drone and event-driven sword, impact, damage, movement, elemental, and encounter cues. Audio initializes only after a user gesture and degrades safely when Web Audio is unavailable.

Elemental lights now breathe independently and react to the selected element during casts. The renderer requests the high-performance GPU path and samples FPS, draw calls, and triangle count. After sustained low performance it reduces pixel density in small steps; after a sustained recovery it gradually restores quality. Geometry, particles, and combat effects remain pooled or reused.

## Enemy archetypes

- Ash Warden — balanced health, movement, damage, and sword timing
- Void Stalker — low health, fast detection and movement, rapid claw attacks
- Iron Revenant — high health, slow movement, heavy hammer damage, and knockback resistance

All enemies use Idle, Patrol, Detect, Chase, Attack, Hit, Retreat, and Dead states. Their states drive blended walk, run, weapon attack, hit-reaction, and death clips. The original procedural models remain as an automatic fallback if an asset cannot load.

## Third-party asset licenses

The rigged Rogue, Knight, and Barbarian models are from **KayKit Character Pack: Adventurers**. The two animated bosses come from **KayKit Character Pack: Skeletons**, and the modular scenery comes from **KayKit Dungeon Pack**. All three packs were created by Kay Lousberg and released under **CC0 1.0**. Their original licenses are included beside the selected runtime assets in `public/models/`. Only the models used by the game are shipped.

## Academic graphics concepts

The completed project demonstrates procedural 3D modeling, object transformations, lighting and shading, a third-person camera, skeletal and procedural animation, animation blending, collision detection, particles, custom physics, UI animation, and gameplay systems. It uses glTF rigs, procedural and custom-buffer geometry, transformations, multiple material models, dynamic lighting, shadows, perspective projection, fog, responsive rendering, and frame-based environmental animation.

## Viva documentation

- [Architecture](docs/architecture.md)
- [Graphics and rendering](docs/graphics.md)
- [Procedural animation](docs/animation.md)
- [Collision detection](docs/collision.md)
- [Gameplay physics](docs/physics.md)
- [Particles and VFX](docs/particles.md)
- [Gameplay systems](docs/gameplay.md)
- [Release testing record](docs/release-testing.md)

## Development phases

The project was developed and verified one phase at a time: setup, world, player movement, combat, enemies, elements, VFX, bosses, UI, polish, and final testing. Phase 11 completes collision and state-flow integration checks, release hardening, browser rendering validation, and university viva documentation.

## Known limitations

Desktop keyboard and mouse are required; mobile controls are outside the current scope. Campaign checkpoints use browser-local storage and therefore do not synchronize between different browsers or private sessions. A classic compatibility bundle is available with `?classic=1` for browser profiles that block JavaScript modules.
# Shadow Blade

Live deployment is provided through GitHub Pages.

## Audio credits

- `sword-swing-*.ogg`: “20 Sword Sound Effects (Attacks and Clashes)” by StarNinjas, CC0 1.0, via OpenGameArt.
- `enemy-taunt-*.wav`: “Aggressive NPC sounds” by mujtaba-io, CC0 1.0, via OpenGameArt.
