import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { CONFIG } from '../src/core/Config.js';
import { GAME_STATES, GameStateManager } from '../src/core/GameState.js';
import { Time } from '../src/core/Time.js';
import { SphereHitbox, getForwardFromRotation } from '../src/combat/Hitbox.js';
import { applyGravity, constrainToArena } from '../src/physics/Physics.js';

const hitbox = new SphereHitbox(1).set(new THREE.Vector3(0, 0, 0));
const target = {
  hitRadius: 0.5,
  center: new THREE.Vector3(1.5, 0, 0),
  getHitCenter(output) { return output.copy(this.center); },
};
assert.equal(hitbox.intersectsTarget(target), true, 'touching sphere boundaries count as a hit');
target.center.x = 1.501;
assert.equal(hitbox.intersectsTarget(target), false, 'separated sphere boundaries do not collide');

const forward = getForwardFromRotation(Math.PI / 2);
assert.ok(Math.abs(forward.x - 1) < 1e-8 && Math.abs(forward.z) < 1e-8);

const position = new THREE.Vector3(10, 1.2, 0);
const velocity = new THREE.Vector3(4, 0, 2);
assert.equal(constrainToArena(position, velocity, CONFIG.player.arenaRadius), true);
assert.ok(Math.abs(position.x - CONFIG.player.arenaRadius) < 1e-8, 'arena collision clamps position');
assert.ok(velocity.x <= 0, 'arena collision removes outward velocity');

const fallingPosition = new THREE.Vector3(0, 1.21, 0);
const fallingVelocity = new THREE.Vector3(0, -2, 0);
assert.equal(applyGravity(fallingPosition, fallingVelocity, 1 / 30, CONFIG.player.groundHeight), true);
assert.equal(fallingPosition.y, CONFIG.player.groundHeight);
assert.equal(fallingVelocity.y, 0);

const state = new GameStateManager();
assert.equal(state.transition(GAME_STATES.PLAYING), true);
assert.equal(state.transition(GAME_STATES.BOSS_FIGHT), true);
assert.equal(state.pause(), true);
assert.equal(state.resume(), true);
assert.equal(state.state, GAME_STATES.BOSS_FIGHT);
assert.equal(state.transition(GAME_STATES.VICTORY), true);
assert.equal(state.transition(GAME_STATES.MAIN_MENU), true);

const defeated = new GameStateManager(GAME_STATES.PLAYING);
assert.equal(defeated.transition(GAME_STATES.GAME_OVER), true);
assert.equal(defeated.transition(GAME_STATES.PLAYING), false, 'terminal states require a menu reset');

const time = new Time();
time.tick(0);
assert.equal(time.tick(1000), 1 / 30, 'long frames are clamped for stable physics');

const docs = ['architecture', 'graphics', 'animation', 'collision', 'physics', 'particles', 'gameplay'];
for (const name of docs) {
  const path = new URL(`../docs/${name}.md`, import.meta.url);
  await access(path);
  const contents = await readFile(path, 'utf8');
  assert.ok(contents.length > 500, `${name}.md contains useful viva documentation`);
}

console.log('Phase 11 release tests passed: collision, physics, state flow, timing, and documentation.');
