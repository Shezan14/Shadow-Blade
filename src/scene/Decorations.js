import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { emissiveMaterial, glowMaterial, materials } from '../graphics/Materials.js';

const ALTARS = [
  { name: 'Fire', color: CONFIG.colors.fire, angle: -Math.PI * 0.75 },
  { name: 'Ice', color: CONFIG.colors.ice, angle: -Math.PI * 0.25 },
  { name: 'Wind', color: CONFIG.colors.wind, angle: Math.PI * 0.25 },
  { name: 'Lightning', color: CONFIG.colors.lightning, angle: Math.PI * 0.75 },
];

function createCrystalCluster(color, scale = 1) {
  const cluster = new THREE.Group();
  const crystalMaterial = emissiveMaterial(color, 1.25);
  const layout = [
    [0, 0.75, 0, 1], [-0.35, 0.4, 0.1, 0.58], [0.32, 0.33, -0.06, 0.47],
  ];
  layout.forEach(([x, y, z, size], index) => {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), crystalMaterial);
    shard.position.set(x, y, z);
    shard.scale.set(size * 0.75, size * 1.7, size * 0.75);
    shard.rotation.y = index * 0.7;
    shard.castShadow = true;
    cluster.add(shard);
  });
  cluster.scale.setScalar(scale);
  return cluster;
}

function createElementalAltar({ name, color, angle }, index) {
  const altar = new THREE.Group();
  altar.name = `${name} Altar`;

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1, 1.2, 6), materials.darkStone);
  plinth.position.y = 0.6;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  altar.add(plinth);

  const crystal = createCrystalCluster(color, 0.9);
  crystal.position.y = 1.25;
  altar.add(crystal);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.022, 6, 48), glowMaterial(color, 0.7));
  halo.position.y = 2.05;
  halo.rotation.x = Math.PI / 2;
  altar.add(halo);

  const light = new THREE.PointLight(color, 9, 6, 2);
  light.position.y = 2.1;
  altar.add(light);

  const radius = 6.7;
  altar.position.set(Math.cos(angle) * radius, -0.02, Math.sin(angle) * radius);
  altar.rotation.y = -angle - Math.PI / 2;
  altar.userData.halo = halo;
  altar.userData.crystal = crystal;
  altar.userData.phase = index * 1.4;
  return altar;
}

function createBrazier() {
  const brazier = new THREE.Group();
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.23, 0.28, 8, 1, true),
    materials.steel,
  );
  bowl.position.y = 1.05;
  brazier.add(bowl);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 0.9, 6), materials.steel);
  stem.position.y = 0.5;
  brazier.add(stem);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 7), emissiveMaterial(0xff5522, 2));
  flame.position.y = 1.52;
  brazier.add(flame);
  const light = new THREE.PointLight(0xff4b1f, 5, 5, 2);
  light.position.y = 1.5;
  brazier.add(light);
  brazier.userData.flame = flame;
  return brazier;
}

export function createDecorations() {
  const decorations = new THREE.Group();
  decorations.name = 'Arena Decorations';
  const animated = [];

  ALTARS.forEach((data, index) => {
    const altar = createElementalAltar(data, index);
    decorations.add(altar);
    animated.push(altar);
  });

  [[-2.8, -3.1], [2.8, -3.1], [-2.8, 3.1], [2.8, 3.1]].forEach(([x, z], index) => {
    const brazier = createBrazier();
    brazier.position.set(x, 0.05, z);
    brazier.rotation.y = index * Math.PI / 2;
    decorations.add(brazier);
    animated.push(brazier);
  });

  const rubbleGeometry = new THREE.DodecahedronGeometry(0.32, 0);
  const rubble = new THREE.InstancedMesh(rubbleGeometry, materials.wornStone, 34);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 34; i += 1) {
    const angle = i * 2.399;
    const radius = 8.1 + (i % 5) * 0.42;
    dummy.position.set(Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius);
    dummy.rotation.set(i * 0.3, i * 0.7, i * 0.17);
    const scale = 0.45 + (i % 6) * 0.09;
    dummy.scale.set(scale * 1.4, scale * 0.72, scale);
    dummy.updateMatrix();
    rubble.setMatrixAt(i, dummy.matrix);
  }
  rubble.castShadow = true;
  rubble.receiveShadow = true;
  decorations.add(rubble);

  decorations.userData.update = (elapsed) => {
    animated.forEach((object, index) => {
      if (object.userData.halo) {
        object.userData.halo.rotation.z = elapsed * (index % 2 ? -0.7 : 0.7);
        object.userData.crystal.position.y = 1.25 + Math.sin(elapsed * 1.4 + object.userData.phase) * 0.09;
      }
      if (object.userData.flame) {
        object.userData.flame.scale.y = 0.85 + Math.sin(elapsed * 8 + index) * 0.14;
        object.userData.flame.rotation.y = elapsed * 1.8;
      }
    });
  };
  return decorations;
}
