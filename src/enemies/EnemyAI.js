import * as THREE from 'three';

export const ENEMY_STATES = Object.freeze({
  IDLE: 'idle',
  PATROL: 'patrol',
  DETECT: 'detect',
  CHASE: 'chase',
  ATTACK: 'attack',
  HIT: 'hit',
  RETREAT: 'retreat',
  DEAD: 'dead',
});

const ZERO = new THREE.Vector3();

export class EnemyAI {
  constructor(stats, spawnPosition) {
    this.stats = stats;
    this.spawnPosition = spawnPosition.clone();
    this.state = ENEMY_STATES.IDLE;
    this.stateTime = 0;
    this.attackCooldown = 0;
    this.attackTriggered = false;
    this.retreatUsed = false;
    this.patrolIndex = 0;
    this.direction = new THREE.Vector3();
    this.toPlayer = new THREE.Vector3();
    this.patrolTarget = new THREE.Vector3();
    this.setPatrolTarget();
  }

  setState(state) {
    if (this.state === state) return;
    this.state = state;
    this.stateTime = 0;
    this.attackTriggered = false;
  }

  setPatrolTarget() {
    const angle = this.patrolIndex * 2.1 + this.spawnPosition.x * 0.37;
    const radius = 1.1 + (this.patrolIndex % 2) * 0.55;
    this.patrolTarget.copy(this.spawnPosition);
    this.patrolTarget.x += Math.cos(angle) * radius;
    this.patrolTarget.z += Math.sin(angle) * radius;
    this.patrolIndex += 1;
  }

  onHit(dead) {
    this.setState(dead ? ENEMY_STATES.DEAD : ENEMY_STATES.HIT);
  }

  reset() {
    this.state = ENEMY_STATES.IDLE;
    this.stateTime = 0;
    this.attackCooldown = 0;
    this.attackTriggered = false;
    this.retreatUsed = false;
    this.patrolIndex = 0;
    this.setPatrolTarget();
  }

  update(delta, position, playerPosition, healthRatio, enabled = true) {
    this.stateTime += delta;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.direction.set(0, 0, 0);
    let attack = false;

    if (this.state === ENEMY_STATES.DEAD) return { state: this.state, direction: ZERO, speed: 0, attack };
    if (this.state === ENEMY_STATES.HIT) {
      if (this.stateTime >= this.stats.hitRecovery) this.setState(ENEMY_STATES.CHASE);
      return { state: this.state, direction: ZERO, speed: 0, attack };
    }
    if (!enabled) return { state: this.state, direction: ZERO, speed: 0, attack };

    this.toPlayer.copy(playerPosition).sub(position).setY(0);
    const distance = this.toPlayer.length();

    switch (this.state) {
      case ENEMY_STATES.IDLE:
        if (distance <= this.stats.detectRange) this.setState(ENEMY_STATES.DETECT);
        else if (this.stateTime >= this.stats.idleDuration) this.setState(ENEMY_STATES.PATROL);
        break;
      case ENEMY_STATES.PATROL:
        if (distance <= this.stats.detectRange) {
          this.setState(ENEMY_STATES.DETECT);
        } else {
          this.direction.copy(this.patrolTarget).sub(position).setY(0);
          if (this.direction.lengthSq() < 0.18) this.setPatrolTarget();
          else this.direction.normalize();
        }
        break;
      case ENEMY_STATES.DETECT:
        if (this.stateTime >= this.stats.detectDelay) this.setState(ENEMY_STATES.CHASE);
        break;
      case ENEMY_STATES.CHASE:
        if (!this.retreatUsed && healthRatio <= this.stats.retreatThreshold) {
          this.retreatUsed = true;
          this.setState(ENEMY_STATES.RETREAT);
        } else if (distance <= this.stats.attackRange && this.attackCooldown <= 0) {
          this.setState(ENEMY_STATES.ATTACK);
        } else if (distance > this.stats.disengageRange) {
          this.setState(ENEMY_STATES.PATROL);
        } else if (distance > 0.001) {
          this.direction.copy(this.toPlayer).normalize();
        }
        break;
      case ENEMY_STATES.ATTACK:
        if (!this.attackTriggered && this.stateTime >= this.stats.attackWindup) {
          this.attackTriggered = true;
          attack = distance <= this.stats.attackRange + 0.45;
        }
        if (this.stateTime >= this.stats.attackWindup + this.stats.attackRecovery) {
          this.attackCooldown = this.stats.attackCooldown;
          this.setState(ENEMY_STATES.CHASE);
        }
        break;
      case ENEMY_STATES.RETREAT:
        if (distance > 0.001) this.direction.copy(this.toPlayer).normalize().multiplyScalar(-1);
        if (this.stateTime >= this.stats.retreatDuration) this.setState(ENEMY_STATES.CHASE);
        break;
      default:
        break;
    }

    const speed = this.state === ENEMY_STATES.PATROL
      ? this.stats.patrolSpeed
      : this.state === ENEMY_STATES.RETREAT
        ? this.stats.retreatSpeed
        : this.state === ENEMY_STATES.CHASE
          ? this.stats.moveSpeed
          : 0;
    return { state: this.state, direction: this.direction, speed, attack };
  }
}
