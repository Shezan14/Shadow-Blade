import * as THREE from 'three';
import { materials, enableShadows } from '../graphics/Materials.js';

function createPillar(height = 4.8, broken = false) {
  const group = new THREE.Group();
  const shaftHeight = broken ? height * 0.62 : height;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, 0.42, 8), materials.wornStone);
  base.position.y = 0.21;
  group.add(base);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.39, 0.5, shaftHeight, 8),
    materials.darkStone,
  );
  shaft.position.y = 0.42 + shaftHeight / 2;
  shaft.rotation.y = Math.PI / 8;
  group.add(shaft);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.44, 0.3, 8), materials.wornStone);
  collar.position.y = 0.42 + shaftHeight;
  collar.rotation.y = Math.PI / 8;
  group.add(collar);
  return enableShadows(group);
}

function createArch() {
  const arch = new THREE.Group();
  const left = createPillar(4.2);
  left.position.x = -1.45;
  const right = createPillar(4.2);
  right.position.x = 1.45;
  arch.add(left, right);

  const top = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.65, 0.72), materials.darkStone);
  top.position.y = 4.8;
  top.rotation.z = -0.035;
  arch.add(top);

  const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), materials.wornStone);
  crown.position.y = 5.35;
  crown.scale.y = 0.65;
  arch.add(crown);
  return enableShadows(arch);
}

function createDistantSpikes() {
  const count = 28;
  const geometry = new THREE.ConeGeometry(0.7, 5.5, 5);
  const spikes = new THREE.InstancedMesh(geometry, materials.obsidian, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 14 + (i % 4) * 1.6;
    const scale = 0.62 + ((i * 17) % 9) * 0.065;
    dummy.position.set(Math.cos(angle) * radius, 0.5 + scale, Math.sin(angle) * radius);
    dummy.rotation.set((i % 3 - 1) * 0.08, -angle, (i % 5 - 2) * 0.035);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    spikes.setMatrixAt(i, dummy.matrix);
  }
  spikes.castShadow = true;
  return spikes;
}

export function createEnvironment() {
  const environment = new THREE.Group();
  environment.name = 'Ancient Ruins';

  const mainArch = createArch();
  mainArch.position.set(0, -0.08, -10.8);
  environment.add(mainArch);

  const sideArchLeft = createArch();
  sideArchLeft.scale.setScalar(0.72);
  sideArchLeft.position.set(-9.2, -0.12, -2.6);
  sideArchLeft.rotation.y = Math.PI / 2.7;
  environment.add(sideArchLeft);

  const sideArchRight = createArch();
  sideArchRight.scale.setScalar(0.72);
  sideArchRight.position.set(9.2, -0.12, -2.6);
  sideArchRight.rotation.y = -Math.PI / 2.7;
  environment.add(sideArchRight);

  const pillarLayout = [
    [-6.6, -6.2, 5.2, false], [6.6, -6.2, 5.2, false],
    [-8.4, 3.1, 4.3, true], [8.4, 3.1, 4.8, true],
    [-9.4, -0.4, 3.6, true], [9.4, -0.4, 3.9, true],
  ];
  pillarLayout.forEach(([x, z, height, broken], index) => {
    const pillar = createPillar(height, broken);
    pillar.position.set(x, -0.05, z);
    pillar.rotation.z = broken ? (index % 2 ? -0.075 : 0.06) : 0;
    environment.add(pillar);
  });

  environment.add(createDistantSpikes());
  return environment;
}
