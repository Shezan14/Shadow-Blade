const BOSS_LINES = Object.freeze([
  'Is that all the strength you have?',
  'You run, but the shadows always follow.',
  'Are you tired, little blade?',
  'Stand and face your end.',
  'Your fear is louder than your sword.',
  'Every step brings you closer to the abyss.',
  'Your little flames cannot warm this tomb.',
  'Kneel, and I may grant you silence.',
  'The veil remembers every fallen hero.',
]);
const ENEMY_LINES = Object.freeze([
  'Break their guard!',
  'The blade is ours!',
  'Do not let them pass!',
  'Corner the intruder!',
]);

export class BattleDialogue {
  constructor(root = document) {
    this.element = root.querySelector('#battle-dialogue');
    this.speaker = this.element.querySelector('strong');
    this.line = this.element.querySelector('p');
    this.lastBossLine = -1;
    this.nextBossAt = 18;
    this.nextEnemyAt = 8;
    this.hideTimer = null;
  }

  say(speaker, line) {
    this.speaker.textContent = speaker;
    this.line.textContent = line;
    this.element.hidden = false;
    this.element.classList.remove('is-visible');
    void this.element.offsetWidth;
    this.element.classList.add('is-visible');
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => { this.element.classList.remove('is-visible'); this.element.hidden = true; }, 4200);
  }

  update({ elapsed, boss, playerPosition, enemyHit }) {
    if ((boss.stage === 'mini' || boss.stage === 'final') && boss.active) {
      const distance = boss.position ? Math.hypot(playerPosition.x - boss.position.x, playerPosition.z - boss.position.z) : 0;
      if (elapsed >= this.nextBossAt || (distance > 8 && elapsed >= this.nextBossAt - 6)) {
        this.lastBossLine = (this.lastBossLine + 1) % BOSS_LINES.length;
        this.say(boss.name?.toUpperCase() || 'THE OVERLORD', BOSS_LINES[this.lastBossLine]);
        this.nextBossAt = elapsed + 17 + Math.random() * 9;
      }
    }
    if (enemyHit && elapsed >= this.nextEnemyAt && !boss.active) {
      this.say('CORRUPTED SENTINEL', ENEMY_LINES[Math.floor(Math.random() * ENEMY_LINES.length)]);
      this.nextEnemyAt = elapsed + 10 + Math.random() * 8;
    }
  }
}
