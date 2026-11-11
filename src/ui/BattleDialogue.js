const BOSS_LINES = Object.freeze([
  { line: 'I will kill you!', voice: 1 },
  { line: 'Hey!', voice: 0 },
]);
const ENEMY_LINES = Object.freeze([
  { line: 'Hey!', voice: 0 },
  { line: 'I will kill you!', voice: 1 },
]);

export class BattleDialogue {
  constructor(root = document, audio = null) {
    this.element = root.querySelector('#battle-dialogue');
    this.speaker = this.element.querySelector('strong');
    this.line = this.element.querySelector('p');
    this.lastBossLine = -1;
    this.nextBossAt = 18;
    this.nextEnemyAt = 8;
    this.hideTimer = null;
    this.audio = audio;
  }

  say(speaker, dialogue) {
    this.audio?.dialogue(dialogue.voice);
    this.speaker.textContent = speaker;
    this.line.textContent = dialogue.line;
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
