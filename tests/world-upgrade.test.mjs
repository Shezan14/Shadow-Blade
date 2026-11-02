import assert from 'node:assert/strict';
import * as THREE from 'three';
import { resolvePlayerClip, resolveEnemyClip, resolveBossClip } from '../src/characters/RiggedCharacter.js';
import { resolveWorldCollision } from '../src/physics/WorldCollision.js';
import { LEVEL_LAYOUTS } from '../src/scene/CampaignMaps.js';

assert.equal(resolvePlayerClip({ state: 'run' }, { attacking: false, blocking: false }), 'Running_A');
assert.equal(resolvePlayerClip({ state: 'idle' }, { attacking: false, blocking: true }), 'Blocking');
assert.equal(resolvePlayerClip({ state: 'idle' }, { attacking: true, blocking: false, comboIndex: 2 }), '1H_Melee_Attack_Stab');
assert.equal(resolveEnemyClip('chase'), 'Running_A');
assert.equal(resolveEnemyClip('dead'), 'Death_A');
assert.equal(resolveBossClip({ dead: false, state: 'intro', hitFlash: 0, type: 'mini' }), 'Skeletons_Awaken_Standing');
assert.equal(resolveBossClip({ dead: false, state: 'attack', hitFlash: 0, type: 'final', currentPattern: 'fire' }), 'Spellcast_Shoot');
assert.equal(resolveBossClip({ dead: true, state: 'dead', hitFlash: 0, type: 'final' }), 'Death_C_Skeletons');

const rectPosition = new THREE.Vector3(99, 0, -99);
const rectVelocity = new THREE.Vector3(3, 0, -2);
resolveWorldCollision(rectPosition, rectVelocity, LEVEL_LAYOUTS[0], 0.5);
assert.equal(rectPosition.x, 15.5);
assert.equal(rectPosition.z, -29.5);
assert.equal(rectVelocity.x, 0);
assert.equal(rectVelocity.z, 0);

const obstaclePosition = new THREE.Vector3(-10, 0, 5);
resolveWorldCollision(obstaclePosition, new THREE.Vector3(), LEVEL_LAYOUTS[0], 0.5);
assert.ok(Math.abs(obstaclePosition.z - 5) >= 0.95, 'solid room walls push the player outside their footprint');

const circlePosition = new THREE.Vector3(20, 0, 0);
resolveWorldCollision(circlePosition, new THREE.Vector3(4, 0, 0), LEVEL_LAYOUTS[3], 0.5);
assert.equal(circlePosition.x, 14.5);

const footprints = LEVEL_LAYOUTS.map((layout) => layout.bounds.type === 'circle'
  ? `circle:${layout.bounds.radius}`
  : `rect:${layout.bounds.halfWidth}x${layout.bounds.halfDepth}`);
assert.ok(new Set(footprints).size >= 4, 'campaign uses materially different map footprints');

console.log('World upgrade tests passed: authored clips, large layouts, boundaries, and obstacle collision.');
