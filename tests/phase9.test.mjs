import assert from 'node:assert/strict';
import { GAME_STATES, GameStateManager, resolveGameplayState } from '../src/core/GameState.js';
import { Time } from '../src/core/Time.js';

const manager = new GameStateManager();
assert.equal(manager.state, GAME_STATES.MAIN_MENU);
assert.equal(manager.isGameplay, false);
assert.equal(manager.transition(GAME_STATES.BOSS_FIGHT), false, 'invalid transitions are rejected');
assert.equal(manager.transition(GAME_STATES.PLAYING), true);
assert.equal(manager.isGameplay, true);

const transitions = [];
manager.subscribe((next, previous) => transitions.push([previous, next]));
assert.equal(manager.transition(GAME_STATES.BOSS_FIGHT), true);
assert.equal(manager.pause(), true);
assert.equal(manager.state, GAME_STATES.PAUSED);
assert.equal(manager.resume(), true);
assert.equal(manager.state, GAME_STATES.BOSS_FIGHT, 'resume returns to the state that was paused');
assert.deepEqual(transitions, [
  [GAME_STATES.PLAYING, GAME_STATES.BOSS_FIGHT],
  [GAME_STATES.BOSS_FIGHT, GAME_STATES.PAUSED],
  [GAME_STATES.PAUSED, GAME_STATES.BOSS_FIGHT],
]);

assert.equal(resolveGameplayState({
  currentState: GAME_STATES.PLAYING,
  playerDead: false,
  complete: false,
  bossStage: 'mini_intro',
}), GAME_STATES.BOSS_FIGHT);
assert.equal(resolveGameplayState({
  currentState: GAME_STATES.BOSS_FIGHT,
  playerDead: false,
  complete: true,
  bossStage: 'complete',
}), GAME_STATES.VICTORY);
assert.equal(resolveGameplayState({
  currentState: GAME_STATES.BOSS_FIGHT,
  playerDead: true,
  complete: true,
  bossStage: 'complete',
}), GAME_STATES.GAME_OVER, 'defeat takes precedence if both terminal flags arrive together');

const time = new Time();
assert.equal(time.tick(1000), 0);
assert.equal(time.tick(1016), 0.016);
const elapsedBeforePause = time.elapsed;
assert.equal(time.tick(2016, true), 0, 'paused frames report zero simulation delta');
assert.equal(time.elapsed, elapsedBeforePause, 'paused frames do not advance simulation time');
assert.equal(time.tick(2032), 0.016, 'resuming does not include time spent paused');

console.log('Phase 9 game-state and pause timing tests passed.');
