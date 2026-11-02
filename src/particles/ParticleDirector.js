import * as THREE from 'three';
import { SwordTrail } from './SwordTrail.js';
import { emitDust } from './WindParticles.js';

const ALTARS = [
  { angle: -Math.PI * 0.75, color: 0xff582d },
  { angle: -Math.PI * 0.25, color: 0x54dcff },
  { angle: Math.PI * 0.25, color: 0x4df0c5 },
  { angle: Math.PI * 0.75, color: 0xb48aff },
];

export class ParticleDirector {
  constructor(particleSystem, player) {
    this.system = particleSystem;
    this.player = player;
    this.swordTrail = new SwordTrail(particleSystem, player.userData.parts.sword);
    this.ambientTimer = 0;
    this.dustTimer = 0;
    this.seed = 0;
    this.tempPosition = new THREE.Vector3();
  }

  update(delta, elapsed, movementSnapshot, combatSnapshot) {
    if (this.player.userData.weapon) this.swordTrail.sword = this.player.userData.weapon;
    this.swordTrail.update(delta, combatSnapshot);
    this.ambientTimer += delta;
    if (this.ambientTimer >= 0.08) {
      this.ambientTimer = 0;
      const index = this.seed % ALTARS.length;
      const altar = ALTARS[index];
      const angle = altar.angle + Math.sin(elapsed * 0.7 + index) * 0.06;
      this.tempPosition.set(Math.cos(angle) * 6.7, 1.35 + (this.seed % 5) * 0.18, Math.sin(angle) * 6.7);
      this.system.spawn({
        position: this.tempPosition,
        velocity: new THREE.Vector3(Math.sin(elapsed + index) * 0.12, 0.32, Math.cos(elapsed * 0.8 + index) * 0.12),
        color: altar.color,
        lifetime: 1.4,
        size: 0.07,
        endSize: 0.015,
        drag: 0.45,
        rotation: elapsed,
        rotationSpeed: 2,
        shape: 1,
      });
      this.seed += 1;
    }

    if (movementSnapshot.grounded && movementSnapshot.speed > 1.2) {
      this.dustTimer += delta;
      if (this.dustTimer >= (movementSnapshot.state === 'run' ? 0.055 : 0.1)) {
        this.dustTimer = 0;
        emitDust(this.system, this.player.position, this.seed++);
      }
    } else {
      this.dustTimer = 0;
    }
  }
}
