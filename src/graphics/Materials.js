import * as THREE from 'three';

export const materials = {
  obsidian: new THREE.MeshStandardMaterial({
    color: 0x080b14,
    roughness: 0.72,
    metalness: 0.28,
  }),
  darkStone: new THREE.MeshStandardMaterial({
    color: 0x111624,
    roughness: 0.88,
    metalness: 0.08,
  }),
  wornStone: new THREE.MeshStandardMaterial({
    color: 0x20263a,
    roughness: 0.93,
    metalness: 0.04,
  }),
  armor: new THREE.MeshStandardMaterial({
    color: 0x222b43,
    roughness: 0.38,
    metalness: 0.78,
  }),
  cloth: new THREE.MeshStandardMaterial({
    color: 0x171125,
    roughness: 0.94,
    metalness: 0,
    side: THREE.DoubleSide,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0x74809c,
    emissive: 0x261c58,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.92,
  }),
};

export function emissiveMaterial(color, intensity = 1.4) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.18),
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.36,
    metalness: 0.52,
  });
}

export function glowMaterial(color, opacity = 0.8) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function enableShadows(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}
