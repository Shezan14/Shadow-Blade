import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export const ENEMY_TYPES = Object.freeze({
  NORMAL: Object.freeze({
    id: 'normal', name: 'Ash Warden', color: 0xff6b42, scale: 1,
    maxHealth: 82, damage: 13, moveSpeed: 3.25, patrolSpeed: 1.05, retreatSpeed: 4.2,
    detectRange: 6.4, disengageRange: 10, attackRange: 1.35,
    attackWindup: 0.48, attackRecovery: 0.62, attackCooldown: 1.05,
    idleDuration: 0.8, detectDelay: 0.32, hitRecovery: 0.3,
    retreatThreshold: 0.28, retreatDuration: 0.65, knockbackResistance: 0.15,
  }),
  FAST: Object.freeze({
    id: 'fast', name: 'Void Stalker', color: 0x55ddff, scale: 0.84,
    maxHealth: 58, damage: 9, moveSpeed: 4.8, patrolSpeed: 1.55, retreatSpeed: 6.4,
    detectRange: 8.2, disengageRange: 12, attackRange: 1.18,
    attackWindup: 0.25, attackRecovery: 0.38, attackCooldown: 0.72,
    idleDuration: 0.45, detectDelay: 0.18, hitRecovery: 0.2,
    retreatThreshold: 0.42, retreatDuration: 0.9, knockbackResistance: 0,
  }),
  HEAVY: Object.freeze({
    id: 'heavy', name: 'Iron Revenant', color: 0xa67cff, scale: 1.32,
    maxHealth: 145, damage: 23, moveSpeed: 2.35, patrolSpeed: 0.72, retreatSpeed: 3.15,
    detectRange: 6.8, disengageRange: 9, attackRange: 1.62,
    attackWindup: 0.72, attackRecovery: 0.88, attackCooldown: 1.45,
    idleDuration: 1.05, detectDelay: 0.5, hitRecovery: 0.42,
    retreatThreshold: 0.18, retreatDuration: 0.52, knockbackResistance: 0.58,
  }),
});

export function createEnemyWave() {
  return [
    new Enemy(ENEMY_TYPES.NORMAL, new THREE.Vector3(-2.5, 0, -2.4)),
    new Enemy(ENEMY_TYPES.FAST, new THREE.Vector3(3.5, 0, -1.8)),
    new Enemy(ENEMY_TYPES.HEAVY, new THREE.Vector3(0.3, 0, -4.6)),
  ];
}
