import * as THREE from 'three';
import { emissiveMaterial, glowMaterial, materials } from '../graphics/Materials.js';
import { resolveWorldCollision } from '../physics/WorldCollision.js';
import { populateKayKitEnvironment } from './KayKitEnvironment.js';

export const MAP_THEMES = Object.freeze([
  { name: 'Ruined Fire Courtyard', color: 0xff5a2f, fog: 0x110409, background: 0x050208 },
  { name: 'Frozen Catacombs', color: 0x54dcff, fog: 0x03101a, background: 0x02070d },
  { name: 'Storm Temple', color: 0xae83ff, fog: 0x0c061c, background: 0x05030d },
  { name: 'Wind Sanctum', color: 0x4df0c5, fog: 0x031613, background: 0x020a0a },
  { name: 'Overlord Arena', color: 0xffc45c, fog: 0x10050f, background: 0x040207 },
]);

export const LEVEL_LAYOUTS = Object.freeze([
  {
    bounds: { type: 'rect', halfWidth: 16, halfDepth: 30 },
    start: [0, 22], shard: [0, -24], shardSpawns: [[0, -24], [7, -24], [-5, -23]], portal: [0, -27],
    spawns: [[-10, 0], [10, 0], [0, -5]],
    seals: [[-11, 19], [11, 17], [0, 9]],
    bossTrigger: [0, -17], bossSpawn: [0, -23], healthPickup: [10, 22],
    obstacles: [
      { x: -10, z: 5, halfWidth: 6, halfDepth: 0.45 },
      { x: 10, z: 5, halfWidth: 6, halfDepth: 0.45 },
      { x: -10, z: -10, halfWidth: 6, halfDepth: 0.45 },
      { x: 10, z: -10, halfWidth: 6, halfDepth: 0.45 },
      { x: 0, z: -10, halfWidth: 2, halfDepth: 0.45, tag: 'boss-gate', solid: true },
      { x: -7, z: -3, halfWidth: 0.75, halfDepth: 0.75, kind: 'pillar' },
      { x: 7, z: -3, halfWidth: 0.75, halfDepth: 0.75, kind: 'pillar' },
    ],
  },
  {
    bounds: { type: 'rect', halfWidth: 9, halfDepth: 17 },
    start: [0, 15], shard: [0, -12], shardSpawns: [[0, -12], [0, -8], [3.2, -13]], portal: [0, -15],
    spawns: [[-5.5, -7], [5.5, -7], [0, -12]],
    seals: [[-5.8, 11], [5.8, 2]], healthPickup: [-6, 13],
    obstacles: [
      { x: -5.7, z: 3, halfWidth: 2.4, halfDepth: 0.35 },
      { x: 5.7, z: -3, halfWidth: 2.4, halfDepth: 0.35 },
      { x: 0, z: 7, halfWidth: 0.65, halfDepth: 1.8 },
    ],
  },
  {
    bounds: { type: 'rect', halfWidth: 16, halfDepth: 13 },
    start: [-12.5, 10], shard: [5.8, -9.2], shardSpawns: [[5.8, -9.2], [2, -9], [10, -3]], portal: [13, -10],
    spawns: [[-1, -4], [8, 2], [11, -7]],
    seals: [[-10, 7], [0, 8], [11, 5]], healthPickup: [12, 10],
    obstacles: [
      { x: -6, z: 0, halfWidth: 0.65, halfDepth: 2.5 },
      { x: 3, z: 5, halfWidth: 2.7, halfDepth: 0.65 },
      { x: 5, z: -6, halfWidth: 0.75, halfDepth: 2.2 },
    ],
  },
  {
    bounds: { type: 'circle', radius: 15 },
    start: [0, 12], shard: [0, -9.5], shardSpawns: [[0, -9.5], [-3, -10], [3, -10]], portal: [0, -12],
    spawns: [[-7, -4], [7, -4], [0, -9]],
    seals: [[-8, 5], [8, 5]], bossTrigger: [0, -4], bossSpawn: [0, -8], healthPickup: [-10, 9],
    obstacles: [
      { x: -5, z: 2, halfWidth: 0.7, halfDepth: 0.7 },
      { x: 5, z: 2, halfWidth: 0.7, halfDepth: 0.7 },
    ],
  },
  {
    bounds: { type: 'circle', radius: 13 },
    start: [0, 10], shard: [0, 0], shardSpawns: [[0, 0], [-3, -4], [3, -4]], portal: [0, -10], spawns: [],
    seals: [[-7, 4], [7, 4], [0, -2]], bossTrigger: [0, -4], bossSpawn: [0, -7], healthPickup: [8, 7], obstacles: [],
  },
]);

function addMesh(group, geometry, material, x, y, z, cast = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addBoundary(group, layout, stone) {
  const wallHeight = 0.3;
  if (layout.bounds.type === 'rect') {
    const { halfWidth: w, halfDepth: d } = layout.bounds;
    addMesh(group, new THREE.BoxGeometry(w * 2 + 1, wallHeight, 0.55), stone, 0, 0.05, -d);
    addMesh(group, new THREE.BoxGeometry(w * 2 + 1, wallHeight, 0.55), stone, 0, 0.05, d);
    addMesh(group, new THREE.BoxGeometry(0.55, wallHeight, d * 2), stone, -w, 0.05, 0);
    addMesh(group, new THREE.BoxGeometry(0.55, wallHeight, d * 2), stone, w, 0.05, 0);
  } else {
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2;
      const segment = addMesh(group, new THREE.BoxGeometry(4.1, wallHeight, 0.5), stone,
        Math.sin(angle) * layout.bounds.radius, 0.05, Math.cos(angle) * layout.bounds.radius);
      segment.rotation.y = angle;
    }
  }
}

function createMap(theme, layout, index) {
  const group = new THREE.Group();
  group.name = theme.name;
  const stone = materials.darkStone.clone();
  stone.color.setHex([0x323747, 0x263b48, 0x342f4d, 0x263f3a, 0x443344][index]);
  stone.roughness = 0.9;
  const floorGeometry = layout.bounds.type === 'circle'
    ? new THREE.CylinderGeometry(layout.bounds.radius, layout.bounds.radius + 0.8, 0.5, 48)
    : new THREE.BoxGeometry(layout.bounds.halfWidth * 2, 0.5, layout.bounds.halfDepth * 2);
  addMesh(group, floorGeometry, stone, 0, -0.25, 0, false);
  addBoundary(group, layout, materials.wornStone);

  layout.obstacles.forEach((obstacle, obstacleIndex) => {
    const height = 3 + obstacleIndex * 0.01;
    const collisionMarker = addMesh(group,
      new THREE.BoxGeometry(obstacle.halfWidth * 2, height, obstacle.halfDepth * 2),
      materials.obsidian,
      obstacle.x, 1.5, obstacle.z);
    collisionMarker.visible = false;
  });
  populateKayKitEnvironment(group, index, layout, theme.color);

  const sigil = new THREE.Mesh(new THREE.RingGeometry(3.8, 4.05, 64), glowMaterial(theme.color, 0.42));
  sigil.rotation.x = -Math.PI / 2;
  sigil.position.y = 0.03;
  group.add(sigil);
  group.userData.sigil = sigil;
  return group;
}

function createPortal() {
  const portal = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 8, 64), glowMaterial(0x68f5e1, 0.9));
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.94, 48), glowMaterial(0x3c8dba, 0.18));
  inner.position.z = -0.02;
  portal.add(ring, inner);
  portal.visible = false;
  portal.userData.ring = ring;
  return portal;
}

function createShard() {
  const shard = new THREE.Group();
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), emissiveMaterial(0xffffff, 1.8));
  crystal.scale.y = 1.7;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 6, 42), glowMaterial(0xffffff, 0.75));
  halo.rotation.x = Math.PI / 2;
  shard.add(crystal, halo);
  shard.visible = false;
  shard.userData.crystal = crystal;
  shard.userData.halo = halo;
  return shard;
}

function createSeal(color, position, index) {
  const seal = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 8, 32), glowMaterial(color, 0.8));
  ring.rotation.x = Math.PI / 2;
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), emissiveMaterial(color, 1.4));
  crystal.position.y = 0.65;
  seal.add(ring, crystal);
  seal.position.set(position[0], 0.08, position[1]);
  seal.userData = { active: false, ring, crystal, index };
  return seal;
}

function createHealthPickup(position) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.24);
  shape.bezierCurveTo(-0.52, 0.7, -0.78, 0.04, 0, -0.55);
  shape.bezierCurveTo(0.78, 0.04, 0.52, 0.7, 0, 0.24);
  const material = emissiveMaterial(0xff4166, 2.1);
  const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.035 }), material);
  heart.rotation.set(0, 0, 0);
  heart.position.set(position[0], 1.1, position[1]);
  heart.userData.collected = false;
  return heart;
}

export function createCampaignMaps(scene, parent) {
  const groups = MAP_THEMES.map((theme, index) => {
    const group = createMap(theme, LEVEL_LAYOUTS[index], index);
    group.userData.seals = (LEVEL_LAYOUTS[index].seals ?? []).map((position, sealIndex) => {
      const seal = createSeal(theme.color, position, sealIndex);
      group.add(seal);
      return seal;
    });
    group.userData.healthPickup = createHealthPickup(LEVEL_LAYOUTS[index].healthPickup);
    group.add(group.userData.healthPickup);
    group.visible = false;
    parent.add(group);
    return group;
  });
  const portal = createPortal();
  const shard = createShard();
  const healthDrops = new THREE.Group();
  parent.add(portal, shard, healthDrops);
  let levelIndex = 0;

  return {
    groups, portal, shard,
    get layout() { return LEVEL_LAYOUTS[levelIndex]; },
    setLevel(index) {
      levelIndex = index;
      groups.forEach((group, groupIndex) => { group.visible = groupIndex === index; });
      portal.visible = false;
      shard.visible = false;
      const healthPickup = groups[index].userData.healthPickup;
      healthPickup.userData.collected = false;
      healthPickup.visible = true;
      healthDrops.clear();
      const theme = MAP_THEMES[index];
      const layout = LEVEL_LAYOUTS[index];
      portal.position.set(layout.portal[0], 1.35, layout.portal[1]);
      const shardSpawns = layout.shardSpawns ?? [layout.shard];
      const shardSpawn = shardSpawns[Math.floor(Math.random() * shardSpawns.length)];
      shard.position.set(shardSpawn[0], 1.25, shardSpawn[1]);
      scene.background.setHex(theme.background);
      scene.fog?.color.setHex(theme.fog);
      if (scene.fog) scene.fog.density = index === 1 ? 0.014 : 0.009;
    },
    resolve(position, velocity, radius = 0.48) {
      const layout = LEVEL_LAYOUTS[levelIndex];
      const environment = groups[levelIndex].userData.environment;
      const openTags = environment?.openTags ?? new Set();
      const obstacles = [
        ...(layout.obstacles ?? []).filter((obstacle) => obstacle.solid),
        ...(environment?.colliders ?? []).filter((obstacle) => obstacle.solid),
      ]
        .filter((obstacle) => !obstacle.tag || !openTags.has(obstacle.tag));
      return resolveWorldCollision(position, velocity, { ...layout, obstacles }, radius);
    },
    getStart() { return LEVEL_LAYOUTS[levelIndex].start; },
    getSpawn(index) { return LEVEL_LAYOUTS[levelIndex].spawns[index] ?? [0, 0]; },
    getBossTrigger() { return LEVEL_LAYOUTS[levelIndex].bossTrigger ?? LEVEL_LAYOUTS[levelIndex].shard; },
    getBossSpawn() { return LEVEL_LAYOUTS[levelIndex].bossSpawn ?? LEVEL_LAYOUTS[levelIndex].shard; },
    getCameraBlockers() { return groups[levelIndex].userData.environment?.cameraBlockers ?? []; },
    collectHealthPickup(position, range = 1.35) {
      const pickup = groups[levelIndex].userData.healthPickup;
      if (pickup.userData.collected || !pickup.visible) return false;
      if (Math.hypot(pickup.position.x - position.x, pickup.position.z - position.z) > range) return false;
      pickup.userData.collected = true;
      pickup.visible = false;
      return true;
    },
    dropHealth(position) {
      const pickup = createHealthPickup([position.x, position.z]);
      pickup.position.y = 0.65;
      pickup.scale.setScalar(0.62);
      pickup.userData.drop = true;
      healthDrops.add(pickup);
    },
    collectHealthDrops(position, range = 1.1) {
      let count = 0;
      [...healthDrops.children].forEach((pickup) => {
        if (Math.hypot(pickup.position.x - position.x, pickup.position.z - position.z) <= range) {
          healthDrops.remove(pickup); count += 1;
        }
      });
      return count;
    },
    startObjectives() {
      const seals = groups[levelIndex].userData.seals ?? [];
      seals.forEach((seal) => {
        seal.visible = true;
        seal.userData.active = false;
        seal.userData.crystal.material.emissiveIntensity = 1.4;
        seal.scale.setScalar(1);
      });
      return seals.length;
    },
    activateNearbySeal(position, range = 2.1) {
      const seals = groups[levelIndex].userData.seals ?? [];
      const seal = seals.find((candidate) => !candidate.userData.active
        && Math.hypot(candidate.position.x - position.x, candidate.position.z - position.z) <= range);
      if (!seal) return false;
      seal.userData.active = true;
      seal.userData.crystal.material.emissiveIntensity = 0.2;
      seal.scale.setScalar(0.82);
      return true;
    },
    openGate(tag) {
      const group = groups[levelIndex];
      const environment = group.userData.environment;
      environment?.openTags.add(tag);
      group.traverse((object) => {
        if (object.userData.environmentTag === tag) object.visible = false;
      });
    },
    showShard(color) {
      shard.visible = true;
      shard.userData.crystal.material.color.setHex(color);
      shard.userData.crystal.material.emissive.setHex(color);
      shard.userData.halo.material.color.setHex(color);
    },
    hideShard() { shard.visible = false; },
    showPortal() { portal.visible = true; },
    hidePortal() { portal.visible = false; },
    update(elapsed) {
      const active = groups[levelIndex];
      if (active?.userData.sigil) active.userData.sigil.rotation.z = elapsed * 0.12 * (levelIndex % 2 ? -1 : 1);
      portal.rotation.y = Math.sin(elapsed * 0.65) * 0.1;
      portal.userData.ring.rotation.z = elapsed * 0.8;
      const pulse = 0.94 + Math.sin(elapsed * 3.2) * 0.06;
      portal.scale.setScalar(pulse);
      shard.rotation.y = elapsed * 1.25;
      shard.position.y = 1.25 + Math.sin(elapsed * 2.4) * 0.12;
      shard.userData.halo.rotation.z = elapsed * -1.1;
      (active?.userData.seals ?? []).forEach((seal, index) => {
        if (!seal.userData.active) {
          seal.rotation.y = elapsed * (0.7 + index * 0.08);
          seal.userData.crystal.position.y = 0.65 + Math.sin(elapsed * 2.5 + index) * 0.1;
        }
      });
      const pickup = active?.userData.healthPickup;
      if (pickup?.visible) {
        pickup.rotation.y = elapsed * 1.6;
        pickup.position.y = 1.1 + Math.sin(elapsed * 2.7) * 0.1;
      }
      healthDrops.children.forEach((pickup, index) => {
        pickup.rotation.y = elapsed * 1.8 + index;
        pickup.position.y = 0.65 + Math.sin(elapsed * 3 + index) * 0.08;
      });
    },
  };
}
