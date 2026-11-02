import * as THREE from 'three';

export const FIRE = Object.freeze({
  id: 'fire', key: 'Digit1', color: 0xff582d, cooldown: 4.8,
  damage: 32, burnDamage: 4, burnDuration: 3, radius: 2.25,
});

export class FireProjectile {
  constructor(origin, direction, effects) {
    this.position = origin.clone();
    this.direction = direction.clone().normalize();
    this.velocity = this.direction.clone().multiplyScalar(11.5);
    this.mesh = effects.createProjectile(FIRE.color, 0.2);
    this.mesh.position.copy(this.position);
    this.effects = effects;
    this.age = 0;
    this.lifetime = 0.78;
    this.done = false;
  }

  update(delta, targets) {
    if (this.done) return false;
    this.age += delta;
    this.position.addScaledVector(this.velocity, delta);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.x += delta * 7;
    this.mesh.rotation.y += delta * 9;
    this.effects.emitTrail('fire', this.position, this.age * 9);
    const directTarget = targets.find((target) => {
      if (target.dead) return false;
      const center = target.getHitCenter(new THREE.Vector3());
      return center.distanceToSquared(this.position) <= (target.hitRadius + 0.35) ** 2;
    });
    if (directTarget || this.age >= this.lifetime) {
      this.explode(targets);
      return false;
    }
    return true;
  }

  explode(targets) {
    this.done = true;
    this.effects.removeProjectile(this.mesh);
    this.effects.spawnBurst(this.position, FIRE.color, 28, 6.2);
    this.effects.spawnRing(this.position, FIRE.color, 0.35, 0.55);
    targets.forEach((target) => {
      if (target.dead) return;
      const center = target.getHitCenter(new THREE.Vector3());
      const distance = center.distanceTo(this.position);
      if (distance > FIRE.radius + target.hitRadius) return;
      const direction = center.sub(this.position).setY(0);
      if (direction.lengthSq() < 0.001) direction.copy(this.direction);
      direction.normalize();
      target.applyElementEffect({
        type: 'fire', damage: FIRE.damage, knockback: direction.multiplyScalar(4.8),
        burnDamage: FIRE.burnDamage, burnDuration: FIRE.burnDuration,
      });
    });
  }
}
