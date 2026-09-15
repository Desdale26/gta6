// sky.js — atmosphere, sun, moon, stars and clouds, plus the image-based lighting probe
// that every reflective surface in the city samples.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, TAU } from '../core/mathx.js';

// How much DAYLIGHT the city gets.
//
// Every daylight number in the palette below was tuned before three.js moved to
// physical lighting units, and nothing re-tuned them afterwards, so the city has
// been lit at roughly a fifth of daylight ever since. Measured at half past
// twelve under a clear sky: a street view wrote 0.044 in linear light, where a
// correctly exposed midday street sits nearer 0.3. That is the entire reason
// the game looked, in the player's words, like the graphics sucked — not the
// materials, not the models, not the post chain. It was dark.
//
// Daylight, and only daylight. The first version of this multiplied everything
// the sky emits, night included, and the lighting-levels scenario caught it
// immediately: the ambient floor a clear night sits on went from 1.09 to 2.45
// against a ceiling of 1.6, and rain at night to 2.72. Night was never the
// broken case — it is lit by the moon, the street-light pool and a lot of
// emissive neon, none of which went through the units change — so washing it
// out would have traded one bad-looking game for another, and thrown away the
// entire street-light system on the way. The sun and the daylight half of the
// sky fill are gained; the night floor and the moon are left exactly as they
// were.
//
// 2.8 was the first value that made the city visible and it washed the road out
// to pale grey. 2.15 keeps the asphalt reading as asphalt and keeps the key
// light under the ceiling that same scenario puts on it.
const DAY_GAIN = 2.15;

const SKY_VERT = /* glsl */`
  varying vec3 vWorldDir;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(wp.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position.z = gl_Position.w;             // always at the far plane
  }
`;

const SKY_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vWorldDir;
  uniform vec3 uSunDir, uMoonDir;
  uniform vec3 uZenith, uHorizon, uGround;
  uniform vec3 uSunColor, uMoonColor;
  uniform float uSunIntensity, uMoonIntensity;
  uniform float uTurbidity, uMie, uNight, uTime;
  uniform float uCloudCover, uCloudSpeed, uStorm;
  uniform vec3 uFogColor;

  float hash(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  // Cheap star field: hash the direction onto a grid and keep the brightest cells.
  float stars(vec3 d){
    vec3 s = d * 220.0;
    vec3 i = floor(s);
    float h = hash(i.xy + i.z * 37.0);
    if (h < 0.9965) return 0.0;
    vec3 f = fract(s) - 0.5;
    float d2 = dot(f, f);
    float tw = 0.65 + 0.35 * sin(uTime * (1.5 + h * 9.0) + h * 60.0);
    return smoothstep(0.16, 0.0, d2) * tw * (0.4 + (h - 0.9965) * 190.0);
  }

  void main(){
    vec3 dir = normalize(vWorldDir);
    float up = dir.y;
    float h = clamp(up * 0.5 + 0.5, 0.0, 1.0);

    // --- base gradient ---
    float t = pow(clamp(up, 0.0, 1.0), 0.42);
    vec3 sky = mix(uHorizon, uZenith, t);
    if (up < 0.0) sky = mix(uHorizon, uGround, clamp(-up * 2.4, 0.0, 1.0));

    // --- Rayleigh-ish sun glow near the horizon ---
    float sunDot = max(dot(dir, uSunDir), 0.0);
    float sunAlt = clamp(uSunDir.y, -1.0, 1.0);
    float horizonBoost = pow(1.0 - abs(up), 5.0);
    vec3 scatter = uSunColor * (pow(sunDot, 6.0) * 0.45 + pow(sunDot, 1.6) * 0.12) * uTurbidity;
    scatter += uSunColor * horizonBoost * 0.35 * smoothstep(-0.22, 0.30, sunAlt);
    sky += scatter * uSunIntensity;

    // --- Mie halo + sun disc ---
    float disc = smoothstep(0.99955, 0.99985, sunDot);
    sky += uSunColor * disc * 14.0 * uSunIntensity;
    sky += uSunColor * pow(sunDot, 220.0) * 2.2 * uMie * uSunIntensity;

    // --- moon + stars ---
    if (uNight > 0.01){
      float moonDot = max(dot(dir, uMoonDir), 0.0);
      float moonDisc = smoothstep(0.9993, 0.99975, moonDot);
      // simple crater shading on the disc
      vec3 mn = normalize(dir - uMoonDir * dot(dir, uMoonDir));
      float crat = 0.82 + 0.18 * fbm(mn.xz * 140.0);
      sky += uMoonColor * moonDisc * 9.0 * uMoonIntensity * crat;
      sky += uMoonColor * pow(moonDot, 90.0) * 0.55 * uMoonIntensity;
      sky += vec3(0.85, 0.9, 1.0) * stars(dir) * uNight * (1.0 - uCloudCover * 0.85);
    }

    // --- clouds ---
    if (up > -0.03){
      vec2 cuv = dir.xz / max(up + 0.14, 0.02);
      cuv *= 0.34;
      cuv += vec2(uTime * uCloudSpeed * 0.006, uTime * uCloudSpeed * 0.0035);
      float c = fbm(cuv * 1.4);
      float c2 = fbm(cuv * 3.1 + 17.3);
      float cover = uCloudCover;
      float density = smoothstep(1.0 - cover, 1.0 - cover + 0.34, c * 0.72 + c2 * 0.28);
      density *= smoothstep(-0.02, 0.14, up);
      // light the clouds from the sun side
      float lighting = clamp(dot(normalize(vec3(dir.x, max(up, 0.05), dir.z)), uSunDir) * 0.5 + 0.5, 0.0, 1.0);
      vec3 lit = mix(uFogColor * 0.42, uSunColor * 1.05 + uFogColor * 0.5, pow(lighting, 1.6));
      // Storm cloud is dark slate, not black. Crushing it to a quarter — which
      // is what this collapsed to at full storm — made the sky itself the
      // darkest thing on screen during an afternoon thunderstorm.
      lit *= 1.0 - uStorm * 0.26;
      sky = mix(sky, lit, clamp(density * (0.55 + 0.45 * cover), 0.0, 0.97));
    }

    // --- horizon haze ---
    sky = mix(sky, uFogColor, pow(1.0 - clamp(abs(up) * 2.6, 0.0, 1.0), 3.0) * 0.55);

    gl_FragColor = vec4(max(sky, vec3(0.0)), 1.0);
  }
`;

/** Keyframed sky/lighting palette across a 24 h day.
 *
 * `amb` is the hemisphere light's sky colour — the fill that lands on every
 * surface the sun is not hitting. At midday and mid-afternoon it is correctly a
 * cool blue (0xa8c2e2, 0x9db2cc), because that is what the sky overhead is. At
 * dawn and dusk it had been set warm instead (0x8e7466, 0xb08464, 0x8a5f66),
 * following the horizon rather than the sky, and the result was that the key
 * light and the fill were both orange and a sunset had no second colour in it
 * anywhere: road, pavement, walls and people all came out the same red, which
 * reads as a filter over the picture rather than as light in a city. The sun
 * goes orange at dusk; the sky above it stays blue, and that contrast is the
 * whole of what golden hour looks like. These three are now sampled toward
 * their own zenith, keeping a little of the warmth but not the monochrome.
 */
const DAY_KEYS = [
  { h: 0.0, zenith: 0x060a1a, horizon: 0x121631, ground: 0x08080f, sun: 0x223055, amb: 0x38415f, fog: 0x121730, sunI: 0.05, ambI: 0.55, night: 1.0, exposure: 1.5 },
  { h: 4.6, zenith: 0x0c1430, horizon: 0x2a2040, ground: 0x0c0a14, sun: 0x4b3a58, amb: 0x343553, fog: 0x1f1c36, sunI: 0.10, ambI: 0.46, night: 0.92, exposure: 1.46 },
  { h: 6.1, zenith: 0x2a3f78, horizon: 0xd86a44, ground: 0x2a1e22, sun: 0xff9a52, amb: 0x70789a, fog: 0x9a6a62, sunI: 1.15, ambI: 0.52, night: 0.35, exposure: 1.16 },
  { h: 7.4, zenith: 0x4d7cc4, horizon: 0xf0b183, ground: 0x4a4038, sun: 0xffd3a0, amb: 0x7d90b0, fog: 0xc9b5a8, sunI: 1.75, ambI: 0.72, night: 0.05, exposure: 1.06 },
  { h: 10.0, zenith: 0x3f7ed6, horizon: 0xa8ccf0, ground: 0x60625e, sun: 0xfff3dc, amb: 0x9fb8d8, fog: 0xbdd3ea, sunI: 2.85, ambI: 0.95, night: 0.0, exposure: 0.94 },
  { h: 13.0, zenith: 0x2f76e0, horizon: 0xb3d6f7, ground: 0x6a6c66, sun: 0xfffaf0, amb: 0xa8c2e2, fog: 0xc6dcf0, sunI: 3.15, ambI: 1.0, night: 0.0, exposure: 0.9 },
  { h: 16.5, zenith: 0x3a78cf, horizon: 0xd7c193, ground: 0x6a6156, sun: 0xffe7bb, amb: 0x9db2cc, fog: 0xd0cbb5, sunI: 2.45, ambI: 0.88, night: 0.0, exposure: 0.98 },
  { h: 18.6, zenith: 0x2a4f92, horizon: 0xff8a4c, ground: 0x4a3228, sun: 0xff9d4f, amb: 0x8084a8, fog: 0xd08a63, sunI: 1.75, ambI: 0.66, night: 0.08, exposure: 1.06 },
  { h: 19.8, zenith: 0x1b2a5c, horizon: 0xd2497c, ground: 0x261a26, sun: 0xff6a7a, amb: 0x60608c, fog: 0x7a4a60, sunI: 0.75, ambI: 0.5, night: 0.45, exposure: 1.24 },
  { h: 21.2, zenith: 0x0a1028, horizon: 0x35213f, ground: 0x0c0a12, sun: 0x2e2a48, amb: 0x3a3d5e, fog: 0x231a36, sunI: 0.08, ambI: 0.56, night: 0.95, exposure: 1.46 },
  { h: 24.0, zenith: 0x060a1a, horizon: 0x121631, ground: 0x08080f, sun: 0x223055, amb: 0x38415f, fog: 0x121730, sunI: 0.05, ambI: 0.55, night: 1.0, exposure: 1.5 },
];

function sampleKeys(hour) {
  let a = DAY_KEYS[0], b = DAY_KEYS[DAY_KEYS.length - 1];
  for (let i = 0; i < DAY_KEYS.length - 1; i++) {
    if (hour >= DAY_KEYS[i].h && hour <= DAY_KEYS[i + 1].h) { a = DAY_KEYS[i]; b = DAY_KEYS[i + 1]; break; }
  }
  const t = clamp((hour - a.h) / Math.max(b.h - a.h, 1e-3), 0, 1);
  const cA = new THREE.Color(), cB = new THREE.Color();
  const mix = (ka, kb) => { cA.setHex(ka); cB.setHex(kb); return cA.clone().lerp(cB, t); };
  return {
    zenith: mix(a.zenith, b.zenith),
    horizon: mix(a.horizon, b.horizon),
    ground: mix(a.ground, b.ground),
    sun: mix(a.sun, b.sun),
    amb: mix(a.amb, b.amb),
    fog: mix(a.fog, b.fog),
    sunI: lerp(a.sunI, b.sunI, t),
    ambI: lerp(a.ambI, b.ambI, t),
    night: lerp(a.night, b.night, t),
    exposure: lerp(a.exposure, b.exposure, t),
  };
}

export class Sky {
  constructor(ctx) {
    this.ctx = ctx;
    this.scene = ctx.scene;
    this.hour = 9;
    this.latitude = 26 * Math.PI / 180;     // roughly subtropical
    this.sunDir = new THREE.Vector3(0.4, 0.7, 0.2).normalize();
    this.moonDir = new THREE.Vector3(-0.4, -0.7, -0.2).normalize();
    this.palette = sampleKeys(9);
    this.cloudCover = 0.28;
    this.storm = 0;
    this.envNeedsUpdate = true;
    this._lastEnvHour = -99;
    this.reflections = true;     // set from the quality preset in setQuality()

    const geo = new THREE.SphereGeometry(1, 32, 18);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: this.sunDir },
        uMoonDir: { value: this.moonDir },
        uZenith: { value: new THREE.Color(0x3f7ed6) },
        uHorizon: { value: new THREE.Color(0xa8ccf0) },
        uGround: { value: new THREE.Color(0x60625e) },
        uSunColor: { value: new THREE.Color(0xfff3dc) },
        uMoonColor: { value: new THREE.Color(0xcfd8ff) },
        uSunIntensity: { value: 1 },
        uMoonIntensity: { value: 0 },
        uTurbidity: { value: 1.0 },
        uMie: { value: 1.0 },
        uNight: { value: 0 },
        uTime: { value: 0 },
        uCloudCover: { value: 0.3 },
        uCloudSpeed: { value: 1 },
        uStorm: { value: 0 },
        uFogColor: { value: new THREE.Color(0xbdd3ea) },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'sky';
    this.mesh.frustumCulled = false;
    // Drawn first, and it stays that way.
    //
    // Moving it to renderOrder 100 is the textbook fill-rate saving — early-Z
    // would throw away every sky pixel a building covers — and it was tried and
    // reverted, because it measurably dimmed the sky that remained: the same
    // clear midday zenith read 26% darker drawn last than drawn first. The
    // mechanism was not worth chasing when the saving is a fraction of a frame
    // and the cost is the colour of the sky.
    this.mesh.renderOrder = -1000;
    this.mesh.scale.setScalar(1);
    this.scene.add(this.mesh);

    // --- lights ---
    this.sun = new THREE.DirectionalLight(0xfff3dc, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 700;
    this._setShadowExtent(140);
    this.sun.target.position.set(0, 0, 0);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.moon = new THREE.DirectionalLight(0xaebeff, 0);
    this.moon.castShadow = false;
    this.scene.add(this.moon);

    this.hemi = new THREE.HemisphereLight(0xa8c2e2, 0x50504a, 1);
    this.scene.add(this.hemi);

    this.scene.fog = new THREE.FogExp2(0xbdd3ea, 0.0012);

    // --- environment probe ---
    this.pmrem = new THREE.PMREMGenerator(ctx.gl || ctx.renderer.renderer);
    this.pmrem.compileEquirectangularShader();
    this.envScene = new THREE.Scene();
    this.envSky = new THREE.Mesh(geo, this.material);
    this.envSky.frustumCulled = false;
    this.envScene.add(this.envSky);
    this.envRT = null;
    this.shadowRadius = 140;
  }

  _setShadowExtent(r) {
    const c = this.sun.shadow.camera;
    c.left = -r; c.right = r; c.top = r; c.bottom = -r;
    c.near = 1; c.far = r * 5.2;
    c.updateProjectionMatrix();
    this.shadowRadius = r;
  }

  setQuality(preset) {
    const size = preset.shadowMapSize || 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    // castShadow is deliberately NOT touched here. Whether a light casts a shadow
    // is part of every material's shader cache key, so turning it off for the
    // potato preset recompiled the entire city — and the potato preset is exactly
    // what the adaptive system drops a struggling machine to, which meant the
    // machine least able to afford a stall got one at the worst moment. Shadow
    // COST is controlled by the map size and the extent below, neither of which
    // is in the key, and the cheapest setting is cheap enough.
    this._setShadowExtent(preset.shadowExtent || 110);
    // The environment probe is what puts the sky and the neon into every wet
    // road and car body, so it is the reflection budget.
    this.reflections = preset.reflections !== false;
    if (this.pmrem) this.refreshEnvironment();   // not yet built during boot
  }

  /**
   * Sun direction for a given hour. The daylight arc is stretched across 06:00–20:00 so the
   * sky palette keyframes (golden hour at 18:30, dusk at 19:45) actually line up with where
   * the sun is, and the remaining ten hours run below the horizon.
   */
  sunDirectionAt(hour) {
    const day = hour >= 6 && hour <= 20;
    const t = day ? (hour - 6) / 14 : (hour > 20 ? (hour - 20) / 10 : (hour + 4) / 10);
    const a = day ? t * Math.PI : Math.PI + t * Math.PI;
    const decl = 0.31;
    const tilt = Math.cos(this.latitude - decl);
    const y = Math.sin(a) * tilt;
    const x = Math.cos(a);
    const z = Math.sin(a) * Math.sin(this.latitude - decl) * 0.7 + 0.2;
    return new THREE.Vector3(x, y, z).normalize();
  }

  update(dt, hour, weather) {
    this.hour = hour;
    const p = sampleKeys(hour);
    this.palette = p;
    const u = this.material.uniforms;

    const sd = this.sunDirectionAt(hour);
    this.sunDir.copy(sd);
    this.moonDir.copy(sd).negate();
    u.uSunDir.value.copy(this.sunDir);
    u.uMoonDir.value.copy(this.moonDir);

    const overcast = weather ? weather.cloudCover : this.cloudCover;
    const storm = weather ? weather.storm : this.storm;
    const wet = weather ? weather.wetness : 0;
    this.cloudCover = overcast;
    this.storm = storm;

    // Weather desaturates and dims the palette. Cloud cover and storm describe
    // the same sky, so take the stronger of the two rather than stacking them —
    // multiplying both left a thunderstorm at two in the afternoon darker than
    // midnight.
    const cloudCut = Math.max(overcast * 0.62, storm * 0.68);
    const dim = 1 - Math.max(storm * 0.34, overcast * 0.3);
    u.uZenith.value.copy(p.zenith).multiplyScalar(dim);
    u.uHorizon.value.copy(p.horizon).multiplyScalar(dim);
    u.uGround.value.copy(p.ground);
    u.uSunColor.value.copy(p.sun);
    u.uSunIntensity.value = p.sunI * (1 - Math.max(overcast * 0.55, storm * 0.7));
    u.uMoonIntensity.value = p.night * (1 - overcast * 0.7);
    u.uNight.value = p.night;
    u.uTime.value = (u.uTime.value + dt) % 100000;
    u.uCloudCover.value = overcast;
    u.uCloudSpeed.value = weather ? 1 + weather.windSpeed * 0.35 : 1;
    u.uStorm.value = storm;
    u.uTurbidity.value = 1 + overcast * 0.6 + (weather ? weather.fog * 1.4 : 0);
    u.uMie.value = 1 - overcast * 0.5;

    const fog = p.fog.clone();
    // Slate grey, not near-black: this colour is what the horizon, the aerial
    // haze and the distance fog all resolve to, so it sets the floor for how
    // dark a storm can make the whole frame.
    if (storm > 0) fog.lerp(new THREE.Color(0x6d7784), storm * 0.7);
    if (weather && weather.fog > 0) fog.lerp(new THREE.Color(0xb9c4cc), weather.fog * 0.6);
    u.uFogColor.value.copy(fog);

    // --- scene lights ---
    const sunUp = clamp(this.sunDir.y, -1, 1);
    const sunStrength = p.sunI * 0.95 * DAY_GAIN * clamp(sunUp * 5.0 + 0.05, 0, 1) * (1 - cloudCut);
    this.sun.color.copy(p.sun);
    this.sun.intensity = sunStrength;
    // The sun stays IN the scene after dark, turned down rather than hidden.
    // Hiding it changed the scene's directional-light count and its
    // shadow-casting-light count, both of which are part of every material's
    // shader cache key — so dusk recompiled every material in the city, and so
    // did dawn. Measured: the program count jumped from 58 to 100 crossing
    // nightfall. An intensity of zero costs a multiply; a recompile costs frames.
    // Its shadow map stops being redrawn instead, which is where the real saving
    // was anyway.
    this.sun.shadow.autoUpdate = sunStrength > 0.01;
    this.moon.color.setHex(0xaebeff);
    this.moon.intensity = p.night * 0.55 * (1 - overcast * 0.8);
    this.moon.position.copy(this.moonDir).multiplyScalar(400);
    this.hemi.color.copy(p.amb);
    this.hemi.groundColor.copy(p.ground).lerp(new THREE.Color(0x6b5a46), 0.55);
    // Sky fill is what stops the shaded sides of buildings reading as black
    // slabs; the sun-facing surfaces barely notice it. The night term is a floor
    // rather than a scale, so a back street with no streetlight on it stays
    // navigable — the city is dark at night, not pitch black — while leaving
    // daylight where it was. Emissive windows ignore this, so it lifts only the
    // surfaces that were genuinely unlit.
    const nightFloor = p.night * 0.34;
    // An overcast sky is a huge soft light source, so cloud adds fill as it
    // takes away sun.
    // The gain rides out with the sun. `ambI` is not a daylight-only quantity —
    // it is still better than half its midday value at eleven at night — so
    // multiplying it flat lifted the night too, and the lighting-levels scenario
    // caught rain at night at 1.83 against a ceiling of 1.6. Scaled by how much
    // daylight is left, it is the full gain at noon and exactly one after dark,
    // which puts every night back on the floor it was tuned for.
    const ambGain = 1 + (DAY_GAIN - 1) * (1 - p.night);
    this.hemi.intensity = (p.ambI * 0.62 * ambGain + nightFloor) * (0.8 + overcast * 0.75 + storm * 0.25);

    const f = this.scene.fog;
    if (f) {
      f.color.copy(fog);
      // Thin enough that the skyline keeps its shape from across the bay;
      // weather still thickens it properly.
      const base = 0.00032;
      f.density = base + (weather ? weather.fog * 0.0055 : 0) + storm * 0.0016 + overcast * 0.00035;
    }

    // --- follow the camera ---
    const cam = this.ctx.camera;
    this.mesh.position.copy(cam.position);
    this.mesh.scale.setScalar(Math.max(400, cam.far * 0.42));
    this.sun.position.copy(cam.position).addScaledVector(this.sunDir, this.shadowRadius * 2.4);
    this.sun.target.position.copy(cam.position);
    this.sun.target.updateMatrixWorld();

    // --- environment probe, refreshed lazily ---
    // The probe is what most surfaces get their brightness from — wet asphalt is
    // almost entirely environment — so a stale one keeps the world lit by the
    // previous sky. `envNeedsUpdate` was set once and never read, which meant a
    // weather change took up to four seconds to reach anything reflective.
    // Rebuilt when the sky has actually changed, and not otherwise.
    //
    // A PMREM rebuild is six cube-face renders of the sky plus the whole
    // prefilter chain, and a four-second timer meant the game paid for one
    // fifteen times a minute whether or not anything had moved. The hour test
    // below and `envNeedsUpdate`, which the weather system sets when conditions
    // change, are between them the complete set of reasons the environment can
    // differ from the one already prefiltered — the timer was only ever
    // rediscovering that nothing had happened.
    if (this.envNeedsUpdate || Math.abs(hour - this._lastEnvHour) > 0.28) {
      this.envNeedsUpdate = false;
      this._lastEnvHour = hour;
      this.refreshEnvironment();
    }
  }

  refreshEnvironment() {
    try {
      const prev = this.envRT;
      this.envSky.scale.setScalar(100);
      this.envSky.position.set(0, 0, 0);
      this.envRT = this.pmrem.fromScene(this.envScene, 0.02, 1, 400);
      this.scene.environment = this.envRT.texture;
      // Without a reflection budget the probe still lights the scene, it just
      // stops being a mirror.
      //
      // The probe is the sky's contribution to every surface not facing the sun,
      // which in a city of vertical walls is most of them — and it is blue. At
      // 1.35 it was lifted further than the sun was (2.45x against 2.15x), so
      // skylight out-weighed sunlight and every shadow on the road came out
      // purple. A clear midday has a sun-to-sky ratio around five to one and this
      // had it closer to three. 0.95 is still most of a doubling on the 0.55 it
      // shipped at, and it puts the ratio back without putting the light back.
      this.scene.environmentIntensity = this.reflections === false ? 0.6 : 0.95;
      if (prev) prev.dispose();
    } catch (e) {
      console.warn('[sky] environment probe failed', e);
    }
  }

  get exposure() { return this.palette.exposure; }
  get isNight() { return this.palette.night > 0.5; }
  get fogColor() { return this.material.uniforms.uFogColor.value; }

  dispose() {
    this.scene.remove(this.mesh, this.sun, this.sun.target, this.moon, this.hemi);
    this.material.dispose();
    this.mesh.geometry.dispose();
    if (this.envRT) this.envRT.dispose();
    this.pmrem.dispose();
  }
}
