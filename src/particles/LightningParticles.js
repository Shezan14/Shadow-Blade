import * as THREE from 'three';

export function emitLightningSparks(system, position, count = 22) {
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.399;
    const speed = 3 + (i % 6) * 0.65;
    system.spawn({
      position,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, ((i * 7) % 5) - 1.2, Math.sin(angle) * speed),
      color: i % 4 ? 0xb58cff : 0xffffff,
      lifetime: 0.18 + (i % 5) * 0.035,
      size: 0.075,
      endSize: 0.015,
      drag: 2.2,
      rotation: angle,
      rotationSpeed: 12,
      shape: 1,
    });
  }
}
