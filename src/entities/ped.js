// ped.js — a pedestrian: procedural body, procedural animation, and a small brain.
//
// Bodies are built from a shared set of primitive geometries so thousands of peds cost a
// handful of materials. Animation is entirely procedural — no clips, no skeleton data, just
// sine-driven joint angles that respond to actual walk speed.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, damp, angleDamp, wrapAngle, angleDelta, TAU } from '../core/mathx.js';
import { CharacterController, Ragdoll, MOVE_STATE } from '../physics/character.js';
import { BoxCollider, LAYER, SURFACE, MASK_SOLID } from '../physics/world.js';
import { getPed, PED_ARCHETYPES, FIRST_NAMES, LAST_NAMES } from '../content/pedCatalog.js';
import { buildWeaponModel } from '../combat/weapons.js';
import { getWeapon } from '../content/weaponCatalog.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _pv = new THREE.Vector3();

let _pid = 1;

// Getting shot is not the moment for the polite line in the archetype's bark
// table. One shared pool rather than per-archetype ones, because pain sounds
// much the same coming from a banker as from a surfer.
const HURT_SWEARS = [
  'Fuck! I\'m hit!', 'Shit, shit, shit!', 'Argh — you fucking shot me!',
  'Jesus Christ, my leg!', 'You bastard!', 'Fucking hell!',
  'Ow — fuck!', 'What the fuck is wrong with you!', 'You piece of shit!',
  'Somebody help me, fuck!', 'God damn it, that hurts!', 'You fucking prick!',
  'Shit! I\'m bleeding!', 'Arghhh — you crazy bastard!',
];
const DEATH_SWEARS = [
  'Fuck—', 'Oh shit—', 'You fucking—', 'Shit!', 'Jesus—',
  'Fucking hell—', 'Bastard—', 'God damn—', 'No — no, fuck—',
];

export const PED_STATE = {
  WANDER: 'wander', IDLE: 'idle', FLEE: 'flee', PANIC: 'panic', COMBAT: 'combat',
  COWER: 'cower', CHASE: 'chase', DRIVE: 'drive', DEAD: 'dead', TALK: 'talk', WATCH: 'watch',
};

// ---------------------------------------------------------------------------
// Shared geometry — built once, reused by every ped.
// ---------------------------------------------------------------------------
let GEO = null;
function buildGeometry() {
  if (GEO) return GEO;

  // Every ped in the city shares this one table, so resolution here is a fixed
  // cost no matter how many are on screen. Capsules and spheres could never be
  // more than a blocked-out figure; lathed profiles give real anatomy — a chest
  // that tapers to a waist, calves, a heel — at a resolution worth looking at.
  //
  // Everything below that is merged into head/torso/hand/foot is free in draw
  // calls, because a ped draws those as one mesh each however many shapes went
  // into them. Only a part needing its OWN material costs a call, times the
  // pedestrian budget, so those are spent deliberately and counted.
  const RAD = 20;

  /** A solid of revolution from [radius, y] pairs, capped at both ends. */
  const lathe = (profile, seg = RAD) => {
    const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0008, r), y));
    const g = new THREE.LatheGeometry(pts, seg);
    g.computeVertexNormals();
    return g;
  };

  /** A tapered limb segment with rounded ends. */
  /**
   * One limb segment: a tapered shaft with a hemispherical cap at each end.
   *
   * The caps matter. A segment that tapers to a point leaves a pinch wherever
   * two of them meet, and an arm built from pointed spindles reads as a string
   * of separate sausages with a notch at every joint. Capping each end means
   * the elbow and the knee are balls that overlap their neighbours, which is
   * both what a joint looks like and what fills the seam.
   */
  const limb = (rTop, rMid, rBot, len, seg = RAD) => {
    const h = len / 2;
    const N = 4;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 0.5;
      pts.push([rBot * Math.sin(a), -h - rBot * Math.cos(a) * 0.85]);
    }
    pts.push([rMid, 0]);
    for (let i = N; i >= 0; i--) {
      const a = (i / N) * Math.PI * 0.5;
      pts.push([rTop * Math.sin(a), h + rTop * Math.cos(a) * 0.85]);
    }
    return lathe(pts, seg);
  };

  const merge = (list) => mergeGeometries(list.filter(Boolean), false) || list[0];

  // ---- head: skull, brow, nose, ears, all one skin-coloured mesh ----
  const skull = lathe([
    [0, -0.115], [0.052, -0.112], [0.075, -0.088], [0.086, -0.045],
    [0.092, 0.0], [0.090, 0.045], [0.078, 0.085], [0.046, 0.112], [0, 0.120],
  ], RAD);
  skull.scale(1.0, 1.0, 0.92);
  const brow = new THREE.BoxGeometry(0.13, 0.022, 0.03);
  brow.translate(0, 0.016, 0.079);
  const nose = new THREE.BoxGeometry(0.028, 0.05, 0.034);
  nose.translate(0, -0.018, 0.083);
  const chin = new THREE.SphereGeometry(0.045, 8, 6);
  chin.scale(1.25, 0.85, 1.0);
  chin.translate(0, -0.072, 0.038);
  const earL = new THREE.SphereGeometry(0.021, 8, 6); earL.scale(0.5, 1.25, 1);
  earL.translate(-0.086, 0.0, 0.004);
  const earR = earL.clone(); earR.translate(0.172, 0, 0);
  // Cheekbones, lips and a browline. Under flat shading a face has no specular
  // to describe it, so what little it reads by is the angle each small plane
  // turns to the light — which means the planes have to be there.
  const cheekL = new THREE.SphereGeometry(0.030, 8, 6); cheekL.scale(1.0, 0.72, 0.62);
  cheekL.translate(-0.050, -0.022, 0.062);
  const cheekR = cheekL.clone(); cheekR.translate(0.100, 0, 0);
  const lipTop = new THREE.BoxGeometry(0.042, 0.009, 0.014); lipTop.translate(0, -0.046, 0.074);
  const lipBot = new THREE.BoxGeometry(0.038, 0.011, 0.013); lipBot.translate(0, -0.057, 0.072);
  const browL = new THREE.BoxGeometry(0.048, 0.011, 0.020);
  browL.rotateZ(0.10); browL.translate(-0.030, 0.026, 0.070);
  const browR = browL.clone(); browR.rotateZ(-0.20); browR.translate(0.060, 0, 0);
  const jaw = new THREE.BoxGeometry(0.104, 0.038, 0.070);
  jaw.rotateX(0.16); jaw.translate(0, -0.058, 0.014);
  const head = merge([skull, brow, nose, chin, earL, earR,
    cheekL, cheekR, lipTop, lipBot, browL, browR, jaw]);

  // Eyes are the one facial part worth its own material — skin-coloured eyes
  // are no eyes at all, and a face with none reads as a mannequin at any
  // distance you can make out a head. One extra mesh per ped.
  const eyeL = new THREE.SphereGeometry(0.0125, 8, 6); eyeL.scale(1.15, 1, 0.75);
  eyeL.translate(-0.031, 0.006, 0.075);
  const eyeR = eyeL.clone(); eyeR.translate(0.062, 0, 0);
  const eyes = merge([eyeL, eyeR]);

  // ---- torso: shoulders down to a waist, plus collarbones ----
  const chest = lathe([
    [0, -0.26], [0.10, -0.255], [0.125, -0.20], [0.132, -0.09],
    [0.150, 0.04], [0.163, 0.14], [0.150, 0.215], [0.09, 0.255], [0, 0.26],
  ], RAD);
  chest.scale(1.06, 1, 0.70);
  const deltoidL = new THREE.SphereGeometry(0.072, 12, 9); deltoidL.scale(1, 0.9, 0.85);
  deltoidL.translate(-0.165, 0.175, 0);
  const deltoidR = deltoidL.clone(); deltoidR.translate(0.33, 0, 0);
  // Collarbones, a chest plane and a collar. All the same cloth colour as the
  // torso, so they cost nothing but give the upper body somewhere for the light
  // to change — without them a shirt is one smooth barrel.
  const clavL = new THREE.BoxGeometry(0.115, 0.017, 0.030);
  clavL.rotateZ(-0.16); clavL.translate(-0.068, 0.196, 0.048);
  const clavR = clavL.clone(); clavR.rotateZ(0.32); clavR.translate(0.136, 0, 0);
  const pecL = new THREE.SphereGeometry(0.070, 10, 8); pecL.scale(1.0, 0.62, 0.42);
  pecL.translate(-0.062, 0.088, 0.072);
  const pecR = pecL.clone(); pecR.translate(0.124, 0, 0);
  const collar = new THREE.TorusGeometry(0.083, 0.016, 6, 16);
  collar.rotateX(Math.PI / 2); collar.scale(1.0, 1, 0.74); collar.translate(0, 0.236, 0.004);
  const torso = merge([chest, deltoidL, deltoidR, clavL, clavR, pecL, pecR, collar]);

  // ---- pelvis ----
  const hipsBase = lathe([
    [0, -0.13], [0.09, -0.126], [0.122, -0.08], [0.138, 0.0],
    [0.132, 0.075], [0.10, 0.122], [0, 0.13],
  ], RAD);
  hipsBase.scale(1.08, 1, 0.78);
  // A waistband, in the trouser colour. It only has to catch the light along an
  // edge to separate the top half of a figure from the bottom half.
  const waist = new THREE.TorusGeometry(0.139, 0.015, 6, 18);
  waist.rotateX(Math.PI / 2); waist.scale(1.08, 1, 0.80); waist.translate(0, 0.104, 0);
  const hips = merge([hipsBase, waist]);

  // ---- hand: palm plus a thumb and a fused finger block ----
  const palm = new THREE.SphereGeometry(0.042, 10, 8);
  palm.scale(0.78, 1.25, 1.12);
  // Four fingers rather than one fused block. At arm's length the difference is
  // a hand instead of a mitten, and it merges into the same mesh, so it is free.
  const fingerParts = [];
  for (let i = 0; i < 4; i++) {
    const len = 0.062 - Math.abs(i - 1.2) * 0.008;
    const f = new THREE.BoxGeometry(0.0115, len, 0.026);
    f.translate(-0.019 + i * 0.0128, -0.028 - len * 0.5, 0.002);
    fingerParts.push(f);
  }
  const knuckles = new THREE.BoxGeometry(0.052, 0.016, 0.028);
  knuckles.translate(0, -0.026, 0.002);
  const thumb = new THREE.BoxGeometry(0.018, 0.038, 0.019);
  thumb.rotateZ(-0.35); thumb.translate(0.031, -0.020, 0.010);
  const hand = merge([palm, knuckles, ...fingerParts, thumb]);

  // ---- foot: heel, arch and toe rather than a shoebox ----
  const sole = new THREE.BoxGeometry(0.098, 0.035, 0.255);
  sole.translate(0, -0.020, 0.048);
  const upper = new THREE.BoxGeometry(0.094, 0.062, 0.145);
  upper.translate(0, 0.012, -0.005);
  const toe = new THREE.SphereGeometry(0.049, 12, 8);
  toe.scale(1.0, 0.62, 1.35);
  toe.translate(0, -0.004, 0.136);
  const heel = new THREE.SphereGeometry(0.047, 12, 8);
  heel.scale(1.0, 0.78, 0.9);
  heel.translate(0, 0.004, -0.058);
  // A welt around the sole, a heel block and a tongue, so a shoe has a shoe's
  // edges instead of reading as a rounded lump of the trouser colour.
  const welt = new THREE.BoxGeometry(0.106, 0.012, 0.262);
  welt.translate(0, -0.034, 0.046);
  const heelBlock = new THREE.BoxGeometry(0.092, 0.024, 0.070);
  heelBlock.translate(0, -0.042, -0.048);
  const tongue = new THREE.BoxGeometry(0.058, 0.040, 0.044);
  tongue.rotateX(-0.30); tongue.translate(0, 0.036, 0.034);
  const foot = merge([sole, upper, toe, heel, welt, heelBlock, tongue]);

  GEO = {
    head,
    eyes,
    hair: (() => {
      const g = lathe([
        [0, -0.02], [0.062, -0.018], [0.090, 0.020], [0.098, 0.058],
        [0.082, 0.100], [0.046, 0.124], [0, 0.130],
      ], RAD);
      g.scale(1.02, 1.0, 0.96);
      return g;
    })(),
    torso,
    hips,
    upperArm: limb(0.058, 0.052, 0.044, 0.30),
    lowerArm: limb(0.044, 0.040, 0.034, 0.27),
    hand,
    thigh: limb(0.088, 0.079, 0.062, 0.42),
    shin: limb(0.062, 0.056, 0.040, 0.42),
    foot,
    cap_: new THREE.CylinderGeometry(0.125, 0.122, 0.062, 16),
    bagGeo: new THREE.BoxGeometry(0.22, 0.26, 0.1),
    phoneGeo: new THREE.BoxGeometry(0.07, 0.13, 0.012),
  };
  // Accessories are fixed-size, so they belong in the shared table too —
  // allocating them per ped leaked a handful of buffers on every despawn.
  GEO.capPeak = new THREE.BoxGeometry(0.17, 0.02, 0.1);
  GEO.coffee = new THREE.CylinderGeometry(0.035, 0.03, 0.11, 10);
  GEO.camera = new THREE.BoxGeometry(0.1, 0.07, 0.07);
  GEO.umbrella = new THREE.CylinderGeometry(0.015, 0.015, 0.7, 8);
  GEO.skateboard = new THREE.BoxGeometry(0.18, 0.03, 0.72);
  GEO.surfboard = new THREE.BoxGeometry(0.36, 0.06, 1.9);
  return GEO;
}

/** Cached per-colour materials so 150 peds don't mean 1500 materials. */
const matCache = new Map();
function bodyMat(base, colorHex) {
  const key = (base.name || 'm') + ':' + colorHex;
  let m = matCache.get(key);
  if (m) return m;
  m = base.clone();
  m.color.setHex(colorHex);
  matCache.set(key, m);
  return m;
}

export function clearPedMaterialCache() { matCache.clear(); }

// ---------------------------------------------------------------------------
export class Ped {
  constructor(ctx, archetypeId, opts = {}) {
    this.ctx = ctx;
    this.id = _pid++;
    this.isPed = true;
    this.dead = false;
    const def = getPed(archetypeId) || PED_ARCHETYPES[0];
    this.def = def;
    const rng = opts.rng || ctx.rng;
    this.rng = rng;

    this.height = rng.range(def.height[0], def.height[1]);
    this.build = rng.range(def.build[0], def.build[1]);
    this.name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    this.colors = {
      skin: rng.pick(def.palette.skin),
      hair: rng.pick(def.palette.hair),
      top: rng.pick(def.palette.top),
      bottom: rng.pick(def.palette.bottom),
      shoes: rng.pick(def.palette.shoes),
      accent: rng.pick(def.palette.accent),
    };
    this.hasHat = def.outfit === 'cop' || def.outfit === 'worker' || def.outfit === 'chef' || rng.bool(0.16);
    this.prop = def.props && def.props.length && rng.bool(0.45) ? rng.pick(def.props) : null;

    this.health = def.health ?? 100;
    this.maxHealth = this.health;
    this.armed = def.armed && rng.float() < def.armed.chance ? def.armed.weaponId : null;
    this.stats = def.stats;
    this.isCop = def.outfit === 'cop';
    this.isGang = !!def.gang;

    // --- physics ---
    this.body = new CharacterController(ctx.physics, {
      radius: 0.3 * this.build, height: this.height, mass: 60 * this.build,
    });
    this.body.ignore = this;
    this.collider = new BoxCollider(0, 0, 0, 0.32 * this.build, this.height * 0.5, 0.26 * this.build, 0, {
      layer: LAYER.PED, surface: SURFACE.FLESH, owner: this,
    });
    ctx.physics.addDynamic(this);
    this.ragdoll = null;

    // --- visuals ---
    this.group = new THREE.Group();
    this.group.name = 'ped:' + def.id;
    this.group.userData.entity = this;
    this._buildMesh();
    ctx.scene.add(this.group);

    // --- brain ---
    this.state = PED_STATE.WANDER;
    this.stateTime = 0;
    this.target = new THREE.Vector3();
    this.hasTarget = false;
    this.path = null;
    this.pathIndex = 0;
    this.wishDir = new THREE.Vector3();
    this.speed = def.speed.walk;
    this.yaw = opts.yaw ?? rng.range(0, TAU);
    this.lookYaw = this.yaw;
    this.fear = 0;
    this.anger = 0;
    this.alertness = 0;
    this.threat = null;
    this.inVehicle = null;      // set while riding in a car; the vehicle carries us
    this.vehicleSeat = 0;
    this.lastBark = -99;
    this.barkText = null;
    this.edge = opts.edge || null;
    this.edgeSide = opts.side || 1;
    this.edgeT = opts.t ?? rng.float();
    this.edgeDir = rng.bool() ? 1 : -1;
    this.vehicle = null;
    this.seat = -1;
    this.despawnTimer = 0;
    this.animPhase = rng.range(0, TAU);
    this.blinkTimer = rng.range(1, 5);
    this.distToCam = 0;
    this.visible = true;
    this.lodLevel = 0;
    this.money = Math.round(rng.range(4, 60) * (1 + (def.stats.wealth || 0.3) * 14));

    if (opts.x !== undefined) this.teleport(opts.x, opts.y, opts.z, this.yaw);
  }

  _buildMesh() {
    const g = buildGeometry();
    const mats = this.ctx.materials;
    const skinM = bodyMat(mats.skin, this.colors.skin);
    const topM = bodyMat(mats.cloth, this.colors.top);
    const botM = bodyMat(mats.cloth, this.colors.bottom);
    const shoeM = bodyMat(mats.cloth, this.colors.shoes);
    const hairM = bodyMat(mats.hairMat, this.colors.hair);
    const accM = bodyMat(mats.cloth, this.colors.accent);

    const s = this.height / 1.78;
    const b = this.build;
    const root = new THREE.Group();
    root.scale.set(b * 0.95, 1, b * 0.95);
    this.group.add(root);
    this.root = root;

    // Only the parts that make the silhouette cast. A pedestrian is fifteen small
    // meshes and every one of them used to be redrawn into the shadow map, which
    // with the city's pedestrian budget was the single largest block of draw
    // calls in the shadow pass — measured at 776 of a 1781-call frame for the
    // peds alone. Torso, hips and head are the shape you recognise on the
    // pavement; the shadow of a separate forearm at this scale is four pixels.
    const mk = (geo, mat, x, y, z, shadow = false) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = shadow;
      m.receiveShadow = false;
      return m;
    };

    // torso + hips
    this.torso = mk(g.torso, topM, 0, 1.18 * s, 0, true);
    root.add(this.torso);
    this.hips = mk(g.hips, botM, 0, 0.93 * s, 0, true);
    root.add(this.hips);

    // head
    this.neck = new THREE.Group();
    this.neck.position.set(0, 1.42 * s, 0);
    root.add(this.neck);
    this.head = mk(g.head, skinM, 0, 0.06, 0, true);
    this.neck.add(this.head);
    this.eyes = mk(g.eyes, bodyMat(mats.plasticBlack, 0x15161a), 0, 0.06, 0);
    this.neck.add(this.eyes);
    const hair = mk(g.hair, hairM, 0, 0.06, 0);
    this.neck.add(hair);
    if (this.hasHat) {
      const cap = mk(g.cap_, accM, 0, 0.16, 0);
      this.neck.add(cap);
      const peak = mk(g.capPeak, accM, 0, 0.15, 0.11);
      this.neck.add(peak);
    }

    // arms
    this.arms = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      // Just inside the deltoid, so the top of the arm sits in the shoulder
      // rather than beside it. At 0.19 the arms hung a centimetre clear of the
      // body and read as bolted on.
      shoulder.position.set(side * 0.172, 1.355 * s, 0);
      root.add(shoulder);
      const upper = mk(g.upperArm, topM, 0, -0.15, 0);
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.30, 0);
      shoulder.add(elbow);
      const lower = mk(g.lowerArm, skinM, 0, -0.135, 0);
      elbow.add(lower);
      const hand = mk(g.hand, skinM, 0, -0.30, 0);
      elbow.add(hand);
      this.arms.push({ shoulder, elbow, hand, side });
    }

    // Built the first time they actually draw it — `armed` is assigned after
    // construction for police, and most armed pedestrians never draw at all.
    this.weaponModel = null;
    this._weaponModelId = undefined;

    // legs
    this.legs = [];
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.10, 0.88 * s, 0);
      root.add(hip);
      const thigh = mk(g.thigh, botM, 0, -0.21, 0);
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.set(0, -0.42, 0);
      hip.add(knee);
      const shin = mk(g.shin, botM, 0, -0.21, 0);
      knee.add(shin);
      const foot = mk(g.foot, shoeM, 0, -0.44, 0.02);
      knee.add(foot);
      this.legs.push({ hip, knee, foot, side });
    }

    // carried prop
    if (this.prop) {
      const p = this.prop;
      let mesh = null;
      if (p === 'phone') mesh = mk(g.phoneGeo, bodyMat(mats.plasticBlack, 0x20242c), 0, -0.3, 0.05);
      else if (p === 'bag' || p === 'briefcase') mesh = mk(g.bagGeo, accM, 0, -0.34, 0);
      else if (p === 'coffee') mesh = mk(g.coffee, bodyMat(mats.cloth, 0xf0ece0), 0, -0.32, 0.03);
      else if (p === 'camera') mesh = mk(g.camera, bodyMat(mats.plasticBlack, 0x1a1a1e), 0, -0.3, 0.04);
      else if (p === 'umbrella') mesh = mk(g.umbrella, bodyMat(mats.cloth, 0x22242a), 0, -0.5, 0);
      else if (p === 'skateboard') mesh = mk(g.skateboard, bodyMat(mats.wood, 0x6b4a2a), 0, -0.36, 0);
      else if (p === 'surfboard') mesh = mk(g.surfboard, bodyMat(mats.cloth, 0xf0e8d8), 0.2, -0.3, 0);
      if (mesh) { this.arms[1].elbow.add(mesh); this.propMesh = mesh; }
    }

    this.group.scale.setScalar(1);
    this._meshParts = [this.torso, this.hips, this.head];
  }

  // -------------------------------------------------------------------------
  teleport(x, y, z, yaw) {
    this.body.teleport(x, y, z, yaw);
    this.yaw = yaw ?? this.yaw;
    this.group.position.set(x, y, z);
    this.group.rotation.y = this.yaw;
    this._syncCollider();
  }

  get position() { return this.body.position; }

  _syncCollider() {
    const c = this.collider;
    const p = this.body.position;
    c.x = p.x; c.y = p.y + this.height * 0.5; c.z = p.z;
    c.setYawPitchRoll(this.yaw, 0, 0);
  }

  // -------------------------------------------------------------------------
  update(dt) {
    if (this.dead && this.ragdoll) {
      this.ragdoll.update(dt);
      this._poseFromRagdoll();
      this.despawnTimer += dt;
      return;
    }
    if (this.dead) { this.despawnTimer += dt; return; }

    // Riding in a car: the vehicle carries us, so skip the walking AI entirely.
    // Without this the occupant kept wandering off on foot while invisible, and
    // then popped back into view standing in the road wherever it had got to.
    if (this.inVehicle) {
      const v = this.inVehicle;
      if (v.dead) { this.inVehicle = null; }
      else {
        v.seatPoint(this.vehicleSeat || 0, _pv);
        const yaw = Math.atan2(v.sim.forward.x, v.sim.forward.z);
        this.body.teleport(_pv.x, _pv.y, _pv.z, yaw);
        this.yaw = yaw;
        this._syncCollider();
        this.group.position.copy(this.body.position);
        this.group.rotation.y = yaw;
        this.setVisible(false);
        return;
      }
    }

    const cam = this.ctx.camera.position;
    const dx = this.body.position.x - cam.x, dz = this.body.position.z - cam.z;
    this.distToCam = Math.sqrt(dx * dx + dz * dz);

    // Distant peds get a cheaper update — still moving, just not animated per-joint.
    this.lodLevel = this.distToCam > 95 ? 2 : this.distToCam > 42 ? 1 : 0;

    this.stateTime += dt;
    this._think(dt);
    this._move(dt);
    this._syncCollider();

    this.group.position.copy(this.body.position);
    this.group.rotation.y = this.yaw;
    if (this.lodLevel < 2) this._animate(dt);
  }

  // ---- brain --------------------------------------------------------------
  _think(dt) {
    const ctx = this.ctx;
    const player = ctx.player;
    this.fear = Math.max(0, this.fear - dt * 0.28);
    this.anger = Math.max(0, this.anger - dt * 0.2);

    // React to nearby danger: gunfire, a car on the pavement, a drawn weapon.
    if (player && !player.dead) {
      const pd = this.body.position.distanceTo(player.position);
      if (pd < 26) {
        const threat = player.threatLevel;
        if (threat > 0) {
          const scared = threat * (1.25 - this.stats.bravery) * (1 - pd / 30);
          this.fear = Math.min(1.6, this.fear + scared * dt * 3.2);
          if (this.fear > 0.5) this.threat = player;
        }
      }
    }

    switch (this.state) {
      case PED_STATE.WANDER: {
        if (this.fear > 0.55) { this._setState(PED_STATE.FLEE); break; }
        if (!this.hasTarget || this.body.position.distanceToSquared(this.target) < 2.6) this._pickWanderTarget();
        this.speed = this.def.speed.walk * (this.stats.fitness * 0.3 + 0.85);
        break;
      }
      case PED_STATE.IDLE: {
        this.speed = 0;
        if (this.stateTime > 3 + this.rng.float() * 5) this._setState(PED_STATE.WANDER);
        if (this.fear > 0.55) this._setState(PED_STATE.FLEE);
        break;
      }
      case PED_STATE.FLEE: {
        this.speed = this.def.speed.run;
        if (this.threat) {
          _v1.copy(this.body.position).sub(this.threat.position);
          _v1.y = 0;
          if (_v1.lengthSq() < 0.01) _v1.set(1, 0, 0);
          _v1.normalize();
          this.target.copy(this.body.position).addScaledVector(_v1, 24);
          this.hasTarget = true;
        }
        if (this.fear < 0.18) this._setState(PED_STATE.WANDER);
        this._bark('panic', 5);
        break;
      }
      case PED_STATE.PANIC: {
        this.speed = this.def.speed.run;
        if (this.stateTime > 1.2) this._pickWanderTarget(true);
        if (this.fear < 0.2) this._setState(PED_STATE.WANDER);
        break;
      }
      case PED_STATE.COWER: {
        this.speed = 0;
        this.body.crouching = true;
        if (this.fear < 0.25) { this.body.crouching = false; this._setState(PED_STATE.WANDER); }
        break;
      }
      case PED_STATE.COMBAT: {
        const t = this.threat;
        if (!t || t.dead) { this._setState(PED_STATE.WANDER); break; }
        const d = this.body.position.distanceTo(t.position);
        this.speed = d > 12 ? this.def.speed.run : d < 4 ? 0 : this.def.speed.jog;
        this.target.copy(t.position);
        this.hasTarget = true;
        this.lookYaw = Math.atan2(t.position.x - this.body.position.x, t.position.z - this.body.position.z);
        this._bark('angry', 6);
        if (this.armed && d < 34 && this.stateTime > 0.6) this._shootAt(t, d);
        break;
      }
      case PED_STATE.CHASE: {
        const t = this.threat;
        if (!t || t.dead) { this._setState(PED_STATE.WANDER); break; }
        this.speed = this.def.speed.run;
        this.target.copy(t.position);
        this.hasTarget = true;
        break;
      }
      default: break;
    }

    // Anyone brave and angry enough fights back instead of running.
    if (this.state === PED_STATE.FLEE && this.anger > 0.7 && this.stats.bravery > 0.6) {
      this._setState(PED_STATE.COMBAT);
    }
  }

  _setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.stateTime = 0;
    if (s === PED_STATE.FLEE || s === PED_STATE.PANIC) this.hasTarget = false;
    // Draw the weapon on entering the fight, not on the first frame that
    // happens to animate. _animate is skipped entirely past 95 m, so an armed
    // ped who opened fire from further out than that stood there shooting with
    // empty hands until they closed the distance.
    if (s === PED_STATE.COMBAT && this.armed) this._ensureWeaponModel();
  }

  _pickWanderTarget(random = false) {
    const world = this.ctx.world;
    const rng = this.rng;
    if (!random && this.edge) {
      // Walk along the sidewalk, turning at junctions.
      this.edgeT += this.edgeDir * 0.45;
      if (this.edgeT > 1 || this.edgeT < 0) {
        const node = this.edgeT > 1 ? this.edge.b : this.edge.a;
        const options = node.edges.filter((e) => e !== this.edge && e.sidewalkWidth > 0.5);
        if (options.length) {
          this.edge = rng.pick(options);
          this.edgeDir = this.edge.a === node ? 1 : -1;
          this.edgeT = this.edgeDir > 0 ? 0.05 : 0.95;
          if (rng.bool(0.35)) this.edgeSide = -this.edgeSide;
        } else {
          this.edgeDir *= -1;
          this.edgeT = clamp(this.edgeT, 0.05, 0.95);
        }
      }
      const e = this.edge;
      const off = e.halfWidth + Math.max(1.2, e.sidewalkWidth * 0.55);
      this.target.set(
        lerp(e.a.x, e.b.x, clamp(this.edgeT, 0, 1)) + e.nx * off * this.edgeSide,
        0,
        lerp(e.a.z, e.b.z, clamp(this.edgeT, 0, 1)) + e.nz * off * this.edgeSide,
      );
      this.target.y = this.ctx.physics.groundHeight(this.target.x, this.target.z);
      this.hasTarget = true;
      return;
    }
    const a = rng.range(0, TAU);
    const r = rng.range(8, 26);
    this.target.set(
      this.body.position.x + Math.cos(a) * r, 0,
      this.body.position.z + Math.sin(a) * r,
    );
    this.target.y = this.ctx.physics.groundHeight(this.target.x, this.target.z);
    this.hasTarget = true;
  }

  _shootAt(target, dist) {
    if (!this.ctx.combat || this._fireCooldown > 0) return;
    this._fireCooldown = 0.9 + this.rng.float() * 0.8;
    this.ctx.combat.npcFire(this, target, this.armed);
  }

  _bark(kind, cooldown) {
    const now = this.ctx.time.elapsed;
    if (now - this.lastBark < cooldown) return;
    if (this.distToCam > 22) return;
    const lines = this.def.barks && this.def.barks[kind];
    if (!lines || !lines.length) return;
    this.lastBark = now;
    this.barkText = this.rng.pick(lines);
    this.ctx.bus.emit('ped:bark', { ped: this, text: this.barkText, kind });
  }

  /**
   * Same channel as _bark, but from a fixed pool rather than the archetype's,
   * and audible from further off — someone screaming because they have just
   * been shot carries further than someone muttering about the printer.
   */
  _swear(lines, kind, cooldown) {
    const now = this.ctx.time.elapsed;
    if (now - this.lastBark < cooldown) return;
    if (this.distToCam > 30) return;
    this.lastBark = now;
    this.barkText = this.rng.pick(lines);
    this.ctx.bus.emit('ped:bark', { ped: this, text: this.barkText, kind });
  }

  // ---- movement -----------------------------------------------------------
  _move(dt) {
    if (this._fireCooldown > 0) this._fireCooldown -= dt;
    const body = this.body;
    if (this.hasTarget && this.speed > 0.05) {
      _v1.copy(this.target).sub(body.position);
      _v1.y = 0;
      const dist = _v1.length();
      if (dist > 0.3) {
        _v1.divideScalar(dist);
        // Steer around whatever is directly ahead.
        this._avoid(_v1, dt);
        this.wishDir.copy(_v1);
        const targetYaw = Math.atan2(_v1.x, _v1.z);
        this.yaw += angleDelta(this.yaw, targetYaw) * Math.min(1, dt * 7);
      } else {
        this.wishDir.set(0, 0, 0);
        if (this.state === PED_STATE.WANDER && this.rng.bool(0.25)) this._setState(PED_STATE.IDLE);
      }
    } else {
      this.wishDir.set(0, 0, 0);
    }
    body.update(dt, this.wishDir, this.speed, false);
    // A heading, so angleDamp -- plain damp across the +/-PI seam makes a
    // pedestrian's head whip round a full turn as they walk past it.
    if (this.state !== PED_STATE.COMBAT) this.lookYaw = angleDamp(this.lookYaw, this.yaw, 6, dt);
  }

  _avoid(dir, dt) {
    const phys = this.ctx.physics;
    const p = this.body.position;
    const probe = 2.2;
    const hit = phys.raycast(p.x, p.y + 0.9, p.z, dir.x, 0, dir.z, probe,
      MASK_SOLID | LAYER.VEHICLE | LAYER.PED, { ignore: this });
    if (!hit.hit) return;
    // Slide along the obstacle rather than grinding into it.
    const nx = hit.nx, nz = hit.nz;
    const d = dir.x * nx + dir.z * nz;
    dir.x -= nx * d * 1.6;
    dir.z -= nz * d * 1.6;
    const l = Math.hypot(dir.x, dir.z) || 1;
    dir.x /= l; dir.z /= l;
    if (hit.layer === LAYER.VEHICLE && hit.dist < 1.6) {
      this.fear = Math.min(1.5, this.fear + dt * 3);
      this._setState(PED_STATE.FLEE);
    }
  }

  // ---- animation ----------------------------------------------------------
  _animate(dt) {
    const hSpeed = Math.hypot(this.body.velocity.x, this.body.velocity.z);

    // Everything below drives a *target* pose, and every joint eases toward its
    // target rather than being assigned. That single change is most of what
    // separates fluid movement from the snapping this used to do when a ped
    // changed state, because a walk now blends into a sprint or a gun-raise
    // over a few frames instead of cutting to it.
    const blend = this.lodLevel === 0 ? 16 : 10;
    const to = (obj, axis, target, rate = blend) => {
      obj.rotation[axis] = damp(obj.rotation[axis], target, rate, dt);
    };

    // Smoothed gait speed, so the stride grows and shrinks instead of popping.
    this.gait = damp(this.gait ?? 0, hSpeed, 8, dt);
    const stride = clamp(this.gait / 1.6, 0, 2.4);
    const running = this.gait > 3.1;

    // Stride frequency rises with speed the way a real gait does, and the phase
    // is continuous across the walk/run transition so nothing ever jumps.
    this.animPhase += dt * (2.6 + Math.sqrt(Math.max(0, this.gait)) * 3.4);
    const ph = this.animPhase;
    const amp = clamp(stride * 0.58, 0.05, 1.0);
    const swing = Math.sin(ph) * amp;
    const swingB = Math.sin(ph + Math.PI) * amp;
    const airborne = !this.body.grounded;
    const crouch = this.body.crouching;

    // --- body: bob, lean into acceleration, bank into turns ---
    const bob = (running ? 0.055 : 0.035) * stride * Math.abs(Math.sin(ph));
    this.root.position.y = damp(this.root.position.y, bob, 14, dt);

    const turn = angleDelta(this._prevYaw ?? this.yaw, this.yaw) / Math.max(dt, 1e-3);
    this._prevYaw = this.yaw;
    this.turnRate = damp(this.turnRate ?? 0, clamp(turn, -4, 4), 6, dt);
    const accel = (this.gait - (this._lastGait ?? this.gait)) / Math.max(dt, 1e-3);
    this._lastGait = this.gait;
    this.leanF = damp(this.leanF ?? 0, clamp(accel * 0.02, -0.18, 0.30) + stride * 0.07, 5, dt);

    to(this.torso, 'x', crouch ? 0.42 : -0.03 + this.leanF);
    to(this.torso, 'z', -this.turnRate * 0.06 + Math.sin(ph) * 0.025 * stride);
    // Shoulders counter-rotate against the pelvis — without this a walk reads
    // as a shop mannequin sliding along.
    to(this.torso, 'y', -Math.sin(ph) * 0.14 * stride);
    to(this.hips, 'y', Math.sin(ph) * 0.10 * stride);
    to(this.hips, 'x', crouch ? 0.2 : 0);

    // --- legs ---
    for (let i = 0; i < this.legs.length; i++) {
      const leg = this.legs[i];
      const sw = i === 0 ? swing : swingB;
      let hipX, kneeX, footX;
      if (airborne) {
        hipX = 0.34 + sw * 0.15; kneeX = -0.62; footX = 0.16;
      } else if (crouch) {
        hipX = 0.88; kneeX = -1.52; footX = 0.5;
      } else {
        hipX = sw * (running ? 1.05 : 0.78);
        // The knee only folds while the leg is travelling forward through its
        // swing; a straight leg on the ground is what makes a stride land.
        const lift = Math.max(0, -sw);
        kneeX = -(lift * (running ? 1.9 : 1.25) + 0.06);
        // Heel strike then toe off: the ankle leads the foot into the ground
        // and pushes off behind, which is what stops feet skating.
        footX = -kneeX * 0.35 - sw * 0.30;
      }
      to(leg.hip, 'x', hipX);
      to(leg.knee, 'x', kneeX);
      to(leg.foot, 'x', footX);
      to(leg.hip, 'z', leg.side * 0.02);
    }

    // --- arms ---
    const combat = this.state === PED_STATE.COMBAT && this.armed;
    const gun = combat ? this._ensureWeaponModel() : this.weaponModel;
    if (gun && gun.visible !== !!combat) gun.visible = !!combat;
    const fleeing = this.state === PED_STATE.FLEE || this.state === PED_STATE.PANIC;
    for (let i = 0; i < this.arms.length; i++) {
      const arm = this.arms[i];
      const sw = i === 0 ? swingB : swing;
      let shX, shZ, elX;
      if (combat) {
        // Shoulder plus elbow comes to -PI/2 so the barrel -- which runs down
        // the arm -- points level at whatever they are shooting at, rather than
        // ten degrees over its head.
        shX = -(Math.PI / 2) + 0.28; shZ = arm.side * 0.16; elX = -0.28;
      } else if (fleeing) {
        shX = -2.2 + Math.sin(ph * 1.4 + i) * 0.35; shZ = arm.side * 0.5; elX = -0.7;
      } else if (this.prop === 'phone' && i === 1) {
        shX = -1.1; shZ = arm.side * 0.2; elX = -1.2;
      } else {
        shX = sw * (running ? 0.92 : 0.58);
        // Arms rest against the ribs when still and swing wider as the stride
        // opens up; a constant splay made a standing ped look inflated.
        shZ = arm.side * (0.035 + stride * 0.10);
        // The elbow closes on the forward swing and opens behind, and it stays
        // more bent at a run — the detail that reads as momentum.
        elX = -(Math.max(0, sw) * (running ? 1.15 : 0.55) + (running ? 0.55 : 0.14));
      }
      to(arm.shoulder, 'x', shX);
      to(arm.shoulder, 'z', shZ);
      to(arm.elbow, 'x', elX);
    }

    // --- head: leads the turn, settles on what the ped is looking at ---
    const lookY = clamp(angleDelta(this.yaw, this.lookYaw), -0.9, 0.9);
    to(this.neck, 'y', lookY, 9);
    to(this.neck, 'x', clamp(-this.leanF * 0.5, -0.25, 0.25) + Math.sin(ph * 0.5) * 0.02, 9);

    this.blinkTimer -= dt;
    if (this.blinkTimer < 0) {
      this.blinkTimer = 2 + this.rng.float() * 4;
      this._blink = 0.12;
    }
    if (this._blink > 0) {
      this._blink -= dt;
      // Squash the eyes, not the skull. Blinking used to shorten the whole head
      // by a seventh, which at close range is a head pulsing rather than a
      // face blinking.
      if (this.eyes) this.eyes.scale.y = this._blink > 0 ? 0.12 : 1;
    }
  }

  _poseFromRagdoll() {
    const r = this.ragdoll;
    if (!r) return;
    // Align the torso with the hips→chest axis.
    r.get('hips', _v1); r.get('chest', _v2);
    _v3.copy(_v2).sub(_v1);
    const yaw = Math.atan2(_v3.x, _v3.z);
    // Polar angle from +Y: 0 for a body still standing, PI/2 for one flat on
    // the ground. That IS the rotation the root needs about its own X once the
    // group has been yawed to put the horizontal part on local +Z -- taking
    // another quarter turn off it inverted the two, so a ped shot standing up
    // snapped flat and a corpse on the pavement stood bolt upright. Measured:
    // hips->chest = +Y used to render the body axis as (0, 0, -1).
    const pitch = Math.atan2(Math.hypot(_v3.x, _v3.z), _v3.y);
    // The root pivots at the model's feet, so how far the body's middle sits
    // from it swings round with the pitch: straight up when standing, out
    // along the ground when flat. Getting this from the pitch as well puts the
    // drawn body exactly on the ragdoll instead of 0.76 m away from it.
    r.center(_v2);
    const lift = this.height * 0.42;
    const sp = Math.sin(pitch), cp = Math.cos(pitch);
    this.group.position.set(
      _v2.x - lift * Math.sin(yaw) * sp,
      _v2.y - lift * cp,
      _v2.z - lift * Math.cos(yaw) * sp,
    );
    this.group.rotation.set(0, yaw, 0);
    this.root.rotation.x = pitch;
    // Splay limbs so it reads as a body and not a mannequin.
    for (let i = 0; i < this.legs.length; i++) {
      this.legs[i].hip.rotation.x = 0.6 + i * 0.3;
      this.legs[i].knee.rotation.x = -0.9 - i * 0.25;
    }
    for (let i = 0; i < this.arms.length; i++) {
      this.arms[i].shoulder.rotation.x = -0.4 - i * 0.5;
      this.arms[i].shoulder.rotation.z = this.arms[i].side * 1.2;
      this.arms[i].elbow.rotation.x = -0.5;
    }
  }

  // ---- damage -------------------------------------------------------------
  damage(amount, opts = {}) {
    if (this.dead) return false;
    this.health -= amount;
    this.anger = Math.min(1.5, this.anger + 0.5);
    this.fear = Math.min(1.6, this.fear + 0.8);
    if (opts.source) this.threat = opts.source;
    this._swear(HURT_SWEARS, 'hurt', 1.1);
    this.ctx.bus.emit('ped:damaged', { ped: this, amount, source: opts.source });
    if (this.health <= 0) { this.kill(opts); return true; }
    if (this.stats.bravery > 0.65 && (this.armed || this.isCop)) this._setState(PED_STATE.COMBAT);
    else this._setState(PED_STATE.FLEE);
    return false;
  }

  kill(opts = {}) {
    if (this.dead) return;
    this.dead = true;
    this.state = PED_STATE.DEAD;
    this.body.enabled = false;
    this.body.dead = true;
    this.despawnTimer = 0;
    // Whatever killed them. This used to fire only for a car, so being shot --
    // by far the commonest way anyone in this city dies -- was silent.
    this._swear(DEATH_SWEARS, 'death', 0);
    this.ragdoll = new Ragdoll(this.ctx.physics, this.height, this.build);
    const v = opts.velocity || { x: 0, y: 0, z: 0 };
    this.ragdoll.activate(this.body.position.x, this.body.position.y, this.body.position.z, this.yaw,
      v.x, v.y + 1.2, v.z);
    this.collider.layer = LAYER.DEBRIS;
    this.ctx.audio?.playAt('bodyFall', this.body.position, { volume: 0.7 });
    if (this.ctx.settings.get('bloodFx') && this.ctx.decals) {
      this.ctx.decals.addBlood(this.body.position.x, this.body.position.y + 0.05, this.body.position.z, 1.4);
    }
    this.ctx.bus.emit('ped:killed', { ped: this, source: opts.source });
  }

  /** Shove from an explosion or a car. */
  shove(vx, vy, vz) {
    if (this.dead && this.ragdoll) { this.ragdoll.impulse(vx, vy, vz); return; }
    this.body.externalVelocity.set(vx, vy, vz);
    this.fear = 1.4;
    this._setState(PED_STATE.FLEE);
  }

  setVisible(v) {
    if (this.visible === v) return;
    this.visible = v;
    this.group.visible = v;
  }

  /**
   * The weapon an armed ped is holding, built the first time they draw it.
   * Armed pedestrians used to shoot at you holding nothing at all: `armed` was
   * only ever an id handed to the combat system, and nothing put anything in
   * their hand. It mounts the same way the player's does -- an arm in this rig
   * points down its own local -Y, and weapon models are built along +Z, so the
   * quarter turn about X is what lays the barrel along the arm.
   */
  _ensureWeaponModel() {
    if (this._weaponModelId === this.armed) return this.weaponModel;
    if (this.weaponModel) { this.arms[1].hand.remove(this.weaponModel); this.weaponModel = null; }
    this._weaponModelId = this.armed;
    const wdef = this.armed ? getWeapon(this.armed) : null;
    if (!wdef || (wdef.model && wdef.model.kind === 'fists')) return null;
    try {
      const built = buildWeaponModel(wdef, this.ctx.materials);
      built.group.position.set(0, -0.04, 0);
      built.group.rotation.set(Math.PI / 2, 0, 0);
      this.arms[1].hand.add(built.group);
      this.weaponModel = built.group;
    } catch (err) {
      console.warn('[ped] could not build weapon model', this.armed, err);
    }
    return this.weaponModel;
  }

  dispose() {
    this.ctx.physics.removeDynamic(this);
    this.ctx.scene.remove(this.group);
    this.dead = true;
  }
}
