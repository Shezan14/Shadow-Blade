# Particle and VFX System

## Pool design

The scene owns one fixed-capacity pool of 900 GPU point particles. Each slot is represented in typed arrays for position, velocity, color, size, opacity, rotation, shape, age, lifetime, gravity, and drag. A free-index stack allocates a slot without constructing a Three.js object. When a particle expires, the slot returns to the stack.

This design avoids garbage-collection spikes during combat. One `THREE.Points` object and one draw call can render the pool. Buffer attributes use dynamic draw usage and are marked for upload after simulation updates.

## Simulation and shader

Every active particle integrates velocity and position using delta time. Exponential drag reduces speed, gravity curves motion, size interpolates from start to end, opacity fades quadratically, and rotation advances independently.

The vertex shader transforms world position into camera space and calculates perspective-correct point size. The fragment shader treats point coordinates as a small billboard. It rotates the coordinates, evaluates either a circle or diamond distance field, softens the edge, and outputs additive colored light.

## Effects

- Fire uses orange embers, sparks, bursts, and projectile trails.
- Ice uses cyan mist and directional crystal shards.
- Lightning uses violet-white flashes, branching line effects, and sparks.
- Wind uses teal spirals, rings, dust, and strong displacement cues.
- Sword combat adds sampled blade trails, hit sparks, smoke, and impact bursts.
- The arena emits subtle ambient altar motes.

Effect modules specify presets while `ParticleSystem` owns storage and lifetime. `ParticleDirector` watches movement and combat snapshots to emit footsteps and sword trails without coupling those systems to rendering details.

## Performance and debugging

Spawning fails safely when the pool is full. No array grows during a burst, and expired particles are reused. The HUD and F1 debug panel report the current active count. Automated tests verify allocation, expiry, reuse, capacity behavior, elemental emitters, dust, impacts, and sword trails. This provides a clear academic example of CPU simulation feeding a compact custom GPU shader.
