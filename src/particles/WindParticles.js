import * as THREE from 'three';

export function emitWindSpiral(system, position, count = 28) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 0.35 + (i % 4) * 0.12;
    system.spawn({
      position: new THREE.Vector3(position.x + Math.cos(angle) * radius, position.y + 0.12, position.z + Math.sin(angle) * radius),
      velocity: new THREE.Vector3(Math.cos(angle + Math.PI / 2) * 2.1, 0.3 + (i % 5) * 0.12, Math.sin(angle + Math.PI / 2) * 2.1),
      color: i % 3 ? 0x4ce8c0 : 0xb9fff0,
      lifetime: 0.48 + (i % 4) * 0.09,
      size: 0.085,
      endSize: 0.025,
      drag: 0.8,
      rotation: angle,
      rotationSpeed: 7,
      shape: 1,
    });
  }
}

export function emitDust(system, position, seed = 0) {
  const angle = seed * 2.399;
  system.spawn({
    position: new THREE.Vector3(position.x + Math.cos(angle) * 0.28, 0.08, position.z + Math.sin(angle) * 0.28),
    velocity: new THREE.Vector3(Math.cos(angle) * 0.25, 0.24, Math.sin(angle) * 0.25),
    color: 0x667086,
    lifetime: 0.72,
    size: 0.13,
    endSize: 0.3,
    drag: 2.4,
    shape: 0,
  });
}
