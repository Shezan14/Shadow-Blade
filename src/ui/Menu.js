import { GAME_STATES } from '../core/GameState.js';

export class MenuController {
  constructor(root = document) {
    this.startScreen = root.querySelector('#start-screen');
    this.pauseScreen = root.querySelector('#pause-screen');
    this.gameOverScreen = root.querySelector('#game-over-screen');
    this.victoryScreen = root.querySelector('#victory-screen');
    this.startButton = root.querySelector('#start-button');
    this.resumeButton = root.querySelector('#resume-button');
    this.restartButtons = [...root.querySelectorAll('[data-action="restart"]')];
    this.menuButtons = [...root.querySelectorAll('[data-action="menu"]')];
  }

  bind({ start, resume, restart, menu }) {
    this.startButton.addEventListener('click', start);
    this.resumeButton.addEventListener('click', resume);
    this.restartButtons.forEach((button) => button.addEventListener('click', restart));
    this.menuButtons.forEach((button) => button.addEventListener('click', menu));
  }

  showState(state) {
    this.startScreen.hidden = state !== GAME_STATES.MAIN_MENU;
    this.pauseScreen.classList.toggle('is-visible', state === GAME_STATES.PAUSED);
    this.gameOverScreen.classList.toggle('is-visible', state === GAME_STATES.GAME_OVER);
    this.victoryScreen.classList.toggle('is-visible', state === GAME_STATES.VICTORY);
  }
}
