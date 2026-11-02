import * as THREE from 'three';

export function emitIceMist(system, origin, forward, count = 24) {
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  for (let i = 0; i < count; i += 1) {
    const spread = (i / (count - 1) - 0.5) * 2;
    const velocity = forward.clone().multiplyScalar(1.3 + (i % 5) * 0.34);
    velocity.addScaledVector(side, spread * 1.15).setY(0.2 + (i % 4) * 0.12);
    system.spawn({
      position: origin,
      velocity,
      color: i % 3 ? 0x63e6ff : 0xd6f8ff,
      lifetime: 0.75 + (i % 4) * 0.1,
      size: i % 2 ? 0.1 : 0.16,
      endSize: 0.22,
      drag: 1.8,
      rotation: i,
      rotationSpeed: i % 2 ? 2 : -2,
      shape: i % 3 ? 0 : 1,
    });
  }
}
