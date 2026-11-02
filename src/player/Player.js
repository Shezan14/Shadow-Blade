import * as THREE from 'three';
import { emissiveMaterial, enableShadows, materials } from '../graphics/Materials.js';

function createSword() {
  const sword = new THREE.Group();
  const bladeShape = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -0.07, 0, 0, 0.07, 0, 0, -0.055, 1.45, 0,
    0.07, 0, 0, 0.055, 1.45, 0, -0.055, 1.45, 0,
    -0.055, 1.45, 0, 0.055, 1.45, 0, 0, 1.72, 0,
  ]);
  bladeShape.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  bladeShape.computeVertexNormals();
  const blade = new THREE.Mesh(bladeShape, materials.steel);
  sword.add(blade);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.11), materials.steel);
  sword.add(guard);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.43, 7), materials.cloth);
  grip.position.y = -0.25;
  sword.add(grip);
  return sword;
}

function createLeg(side) {
  const leg = new THREE.Group();
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.75, 6), materials.armor);
  thigh.position.y = -0.35;
  leg.add(thigh);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.64, 0.4), materials.obsidian);
  boot.position.set(0, -0.98, 0.06);
  boot.rotation.x = -0.06;
  leg.add(boot);
  leg.position.x = side * 0.24;
  return leg;
}

function createArm(side) {
  const arm = new THREE.Group();
  const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.25, 7, 5), materials.armor);
  pauldron.scale.set(1.35, 0.8, 1.1);
  arm.add(pauldron);
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.72, 6), materials.armor);
  forearm.position.y = -0.43;
  arm.add(forearm);
  arm.position.set(side * 0.58, 1.42, 0);
  arm.rotation.z = side * 0.12;
  return arm;
}

export function createPlayer() {
  const player = new THREE.Group();
  player.name = 'Shadow Warrior';
  const visual = new THREE.Group();
  visual.name = 'procedural-player-fallback';
  player.add(visual);

  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);
  visual.add(leftLeg, rightLeg);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.96, 7), materials.armor);
  torso.position.y = 1.13;
  torso.scale.z = 0.72;
  visual.add(torso);

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.22, 7), materials.cloth);
  waist.position.y = 0.58;
  visual.add(waist);

  const leftArm = createArm(-1);
  const rightArm = createArm(1);
  rightArm.rotation.x = -0.22;
  visual.add(leftArm, rightArm);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.43, 0.78, 7), materials.cloth);
  hood.position.y = 1.97;
  hood.rotation.y = Math.PI / 7;
  visual.add(hood);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), materials.obsidian);
  face.position.set(0, 1.88, 0.12);
  face.scale.set(0.82, 1, 0.72);
  visual.add(face);

  const eyeMaterial = emissiveMaterial(0x61e7ff, 2.8);
  [-0.085, 0.085].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.025), eyeMaterial);
    eye.position.set(x, 1.93, 0.31);
    visual.add(eye);
  });

  const capeShape = new THREE.BufferGeometry();
  capeShape.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.42, 1.62, -0.18, 0.42, 1.62, -0.18, -0.62, 0.05, -0.38,
    0.42, 1.62, -0.18, 0.57, 0.05, -0.38, -0.62, 0.05, -0.38,
  ], 3));
  capeShape.computeVertexNormals();
  const cape = new THREE.Mesh(capeShape, materials.cloth);
  visual.add(cape);

  const sword = createSword();
  sword.position.set(0.6, 0.92, 0.05);
  sword.rotation.set(-0.16, 0, -0.24);
  visual.add(sword);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.31;
  player.add(shadow);

  player.position.set(0.85, 1.2, 2.55);
  player.rotation.y = Math.PI;
  player.scale.setScalar(0.92);
  player.userData.parts = { visual, torso, hood, cape, leftArm, rightArm, leftLeg, rightLeg, sword };
  return enableShadows(player);
}
