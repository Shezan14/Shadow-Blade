import * as THREE from 'three';
import { CONFIG } from './core/Config.js';
import { Time } from './core/Time.js';
import { GAME_STATES, GameStateManager, resolveGameplayState } from './core/GameState.js';
import { BossSystem } from './core/BossSystem.js';
import { PerformanceMonitor } from './core/PerformanceMonitor.js';
import { CampaignSystem } from './core/CampaignSystem.js';
import { createRenderer, supportsWebGL2 } from './graphics/Renderer.js';
import { addLighting } from './graphics/Lighting.js';
import { createPhaseTwoScene } from './scene/PhaseTwoScene.js';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera.js';
import { PlayerController } from './player/PlayerController.js';
import { PlayerAnimation } from './player/PlayerAnimation.js';
import { PlayerCombat } from './player/PlayerCombat.js';
import { CombatSystem } from './combat/CombatSystem.js';
import { ElementSystem } from './elements/ElementSystem.js';
import { ParticleDirector } from './particles/ParticleDirector.js';
import { HUD } from './ui/HUD.js';
import { MenuController } from './ui/Menu.js';
import { UIAnimations } from './ui/UIAnimations.js';
import { DebugPanel } from './ui/DebugPanel.js';
import { AudioManager } from './audio/AudioManager.js';
import { CampaignUI } from './ui/CampaignUI.js';
import { BattleDialogue } from './ui/BattleDialogue.js';

const canvas = document.querySelector('#game-canvas');
const errorPanel = document.querySelector('#webgl-error');
const renderStatus = document.querySelector('#render-status');
const mouseStatus = document.querySelector('#mouse-status');
const audioToggle = document.querySelector('#audio-toggle');
const settingsToggle = document.querySelector('#settings-toggle');
const settingsPanel = document.querySelector('#settings-panel');
const sensitivityControl = document.querySelector('#sensitivity-control');
const sensitivityValue = document.querySelector('#sensitivity-value');
const walkSpeedControl = document.querySelector('#walk-speed-control');
const walkSpeedValue = document.querySelector('#walk-speed-value');
const runSpeedControl = document.querySelector('#run-speed-control');
const runSpeedValue = document.querySelector('#run-speed-value');
const playerNameInput = document.querySelector('#player-name');
const guestButton = document.querySelector('#guest-button');

if (!supportsWebGL2(canvas)) {
  errorPanel.hidden = false;
  renderStatus.textContent = 'Renderer unavailable';
  throw new Error('WebGL 2 is not available in this browser.');
}

const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.renderer.clearColor);
const camera = new THREE.PerspectiveCamera(
  CONFIG.camera.fov,
  window.innerWidth / window.innerHeight,
  CONFIG.camera.near,
  CONFIG.camera.far,
);
camera.position.set(...CONFIG.camera.position);
camera.lookAt(0, 0.3, 0);
scene.add(camera);

const lighting = addLighting(scene);
const world = createPhaseTwoScene(scene);
const time = new Time();
const gameState = new GameStateManager();
const cameraRig = new ThirdPersonCamera(camera, canvas);
cameraRig.setCollisionProvider(() => world.campaignMaps.getCameraBlockers());
const firstPersonView = new THREE.Group();
firstPersonView.name = 'First Person Arms and Blade';
const firstPersonRightHand = new THREE.Group();
const firstPersonLeftHand = new THREE.Group();
const arm = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.11, 0.62, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x28344d, roughness: 0.55, metalness: 0.35 }),
);
arm.position.set(0.38, -0.42, -0.72);
arm.rotation.z = -0.7;
const firstPersonSword = world.player.userData.parts.sword.clone(true);
firstPersonSword.position.set(0.62, -0.54, -1.05);
firstPersonSword.rotation.set(-0.42, 0.18, -0.32);
firstPersonSword.scale.setScalar(0.78);
firstPersonSword.traverse((child) => {
  if (!child.isMesh) return;
  child.material = child.material.clone();
  child.material.depthTest = false;
  child.material.depthWrite = false;
  if (child.material.emissive) {
    child.material.emissive.setHex(0x1a2a45);
    child.material.emissiveIntensity = 0.55;
  }
  child.frustumCulled = false;
  child.renderOrder = 100;
});
firstPersonRightHand.add(arm, firstPersonSword);
const leftArm = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.11, 0.58, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x28344d, roughness: 0.55, metalness: 0.35 }),
);
leftArm.position.set(-0.36, -0.47, -0.68);
leftArm.rotation.z = 0.72;
const shield = new THREE.Mesh(
  new THREE.CylinderGeometry(0.26, 0.26, 0.07, 8),
  new THREE.MeshStandardMaterial({ color: 0x556581, emissive: 0x101a2b, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.7 }),
);
shield.position.set(-0.62, -0.54, -0.86);
shield.rotation.set(Math.PI / 2, 0, 0.32);
shield.material.depthTest = false;
shield.material.depthWrite = false;
shield.renderOrder = 100;
firstPersonLeftHand.add(leftArm, shield);
firstPersonView.add(firstPersonRightHand, firstPersonLeftHand);
firstPersonView.visible = false;
camera.add(firstPersonView);
const playerController = new PlayerController(world.player, cameraRig);
playerController.setWorldCollider((position, velocity) => world.campaignMaps.resolve(position, velocity));
const playerAnimation = new PlayerAnimation(world.player);
const playerCombat = new PlayerCombat(canvas);
const combatSystem = new CombatSystem(
  world.player,
  world.combatTargets,
  world.combatEffects,
  cameraRig,
  camera,
  playerCombat,
  playerController,
);
const elementSystem = new ElementSystem({
  parent: world.world,
  particleSystem: world.particleSystem,
  player: world.player,
  targets: world.combatTargets,
  playerController,
  playerCombat,
  cameraRig,
  canvas,
});
const particleDirector = new ParticleDirector(world.particleSystem, world.player);
const bossSystem = new BossSystem({
  enemies: world.enemies,
  targets: world.combatTargets,
  miniBoss: world.bosses.miniBoss,
  finalBoss: world.bosses.finalBoss,
  player: world.player,
  playerCombat,
  playerController,
  cameraRig,
  effects: elementSystem.effects,
});
const campaign = new CampaignSystem({
  enemies: world.enemies,
  bosses: world.bosses,
  bossSystem,
  maps: world.campaignMaps,
  elementSystem,
  player: world.player,
  playerCombat,
  playerController,
});
const profileLabel = (() => {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512; labelCanvas.height = 96;
  const context = labelCanvas.getContext('2d');
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.set(0, 1.92, 0); sprite.scale.set(1.45, 0.27, 1); sprite.visible = false;
  world.player.add(sprite);
  return { sprite, context, texture };
})();
function setPlayerProfile(username, guest) {
  const clean = String(username ?? '').trim().slice(0, 16);
  campaign.setProfile({ username: clean, guest });
  profileLabel.sprite.visible = Boolean(clean);
  if (!clean) return;
  const { context, texture } = profileLabel;
  context.clearRect(0, 0, 512, 96);
  context.font = '600 44px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillStyle = '#dffcff'; context.shadowColor = '#000'; context.shadowBlur = 8;
  context.fillText(clean, 256, 48); texture.needsUpdate = true;
}
const hud = new HUD();
const menus = new MenuController();
const uiAnimations = new UIAnimations(document.querySelector('#encounter-banner'));
const campaignUI = new CampaignUI();
const audio = new AudioManager();
const battleDialogue = new BattleDialogue(document, audio);

const collisionHelpers = [world.player, ...world.enemies.map((enemy) => enemy.group), world.bosses.miniBoss.group, world.bosses.finalBoss.group]
  .map((object) => {
    const helper = new THREE.BoxHelper(object, 0x4fffe1);
    helper.visible = false;
    helper.material.depthTest = false;
    helper.renderOrder = 20;
    scene.add(helper);
    return helper;
  });
const debugPanel = new DebugPanel(document.querySelector('#debug-panel'), {
  onCollisionToggle: (visible) => collisionHelpers.forEach((helper) => { helper.visible = visible; }),
});
const performanceMonitor = new PerformanceMonitor({
  onQualityChange: (scale) => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.renderer.maxPixelRatio) * scale);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  },
});

let movementSnapshot = playerController.getSnapshot();
let combatSnapshot = playerCombat.update(0);
let elementSnapshot = elementSystem.getSnapshot();
let bossSnapshot = bossSystem.getSnapshot();
let campaignSnapshot = campaign.getSnapshot();
let previousAttackSerial = combatSnapshot.attackSerial;
let previousCastFlash = elementSnapshot.castFlash;
let previousHealth = combatSnapshot.health;
let previousMovementState = movementSnapshot.state;
let previousBossStage = bossSnapshot.stage;

function setGameplayEnabled(enabled) {
  cameraRig.setEnabled(enabled);
  playerController.setEnabled(enabled);
  playerCombat.setEnabled(enabled);
  combatSystem.setEnabled(enabled);
  elementSystem.setEnabled(enabled);
  bossSystem.setEnabled(enabled && campaign.phase === 'boss');
}

function applyState(nextState) {
  const gameplay = nextState === GAME_STATES.PLAYING || nextState === GAME_STATES.BOSS_FIGHT;
  document.body.dataset.gameState = nextState.toLowerCase();
  document.body.classList.toggle('game-active', nextState !== GAME_STATES.MAIN_MENU);
  setGameplayEnabled(gameplay && !campaign.blocked);
  menus.showState(nextState);
  audio.setState(nextState);
  mouseStatus.classList.remove('is-visible');
  if (!gameplay) {
    playerController.clearInput();
    playerCombat.clearInput();
    document.exitPointerLock?.();
  }
}

function enterArena(continueRun = false, guest = false) {
  void audio.unlock();
  if (!continueRun) {
    const name = playerNameInput.value.trim();
    if (!guest && !name) { playerNameInput.focus(); return; }
    setPlayerProfile(guest ? 'Guest' : name, guest);
    audio.menu();
  }
  if (!gameState.transition(GAME_STATES.PLAYING)) return;
  if (continueRun) campaign.continueFromCheckpoint();
  else campaign.startNew();
  campaignSnapshot = campaign.getSnapshot();
}

function resumeGame() {
  if (gameState.resume()) cameraRig.requestPointerLock();
}

function reloadGame() {
  window.location.assign(window.location.pathname);
}

menus.bind({ start: () => enterArena(false, false), resume: resumeGame, restart: reloadGame, menu: reloadGame });
guestButton.addEventListener('click', () => enterArena(false, true));
document.querySelector('#continue-button').addEventListener('click', () => enterArena(true));
campaignUI.setContinueAvailable(campaign.hasCheckpoint);
campaignUI.bindAction(() => {
  if (campaign.phase === 'story') {
    campaign.beginLevel();
  } else if (campaign.phase === 'level_complete') {
    campaign.advanceLevel();
  }
});
campaign.subscribe((type, snapshot) => {
  campaignSnapshot = snapshot;
  campaignUI.update(snapshot, true);
  campaignUI.setContinueAvailable(snapshot.hasCheckpoint);
  if (type === 'story') {
    if (gameState.state === GAME_STATES.BOSS_FIGHT) gameState.transition(GAME_STATES.PLAYING);
    setGameplayEnabled(false);
    playerController.clearInput();
    playerCombat.clearInput();
    document.exitPointerLock?.();
    campaignUI.showStory(snapshot, false);
  } else if (type === 'level_complete') {
    setGameplayEnabled(false);
    playerController.clearInput();
    playerCombat.clearInput();
    document.exitPointerLock?.();
    campaignUI.showStory(snapshot, true);
  } else if (type === 'combat') {
    campaignUI.hideStory();
    setGameplayEnabled(true);
    cameraRig.requestPointerLock();
  } else if (type === 'complete') {
    campaignUI.hideStory();
    gameState.transition(GAME_STATES.VICTORY);
  }
});
gameState.subscribe((nextState) => applyState(nextState));
applyState(gameState.state);

canvas.addEventListener('click', () => {
  if (gameState.isGameplay && document.pointerLockElement !== canvas) cameraRig.requestPointerLock();
});

document.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.code === 'Escape') {
    if (gameState.isGameplay && !campaign.blocked) gameState.pause();
    else if (gameState.state === GAME_STATES.PAUSED) resumeGame();
  } else if (event.code === CONFIG.controls.mute) {
    updateAudioButton(audio.toggleMuted());
  } else if (event.code === CONFIG.controls.viewToggle && gameState.isGameplay) {
    setViewMode(cameraRig.mode === 'third-person' ? 'first-person' : 'third-person');
  }
});

function updateAudioButton(muted) {
  audioToggle.textContent = muted ? 'Audio off' : 'Audio on';
  audioToggle.classList.toggle('is-muted', muted);
  audioToggle.setAttribute('aria-pressed', String(muted));
}

function setViewMode(mode) {
  const firstPerson = mode === 'first-person';
  cameraRig.setMode(mode);
  world.player.userData.firstPerson = firstPerson;
  const rig = playerAnimation.rigged.rig;
  world.player.userData.parts.visual.visible = !firstPerson && rig.failed;
  if (rig.model) rig.model.visible = !firstPerson;
  firstPersonView.visible = firstPerson;
  document.body.dataset.cameraMode = mode;
}

function setSensitivity(value) {
  const sensitivity = cameraRig.setSensitivity(value);
  sensitivityControl.value = String(sensitivity);
  sensitivityValue.textContent = `${Math.round(sensitivity * 100)}%`;
  try { localStorage.setItem('shadowBladeMouseSensitivity', String(sensitivity)); } catch { /* optional preference */ }
}

function updateFirstPersonView(combat, elements, elapsed) {
  if (!firstPersonView.visible) return;
  const bob = Math.sin(elapsed * 7) * 0.018;
  firstPersonRightHand.position.set(0, bob, 0);
  firstPersonLeftHand.position.set(0, bob * 0.7, 0);
  firstPersonRightHand.rotation.set(0, 0, 0);
  firstPersonLeftHand.rotation.set(0, 0, 0);
  if (combat.attacking) {
    const p = combat.attackProgress;
    const swing = Math.sin(p * Math.PI);
    firstPersonRightHand.rotation.x = -0.55 + swing * 1.35;
    firstPersonRightHand.rotation.y = -0.35 + swing * 0.72;
    firstPersonRightHand.rotation.z = -0.18 - swing * 0.62;
    firstPersonLeftHand.rotation.z = 0.12 + swing * 0.16;
  } else if (elements.casting) {
    const pulse = Math.sin((1 - elements.castFlash / 0.22) * Math.PI);
    firstPersonRightHand.rotation.x = -0.22 - pulse * 0.34;
    firstPersonLeftHand.rotation.x = -0.12 - pulse * 0.2;
  }
}

function setMovementSettings(walkSpeed, runSpeed) {
  const speeds = playerController.setSpeedSettings({ walkSpeed, runSpeed });
  walkSpeedControl.value = String(speeds.walkSpeed);
  runSpeedControl.value = String(speeds.runSpeed);
  walkSpeedValue.textContent = speeds.walkSpeed.toFixed(1);
  runSpeedValue.textContent = speeds.runSpeed.toFixed(1);
  try {
    localStorage.setItem('shadowBladeWalkSpeed', String(speeds.walkSpeed));
    localStorage.setItem('shadowBladeRunSpeed', String(speeds.runSpeed));
  } catch { /* optional preference */ }
}

try { setSensitivity(localStorage.getItem('shadowBladeMouseSensitivity') ?? 1); } catch { setSensitivity(1); }
try {
  setMovementSettings(
    localStorage.getItem('shadowBladeWalkSpeed') ?? CONFIG.player.walkSpeed,
    localStorage.getItem('shadowBladeRunSpeed') ?? CONFIG.player.runSpeed,
  );
} catch { setMovementSettings(CONFIG.player.walkSpeed, CONFIG.player.runSpeed); }
settingsToggle.addEventListener('click', () => {
  settingsPanel.hidden = !settingsPanel.hidden;
  settingsToggle.setAttribute('aria-expanded', String(!settingsPanel.hidden));
});
sensitivityControl.addEventListener('input', () => setSensitivity(sensitivityControl.value));
walkSpeedControl.addEventListener('input', () => setMovementSettings(walkSpeedControl.value, runSpeedControl.value));
runSpeedControl.addEventListener('input', () => setMovementSettings(walkSpeedControl.value, runSpeedControl.value));

audioToggle.addEventListener('click', async () => {
  await audio.unlock();
  updateAudioButton(audio.toggleMuted());
});

document.addEventListener('pointerlockchange', () => {
  const mouseLocked = document.pointerLockElement === canvas;
  if (!mouseLocked) {
    playerController.clearInput();
    playerCombat.clearInput();
    if (gameState.isGameplay && !campaign.blocked) gameState.pause();
  }
  mouseStatus.classList.toggle('is-visible', gameState.isGameplay && !campaign.blocked && !mouseLocked);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && gameState.isGameplay) gameState.pause();
});

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  if (gameState.isGameplay) gameState.pause();
  renderStatus.textContent = 'Graphics context lost — paused safely';
});

canvas.addEventListener('webglcontextrestored', () => {
  renderStatus.textContent = 'Renderer restored — resume when ready';
});

if (import.meta.env.DEV) {
  const preview = new URLSearchParams(window.location.search).get('preview');
  if (preview === 'campaign') {
    gameState.transition(GAME_STATES.PLAYING, true);
    campaign.startNew();
  } else if (/^level[1-5](combat)?$/.test(preview ?? '')) {
    const level = Number(preview.match(/^level([1-5])/)[1]) - 1;
    gameState.transition(GAME_STATES.PLAYING, true);
    campaign.levelIndex = level;
    campaign.shards = Math.min(level, 4);
    campaign.prepareLevel();
    if (preview.endsWith('combat')) campaign.beginLevel();
  } else if (preview === 'mini' || preview === 'final') {
    gameState.transition(GAME_STATES.BOSS_FIGHT, true);
    bossSystem.debugStartBoss(preview);
  } else if (preview === 'pause') {
    gameState.transition(GAME_STATES.PLAYING, true);
    gameState.pause();
  } else if (preview === 'gameover') {
    gameState.transition(GAME_STATES.GAME_OVER, true);
  } else if (preview === 'victory') {
    gameState.transition(GAME_STATES.VICTORY, true);
  } else if (preview === 'debug') {
    gameState.transition(GAME_STATES.PLAYING, true);
    debugPanel.handleKey({ code: 'F1' });
    debugPanel.handleKey({ code: 'F2' });
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, CONFIG.renderer.maxPixelRatio) * performanceMonitor.qualityScale,
  );
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

function updateGameplay(delta) {
  combatSnapshot = playerCombat.update(delta);
  if (combatSnapshot.attackSerial !== previousAttackSerial) audio.sword(combatSnapshot.comboIndex);
  previousAttackSerial = combatSnapshot.attackSerial;
  playerController.setMovementScale(combatSnapshot.movementScale);
  movementSnapshot = playerController.update(delta);
  if (movementSnapshot.state !== previousMovementState) audio.movement(movementSnapshot.state);
  previousMovementState = movementSnapshot.state;
  elementSnapshot = elementSystem.update(delta);
  if (elementSnapshot.castFlash > 0 && previousCastFlash <= 0) audio.element(elementSnapshot.current);
  previousCastFlash = elementSnapshot.castFlash;
  bossSnapshot = bossSystem.update(delta, time.elapsed, movementSnapshot, combatSnapshot);
  if (bossSnapshot.stage !== previousBossStage) audio.encounter(bossSnapshot.stage);
  previousBossStage = bossSnapshot.stage;
  const frameHits = combatSystem.update(combatSnapshot, delta, time.elapsed, movementSnapshot);
  if (frameHits > 0) {
    hud.registerHit();
    audio.hit();
  }
  if (playerCombat.health.health < previousHealth) audio.damage();
  previousHealth = playerCombat.health.health;
  playerAnimation.update(movementSnapshot, { ...combatSnapshot, casting: elementSnapshot.casting, castElement: elementSnapshot.castElement, castSerial: elementSnapshot.castSerial }, time.elapsed, delta);
  updateFirstPersonView(combatSnapshot, elementSnapshot, time.elapsed);
  particleDirector.update(delta, time.elapsed, movementSnapshot, combatSnapshot);
  world.update(time.elapsed, delta);
  cameraRig.update(world.player.position, delta);
  uiAnimations.announceStage(bossSnapshot.stage);
  battleDialogue.update({ elapsed: time.elapsed, boss: bossSnapshot, playerPosition: world.player.position, enemyHit: frameHits > 0 });
  campaignSnapshot = campaign.update(delta);
  audio.setMusicMode(bossSnapshot.active ? 'boss' : campaignSnapshot.phase === 'combat' ? 'combat' : 'exploration');
  campaignUI.update(campaignSnapshot, true);

  const resolvedState = resolveGameplayState({
    currentState: gameState.state,
    playerDead: playerCombat.health.dead,
    complete: campaignSnapshot.complete,
    bossStage: bossSnapshot.stage,
  });
  if (resolvedState !== gameState.state) gameState.transition(resolvedState);
}

function updateMenuScene(delta) {
  playerAnimation.update(movementSnapshot, combatSnapshot, time.elapsed, delta);
  particleDirector.update(delta, time.elapsed, movementSnapshot, combatSnapshot);
  world.update(time.elapsed, delta);
  cameraRig.update(world.player.position, delta);
}

function render(timestamp) {
  const frozen = [GAME_STATES.PAUSED, GAME_STATES.GAME_OVER, GAME_STATES.VICTORY].includes(gameState.state);
  const delta = time.tick(timestamp, frozen);
  if (gameState.isGameplay && !campaign.blocked) updateGameplay(delta);
  else if (gameState.state === GAME_STATES.MAIN_MENU || gameState.isGameplay) updateMenuScene(delta);
  lighting.update(time.elapsed, elementSnapshot.current, elementSnapshot.castFlash);
  hud.update(combatSnapshot, elementSnapshot, bossSnapshot, world.particleSystem.activeCount, delta);
  collisionHelpers.forEach((helper) => { if (helper.visible) helper.update(); });
  renderer.render(scene, camera);
  performanceMonitor.update(delta, renderer.info);
  debugPanel.update({
    performance: performanceMonitor.getSnapshot(),
    playerPosition: world.player.position,
    gameState: gameState.state,
    enemyStates: world.enemies.filter((enemy) => enemy.group.visible).map((enemy) => enemy.ai.state),
    particleCount: world.particleSystem.activeCount,
  });
}

window.addEventListener('resize', resize);
renderer.setAnimationLoop(render);
renderStatus.textContent = 'Renderer online';
window.__shadowBladeBooted = true;
document.querySelector('#boot-error').hidden = true;
