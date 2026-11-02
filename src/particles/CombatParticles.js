import * as THREE from 'three';

export function emitHitSparks(system, position, color = 0xc6f5ff, count = 16) {
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.399;
    const speed = 2.8 + (i % 5) * 0.8;
    system.spawn({
      position,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, 0.6 + (i % 4) * 0.65, Math.sin(angle) * speed),
      color: i % 4 ? color : 0xffffff,
      lifetime: 0.2 + (i % 4) * 0.06,
      size: 0.065,
      endSize: 0.012,
      gravity: -5.5,
      drag: 0.8,
      rotation: angle,
      rotationSpeed: 9,
      shape: 1,
    });
  }
}

export function emitSmoke(system, position, count = 7) {
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.399;
    system.spawn({
      position,
      velocity: new THREE.Vector3(Math.cos(angle) * 0.22, 0.45 + i * 0.04, Math.sin(angle) * 0.22),
      color: i % 2 ? 0x35384a : 0x191c29,
      lifetime: 0.85 + i * 0.07,
      size: 0.14,
      endSize: 0.34,
      drag: 1.4,
      rotation: angle,
      rotationSpeed: i % 2 ? 0.8 : -0.8,
      shape: 0,
    });
  }
}
