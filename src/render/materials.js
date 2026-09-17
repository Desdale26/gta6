// materials.js — the PBR material library.
//
// One place where every surface in the game gets its look, so wetness, night-time emissive
// windows and quality settings can be driven globally instead of hunting down meshes.
import * as THREE from 'three';
import { clamp, lerp } from '../core/mathx.js';
import { initProcTex, tex, texSet, signTexture } from './proctex.js';
import { stdMat, physMat, isMinimal } from './matmode.js';

const REPEAT = THREE.RepeatWrapping;

function cfg(map, repeat, aniso) {
  if (!map) return null;
  map.wrapS = map.wrapT = REPEAT;
  if (repeat) map.repeat.set(repeat, repeat);
  map.anisotropy = aniso;
  return map;
}

export class MaterialLibrary {
  constructor(ctx) {
    this.ctx = ctx;
    const caps = ctx.gl ? ctx.gl.capabilities : (ctx.renderer?.renderer?.capabilities || null);
    this.aniso = Math.min(caps ? caps.getMaxAnisotropy() : 4, ctx.settings.preset.anisotropy || 4);
    this.map = new Map();
    this.wetness = 0;
    this.nightFactor = 0;
    this._carPaints = new Map();
    this._tintables = new Map();
    this._emissiveMats = [];
    this._wetMats = [];
    this.ready = false;
  }

  // Both delegate to render/matmode.js so that the ~20 material sites outside this
  // library shade identically. See that file for why minimal exists and why the
  // mode has to be latched before the first material is built.
  _mkStd(opts = {}) { return stdMat(opts); }
  _mkPhys(opts = {}) { return physMat(opts); }

  init() {
    initProcTex(THREE, { anisotropy: this.aniso });
    const A = this.aniso;
    const S = (name, opts) => {
      try { return texSet(name, opts); } catch (e) { console.warn('[materials] texSet', name, e); return {}; }
    };
    const T = (name, opts) => {
      try { return tex(name, opts); } catch (e) { console.warn('[materials] tex', name, e); return null; }
    };

    // ---------------- ground & roads ----------------
    const asphalt = S('asphalt', { size: 512 });
    this.road = this._mkStd({
      name: 'road',
      map: cfg(asphalt.map, 1, A),
      normalMap: cfg(asphalt.normalMap, 1, A),
      roughnessMap: cfg(asphalt.roughnessMap, 1, A),
      roughness: 0.92, metalness: 0.02,
      normalScale: new THREE.Vector2(0.75, 0.75),
      envMapIntensity: 0.35,
    });
    this._wetMats.push({ m: this.road, dryRough: 0.92, wetRough: 0.14, dryEnv: 0.35, wetEnv: 1.5 });

    const conc = S('concrete', { size: 512 });
    this.sidewalk = this._mkStd({
      name: 'sidewalk',
      map: cfg(S('sidewalk', { size: 512 }).map || conc.map, 1, A),
      normalMap: cfg(S('sidewalk', { size: 512 }).normalMap || conc.normalMap, 1, A),
      roughness: 0.94, metalness: 0.0, envMapIntensity: 0.3,
    });
    this._wetMats.push({ m: this.sidewalk, dryRough: 0.94, wetRough: 0.36, dryEnv: 0.3, wetEnv: 0.95 });

    this.ground = this._mkStd({
      name: 'ground',
      vertexColors: true,
      map: cfg(T('groundDetail') || asphalt.map, 1, A),
      normalMap: cfg(asphalt.normalMap, 1, A),
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.97, metalness: 0.0, envMapIntensity: 0.25,
    });
    this._wetMats.push({ m: this.ground, dryRough: 0.97, wetRough: 0.42, dryEnv: 0.25, wetEnv: 0.8 });

    const marks = T('roadLineWhite', { size: 256 });
    this.roadMarking = this._mkStd({
      name: 'roadMarking',
      map: cfg(marks, 1, A),
      transparent: true, alphaTest: 0.28, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      roughness: 0.7, metalness: 0.0,
    });

    // ---------------- buildings ----------------
    this.concrete = this._std('concrete', conc, { roughness: 0.93, envMapIntensity: 0.4 });
    this.brick = this._std('brick', S('brick', { size: 512 }), { roughness: 0.95 });
    this.stucco = this._std('stucco', S('stucco'), { roughness: 0.9 });
    this.warehouse = this._std('warehouseWall', S('warehouseWall'), { roughness: 0.88 });
    this.corrugated = this._std('corrugated', S('corrugated'), { roughness: 0.62, metalness: 0.55 });
    this.metalPanel = this._std('metalPanel', S('metalPanel'), { roughness: 0.42, metalness: 0.8 });
    this.rustMetal = this._std('rustMetal', S('rustMetal'), { roughness: 0.85, metalness: 0.45 });
    this.marble = this._std('marble', S('marble'), { roughness: 0.22, metalness: 0.05, envMapIntensity: 1.1 });
    this.wood = this._std('woodPlank', S('woodPlank'), { roughness: 0.8 });
    this.tile = this._std('tile', S('tile'), { roughness: 0.4, envMapIntensity: 0.8 });
    this.roofTar = this._std('roofTar', S('roofTar') || conc, { roughness: 0.96 });
    this.roofShingle = this._std('roofShingle', S('roofShingle'), { roughness: 0.9 });

    const glassTex = T('glassFacade', { size: 512 });
    // A glass tower in PBR is almost entirely reflected sky: its own albedo map is
    // nearly black, and envMapIntensity 2.2 plus a clearcoat lobe supplied the
    // rest. Minimal has no environment probe and no specular, so multiplying that
    // dark map by white left a black slab in the middle of a sunlit street.
    // Dropping the map and giving it a flat sky tint is both the fix and the
    // honest version of the look — the emissive night-window map is untouched, so
    // the towers still come alive after dark.
    const minimalGlass = isMinimal();
    this.glassFacade = this._mkPhys({
      name: 'glassFacade',
      map: minimalGlass ? null : cfg(glassTex, 1, A),
      color: minimalGlass ? 0x7fa6c8 : 0xffffff,
      roughness: 0.08, metalness: 0.25,
      envMapIntensity: 2.2,
      clearcoat: 0.6, clearcoatRoughness: 0.06,
      emissive: 0x0a1420, emissiveIntensity: 0,
      emissiveMap: cfg(T('glassFacadeLit', { size: 512 }) || glassTex, 1, A),
    });
    this._emissiveMats.push({ m: this.glassFacade, night: 0.55, day: 0 });

    this.officeFacade = this._facade('officeFacade');
    this.apartmentFacade = this._facade('apartmentFacade');
    this.artdeco = this._facade('artdeco');
    this.shopFront = this._facade('shopFront', 0.95);

    this.glass = this._mkPhys({
      name: 'glass', color: 0x9fc8d8, roughness: 0.03, metalness: 0,
      transparent: true, opacity: 0.34, envMapIntensity: 2.6,
      side: THREE.DoubleSide, depthWrite: false,
    });

    // ---------------- vehicles ----------------
    // Same story, smaller: car glass was a near-black tint that only read as glass
    // because it reflected the sky. Flat, it has to carry its own colour.
    this.carGlass = this._mkPhys({
      name: 'carGlass', color: isMinimal() ? 0x5b7488 : 0x121820, roughness: 0.05, metalness: 0.1,
      transparent: true, opacity: 0.62, envMapIntensity: 2.4,
      clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, depthWrite: false,
    });
    this.tire = this._mkStd({
      name: 'tire', color: 0x14141a, roughness: 0.94, metalness: 0.0,
      map: cfg(T('tireTread', { size: 256 }), 1, A),
    });
    this.rimChrome = this._mkStd({ name: 'rimChrome', color: 0xdfe4ea, roughness: 0.14, metalness: 1, envMapIntensity: 2.2 });
    this.rimDark = this._mkStd({ name: 'rimDark', color: 0x2c2f36, roughness: 0.42, metalness: 0.9, envMapIntensity: 1.2 });
    this.chrome = this._mkStd({ name: 'chrome', color: 0xf0f4f8, roughness: 0.08, metalness: 1, envMapIntensity: 2.6 });
    this.carbon = this._std('carbonFibre', S('carbonFibre'), { roughness: 0.28, metalness: 0.4, envMapIntensity: 1.4 });
    this.plasticBlack = this._mkStd({ name: 'plasticBlack', color: 0x16181d, roughness: 0.72, metalness: 0.1 });
    this.plasticGrey = this._mkStd({ name: 'plasticGrey', color: 0x3a3d44, roughness: 0.68, metalness: 0.1 });
    this.leather = this._std('leather', S('leather'), { roughness: 0.72 });
    this.headlightGlass = this._mkPhys({
      name: 'headlightGlass', color: 0xf6f8ff, roughness: 0.06, metalness: 0.0,
      transmission: 0, opacity: 0.85, transparent: true,
      emissive: 0xfff2d0, emissiveIntensity: 0, envMapIntensity: 2.4,
    });
    this.taillightGlass = this._mkStd({
      name: 'taillight', color: 0x5a0a0a, roughness: 0.18, metalness: 0.1,
      emissive: 0xff1a10, emissiveIntensity: 0.2, envMapIntensity: 1.4,
    });
    this.lightbarRed = this._emissive('lightbarRed', 0xff2222, 3);
    this.lightbarBlue = this._emissive('lightbarBlue', 0x3355ff, 3);

    // ---------------- characters ----------------
    this.skin = this._mkStd({ name: 'skin', color: 0xd2a07c, roughness: 0.66, metalness: 0 });
    this.cloth = this._mkStd({ name: 'cloth', color: 0x3a4a6a, roughness: 0.92, metalness: 0 });
    this.denim = this._std('denim', S('denim'), { roughness: 0.94 });
    this.hairMat = this._mkStd({ name: 'hair', color: 0x21160f, roughness: 0.62, metalness: 0.05 });

    // ---------------- nature ----------------
    const foliageTex = T('foliage', { size: 256 });
    this.foliage = this._mkStd({
      name: 'foliage', map: cfg(foliageTex, 1, A), color: 0xffffff,
      alphaTest: 0.42, transparent: false, side: THREE.DoubleSide,
      roughness: 0.86, metalness: 0,
    });
    this.palmFrond = this._mkStd({
      name: 'palmFrond', map: cfg(T('palmFrond', { size: 256 }), 1, A),
      alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.78, metalness: 0,
    });
    this.bark = this._std('palmBark', S('palmBark'), { roughness: 0.92 });
    this.hedge = this._std('hedge', S('hedge'), { roughness: 0.95 });

    // ---------------- misc ----------------
    this.neon = this._emissive('neon', 0xff2d95, 2.6);
    this.neonCyan = this._emissive('neonCyan', 0x22e3ff, 2.6);
    this.streetlightLens = this._emissive('lampLens', 0xffd9a0, 0);
    this._emissiveMats.push({ m: this.streetlightLens, night: 2.6, day: 0 });
    this.fence = this._mkStd({
      name: 'fence', map: cfg(T('chainlink', { size: 256 }), 1, A),
      alphaTest: 0.5, transparent: false, side: THREE.DoubleSide,
      roughness: 0.5, metalness: 0.8,
    });
    this.tarp = this._std('tarp', S('tarp'), { roughness: 0.88 });
    this.sand = this._std('sand', S('sand', { size: 512 }), { roughness: 0.98 });
    this.grassMat = this._std('grass', S('grass', { size: 512 }), { roughness: 0.95 });

    this.blood = new THREE.MeshBasicMaterial({
      name: 'blood', map: cfg(T('bloodSplat', { size: 128 }), 1, A),
      transparent: true, depthWrite: false, opacity: 0.9,
      polygonOffset: true, polygonOffsetFactor: -3,
    });

    // Shared spec for per-vehicle paint instances.
    this.paintFlake = T('carPaintFlake', { size: 256 });
    this.ready = true;
    return this;
  }

  _std(name, set, opts = {}) {
    const A = this.aniso;
    const m = this._mkStd({
      name,
      map: cfg(set.map, 1, A),
      normalMap: cfg(set.normalMap, 1, A),
      roughnessMap: cfg(set.roughnessMap, 1, A),
      roughness: opts.roughness ?? 0.85,
      metalness: opts.metalness ?? 0.0,
      envMapIntensity: opts.envMapIntensity ?? 0.6,
    });
    if (opts.color) m.color.setHex(opts.color);
    this._wetMats.push({ m, dryRough: m.roughness, wetRough: Math.max(0.1, m.roughness * 0.35), dryEnv: m.envMapIntensity, wetEnv: m.envMapIntensity * 2.2 });
    return m;
  }

  _facade(name, emissiveNight = 0.5) {
    const A = this.aniso;
    // Facades now carry real relief, so ask for a strong normal: the window
    // reveals and sills are shallow in world terms and need the help.
    const set = (() => { try { return texSet(name, { size: 512, normalStrength: 3.4 }); } catch (e) { return {}; } })();
    const lit = (() => { try { return tex(name + 'Lit', { size: 512 }); } catch (e) { return null; } })();
    const m = this._mkStd({
      name,
      map: cfg(set.map, 1, A),
      normalMap: cfg(set.normalMap, 1, A),
      roughnessMap: cfg(set.roughnessMap, 1, A),
      // Roughness is now a map: glass comes out near-mirror and the wall
      // stays matte, so the environment only shows up where it should.
      roughness: 0.95, metalness: 0.10, envMapIntensity: 1.25,
      emissive: 0xffffff, emissiveIntensity: 0,
      emissiveMap: lit ? cfg(lit, 1, A) : null,
    });
    if (lit) this._emissiveMats.push({ m, night: emissiveNight, day: 0 });
    this._wetMats.push({ m, dryRough: 0.95, wetRough: 0.45, dryEnv: 1.25, wetEnv: 2.1 });
    return m;
  }

  _emissive(name, color, intensity) {
    return this._mkStd({
      name, color: 0x000000, emissive: color, emissiveIntensity: intensity,
      roughness: 0.4, metalness: 0, toneMapped: true,
    });
  }

  /** A cached car paint material for a colour. */
  carPaint(colorHex, opts = {}) {
    const key = `${colorHex}|${opts.metallic ?? 1}|${opts.matte ? 1 : 0}|${opts.roughness ?? 0.3}`;
    let m = this._carPaints.get(key);
    if (m) return m;
    const matte = !!opts.matte;
    m = this._mkPhys({
      name: 'carPaint' + key,
      color: colorHex,
      metalness: matte ? 0.05 : clamp(opts.metallic ?? 0.85, 0, 1),
      roughness: matte ? 0.72 : clamp(opts.roughness ?? 0.28, 0.03, 1),
      clearcoat: matte ? 0.1 : 1.0,
      clearcoatRoughness: matte ? 0.5 : 0.045,
      envMapIntensity: matte ? 0.6 : 1.8,
      sheen: matte ? 0 : 0.12,
    });
    if (!matte && this.paintFlake) {
      m.normalMap = cfg(this.paintFlake, 6, this.aniso);
      m.normalScale = new THREE.Vector2(0.06, 0.06);
    }
    this._carPaints.set(key, m);
    return m;
  }

  /** A sign / billboard material from rendered text. */
  sign(text, opts = {}) {
    let t = null;
    try { t = signTexture(text, opts); } catch (e) { /* fall through */ }
    const m = this._mkStd({
      name: 'sign:' + text,
      map: t, color: 0xffffff,
      emissive: opts.neon ? new THREE.Color(opts.neonColor ?? 0xff2d95) : 0x000000,
      emissiveMap: opts.neon ? t : null,
      emissiveIntensity: 0,
      roughness: 0.6, metalness: 0.1,
      transparent: !!opts.transparent, alphaTest: opts.transparent ? 0.3 : 0,
      side: THREE.DoubleSide,
    });
    if (opts.neon) this._emissiveMats.push({ m, night: opts.intensity ?? 2.2, day: opts.dayIntensity ?? 0.25 });
    return m;
  }

  registerEmissive(m, night, day = 0) { this._emissiveMats.push({ m, night, day }); return m; }

  /**
   * A vertex-coloured variant of a library material. Static world geometry bakes its tint
   * into vertex colours instead of cloning a material per colour, which is what lets the
   * whole city merge down to a few hundred draw calls.
   */
  tintable(name) {
    const key = 'tintable:' + name;
    let m = this._tintables.get(key);
    if (m) return m;
    const base = this[name] || this.concrete;
    m = base.clone();
    m.name = key;
    m.vertexColors = true;
    m.color.setHex(0xffffff);
    this._tintables.set(key, m);
    // Keep the clone in step with night-time and wet-weather driving.
    for (const e of this._emissiveMats) {
      if (e.m === base) { this._emissiveMats.push({ m, night: e.night, day: e.day }); break; }
    }
    for (const w of this._wetMats) {
      if (w.m === base) { this._wetMats.push({ m, dryRough: w.dryRough, wetRough: w.wetRough, dryEnv: w.dryEnv, wetEnv: w.wetEnv }); break; }
    }
    return m;
  }

  /** Drive night-time emissives and wet-surface response. */
  update(nightFactor, wetness) {
    if (Math.abs(nightFactor - this.nightFactor) > 0.004) {
      this.nightFactor = nightFactor;
      for (const e of this._emissiveMats) {
        e.m.emissiveIntensity = lerp(e.day, e.night, nightFactor);
      }
    }
    if (Math.abs(wetness - this.wetness) > 0.004) {
      this.wetness = wetness;
      for (const w of this._wetMats) {
        w.m.roughness = lerp(w.dryRough, w.wetRough, wetness);
        w.m.envMapIntensity = lerp(w.dryEnv, w.wetEnv, wetness);
      }
    }
  }

  dispose() {
    for (const m of [...this._carPaints.values()]) m.dispose();
    this._carPaints.clear();
  }
}
