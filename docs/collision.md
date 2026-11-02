# Collision Detection

## Collision shapes

The game uses simple analytical bounds instead of mesh-to-mesh collision. This is faster, easier to test, and appropriate for stylized low-poly characters.

`SphereHitbox` represents sword and area attacks. A target exposes a center and radius; a hit occurs when squared center distance is less than or equal to the squared sum of radii. Squared distance avoids a square root. Elemental cones add distance and direction-dot-product checks, while lightning selects valid targets along its chain. Boss projectiles and hazards use radius checks around their world positions.

The player and enemies are constrained to a circular arena boundary. The physics code projects any outside position back onto the circle and removes only the outward component of velocity. Tangential or inward motion remains possible, which prevents sticky walls.

## Attack pipeline

1. Mouse input starts an attack and increments a serial number.
2. Normalized attack progress opens a defined active window.
3. `CombatSystem` positions the attack sphere in front of the player.
4. Targets are filtered by visibility, life state, distance, and per-swing hit history.
5. A confirmed intersection applies damage and knockback once.
6. Particles, camera shake, hit marker, and audio communicate the result.

Blocking reduces received damage. Dodging grants temporary avoidance during its state. Enemy and boss attacks use their own ranges and telegraphs but feed the same player damage and knockback systems.

## Debugging and tests

Press F2 to show cyan `BoxHelper` bounds for the player, enemies, and bosses. These boxes are a visual diagnostic, while gameplay continues to use its lightweight sphere/range rules. Phase tests cover contact at an exact sphere boundary, non-contact immediately beyond it, arena clamping, sword reach, projectile hits, boss hazards, and duplicate-hit prevention.

Simple bounds can look less exact around decorative extremities, but this is an intentional tradeoff: combat remains forgiving and stable, and the collision mathematics can be explained clearly during a university demonstration.
