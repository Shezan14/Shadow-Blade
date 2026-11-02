import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const assetUrl = (path) => new URL(path, typeof document !== 'undefined' ? document.baseURI : 'http://localhost/').toString();

const PLAYER_CLIPS = Object.freeze({
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  jump: 'Jump_Full_Short',
  fall: 'Jump_Idle',
  dodge: 'Dodge_Forward',
  block: 'Blocking',
  attacks: [
    '1H_Melee_Attack_Slice_Diagonal',
    '1H_Melee_Attack_Slice_Horizontal',
    '1H_Melee_Attack_Stab',
  ],
});

export function resolvePlayerClip(snapshot, combat) {
  if (combat.attacking) return PLAYER_CLIPS.attacks[combat.comboIndex % PLAYER_CLIPS.attacks.length];
  if (combat.blocking) return PLAYER_CLIPS.block;
  if (combat.casting) {
    if (combat.castElement === 'ice') return 'Spellcast_Raise';
    if (combat.castElement === 'wind') return 'Spellcast_Long';
    return 'Spellcast_Shoot';
  }
  return PLAYER_CLIPS[snapshot.state] ?? PLAYER_CLIPS.idle;
}

function configureAccessories(model, kind) {
  if (kind.startsWith('skeleton-')) return;
  const allowed = kind === 'rogue'
    ? new Set(['Knife'])
    : kind === 'barbarian'
      ? new Set(['1H_Axe'])
      : new Set(['1H_Sword']);
  model.traverse((object) => {
    if (/Sword|Axe|Shield|Crossbow|Knife|Throwable|Smokebomb/i.test(object.name)) {
      object.visible = allowed.has(object.name);
    }
    if (object.isMesh || object.isSkinnedMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
    }
  });
}

export class RiggedCharacter {
  constructor(host, {
    url,
    kind = 'rogue',
    fallback = [],
    scale = 1,
    yOffset = 0,
    rotationY = 0,
    accessory = null,
  }) {
    this.host = host;
    this.kind = kind;
    this.fallback = fallback;
    this.scale = scale;
    this.yOffset = yOffset;
    this.rotationY = rotationY;
    this.accessory = accessory;
    this.model = null;
    this.mixer = null;
    this.actions = new Map();
    this.currentAction = null;
    this.currentName = '';
    this.ready = false;
    this.failed = false;
    if (typeof window !== 'undefined') this.load(url);
  }

  async load(url) {
    try {
      const gltf = await loader.loadAsync(url);
      this.model = gltf.scene;
      this.model.name = `${this.kind}-rigged-model`;
      this.model.position.y = this.yOffset;
      this.model.rotation.y = this.rotationY;
      this.model.scale.setScalar(this.scale);
      this.model.visible = !this.host.userData.firstPerson;
      configureAccessories(this.model, this.kind);
      this.host.add(this.model);
      this.mixer = new THREE.AnimationMixer(this.model);
      gltf.animations.forEach((clip) => this.actions.set(clip.name, this.mixer.clipAction(clip)));
      this.fallback.forEach((object) => { if (object) object.visible = false; });
      this.host.userData.weapon = this.model.getObjectByName(
        this.kind === 'rogue' ? 'Knife' : this.kind === 'barbarian' ? '1H_Axe' : '1H_Sword',
      );
      this.ready = true;
      this.play('Idle', 0);
      if (this.accessory) void this.loadAccessory(this.accessory);
    } catch (error) {
      this.failed = true;
      console.warn(`Rigged character failed to load: ${url}`, error);
    }
  }

  async loadAccessory(accessory) {
    try {
      const gltf = await loader.loadAsync(accessory.url);
      const socket = this.model.getObjectByName(accessory.socket ?? 'handslot.r');
      if (!socket) return;
      const weapon = gltf.scene;
      weapon.name = accessory.name ?? 'rigged-weapon';
      weapon.position.fromArray(accessory.position ?? [0, 0, 0]);
      weapon.rotation.set(...(accessory.rotation ?? [0, 0, 0]));
      weapon.scale.setScalar(accessory.scale ?? 1);
      weapon.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      socket.add(weapon);
      this.host.userData.weapon = weapon;
    } catch (error) {
      console.warn(`Character accessory failed to load: ${accessory.url}`, error);
    }
  }

  play(name, fade = 0.14, oneShot = false) {
    if (!this.ready || name === this.currentName) return;
    const next = this.actions.get(name) ?? this.actions.get('Idle');
    if (!next) return;
    if (oneShot) {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.clampWhenFinished = false;
    }
    next.reset().fadeIn(fade).play();
    this.currentAction?.fadeOut(fade);
    this.currentAction = next;
    this.currentName = name;
  }

  update(delta, name, { oneShot = false, timeScale = 1 } = {}) {
    if (!this.ready) return;
    this.play(name, oneShot ? 0.07 : 0.16, oneShot);
    if (this.currentAction) this.currentAction.timeScale = timeScale;
    this.mixer.update(delta);
  }
}

export class PlayerRiggedAnimator {
  constructor(player) {
    this.player = player;
    this.attackSerial = -1;
    this.castSerial = -1;
    this.rig = new RiggedCharacter(player, {
      url: assetUrl('models/kaykit/Rogue_Hooded.glb'),
      kind: 'rogue',
      fallback: [player.userData.parts.visual],
      scale: 1.08,
      yOffset: -1.2,
      rotationY: 0,
    });
    player.userData.riggedAnimator = this;
  }

  update(snapshot, combat, delta) {
    const clip = resolvePlayerClip(snapshot, combat);
    const isAttack = combat.attacking;
    const isCasting = combat.casting;
    const isOneShot = isAttack || isCasting || ['dodge', 'jump'].includes(snapshot.state);
    let speed = 1;
    if (snapshot.state === 'walk') speed = THREE.MathUtils.clamp(snapshot.speed / 3, 0.82, 1.55);
    if (snapshot.state === 'run') speed = THREE.MathUtils.clamp(snapshot.speed / 4.6, 1.05, 1.78);
    if (isAttack) {
      const freshAttack = combat.attackSerial !== this.attackSerial;
      if (freshAttack) {
        this.rig.currentName = '';
        this.attackSerial = combat.attackSerial;
      }
      speed = 1.32;
    }
    if (isCasting) {
      if (combat.castSerial !== this.castSerial) {
        this.rig.currentName = '';
        this.castSerial = combat.castSerial;
      }
      speed = 1.18;
    }
    this.rig.update(delta, clip, { oneShot: isOneShot, timeScale: speed });
  }
}

export function attachEnemyRig(enemy, kind = 'knight') {
  const file = kind === 'barbarian' ? 'Barbarian.glb' : 'Knight.glb';
  const rig = new RiggedCharacter(enemy.group, {
    url: assetUrl(`models/kaykit/${file}`),
    kind,
    fallback: [enemy.bodyPivot, enemy.parts.leftLeg, enemy.parts.rightLeg],
    scale: 0.92,
    yOffset: 0,
    rotationY: 0,
  });
  enemy.riggedAnimator = rig;
  return rig;
}

export function resolveEnemyClip(state) {
  if (state === 'patrol') return 'Walking_A';
  if (state === 'chase' || state === 'retreat') return 'Running_A';
  if (state === 'attack') return '1H_Melee_Attack_Slice_Diagonal';
  if (state === 'hit') return 'Hit_A';
  if (state === 'dead') return 'Death_A';
  return 'Idle';
}

export function attachBossRig(boss) {
  const mage = boss.type === 'final';
  const rig = new RiggedCharacter(boss.group, {
      url: assetUrl(`models/kaykit-skeletons/${mage ? 'Skeleton_Mage' : 'Skeleton_Warrior'}.glb`),
    kind: mage ? 'skeleton-mage' : 'skeleton-warrior',
    fallback: [boss.proceduralVisual],
    scale: mage ? 1.18 : 1.12,
    yOffset: 0,
    rotationY: 0,
    accessory: {
      url: assetUrl(`models/kaykit-skeletons/${mage ? 'Skeleton_Staff' : 'Skeleton_Axe'}.gltf`),
      name: mage ? 'Overlord Staff' : 'Vanguard Axe',
      socket: 'handslot.r',
    },
  });
  boss.riggedAnimator = rig;
  return rig;
}

export function resolveBossClip(boss) {
  if (boss.dead || boss.state === 'dead') return 'Death_C_Skeletons';
  if (boss.state === 'intro') return 'Skeletons_Awaken_Standing';
  if (boss.hitFlash > 0.12) return 'Hit_B';
  if (boss.state === 'attack') {
    if (boss.type === 'final') return boss.currentPattern === 'wind' ? 'Spellcast_Summon' : 'Spellcast_Shoot';
    return boss.currentPattern === 'charge' ? '1H_Melee_Attack_Jump_Chop' : '2H_Melee_Attack_Chop';
  }
  if (boss.state === 'chase') return boss.type === 'final' ? 'Walking_D_Skeletons' : 'Running_C';
  return 'Idle_Combat';
}
