import * as THREE from 'three';

export function emitFireBurst(system, position, count = 26) {
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.399;
    const speed = 2.2 + (i % 6) * 0.65;
    system.spawn({
      position,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, 1.2 + (i % 5) * 0.42, Math.sin(angle) * speed),
      color: i % 3 ? 0xff5b24 : 0xffc14e,
      lifetime: 0.45 + (i % 5) * 0.08,
      size: i % 3 ? 0.14 : 0.08,
      endSize: 0.025,
      gravity: -3.5,
      drag: 0.6,
      rotation: angle,
      rotationSpeed: 5,
      shape: 1,
    });
  }
}

export function emitFireTrail(system, position, phase = 0) {
  system.spawn({
    position,
    velocity: new THREE.Vector3(Math.sin(phase) * 0.18, 0.45, Math.cos(phase) * 0.18),
    color: phase % 1 > 0.5 ? 0xffb23f : 0xff4b1f,
    lifetime: 0.34,
    size: 0.11,
    endSize: 0.025,
    drag: 1.5,
    shape: 1,
  });
}
