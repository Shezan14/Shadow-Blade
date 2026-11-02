import * as THREE from 'three';

export const LIGHTNING = Object.freeze({
  id: 'lightning', key: 'Digit3', color: 0xb48aff, cooldown: 4.2,
  damage: 25, range: 7.5, stunDuration: 1.15, maxTargets: 3,
});

export function castLightning(origin, forward, targets, effects) {
  const candidates = targets
    .filter((target) => !target.dead)
    .map((target) => ({ target, center: target.getHitCenter(new THREE.Vector3()) }))
    .map((entry) => ({ ...entry, offset: entry.center.clone().sub(origin).setY(0) }))
    .filter((entry) => entry.offset.length() <= LIGHTNING.range && entry.offset.clone().normalize().dot(forward) > 0.15)
    .sort((a, b) => a.offset.lengthSq() - b.offset.lengthSq())
    .slice(0, LIGHTNING.maxTargets);
  const points = [origin.clone().add(new THREE.Vector3(0, 0.8, 0))];
  candidates.forEach((entry, index) => {
    entry.target.applyElementEffect({
      type: 'lightning', damage: LIGHTNING.damage - index * 4,
      knockback: new THREE.Vector3(), stunDuration: LIGHTNING.stunDuration - index * 0.12,
    });
    points.push(entry.center);
  });
  if (points.length > 1) effects.spawnLightning(points, LIGHTNING.color);
  else effects.spawnBurst(points[0], LIGHTNING.color, 8, 2.2);
  return candidates.length;
}
