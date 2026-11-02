export class Damageable {
  constructor(maxHealth = 100) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.dead = false;
    this.lastDamage = 0;
  }

  damage(amount) {
    if (this.dead || amount <= 0) return 0;
    const applied = Math.min(this.health, amount);
    this.health -= applied;
    this.lastDamage = applied;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
    return applied;
  }

  heal(amount) {
    if (this.dead || amount <= 0) return 0;
    const previous = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health - previous;
  }

  reset() {
    this.health = this.maxHealth;
    this.dead = false;
    this.lastDamage = 0;
  }

  get ratio() {
    return this.health / this.maxHealth;
  }
}

export function calculateBlockedDamage(amount, blocking, blockEfficiency = 0.72) {
  return blocking ? amount * (1 - blockEfficiency) : amount;
}
