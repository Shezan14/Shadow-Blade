import * as THREE from 'three';
import { createArena } from './Arena.js';
import { createEnvironment } from './Environment.js';
import { createDecorations } from './Decorations.js';
import { createPlayer } from '../player/Player.js';
import { createEnemyWave } from '../enemies/EnemyTypes.js';
import { CombatEffects } from '../combat/CombatEffects.js';
import { ParticleSystem } from '../particles/ParticleSystem.js';
import { createBosses } from '../enemies/Boss.js';
import { createCampaignMaps } from './CampaignMaps.js';

function createSkyParticles() {
  const count = 180;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.399;
    const radius = 10 + (i % 23) * 0.82;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 1 + ((i * 19) % 14);
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0x89a7ff,
      size: 0.055,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  );
}

export function createPhaseTwoScene(scene) {
  scene.fog = new THREE.FogExp2(0x03050d, 0.038);

  const world = new THREE.Group();
  world.name = 'Shadow Blade World';
  const arena = createArena();
  const environment = createEnvironment();
  const decorations = createDecorations();
  const player = createPlayer();
  const skyParticles = createSkyParticles();
  world.add(arena, environment, decorations, player, skyParticles);
  const enemies = createEnemyWave();
  enemies.forEach((enemy) => world.add(enemy.group));
  const combatTargets = [...enemies];
  const bosses = createBosses();
  world.add(bosses.miniBoss.group, bosses.finalBoss.group);
  const particleSystem = new ParticleSystem(world);
  const combatEffects = new CombatEffects(world, particleSystem);
  const campaignMaps = createCampaignMaps(scene, world);
  campaignMaps.setLevel(0);
  arena.visible = false;
  environment.visible = false;
  decorations.visible = false;

  const playerRim = new THREE.PointLight(0x6554ff, 6, 5.5, 2);
  world.add(playerRim);
  scene.add(world);

  return {
    world,
    player,
    enemies,
    combatTargets,
    bosses,
    combatEffects,
    particleSystem,
    campaignMaps,
    update(elapsed, delta = 0) {
      arena.userData.update(elapsed);
      decorations.userData.update(elapsed);
      skyParticles.rotation.y = elapsed * 0.006;
      playerRim.position.copy(player.position);
      playerRim.position.x -= 1.2;
      playerRim.position.y += 2.3;
      playerRim.position.z += 1.4;
      particleSystem.update(delta);
      campaignMaps.update(elapsed);
    },
  };
}
