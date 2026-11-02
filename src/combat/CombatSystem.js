import * as THREE from 'three';
import { SphereHitbox, getForwardFromRotation } from './Hitbox.js';

export class CombatSystem {
  constructor(player, targets, effects, cameraRig, camera, playerCombat = null, playerController = null) {
    this.player = player;
    this.targets = targets;
    this.effects = effects;
    this.cameraRig = cameraRig;
    this.camera = camera;
    this.playerCombat = playerCombat;
    this.playerController = playerController;
    this.enabled = false;
    this.hitbox = new SphereHitbox(1.02);
    this.hitTargets = new Set();
    this.lastAttackSerial = 0;
    this.forward = new THREE.Vector3();
    this.center = new THREE.Vector3();
    this.knockback = new THREE.Vector3();
    this.impactPosition = new THREE.Vector3();
    this.totalHits = 0;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  update(combatSnapshot, delta, elapsed, movementSnapshot = {}) {
    this.effects.update(delta);
    this.targets.forEach((target) => {
      const attack = target.externallyManaged ? null : target.update(delta, elapsed, this.camera, {
        aiEnabled: this.enabled,
        playerPosition: this.player.position,
      });
      if (!attack || !this.enabled || movementSnapshot.state === 'dodge' || !this.playerCombat) return;
      const applied = this.playerCombat.receiveDamage(attack.damage);
      if (applied <= 0) return;
      this.knockback.copy(this.player.position).sub(attack.origin).setY(0);
      if (this.knockback.lengthSq() < 0.001) this.knockback.set(0, 0, 1);
      this.knockback.normalize();
      const blockScale = combatSnapshot.blocking ? 0.3 : 1;
      this.playerController?.applyKnockback(this.knockback, attack.knockback * blockScale);
      this.impactPosition.copy(this.player.position).add(new THREE.Vector3(0, 0.8, 0));
      this.effects.spawnImpact(this.impactPosition, attack.color);
      this.cameraRig.addShake(combatSnapshot.blocking ? 0.07 : 0.14, 0.24);
    });

    // Keep the hero and living enemies from occupying the same physical space.
    this.targets.forEach((target) => {
      if (!this.enabled || target.dead || !target.group?.visible) return;
      const dx = this.player.position.x - target.group.position.x;
      const dz = this.player.position.z - target.group.position.z;
      const distance = Math.hypot(dx, dz);
      const minimum = 0.48 + (target.hitRadius ?? 0.58);
      if (distance >= minimum) return;
      const nx = distance > 0.001 ? dx / distance : 1;
      const nz = distance > 0.001 ? dz / distance : 0;
      const push = (minimum - distance) * 0.5;
      this.player.position.x += nx * push;
      this.player.position.z += nz * push;
      target.group.position.x -= nx * push;
      target.group.position.z -= nz * push;
    });

    if (combatSnapshot.attackSerial !== this.lastAttackSerial) {
      this.lastAttackSerial = combatSnapshot.attackSerial;
      this.hitTargets.clear();
      this.effects.spawnSlash(this.player.position, this.player.rotation.y, combatSnapshot.comboIndex);
    }

    if (!combatSnapshot.hitActive) return 0;
    getForwardFromRotation(this.player.rotation.y, this.forward);
    this.center.copy(this.player.position).addScaledVector(this.forward, 1.2);
    this.center.y += 0.55;
    this.hitbox.set(this.center, 1.02 + combatSnapshot.comboIndex * 0.12);

    let frameHits = 0;
    this.targets.forEach((target) => {
      if (target.dead || this.hitTargets.has(target) || !this.hitbox.intersectsTarget(target)) return;
      this.hitTargets.add(target);
      target.getHitCenter(this.impactPosition);
      this.knockback.copy(this.impactPosition).sub(this.player.position).setY(0);
      if (this.knockback.lengthSq() < 0.001) this.knockback.copy(this.forward);
      this.knockback.normalize().multiplyScalar(combatSnapshot.knockback);
      const applied = target.applyHit(combatSnapshot.damage, this.knockback);
      if (applied > 0) {
        frameHits += 1;
        this.totalHits += 1;
        this.effects.spawnImpact(this.impactPosition);
        this.cameraRig.addShake(0.08 + combatSnapshot.comboIndex * 0.035, 0.16);
      }
    });
    return frameHits;
  }
}
