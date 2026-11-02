import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Damageable, calculateBlockedDamage } from '../src/combat/DamageSystem.js';
import { SphereHitbox, getForwardFromRotation } from '../src/combat/Hitbox.js';
import { PlayerCombat, ATTACKS } from '../src/player/PlayerCombat.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { CombatEffects } from '../src/combat/CombatEffects.js';
import { TrainingSentinel } from '../src/enemies/TrainingSentinel.js';

const fakeTarget = { addEventListener() {} };
const fakeDocument = { pointerLockElement: null };
const fakeCanvas = { addEventListener() {} };

{
  const health = new Damageable(100);
  assert.equal(health.damage(30), 30);
  assert.equal(health.health, 70);
  assert.equal(health.damage(90), 70);
  assert.equal(health.dead, true);
  health.reset();
  assert.equal(health.health, 100);
  assert.ok(Math.abs(calculateBlockedDamage(50, true) - 14) < 1e-9);
}

{
  const hitbox = new SphereHitbox(1).set(new THREE.Vector3(0, 1, 0));
  const target = {
    hitRadius: 0.5,
    getHitCenter(out) { return out.set(1.4, 1, 0); },
  };
  assert.equal(hitbox.intersectsTarget(target), true);
  target.getHitCenter = (out) => out.set(2, 1, 0);
  assert.equal(hitbox.intersectsTarget(target), false);
  assert.deepEqual(getForwardFromRotation(Math.PI).toArray().map((value) => Math.round(value)), [0, 0, -1]);
}

{
  const combat = new PlayerCombat(fakeCanvas, fakeTarget, fakeDocument);
  combat.setEnabled(true);
  assert.equal(combat.queueAttack(), true);
  assert.equal(combat.attacking, true);
  assert.equal(combat.stamina, 100 - ATTACKS[0].stamina);
  combat.update(0.12);
  combat.queueAttack();
  for (let i = 0; i < 30 && combat.comboIndex === 0; i += 1) combat.update(1 / 60);
  assert.equal(combat.comboIndex, 1, 'queued input advances the combo');
  combat.blocking = true;
  const applied = combat.receiveDamage(50);
  assert.ok(Math.abs(applied - 14) < 1e-9, 'blocking mitigates incoming damage');
}

{
  const scene = new THREE.Scene();
  const effects = new CombatEffects(scene);
  const player = new THREE.Object3D();
  player.position.set(0, 1.2, 2.2);
  player.rotation.y = Math.PI;
  const target = new TrainingSentinel(new THREE.Vector3(0, 0, 0.25));
  const cameraRig = { shakes: 0, addShake() { this.shakes += 1; } };
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 4, 7);
  const system = new CombatSystem(player, [target], effects, cameraRig, camera);
  const snapshot = {
    attackSerial: 1,
    comboIndex: 0,
    hitActive: true,
    damage: 22,
    knockback: 4,
  };
  assert.equal(system.update(snapshot, 1 / 60, 0), 1);
  assert.equal(target.damageable.health, 63);
  assert.ok(target.velocity.length() > 0, 'hit applies knockback');
  assert.equal(cameraRig.shakes, 1, 'hit triggers camera shake');
  assert.equal(system.update(snapshot, 1 / 60, 0.02), 0, 'one attack cannot hit the same target twice');
}

console.log('Phase 4 tests passed: damage, blocking, hitboxes, combo, knockback, effects, camera shake.');
