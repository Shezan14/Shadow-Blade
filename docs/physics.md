# Gameplay Physics

## Integration model

Shadow Blade uses a compact custom physics layer. Velocity is integrated with delta time:

```text
velocity = velocity + acceleration * delta
position = position + velocity * delta
```

The main clock clamps a long frame to 1/30 second. This avoids huge movement, gravity, or collision steps when a tab stalls. Paused frames receive zero delta and the timestamp still advances, so resuming never includes the entire pause duration.

## Movement

Keyboard input creates a normalized two-dimensional vector. Camera forward and right vectors convert that input into world-relative movement. Exponential interpolation approaches the desired walk or run velocity, which produces acceleration without frame-rate-dependent tuning. When input stops, exponential horizontal friction damps velocity.

Gravity adds a constant downward acceleration. Crossing the configured ground height clamps the character to the floor, clears vertical velocity, and marks it grounded. Jump assigns an upward velocity. Dodge temporarily assigns a high horizontal velocity in the selected direction and uses a cooldown.

## Forces and boundaries

Knockback adds impulse-like horizontal velocity. Enemy weight is represented by knockback resistance, and blocking reduces player knockback. Projectiles store position and velocity and advance every frame until impact or lifetime expiry.

The arena uses a circular constraint rather than expensive wall meshes. If a character crosses the radius, its horizontal position is projected back to the boundary. A dot product measures outward speed; only that component is removed.

## Stability and scope

This is gameplay physics, not a rigid-body simulator. It does not calculate mass tensors, angular momentum, stacking, or continuous mesh collision. That smaller scope is deliberate: the required concepts—acceleration, velocity, gravity, friction, jumping, falling, impulse, and projectile motion—are visible and reliable in a browser.

Automated tests verify gravity landing, friction, movement speed, dodge and jump choice, boundary response, knockback, and time-step clamping. The debug panel reports player position in real time, making the numerical result easy to demonstrate.
