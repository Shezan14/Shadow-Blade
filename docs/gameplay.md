# Gameplay Systems

## Objective and loop

The player controls a Shadow Warrior across five connected elemental chapters: Ruined Fire Courtyard, Frozen Catacombs, Storm Temple, Wind Sanctum, and Overlord Arena. Early chapters use different enemy combinations and later introduce multiple waves. The fourth chapter contains the Abyss Vanguard mini-boss; the fifth contains the three-phase Elemental Overlord. Defeat leads to Game Over and the final boss leads to Victory.

Fire is available initially. Ice, Lightning, and Wind unlock progressively through collectible shards. A shard appears after a chapter encounter, and approaching it opens an animated portal. Entering the portal records a local checkpoint and presents the next story panel. Enemy health, speed, damage, and composition scale between chapters.

## Controls

WASD moves relative to the camera, Shift runs, Space jumps while stationary or dodges while moving, the mouse orbits and zooms, left mouse attacks, and right mouse blocks. Keys 1–4 cast Fire, Ice, Lightning, and Wind. Escape pauses, M toggles audio, F1 displays telemetry, and F2 displays collision bounds.

## Combat and resources

Sword combat supports a three-hit queued combo. Every attack spends stamina and has anticipation, active, and recovery timing. Blocking reduces damage but consumes stamina. Dodge provides a short avoidance state. Health, stamina, combo count, cooldowns, impacts, camera shake, sound, and particles provide layered feedback.

Fire deals high damage and burn damage over time. Ice slows or freezes a group. Lightning quickly chains between targets and stuns them. Wind dashes the player and applies extreme knockback. Each has its own cooldown, color, sound profile, and VFX.

## AI and bosses

Normal enemies use Idle, Patrol, Detect, Chase, Attack, Hit, Retreat, and Dead states. Ash Warden is balanced, Void Stalker is fast, and Iron Revenant is slow and resistant to knockback. The mini-boss uses slam and charge patterns. The final boss changes behavior at 66% and 33% health and combines fire projectiles, ice cones, delayed lightning strikes, and wind shockwaves.

## State and presentation

`GameStateManager` permits only defined transitions between Main Menu, Playing, Paused, Boss Fight, Game Over, and Victory. Menus enable or disable every input-driven system together. Pointer-lock loss, tab hiding, and WebGL context loss pause active play safely.

The HUD interpolates values rather than snapping. Stage announcements fade and scale, damage flashes the screen edge, and terminal overlays preserve the arena behind them. Procedural audio initializes only after a user gesture to comply with browser policy.

## Demonstration route

For a short viva, show movement and camera, perform the three-hit combo, cast all four elements, press F1/F2 to explain telemetry and collision, then use the development preview routes `?preview=mini` and `?preview=final` to demonstrate boss phases. UI previews are also available for pause, game over, and victory during development.
