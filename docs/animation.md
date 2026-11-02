# Procedural Animation

## Approach

Characters are animated procedurally because the project intentionally avoids Blender and skeletal animation files. Each character is a hierarchy of Three.js groups. Limbs pivot around their parent joints, and weapons inherit hand transformations. This demonstrates transformation hierarchies directly.

`PlayerAnimation` receives movement and combat snapshots every frame. It does not decide gameplay. Instead, it maps authoritative states to visual targets and smoothly approaches those targets using exponential interpolation. The expression `1 - exp(-rate * delta)` makes smoothing nearly independent of frame rate.

## Player states

- **Idle:** low-frequency sine motion creates breathing and small hood movement.
- **Walk and run:** sine waves alternate arms and legs. Run increases frequency, stride, forward lean, cape lift, and body bob.
- **Jump and fall:** limbs move to distinct airborne silhouettes based on vertical state.
- **Dodge:** progress drives a full roll pose while movement physics controls displacement.
- **Block:** the weapon and arms interpolate into a defensive pose.
- **Attack/combo:** normalized attack progress drives three different sword arcs. Smoothstep easing gives attacks readable anticipation and follow-through.
- **Hit/death:** damage systems and enemy animators add recoil, collapse, and scale changes.

Enemies use the same principles with different speeds and amplitudes per archetype. Their AI state selects patrol, chase, attack, hit, retreat, or death poses. Boss motion and attacks use larger transformations for readable telegraphing.

## Separation from gameplay

Animation never determines whether an attack hits. `PlayerCombat` owns timing and publishes an active hit window; the animation merely visualizes that progress. This separation prevents a visual smoothing change from altering damage rules. The sword trail samples the transformed sword tip, so it follows the visible weapon while damage remains controlled by collision logic.

## Viva demonstration

Stand still to show sine-based breathing, then walk and run to compare frequency and amplitude. Jump and dodge demonstrate state-driven poses. Queue three attacks to show separate curves and interpolation. F1 can confirm the current gameplay state while the animation continues to use delta time.
