import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();
const assetUrl = (path) => new URL(path, typeof document !== 'undefined' ? document.baseURI : 'http://localhost/').toString();

function loadModel(file) {
  if (!cache.has(file)) {
    cache.set(file, loader.loadAsync(assetUrl(`models/kaykit-dungeon/${file}`)).then((gltf) => gltf.scene));
  }
  return cache.get(file);
}

function placement(file, x, z, rotationY = 0, scale = 1, y = 0, options = {}) {
  return { file, x, z, rotationY, scale, y, ...options };
}

function rectangularWalls(layout, doorwaySide = 'north') {
  const result = [];
  const { halfWidth: width, halfDepth: depth } = layout.bounds;
  for (let x = -width + 2; x <= width - 2; x += 4) {
    const northFile = doorwaySide === 'north' && Math.abs(x) < 1 ? 'wall_doorway.glb' : 'wall.gltf.glb';
    result.push(placement(northFile, x, -depth, 0));
    result.push(placement('wall.gltf.glb', x, depth, Math.PI));
  }
  for (let z = -depth + 2; z <= depth - 2; z += 4) {
    result.push(placement(z % 8 === 0 ? 'wall_broken.gltf.glb' : 'wall.gltf.glb', -width, z, Math.PI / 2));
    result.push(placement('wall.gltf.glb', width, z, -Math.PI / 2));
  }
  result.push(
    placement('wall_corner.gltf.glb', -width, -depth, 0),
    placement('wall_corner.gltf.glb', width, -depth, -Math.PI / 2),
    placement('wall_corner.gltf.glb', width, depth, Math.PI),
    placement('wall_corner.gltf.glb', -width, depth, Math.PI / 2),
  );
  return result;
}

function circularWalls(layout, opening = true) {
  const result = [];
  const count = 20;
  for (let i = 0; i < count; i += 1) {
    if (opening && (i === 0 || i === 1 || i === count - 1)) continue;
    const angle = (i / count) * Math.PI * 2;
    result.push(placement(
      i % 5 === 0 ? 'wall_broken.gltf.glb' : 'wall.gltf.glb',
      Math.sin(angle) * layout.bounds.radius,
      Math.cos(angle) * layout.bounds.radius,
      angle,
    ));
  }
  return result;
}

function mapProps(index, layout) {
  const obstacles = layout.obstacles.flatMap((obstacle, i) => [
    obstacle.kind === 'pillar'
      ? placement('pillar_decorated.gltf.glb', obstacle.x, obstacle.z, i * 0.6, 1, 0, { collision: [0.78, 0.78], solid: true })
      : null,
  ]).filter(Boolean);
  const sets = [
    [
      placement('stairs_wide.gltf.glb', -12.5, 25, Math.PI / 2, 0.72, 0, { collision: [1.05, 0.52], solid: true }),
      placement('crates_stacked.gltf.glb', -12, 19, 0.35, 1, 0, { collision: [1.1, 1.2], solid: true }),
      placement('barrel_small_stack.gltf.glb', 12, 17, -0.4, 1, 0, { collision: [1, 0.65], solid: true }),
      placement('rubble_large.gltf.glb', -10, -18, 0.2, 0.55, 0, { collision: [1.25, 0.85], solid: true }),
      placement('chest_gold.glb', 10.5, 8, -0.5, 1, 0, { collision: [1, 0.9], solid: true }),
      placement('torch_lit.gltf.glb', -2.1, -29.35, 0, 1.2, 2.25),
      placement('torch_lit.gltf.glb', 2.1, -29.35, 0, 1.2, 2.25),
      placement('torch_lit.gltf.glb', -15.35, 22, Math.PI / 2, 1.2, 2.25),
      placement('torch_lit.gltf.glb', 15.35, 14, -Math.PI / 2, 1.2, 2.25),
      placement('torch_lit.gltf.glb', -15.35, 0, Math.PI / 2, 1.2, 2.25),
      placement('torch_lit.gltf.glb', 15.35, -6, -Math.PI / 2, 1.2, 2.25),
      placement('torch_lit.gltf.glb', -15.35, -18, Math.PI / 2, 1.2, 2.25),
      ...[-14, -10, -6, 6, 10, 14].map((x) => placement('wall.gltf.glb', x, 5, 0, 1, 0, { collision: [2, 0.45], solid: true })),
      ...[-14, -10, -6, 6, 10, 14].map((x) => placement('wall.gltf.glb', x, -10, 0, 1, 0, { collision: [2, 0.45], solid: true })),
      placement('wall.gltf.glb', 0, -10, 0, 1, 0, { tag: 'boss-gate', collision: [2, 0.45], solid: true }),
    ],
    [
      placement('rubble_large.gltf.glb', 0, 0, Math.PI / 2, 0.55, 0, { collision: [0.9, 1.3], solid: true }),
      placement('crates_stacked.gltf.glb', -6.7, 12, 0.4, 1, 0, { collision: [1.1, 1.2], solid: true }),
      placement('barrel_small_stack.gltf.glb', 6.8, -10, -0.2, 1, 0, { collision: [1, 0.65], solid: true }),
      placement('chest_gold.glb', -5.8, -12, 0.5, 1, 0, { collision: [1, 0.9], solid: true }),
      placement('torch_lit.gltf.glb', -8.35, 7, Math.PI / 2, 1.2, 2.15),
      placement('torch_lit.gltf.glb', 8.35, -7, -Math.PI / 2, 1.2, 2.15),
    ],
    [
      placement('stairs_wide.gltf.glb', 11.5, -7.5, -Math.PI / 2, 0.8, 0, { collision: [1.15, 0.52], solid: true }),
      placement('chest_gold.glb', 12, 8, -0.6, 1, 0, { collision: [1, 0.9], solid: true }),
      placement('crates_stacked.gltf.glb', -12, -8, 0.2, 1, 0, { collision: [1.1, 1.2], solid: true }),
      placement('rubble_large.gltf.glb', -7, 8.5, -0.3, 0.62, 0, { collision: [1.1, 0.85], solid: true }),
      placement('pillar_decorated.gltf.glb', 0, -9, 0, 1.1, 0, { collision: [0.8, 0.8], solid: true }),
      placement('pillar_decorated.gltf.glb', 8, 8, 0, 1.1, 0, { collision: [0.8, 0.8], solid: true }),
    ],
    [
      placement('rubble_large.gltf.glb', -8, -6, 0.6, 0.55, 0, { collision: [1, 0.8], solid: true }),
      placement('rubble_large.gltf.glb', 8, -5, -0.5, 0.55, 0, { collision: [1, 0.8], solid: true }),
      placement('chest_gold.glb', 0, 8.5, Math.PI, 1, 0, { collision: [1, 0.9], solid: true }),
      placement('pillar_decorated.gltf.glb', -9, 4, 0, 1.15, 0, { collision: [0.85, 0.85], solid: true }),
      placement('pillar_decorated.gltf.glb', 9, 4, 0, 1.15, 0, { collision: [0.85, 0.85], solid: true }),
    ],
    [
      placement('stairs_wide.gltf.glb', 0, 8.5, Math.PI, 0.75, 0, { collision: [1.1, 0.52], solid: true }),
      placement('pillar_decorated.gltf.glb', -7.5, 0, 0, 1.25, 0, { collision: [0.9, 0.9], solid: true }),
      placement('pillar_decorated.gltf.glb', 7.5, 0, 0, 1.25, 0, { collision: [0.9, 0.9], solid: true }),
      placement('rubble_large.gltf.glb', 0, -8.5, 0, 0.58, 0, { collision: [1.05, 0.82], solid: true }),
      placement('torch_lit.gltf.glb', -4, -10, 0, 1.35, 2.1),
      placement('torch_lit.gltf.glb', 4, -10, 0, 1.35, 2.1),
    ],
  ];
  return obstacles.concat(sets[index]);
}

export function populateKayKitEnvironment(group, index, layout, color) {
  const data = { colliders: [], cameraBlockers: [], openTags: new Set() };
  group.userData.environment = data;
  if (typeof window === 'undefined') return data;
  const boundary = layout.bounds.type === 'rect' ? rectangularWalls(layout) : circularWalls(layout, index !== 4);
  const placements = boundary.concat(mapProps(index, layout));
  data.colliders = placements.filter((item) => item.collision).map((item) => ({
    x: item.x,
    z: item.z,
    halfWidth: item.collision[0],
    halfDepth: item.collision[1],
    tag: item.tag,
    structural: Boolean(item.structural),
    solid: Boolean(item.solid),
  }));
  placements.forEach(async (item) => {
    try {
      const source = await loadModel(item.file);
      const model = source.clone(true);
      model.position.set(item.x, item.y, item.z);
      model.rotation.y = item.rotationY;
      model.scale.setScalar(item.scale);
      model.userData.environmentTag = item.tag ?? '';
      model.visible = !item.tag || !data.openTags.has(item.tag);
      model.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          if (child.material.color) {
            child.material.emissive = child.material.color.clone().multiplyScalar(0.16);
            child.material.emissiveIntensity = item.file === 'torch_lit.gltf.glb' ? 0.7 : 0.22;
          }
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.cameraBlocker = true;
        }
      });
      group.add(model);
      data.cameraBlockers.push(model);
      if (item.file === 'torch_lit.gltf.glb') {
        const light = new THREE.PointLight(color, 3.8, 7, 2);
        light.position.set(item.x, item.y + 0.65, item.z);
        group.add(light);
      }
    } catch (error) {
      console.warn(`Environment asset failed to load: ${item.file}`, error);
    }
  });
  return data;
}
