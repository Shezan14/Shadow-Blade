const STAGE_MESSAGES = Object.freeze({
  wave: ['THE ARENA STIRS', 'Defeat the corrupted sentinels'],
  mini_intro: ['A GREATER SHADOW APPROACHES', 'Abyss Vanguard'],
  mini: ['ABYSS VANGUARD', 'Break the guardian'],
  final_intro: ['THE ELEMENTS CONVERGE', 'The Overlord awakens'],
  final: ['ELEMENTAL OVERLORD', 'Restore the balance'],
  victory_pending: ['THE VEIL IS MENDING', 'Hold fast'],
  complete: ['BALANCE RESTORED', 'The arena is silent'],
});

export class UIAnimations {
  constructor(element) {
    this.element = element;
    this.title = element.querySelector('strong');
    this.subtitle = element.querySelector('span');
    this.lastStage = null;
    this.hideTimer = null;
  }

  announceStage(stage) {
    if (stage === this.lastStage || !STAGE_MESSAGES[stage]) return false;
    this.lastStage = stage;
    const [title, subtitle] = STAGE_MESSAGES[stage];
    this.title.textContent = title;
    this.subtitle.textContent = subtitle;
    this.element.classList.remove('is-visible');
    void this.element.offsetWidth;
    this.element.classList.add('is-visible');
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.element.classList.remove('is-visible'), 2600);
    return true;
  }
}
