import * as THREE from 'three';

export const WIND = Object.freeze({
  id: 'wind', key: 'Digit4', color: 0x4df0c5, cooldown: 4.5,
  damage: 12, range: 4.6, width: 1.9, knockback: 11,
});

export function castWind(origin, forward, targets, effects, playerController) {
  playerController.applyKnockback(forward, 8.5);
  effects.spawnRing(origin, WIND.color, 0.45, 0.48);
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  let hits = 0;
  targets.forEach((target) => {
    if (target.dead) return;
    const center = target.getHitCenter(new THREE.Vector3());
    const offset = center.sub(origin).setY(0);
    const forwardDistance = offset.dot(forward);
    const sideDistance = Math.abs(offset.dot(side));
    if (forwardDistance < 0 || forwardDistance > WIND.range || sideDistance > WIND.width + target.hitRadius) return;
    target.applyElementEffect({
      type: 'wind', damage: WIND.damage,
      knockback: forward.clone().multiplyScalar(WIND.knockback),
    });
    hits += 1;
  });
  return hits;
}
