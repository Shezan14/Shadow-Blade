# Release Testing Record

## Automated coverage

`npm test` runs Phase 3 through Phase 11 checks in one command. Coverage includes movement, gravity, arena bounds, procedural animation, damage, block reduction, attack windows, combos, enemy state transitions, elemental status effects, particle pooling, boss phases, game-state rules, pause timing, adaptive quality, audio fallback, exact collision boundaries, and documentation presence.

`npm run build` performs the production Vite compilation and catches unresolved modules or syntax errors. The final output contains only the application CSS, application JavaScript, and the Three.js vendor chunk; no network-loaded game assets are required.

## Browser checks

The installed Microsoft Edge browser was used for WebGL 2 integration checks at 1440×900 and a narrow 720×900 viewport. Checks covered the main menu, active arena, debug overlay, collision helpers, mini-boss, final boss, pause, game-over, and victory presentations. FPS, draw calls, triangle count, particle count, and quality scale were read through the in-game F1 panel.

Chrome and Firefox use the same standards-based WebGL 2, ES module, Web Audio, Pointer Lock, HTML, and CSS APIs, but they were not installed in the verification environment. They remain recommended smoke-test targets on the presentation machine.

## Release expectations

Use a current desktop browser with hardware acceleration enabled. Keyboard and mouse are required; mobile controls are outside the first-version scope. Audio begins only after clicking Enter the Arena. If WebGL 2 is unavailable, the game displays a clear fallback instead of starting a broken renderer.
