import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ParticleSystem } from '../src/particles/ParticleSystem.js';
import { emitFireBurst, emitFireTrail } from '../src/particles/FireParticles.js';
import { emitIceMist } from '../src/particles/IceParticles.js';
import { emitLightningSparks } from '../src/particles/LightningParticles.js';
import { emitWindSpiral, emitDust } from '../src/particles/WindParticles.js';
import { emitHitSparks, emitSmoke } from '../src/particles/CombatParticles.js';
import { ParticleDirector } from '../src/particles/ParticleDirector.js';
import { createPlayer } from '../src/player/Player.js';

const origin = new THREE.Vector3();

{
  const parent = new THREE.Group();
  const system = new ParticleSystem(parent, 4);
  for (let i = 0; i < 4; i += 1) {
    assert.notEqual(system.spawn({ position: origin, lifetime: 0.1 }), -1);
  }
  assert.equal(system.activeCount, 4);
  assert.equal(system.spawn({ position: origin }), -1, 'pool refuses particles beyond fixed capacity');
  system.update(0.11);
  assert.equal(system.activeCount, 0, 'expired particles return to the pool');
  assert.notEqual(system.spawn({ position: origin }), -1, 'released slots are reusable');
}

{
  const parent = new THREE.Group();
  const system = new ParticleSystem(parent, 300);
  emitFireBurst(system, origin, 12);
  emitFireTrail(system, origin, 1);
  emitIceMist(system, origin, new THREE.Vector3(0, 0, -1), 10);
  emitLightningSparks(system, origin, 9);
  emitWindSpiral(system, origin, 11);
  emitDust(system, origin, 2);
  emitHitSparks(system, origin, 0xffffff, 8);
  emitSmoke(system, origin, 4);
  assert.equal(system.activeCount, 56, 'all specialized emitters use the shared pool');
  system.update(2);
  assert.equal(system.activeCount, 0);
}

{
  const parent = new THREE.Group();
  const system = new ParticleSystem(parent, 120);
  const player = createPlayer();
  parent.add(player);
  parent.updateMatrixWorld(true);
  const director = new ParticleDirector(system, player);
  const movement = { grounded: true, speed: 6, state: 'run' };
  const combat = { attacking: true, comboIndex: 1 };
  director.update(0.1, 1, movement, combat);
  assert.ok(system.activeCount >= 5, 'director emits ambient motes, run dust, and sword trail samples');
  const countDuringAttack = system.activeCount;
  director.update(0.1, 1.1, { grounded: true, speed: 0, state: 'idle' }, { attacking: false, comboIndex: 0 });
  assert.ok(system.activeCount >= countDuringAttack, 'ambient arena particles continue outside combat');
}

console.log('Phase 7 tests passed: pooling, reuse, expiry, elemental emitters, combat sparks, dust, sword trails.');
