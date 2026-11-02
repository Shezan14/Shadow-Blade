import * as THREE from 'three';
import { materials, glowMaterial } from '../graphics/Materials.js';

function createRuneRing(radius, color, opacity = 0.3) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.025, radius + 0.025, 96),
    glowMaterial(color, opacity),
  );
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    const rune = new THREE.Mesh(
      new THREE.PlaneGeometry(i % 2 ? 0.08 : 0.15, 0.42),
      glowMaterial(color, opacity * 0.85),
    );
    rune.rotation.x = -Math.PI / 2;
    rune.rotation.z = -angle;
    rune.position.set(Math.cos(angle) * radius, 0.006, Math.sin(angle) * radius);
    group.add(rune);
  }
  return group;
}

function createBridge(angle) {
  const bridge = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(2.45 - i * 0.08, 0.22, 1.05),
      i % 2 ? materials.wornStone : materials.darkStone,
    );
    slab.position.z = 6.5 + i * 1.02;
    slab.position.y = -0.25 - i * 0.055;
    slab.rotation.y = (i - 2) * 0.012;
    slab.castShadow = true;
    slab.receiveShadow = true;
    bridge.add(slab);
  }
  bridge.rotation.y = angle;
  return bridge;
}

export function createArena() {
  const arena = new THREE.Group();
  arena.name = 'Elemental Arena';

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(8.8, 9.5, 0.75, 12),
    materials.obsidian,
  );
  base.position.y = -0.64;
  base.receiveShadow = true;
  base.castShadow = true;
  arena.add(base);

  const upperFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(7.7, 8.2, 0.24, 16),
    materials.darkStone,
  );
  upperFloor.position.y = -0.14;
  upperFloor.receiveShadow = true;
  arena.add(upperFloor);

  const centerDais = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 2.5, 0.32, 8),
    materials.wornStone,
  );
  centerDais.position.y = 0.12;
  centerDais.castShadow = true;
  centerDais.receiveShadow = true;
  arena.add(centerDais);

  const centerInset = new THREE.Mesh(
    new THREE.CylinderGeometry(1.72, 1.72, 0.035, 32),
    materials.obsidian,
  );
  centerInset.position.y = 0.3;
  arena.add(centerInset);

  const innerRunes = createRuneRing(1.35, 0x6f56ff, 0.54);
  innerRunes.position.y = 0.325;
  arena.add(innerRunes);

  const outerRunes = createRuneRing(5.8, 0x334879, 0.3);
  outerRunes.position.y = 0.005;
  arena.add(outerRunes);

  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => arena.add(createBridge(angle)));

  arena.userData.update = (elapsed) => {
    innerRunes.rotation.y = elapsed * 0.055;
    outerRunes.rotation.y = -elapsed * 0.018;
  };
  return arena;
}
