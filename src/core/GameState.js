export const GAME_STATES = Object.freeze({
  MAIN_MENU: 'MAIN_MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  BOSS_FIGHT: 'BOSS_FIGHT',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY',
});

const TRANSITIONS = Object.freeze({
  [GAME_STATES.MAIN_MENU]: [GAME_STATES.PLAYING],
  [GAME_STATES.PLAYING]: [GAME_STATES.PAUSED, GAME_STATES.BOSS_FIGHT, GAME_STATES.GAME_OVER, GAME_STATES.VICTORY],
  [GAME_STATES.PAUSED]: [GAME_STATES.PLAYING, GAME_STATES.BOSS_FIGHT, GAME_STATES.MAIN_MENU],
  [GAME_STATES.BOSS_FIGHT]: [GAME_STATES.PAUSED, GAME_STATES.PLAYING, GAME_STATES.GAME_OVER, GAME_STATES.VICTORY],
  [GAME_STATES.GAME_OVER]: [GAME_STATES.MAIN_MENU],
  [GAME_STATES.VICTORY]: [GAME_STATES.MAIN_MENU],
});

const BOSS_STAGES = new Set(['mini_intro', 'mini', 'final_intro', 'final', 'victory_pending']);

export function resolveGameplayState({ currentState, playerDead, complete, bossStage }) {
  if (playerDead) return GAME_STATES.GAME_OVER;
  if (complete) return GAME_STATES.VICTORY;
  if (currentState === GAME_STATES.PLAYING && BOSS_STAGES.has(bossStage)) {
    return GAME_STATES.BOSS_FIGHT;
  }
  return currentState;
}

export class GameStateManager {
  constructor(initialState = GAME_STATES.MAIN_MENU) {
    this.state = initialState;
    this.resumeState = GAME_STATES.PLAYING;
    this.listeners = new Set();
  }

  get isGameplay() {
    return this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.BOSS_FIGHT;
  }

  canTransition(nextState) {
    return TRANSITIONS[this.state]?.includes(nextState) ?? false;
  }

  transition(nextState, force = false) {
    if (nextState === this.state) return false;
    if (!force && !this.canTransition(nextState)) return false;
    const previous = this.state;
    if (nextState === GAME_STATES.PAUSED && this.isGameplay) this.resumeState = this.state;
    this.state = nextState;
    this.listeners.forEach((listener) => listener(nextState, previous));
    return true;
  }

  pause() {
    return this.isGameplay ? this.transition(GAME_STATES.PAUSED) : false;
  }

  resume() {
    if (this.state !== GAME_STATES.PAUSED) return false;
    return this.transition(this.resumeState);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
