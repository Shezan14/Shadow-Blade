import * as THREE from 'three';

export const ICE = Object.freeze({
  id: 'ice', key: 'Digit2', color: 0x54dcff, cooldown: 5.6,
  damage: 17, range: 5.2, slowFactor: 0.38, slowDuration: 4.2, freezeDuration: 1.05,
});

export function castIce(origin, forward, targets, effects) {
  effects.spawnShards(origin, forward, ICE.color);
  let hits = 0;
  targets.forEach((target) => {
    if (target.dead) return;
    const center = target.getHitCenter(new THREE.Vector3());
    const offset = center.sub(origin).setY(0);
    const distance = offset.length();
    if (distance > ICE.range + target.hitRadius || distance < 0.001) return;
    const facing = offset.normalize().dot(forward);
    if (facing < 0.48) return;
    target.applyElementEffect({
      type: 'ice', damage: ICE.damage, knockback: forward.clone().multiplyScalar(1.6),
      slowFactor: distance < 2.45 ? 0 : ICE.slowFactor,
      slowDuration: distance < 2.45 ? ICE.freezeDuration : ICE.slowDuration,
    });
    hits += 1;
  });
  return hits;
}
