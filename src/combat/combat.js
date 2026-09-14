// combat.js — bullets, rockets, grenades, fire and explosions.
//
// Hitscan rounds resolve against the same physics world everything else uses; slower
// projectiles are stepped so you can see and dodge them. Damage falls off with range,
// hit zones matter, and explosions push, burn and shatter whatever they reach.
import * as THREE from 'three';
import { clamp, lerp } from '../core/mathx.js';
import { LAYER, MASK_BULLET, MASK_SOLID, SURFACE } from '../physics/world.js';
import { getWeapon } from '../content/weaponCatalog.js';
import { applySpread } from './weapons.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
// The tracer's far end gets its own scratch. Writing it into _v1 aliased the
// caller's `origin` whenever the caller had built that in _v1 too -- which
// npcFire does -- so `from` and `to` arrived at _tracer as the same object and
// every shot an NPC fired drew a tracer of zero length.
const _tracerEnd = new THREE.Vector3();
const _scratch = [];

const MAX_PROJECTILES = 160;
const MAX_TRACERS = 120;

export class CombatSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.projectiles = [];
    this.tracerPool = [];
    this.fires = [];
    this.pickups = [];

    // Tracers are one buffered LineSegments mesh — cheap even with a minigun going.
    const geo = new THREE.BufferGeometry();
    this.tracerPos = new Float32Array(MAX_TRACERS * 6);
    this.tracerAlpha = new Float32Array(MAX_TRACERS * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.tracerPos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.tracerAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xffd070) } },
      vertexShader: `attribute float aAlpha; varying float vA;
        void main(){ vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying float vA;
        void main(){ if (vA <= 0.01) discard; gl_FragColor = vec4(uColor, vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.tracerMesh = new THREE.LineSegments(geo, mat);
    this.tracerMesh.frustumCulled = false;
    this.tracerMesh.renderOrder = 8;
    ctx.scene.add(this.tracerMesh);
    this.tracers = [];

    // Rocket / grenade meshes come from a small pool.
    this.projGeo = new THREE.SphereGeometry(0.09, 7, 6);
    this.rocketGeo = new THREE.CapsuleGeometry(0.06, 0.24, 2, 7);
    this.projMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.6, metalness: 0.4 });
    this.rocketMat = new THREE.MeshStandardMaterial({ color: 0x6a6a70, roughness: 0.4, metalness: 0.7, emissive: 0xff6020, emissiveIntensity: 0.6 });
    this.molotovMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.2, metalness: 0.1, emissive: 0xff7020, emissiveIntensity: 1.2 });
  }

  // -------------------------------------------------------------------------
  // Hitscan / bullets
  // -------------------------------------------------------------------------
  fireBullet(source, def, origin, dir, opts = {}) {
    const ctx = this.ctx;
    const phys = ctx.physics;
    let remaining = def.range;
    let ox = origin.x, oy = origin.y, oz = origin.z;
    let penetration = def.penetration || 0;
    let travelled = 0;
    let lastHit = null;

    for (let pass = 0; pass < 3; pass++) {
      const hit = phys.raycast(ox, oy, oz, dir.x, dir.y, dir.z, remaining, MASK_BULLET, { ignore: source });
      if (!hit.hit) {
        if (opts.tracer) this._tracer(origin, _tracerEnd.set(ox + dir.x * remaining, oy + dir.y * remaining, oz + dir.z * remaining));
        return null;
      }
      travelled += hit.dist;
      lastHit = { x: hit.px, y: hit.py, z: hit.pz, nx: hit.nx, ny: hit.ny, nz: hit.nz,
        surface: hit.surface, entity: hit.entity, layer: hit.layer, collider: hit.collider };

      const damage = this._damageAtRange(def, travelled);
      this._applyHit(source, def, lastHit, dir, damage, opts);

      if (opts.tracer && pass === 0) this._tracer(origin, _tracerEnd.set(hit.px, hit.py, hit.pz));

      // Penetration: keep going through thin cover and bodies.
      const canPass = penetration > 0.05
        && (hit.layer === LAYER.PED || hit.layer === LAYER.GLASS
            || (hit.layer === LAYER.PROP && penetration > 0.4));
      if (!canPass) break;
      penetration *= 0.5;
      remaining -= hit.dist + 0.35;
      if (remaining <= 0.5) break;
      ox = hit.px + dir.x * 0.3; oy = hit.py + dir.y * 0.3; oz = hit.pz + dir.z * 0.3;
    }
    return lastHit;
  }

  _damageAtRange(def, dist) {
    if (dist <= def.falloffStart) return def.damage;
    if (dist >= def.falloffEnd) return def.damage * def.minDamageFrac;
    const t = (dist - def.falloffStart) / Math.max(1e-3, def.falloffEnd - def.falloffStart);
    return def.damage * lerp(1, def.minDamageFrac, t);
  }

  _applyHit(source, def, hit, dir, damage, opts = {}) {
    const ctx = this.ctx;
    const ent = hit.entity;

    ctx.particles?.spawnImpact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz,
      ent && ent.isPed ? 'flesh' : hit.surface);

    if (ent && ent.isPed) {
      // Hit zones: head, torso, limbs by height on the body.
      const rel = hit.y - ent.body.position.y;
      const h = ent.height;
      let mult = def.limbMult;
      let zone = 'limb';
      if (rel > h * 0.86) { mult = def.headshotMult; zone = 'head'; }
      else if (rel > h * 0.45) { mult = 1; zone = 'torso'; }
      const dmg = damage * mult;
      const killed = ent.damage(dmg, { source, zone, direction: dir });
      ctx.particles?.spawnBlood(hit.x, hit.y, hit.z, dir.x, dir.y + 0.3, dir.z, zone === 'head' ? 2 : 1);
      ctx.audio?.playAt('impactFlesh', hit, { volume: 0.6 });
      if (ent.ragdoll) ent.ragdoll.impulse(dir.x * 6, 2, dir.z * 6, hit.x, hit.z, 1.2);
      ctx.bus.emit('combat:hit', { target: ent, source, killed, zone, damage: dmg, headshot: zone === 'head' });
      return;
    }

    if (ent && ent.isVehicle) {
      ent.damage(damage * 0.55, hit.x, hit.y, hit.z, source);
      ctx.audio?.playAt('impactMetal', hit, { volume: 0.5 });
      ctx.decals?.addBulletHole(hit, 0.1);
      // A round that lands on a wheel blows the tyre rather than denting a
      // panel — the car keeps going, badly, which is far more interesting than
      // a slightly lower health bar.
      const blown = ent.sim?.blowTyreNear?.(hit.x, hit.y, hit.z, 0.55);
      if (blown) {
        ctx.audio?.playAt('tyreBlowout', hit, { volume: 0.8, maxDistance: 70 });
        ctx.particles?.spawnSmoke(hit.x, hit.y, hit.z, 0.7, 0x2a2a2e, 0.9);
        ctx.bus.emit('vehicle:tyreBlown', { vehicle: ent, source });
      }
      // Hitting an occupied car hurts whoever is in it.
      if (ent.driver && Math.random() < 0.35) {
        const killed = ent.driver.damage ? ent.driver.damage(damage * 0.4, { source }) : false;
        ctx.bus.emit('combat:hit', { target: ent.driver, source, killed, damage: damage * 0.4 });
      }
      ctx.bus.emit('combat:vehicleHit', { vehicle: ent, source, damage });
      return;
    }

    // Static world: decal + maybe break it.
    ctx.decals?.addBulletHole(hit, 0.12);
    ctx.audio?.playAt(impactSoundFor(hit.surface), hit, { volume: 0.45, maxDistance: 60 });
    if (hit.collider && hit.collider.breakable) this._damageCollider(hit.collider, damage, hit, source);
  }

  _damageCollider(collider, damage, hit, source) {
    collider.hp -= damage;
    if (collider.hp > 0) return;
    const ctx = this.ctx;
    const b = collider.breakable;
    ctx.particles?.spawnDebris(collider.x, collider.y, collider.z, 10,
      b.debris === 'glass' ? 0xcfe8f0 : b.debris === 'wood' ? 0xa9834f : b.debris === 'metal' ? 0x999999 : 0x777777, 6);
    ctx.audio?.playAt(b.debris === 'glass' ? 'glassBreak' : 'impactWood', collider, { volume: 0.7 });
    if (b.explosive) {
      this.explode(collider.x, collider.y + 0.4, collider.z, { radius: 7, damage: 120, force: 14000, source });
    }
    ctx.physics.removeStatic(collider);
    ctx.bus.emit('prop:broken', { collider, source });
  }

  // -------------------------------------------------------------------------
  // Projectiles
  // -------------------------------------------------------------------------
  fireRocket(source, def, origin, dir) {
    if (this.projectiles.length >= MAX_PROJECTILES) return null;
    const mesh = new THREE.Mesh(this.rocketGeo, this.rocketMat);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(_v1.set(0, 1, 0), dir);
    this.ctx.scene.add(mesh);
    const p = {
      kind: 'rocket', mesh, def, source,
      pos: new THREE.Vector3().copy(origin),
      vel: new THREE.Vector3().copy(dir).multiplyScalar(def.muzzleVelocity || 70),
      life: 7, gravity: -1.2, armed: 0.06,
      homing: def.homing || 0,
      target: def.homing > 0 ? this._acquireTarget(origin, dir, def, source) : null,
    };
    this.projectiles.push(p);
    return p;
  }

  /**
   * Picks the most plausible thing a guided rocket was pointed at: the closest
   * candidate inside a forward cone, weighted so a distant target dead ahead
   * beats a near one out at the edge. Vehicles win ties over people, which is
   * what a thermal seeker would do and what the player expects.
   */
  _acquireTarget(origin, dir, def, source) {
    const ctx = this.ctx;
    const maxDist = def.range || 300;
    const minDot = 0.94; // ~20 degrees half-angle
    let best = null, bestScore = -Infinity;
    const consider = (ent, x, y, z, bias) => {
      if (!ent || ent === source || ent.dead || ent.destroyed) return;
      _v2.set(x - origin.x, y - origin.y, z - origin.z);
      const d = _v2.length();
      if (d < 6 || d > maxDist) return;
      _v2.divideScalar(d);
      const dot = _v2.dot(dir);
      if (dot < minDot) return;
      const score = bias * (dot - minDot) / (1 - minDot) - d / maxDist;
      if (score > bestScore) { bestScore = score; best = ent; }
    };
    if (ctx.traffic) {
      for (const v of ctx.traffic.all()) consider(v, v.position.x, v.position.y + 0.8, v.position.z, 1.6);
    }
    if (ctx.peds) {
      for (const ped of ctx.peds.peds) consider(ped, ped.position.x, ped.position.y + 1.0, ped.position.z, 1.0);
    }
    return best;
  }

  /** Point of aim for a locked rocket, or null if the target is gone. */
  _targetPoint(ent, out) {
    if (!ent || ent.dead || ent.destroyed) return null;
    const p = ent.position;
    if (!p) return null;
    return out.set(p.x, p.y + (ent.isVehicle ? 0.7 : 1.0), p.z);
  }

  throwProjectile(source, def, origin, dir, charge = 1) {
    if (this.projectiles.length >= MAX_PROJECTILES) return null;
    const molotov = def.projectile === 'molotov';
    const mesh = new THREE.Mesh(this.projGeo, molotov ? this.molotovMat : this.projMat);
    mesh.position.copy(origin);
    this.ctx.scene.add(mesh);
    const speed = (def.muzzleVelocity || 18) * clamp(charge, 0.35, 1.3);
    const p = {
      kind: molotov ? 'molotov' : 'grenade', mesh, def, source,
      pos: new THREE.Vector3().copy(origin),
      vel: new THREE.Vector3(dir.x, dir.y + 0.28, dir.z).normalize().multiplyScalar(speed),
      spin: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
      life: def.explosive?.fuse ?? 3.2,
      gravity: this.ctx.physics.gravity,
      bounces: 0, armed: 0.1,
    };
    this.projectiles.push(p);
    return p;
  }

  fireFlame(source, def, origin, dir) {
    const ctx = this.ctx;
    // Flamethrower: short-range cone of damage plus a lot of particles.
    for (let i = 0; i < 3; i++) {
      _v1.copy(dir);
      applySpread(_v1, 0.11);
      const d = 2 + Math.random() * (def.range - 2);
      const hit = ctx.physics.raycast(origin.x, origin.y, origin.z, _v1.x, _v1.y, _v1.z,
        d, MASK_BULLET, { ignore: source });
      const end = hit.hit ? hit.dist : d;
      const px = origin.x + _v1.x * end, py = origin.y + _v1.y * end, pz = origin.z + _v1.z * end;
      ctx.particles?.spawnFire(px, py, pz, 1.4);
      if (hit.hit && hit.entity && hit.entity.isPed) {
        hit.entity.damage(def.damage * 0.34, { source, burning: true });
        ctx.particles?.spawnFire(hit.px, hit.py + 0.8, hit.pz, 1.6);
      } else if (hit.hit && hit.entity && hit.entity.isVehicle) {
        hit.entity.damage(def.damage * 0.25, hit.px, hit.py, hit.pz, source);
      }
    }
    if (Math.random() < 0.25) this.addFire(origin.x + dir.x * 5, origin.z + dir.z * 5, 2.5, source);
  }

  updateProjectiles(dt) {
    const ctx = this.ctx;
    const phys = ctx.physics;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.armed -= dt;

      const step = p.vel.clone().multiplyScalar(dt);
      const dist = step.length();
      let exploded = false;

      if (dist > 1e-4 && p.armed <= 0) {
        _v1.copy(step).divideScalar(dist);
        const hit = phys.raycast(p.pos.x, p.pos.y, p.pos.z, _v1.x, _v1.y, _v1.z, dist + 0.2,
          MASK_BULLET, { ignore: p.source });
        if (hit.hit) {
          if (p.kind === 'rocket' || p.kind === 'molotov') {
            this._detonate(p, hit.px, hit.py, hit.pz);
            exploded = true;
          } else {
            // Grenades bounce.
            p.pos.set(hit.px + hit.nx * 0.1, hit.py + hit.ny * 0.1, hit.pz + hit.nz * 0.1);
            const dot = p.vel.x * hit.nx + p.vel.y * hit.ny + p.vel.z * hit.nz;
            p.vel.x -= 2 * dot * hit.nx; p.vel.y -= 2 * dot * hit.ny; p.vel.z -= 2 * dot * hit.nz;
            p.vel.multiplyScalar(0.42);
            p.bounces++;
            if (p.vel.length() > 2) ctx.audio?.playAt('grenadeBounce', p.pos, { volume: 0.4, maxDistance: 45 });
          }
        }
      }
      if (exploded) { this._removeProjectile(i); continue; }

      p.vel.y += p.gravity * dt;
      if (p.kind === 'rocket') {
        // Guided rockets bend toward their lock before the motor's thrust is
        // applied, so steering authority falls off as the thing speeds up —
        // exactly why you fire these early and let them do the work.
        if (p.homing > 0 && p.armed <= 0) {
          const aim = this._targetPoint(p.target, _v3);
          if (!aim) {
            p.target = null; p.homing = 0;
          } else {
            const speed = p.vel.length();
            _v2.copy(aim).sub(p.pos);
            const d = _v2.length();
            if (d > 0.5) {
              _v2.divideScalar(d);
              // Turn rate in rad/s, tapered by speed so it cannot loop on itself.
              const turn = p.homing * 3.4 * Math.min(1, 90 / Math.max(20, speed)) * dt;
              p.vel.normalize().lerp(_v2, Math.min(1, turn)).normalize().multiplyScalar(speed);
              p.gravity = 0; // the seeker holds it up
            }
          }
        }
        // Rockets accelerate and trail smoke.
        p.vel.addScaledVector(_v2.copy(p.vel).normalize(), 55 * dt);
        ctx.particles?.spawnSmoke(p.pos.x, p.pos.y, p.pos.z, 0.35, 0x888888, 0.4);
        ctx.particles?.spawnGlow(p.pos.x, p.pos.y, p.pos.z, 0xff7a30, 0.5, 0.1);
      } else if (p.kind === 'molotov') {
        ctx.particles?.spawnFire(p.pos.x, p.pos.y, p.pos.z, 0.6);
      }
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      if (p.spin) {
        p.mesh.rotation.x += p.spin.x * dt;
        p.mesh.rotation.y += p.spin.y * dt;
        p.mesh.rotation.z += p.spin.z * dt;
      } else {
        p.mesh.quaternion.setFromUnitVectors(_v1.set(0, 1, 0), _v2.copy(p.vel).normalize());
      }

      if (p.life <= 0) {
        this._detonate(p, p.pos.x, p.pos.y, p.pos.z);
        this._removeProjectile(i);
      }
    }
  }

  _removeProjectile(i) {
    const p = this.projectiles[i];
    this.ctx.scene.remove(p.mesh);
    this.projectiles.splice(i, 1);
  }

  _detonate(p, x, y, z) {
    const e = p.def.explosive;
    if (!e) return;
    if (p.kind === 'molotov') {
      this.addFire(x, z, e.radius || 4, p.source);
      this.ctx.audio?.playAt('fireLoop', { x, y, z }, { volume: 0.6 });
      this.explode(x, y, z, { radius: e.radius * 0.6, damage: e.damage * 0.4, force: e.force * 0.3, source: p.source, fiery: true, quiet: true });
      return;
    }
    this.explode(x, y, z, { radius: e.radius, damage: e.damage, force: e.force, source: p.source });
  }

  // -------------------------------------------------------------------------
  // Explosions
  // -------------------------------------------------------------------------
  explode(x, y, z, opts = {}) {
    const ctx = this.ctx;
    const radius = opts.radius ?? 8;
    const damage = opts.damage ?? 150;
    const force = opts.force ?? 16000;
    const source = opts.source || null;

    ctx.particles?.spawnExplosion(x, y, z, radius);
    if (!opts.quiet) {
      ctx.audio?.playAt(radius > 11 ? 'explosionBig' : 'explosion', { x, y, z },
        { volume: 1, maxDistance: 520, reverb: 1 });
    }
    ctx.decals?.addScorch(x, ctx.physics.groundHeight(x, z) + 0.02, z, radius * 0.55);
    ctx.cameraRig?.shake(clamp(radius * 0.16, 0.3, 2.2), 0.7);
    ctx.renderer?.grade && (ctx.renderer.grade.uFlash.value = Math.min(0.5, radius * 0.03));

    // A momentary light makes the blast read properly at night.
    const light = new THREE.PointLight(0xff9040, radius * 7, radius * 6, 1.8);
    light.position.set(x, y + 1, z);
    ctx.scene.add(light);
    let t = 0;
    const fade = () => {
      t += 0.05;
      light.intensity = Math.max(0, radius * 7 * (1 - t / 0.45));
      if (t < 0.45) setTimeout(fade, 50);
      else ctx.scene.remove(light);
    };
    setTimeout(fade, 40);

    // --- peds ---
    if (ctx.peds) {
      for (const p of ctx.peds.peds) {
        const dx = p.body.position.x - x, dy = p.body.position.y + 0.9 - y, dz = p.body.position.z - z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > radius * 1.6) continue;
        // Line of sight — a wall between you and a blast counts for something.
        const blocked = this._blocked(x, y, z, p.body.position.x, p.body.position.y + 0.9, p.body.position.z, p);
        const falloff = clamp(1 - d / radius, 0, 1) * (blocked ? 0.32 : 1);
        if (falloff <= 0.02) continue;
        if (!p.dead) p.damage(damage * falloff, { source, explosion: true });
        const k = (force / 900) * falloff;
        const inv = 1 / Math.max(d, 0.5);
        p.shove(dx * inv * k, Math.abs(dy) * inv * k + k * 0.8, dz * inv * k);
      }
      ctx.peds.panic(x, z, radius * 4.5, source, 1.5);
    }

    // --- vehicles ---
    if (ctx.traffic) {
      for (const v of ctx.traffic.all()) {
        if (v.dead) continue;
        const dx = v.sim.position.x - x, dy = v.sim.position.y - y, dz = v.sim.position.z - z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > radius * 1.7) continue;
        const falloff = clamp(1 - d / (radius * 1.2), 0, 1);
        const inv = 1 / Math.max(d, 0.8);
        // The impulse is in newton-seconds and the same for everything, so the
        // velocity it imparts goes as 1/mass: a 124 kg scooter took 145 m/s off
        // one grenade and sat pinned against the sim's own 140 m/s ceiling.
        // Heavier things still move less; nothing gets launched into orbit.
        const MAX_BLAST_DV = 26;
        const mag = force * falloff * 1.17;              // incl. the vertical term
        const cap = Math.min(1, (MAX_BLAST_DV * v.sim.mass) / Math.max(mag, 1e-3));
        const imp = force * falloff * cap;
        v.sim.applyImpulseAt(dx * inv * imp, (Math.abs(dy) * inv + 0.6) * imp, dz * inv * imp,
          v.sim.position.x, v.sim.position.y - 0.2, v.sim.position.z);
        if (v !== source) v.damage(damage * falloff * 2.2, x, y, z, source);
      }
    }

    // --- player ---
    const player = ctx.player;
    if (player && !player.dead) {
      const dx = player.position.x - x, dy = player.position.y + 0.9 - y, dz = player.position.z - z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < radius * 1.5) {
        const falloff = clamp(1 - d / radius, 0, 1);
        if (falloff > 0.02) {
          player.damage(damage * falloff * 0.8, { source, explosion: true });
          const k = (force / 1100) * falloff;
          const inv = 1 / Math.max(d, 0.5);
          if (player.vehicle) {
            player.vehicle.sim.applyImpulseAt(dx * inv * force * falloff, force * falloff * 0.5, dz * inv * force * falloff,
              player.vehicle.sim.position.x, player.vehicle.sim.position.y, player.vehicle.sim.position.z);
          } else {
            player.body.externalVelocity.set(dx * inv * k, Math.abs(dy) * inv * k + k * 0.7, dz * inv * k);
          }
        }
      }
    }

    // --- breakable props ---
    const list = ctx.physics.overlapSphereStatic(x, y, z, radius, _scratch);
    for (const c of list) {
      if (!c.breakable) continue;
      this._damageCollider(c, damage, { x: c.x, y: c.y, z: c.z }, source);
    }

    ctx.bus.emit('explosion', { x, y, z, radius, damage, source });
  }

  _blocked(x0, y0, z0, x1, y1, z1, ignore) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 0.5) return false;
    const hit = this.ctx.physics.raycast(x0, y0, z0, dx / d, dy / d, dz / d, d - 0.4,
      LAYER.BUILDING | LAYER.PROP | LAYER.RAMP, { ignore });
    return hit.hit;
  }

  // -------------------------------------------------------------------------
  // Lingering fire
  // -------------------------------------------------------------------------
  addFire(x, z, radius, source) {
    if (this.fires.length > 24) this.fires.shift();
    this.fires.push({
      x, z, y: this.ctx.physics.groundHeight(x, z), radius, life: 11 + Math.random() * 6,
      source, tick: 0,
    });
    this.ctx.decals?.addScorch(x, this.ctx.physics.groundHeight(x, z) + 0.02, z, radius * 0.7);
  }

  updateFires(dt) {
    const ctx = this.ctx;
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.life -= dt;
      if (f.life <= 0) { this.fires.splice(i, 1); continue; }
      const intensity = clamp(f.life / 4, 0.2, 1);
      if (ctx.particles) {
        const n = Math.ceil(f.radius * 0.8);
        for (let k = 0; k < n; k++) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * f.radius;
          ctx.particles.spawnFire(f.x + Math.cos(a) * r, f.y + 0.2, f.z + Math.sin(a) * r, intensity);
        }
        if (Math.random() < 0.4) ctx.particles.spawnSmoke(f.x, f.y + 1.5, f.z, 1.3, 0x2a2a2a, 0.4);
      }
      f.tick -= dt;
      if (f.tick <= 0) {
        f.tick = 0.4;
        // burn whoever stands in it
        if (ctx.peds) {
          for (const p of ctx.peds.peds) {
            if (p.dead) continue;
            if (Math.hypot(p.body.position.x - f.x, p.body.position.z - f.z) < f.radius) {
              p.damage(9, { source: f.source, burning: true });
              p.fear = 1.6;
            }
          }
        }
        const player = ctx.player;
        if (player && !player.dead && !player.vehicle
            && Math.hypot(player.position.x - f.x, player.position.z - f.z) < f.radius) {
          player.damage(7, { source: f.source, burning: true });
        }
        if (ctx.traffic) {
          for (const v of ctx.traffic.all()) {
            if (v.dead || v.sim.exploded) continue;
            if (Math.hypot(v.sim.position.x - f.x, v.sim.position.z - f.z) < f.radius + 1.5) {
              v.damage(26, f.x, f.y, f.z, f.source);
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  npcFire(shooter, target, weaponId) {
    const def = getWeapon(weaponId) || getWeapon('pistol-9');
    if (!def) return;
    const origin = _v1.copy(shooter.body ? shooter.body.position : shooter.position);
    origin.y += (shooter.height || 1.78) * 0.78;
    const tp = _v2.copy(target.position);
    tp.y += 1.0;
    const dir = _v3.copy(tp).sub(origin).normalize();
    // NPCs are deliberately not laser-accurate.
    const skill = clamp((shooter.stats?.awareness ?? 0.5), 0.1, 1);
    applySpread(dir, (def.spread.hip * 1.6 * (1.3 - skill)) * Math.PI / 180);
    this.ctx.particles?.spawnMuzzleFlash(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, 0.8);
    this.ctx.audio?.playAt(def.silenced ? 'gunSilenced' : 'gunPistol', origin, { volume: 0.7, maxDistance: 260 });
    this.fireBullet(shooter, def, origin, dir, { tracer: true });
    this.ctx.bus.emit('npc:fired', { shooter, target });
  }

  // -------------------------------------------------------------------------
  _tracer(from, to) {
    if (this.tracers.length >= MAX_TRACERS) this.tracers.shift();
    this.tracers.push({ x0: from.x, y0: from.y, z0: from.z, x1: to.x, y1: to.y, z1: to.z, life: 0.07 });
  }

  update(dt) {
    this.updateProjectiles(dt);
    this.updateFires(dt);
    // tracers
    let n = 0;
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) { this.tracers.splice(i, 1); continue; }
    }
    for (let i = 0; i < this.tracers.length && n < MAX_TRACERS; i++, n++) {
      const t = this.tracers[i];
      const o = n * 6;
      this.tracerPos[o] = t.x0; this.tracerPos[o + 1] = t.y0; this.tracerPos[o + 2] = t.z0;
      this.tracerPos[o + 3] = t.x1; this.tracerPos[o + 4] = t.y1; this.tracerPos[o + 5] = t.z1;
      const a = clamp(t.life / 0.07, 0, 1);
      this.tracerAlpha[n * 2] = a * 0.1;
      this.tracerAlpha[n * 2 + 1] = a;
    }
    const geo = this.tracerMesh.geometry;
    geo.setDrawRange(0, n * 2);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  }

  clear() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) this._removeProjectile(i);
    this.fires.length = 0;
    this.tracers.length = 0;
  }
}

function impactSoundFor(surface) {
  switch (surface) {
    case SURFACE.METAL: return 'impactMetal';
    case SURFACE.GLASS: return 'impactGlass';
    case SURFACE.WOOD: return 'impactWood';
    case SURFACE.WATER: return 'impactWater';
    case SURFACE.SAND: case SURFACE.DIRT: case SURFACE.GRASS: return 'impactConcrete';
    default: return 'impactConcrete';
  }
}
