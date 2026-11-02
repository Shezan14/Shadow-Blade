import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG } from '../src/core/Config.js';
import { PlayerController, resolveContextAction } from '../src/player/PlayerController.js';
import { PlayerAnimation } from '../src/player/PlayerAnimation.js';
import { createPlayer } from '../src/player/Player.js';

const fakeTarget = { addEventListener() {} };
const cameraRig = {
  getMovementAxes() {
    return {
      forward: new THREE.Vector3(0, 0, -1),
      right: new THREE.Vector3(1, 0, 0),
    };
  },
};

function createController() {
  const player = createPlayer();
  player.position.set(0, CONFIG.player.groundHeight, 0);
  const controller = new PlayerController(player, cameraRig, fakeTarget);
  controller.setEnabled(true);
  return { player, controller };
}

assert.equal(resolveContextAction(false, true), 'jump');
assert.equal(resolveContextAction(true, true), 'dodge');
assert.equal(resolveContextAction(true, false), 'none');

{
  const { player, controller } = createController();
  controller.setInput(CONFIG.controls.forward, true);
  for (let i = 0; i < 60; i += 1) controller.update(1 / 60);
  assert.equal(controller.state, 'walk');
  assert.ok(player.position.z < -2.5, 'W moves toward camera-forward');
  assert.equal(player.position.y, CONFIG.player.groundHeight);

  controller.setInput(CONFIG.controls.run, true);
  const snapshot = controller.update(1 / 30);
  assert.equal(snapshot.state, 'run');
}

{
  const { player, controller } = createController();
  player.rotation.y = 0;
  controller.setInput(CONFIG.controls.left, true);
  controller.update(1 / 60);
  assert.ok(player.rotation.y < -0.2, 'A turns the character toward camera-left immediately');
}

{
  const { player, controller } = createController();
  controller.queueAction();
  const takeoff = controller.update(1 / 60);
  assert.equal(takeoff.state, 'jump');
  assert.ok(player.position.y > CONFIG.player.groundHeight);
  for (let i = 0; i < 120; i += 1) controller.update(1 / 60);
  assert.equal(controller.grounded, true, 'gravity returns the player to the arena');
  assert.equal(player.position.y, CONFIG.player.groundHeight);
}

{
  const { player, controller } = createController();
  controller.setInput(CONFIG.controls.forward, true);
  controller.queueAction();
  const dodge = controller.update(1 / 60);
  assert.equal(dodge.state, 'dodge');
  assert.ok(player.position.z < 0, 'directional dodge applies forward velocity');
}

{
  const { player, controller } = createController();
  player.position.x = 9;
  controller.velocity.x = 4;
  controller.update(1 / 60);
  assert.ok(Math.hypot(player.position.x, player.position.z) <= CONFIG.player.arenaRadius + 1e-6);
}

{
  const player = createPlayer();
  const animation = new PlayerAnimation(player);
  const combat = { attacking: false, blocking: false, attackProgress: 0, comboIndex: 0 };
  animation.update({ state: 'run', speed: 6, dodgeProgress: 0, grounded: true }, combat, 1, 1 / 30);
  assert.notEqual(player.userData.parts.leftLeg.rotation.x, 0, 'run state animates the procedural rig');
  animation.update({ state: 'jump', speed: 0, dodgeProgress: 0, grounded: false }, combat, 1.1, 1 / 30);
  assert.ok(player.userData.parts.cape.rotation.x > 0, 'jump state lifts the cape');
}

console.log('Phase 3 tests passed: movement, run, jump, dodge, gravity, bounds, animation.');
