/*
 * airportlife.js — the people of Vicehaven International: travellers with
 * their suitcases, the staff behind every desk, cars and cabs at the kerb,
 * the PA and the hum of a busy hall.
 *
 *   new VH.AirportLife(game)   game.airportLife, a world system. It wakes up
 *                              when Jay comes within NEAR of the terminal and
 *                              clears everything away beyond FAR.
 *
 * Inside (world.terminal from terminal.js; without it, the kerb only):
 *   departures   in from the kerb with a rolling case → a check-in queue
 *                (the case goes on the belt) → a security lane (bag on the
 *                x-ray belt, through the arch, pick it up) → maybe a shop or
 *                a café → a seat at their gate → when 'airside:boarding'
 *                fires, the gate desk and down the jet bridge into the plane
 *   arrivals     off the plane at the bridge end ('airside:arrived') → the
 *                carousel their bags are on (terminal.takeBag) → out past the
 *                meeting rail (greeters, some with name cards) → a taxi from
 *                the rank, the shuttle bus, a lift at the kerb, or away on foot
 *   staff        check-in agents, the information desk, security officers,
 *                gate agents, café, shop and car-hire staff, a cleaner or two
 *                with a trolley, and a police pair on patrol
 * Outside: cars and cabs pull in at the kerb (scripted, then they rejoin the
 * traffic), a taxi rank with cabs waiting, an airport shuttle now and then,
 * people at the taxi queue and the bus stop, parked cars in the car park
 * (ordinary parked-car spots: they can be taken like any other).
 *
 * Only people near Jay are kept: each part of the terminal wants a share of
 * the cap (CAP) by how close Jay is, and people come in out of sight (or a
 * good way off), finish what they were doing and go. They walk the
 * terminal's own map (world.terminal.nav), so never through a wall; they run
 * from gunfire, crashes and fights, cower, and bystanders phone the police.
 *
 * The PA chimes and makes an announcement every 45-90 s while Jay is in or
 * by the terminal (boarding calls and final calls from airside.js's flights,
 * bags on the belt, the usual reminders), as a caption (css/airport.css) and,
 * with voiced dialogue on, spoken. Inside: the murmur of the hall, footsteps
 * and a soft music bed.
 *
 *   .people()  the people (for tests: { kind, mode, stage, x, z, ... })
 *   .census()  counts by kind, by zone and by mode
 *   stats      "Flights you've watched leave"
 *
 * Nothing about the people is saved: they come back on their own.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, smoothstep, dampAngle } = VH.math;
  const PI = Math.PI;

  // ------------------------------------------------------------ tuning
  const NEAR = 250; //       Jay within this of the terminal: the place wakes up
  const FAR = 350; //        ...and beyond this everyone goes
  const STAFF_R = 70; //     staff are at their posts within this of Jay
  const POP_R = 40; //       nobody pops into view closer than this
  // [inside, outside] people at most, by graphics quality.
  const CAP = { low: [42, 10], medium: [50, 12], high: [50, 14], ultra: [50, 15] };
  // How many travellers each part of the hall wants when Jay is close by.
  const DEMAND = { checkin: 14, landside: 8, arrivals: 6, security: 10, shops: 6, food: 9, baggage: 0, concourse: 5 };
  const GATE_DEMAND = [2, 12]; // a gate with no flight, with one
  // Which side of the partition each part of the hall is on (Jay can't see over it).
  const LANDSIDE = { checkin: 1, landside: 1, arrivals: 1 };
  // The shops, cafés and desks with someone behind them (the others are closed).
  const OPEN = /^(info|pelican|dutyfree|news|grill|lighthouse|books|tern|hire1)$/;
  const CHECKIN_OPEN = [0, 1, 2, 4]; // which airlines' desks are open (one each)
  const WALK = [1.15, 1.45];
  const RUN = [4.4, 5.4];
  const PA_GAP = [45, 90];
  const SEC_BEEP = 0.05; //  a traveller who sets the arch off now and then

  // Original airlines (airside.js names its own; these colour the uniforms).
  const AIRLINE_COL = {
    SB: 0xf2a516, GW: 0x1aa6a6, CC: 0xff5f8a, PX: 0x2f5fd6, AT: 0x173a5e, NW: 0x4b4f8f,
    CW: 0xff4f8b, BL: 0x1fa3a3, AZ: 0x1d4fb8, PM: 0x2f8f4e, KS: 0xc8202a,
  };
  const CASE_COLS = [0x2b2f35, 0x1f3a5f, 0xc0392b, 0x16a085, 0x8e44ad, 0xd35400, 0x34495e, 0xe5c04a, 0x7f8c8d, 0xff6f91, 0xe8e6e0, 0x2f6fc2];
  const PACK_COLS = [0x22303a, 0x3b4452, 0xd94f5c, 0x2f8fd6, 0xf2b01e, 0x1faa6b, 0x4a3b2e, 0x8a3fd1, 0x111214];
  const NAMES = ['WELCOME HOME MUM!', 'MR OKAFOR', 'DANA', 'HALVERSON', 'GRANDPA JOE', 'MS. REYES', 'TEAM KESTREL', 'WELCOME BACK SAM'];
  const PAX_NAMES = ['Dana Whitlock', 'Marcus Bell', 'Priya Nair', 'Tom Ashworth', 'Lucia Moreno', 'Ben Okafor', 'Grace Halverson', 'Ollie Tran'];
  const KIDS = [['Toby', 'he'], ['Maisie', 'she'], ['Arlo', 'he'], ['Rosie', 'she']];
  const CAR_TYPES = ['halcyon', 'halcyon', 'pipit', 'tern', 'tern', 'sovereign', 'mesa', 'porter'];

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const chance = (p) => Math.random() < p;
  const dist2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

  // Scripted poses (humanoid.js joint targets, blended in by w).
  const POSE = {
    sit: { w: 1, hipL: 1.5, hipR: 1.45, kneeL: 1.5, kneeR: 1.42, ankleL: 0, ankleR: 0, pelvisY: 0.55, lean: -0.04, shoulderL: 0.32, shoulderR: 0.3, elbowL: 0.95, elbowR: 0.9, splay: 0.12 },
    sitPhone: { w: 1, hipL: 1.5, hipR: 1.45, kneeL: 1.5, kneeR: 1.42, ankleL: 0, ankleR: 0, pelvisY: 0.55, lean: 0.12, shoulderL: 0.55, shoulderR: 0.6, elbowL: 1.6, elbowR: 1.7, splay: 0.08, headPitch: 0.45 },
    sitEat: { w: 1, hipL: 1.5, hipR: 1.45, kneeL: 1.5, kneeR: 1.42, ankleL: 0, ankleR: 0, pelvisY: 0.55, lean: 0.14, shoulderL: 0.6, shoulderR: 0.75, elbowL: 1.3, elbowR: 1.55, splay: 0.1, headPitch: 0.2 },
    carry: { w: 1, shoulderR: -0.18, elbowR: 0.1, splayR: 0.16 },
    sign: { w: 1, shoulderL: 1.1, shoulderR: 1.1, elbowL: 0.55, elbowR: 0.55, splayL: 0.02, splayR: 0.02 },
    reach: { w: 1, shoulderL: 0.95, shoulderR: 1.05, elbowL: 0.35, elbowR: 0.3, lean: 0.22 },
    lift: { w: 1, shoulderL: 0.6, shoulderR: 0.7, elbowL: 0.2, elbowR: 0.2, lean: 0.45, hipL: 0.35, hipR: 0.35, kneeL: 0.5, kneeR: 0.5, pelvisY: 0.86 },
    push: { w: 1, shoulderL: 0.7, shoulderR: 0.7, elbowL: 0.55, elbowR: 0.55, lean: 0.1 },
    mop: { w: 1, shoulderL: 0.8, shoulderR: 0.5, elbowL: 0.6, elbowR: 0.9, lean: 0.2 },
    armsOut: { w: 1, shoulderL: 1.35, shoulderR: 1.35, splayL: 1.1, splayR: 1.1, elbowL: 0.05, elbowR: 0.05 },
    hug: { w: 1, shoulderL: 1.25, shoulderR: 1.25, elbowL: 1.0, elbowR: 1.0, splayL: -0.25, splayR: -0.25, lean: 0.08 },
    hands: { w: 1, shoulderL: 0.25, shoulderR: 0.25, elbowL: 1.2, elbowR: 1.2, splayL: -0.12, splayR: -0.12 },
  };

  // ================================================================ the map
  // Doorways the people's map only lets some people through (bit flags).
  const SEC_IN = 1;
  const SEC_OUT = 2;
  const REC_IN = 4;
  const REC_OUT = 8;
  const EXIT_OUT = 16;
  const EXIT_IN = 32;
  const MODES = { dep: SEC_IN, arr: REC_IN | EXIT_OUT, land: 0, air: 0, any: 63 };

  /**
   * World.terminal's walkable graph: shortest paths (Dijkstra; the graph is
   * a couple of hundred nodes), the nearest node to a point that can be
   * walked to in a straight line, and one-way doorways so departures never
   * slip out through baggage reclaim nor arrivals back through security.
   */
  class Nav {
    constructor(T, physics) {
      this.T = T;
      this.physics = physics;
      const nodes = (this.nodes = T.nav.nodes);
      const n = nodes.length;
      this.ix = {};
      nodes.forEach((q, i) => (this.ix[q.id] = i));
      this.adj = nodes.map(() => []);
      for (const [i, j] of T.nav.links) {
        const l = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z);
        this.adj[i].push(j, l);
        this.adj[j].push(i, l);
      }
      this.gate = new Map(); // i * 4096 + j → flag
      const one = (a, b, fwd, back) => {
        const i = this.ix[a];
        const j = this.ix[b];
        if (i === undefined || j === undefined) return;
        this.gate.set(i * 4096 + j, fwd);
        this.gate.set(j * 4096 + i, back);
      };
      (T.security || []).forEach((ln, i) => one('sin' + i, 'sarch' + i, SEC_IN, SEC_OUT));
      one('rec_d', 'rec_in', REC_IN, REC_OUT);
      one('exit_s', 'meet', EXIT_OUT, EXIT_IN);
      this.dist = new Float64Array(n);
      this.prev = new Int32Array(n);
      this.done = new Uint8Array(n);
      this.cache = new Map();
    }

    /** Node indices from a to b, or null. avoid = { x, z, r }: keep away from there. */
    path(a, b, mode, avoid) {
      const n = this.nodes.length;
      const allow = MODES[mode] === undefined ? 0 : MODES[mode];
      const { dist, prev, done, adj, nodes } = this;
      dist.fill(Infinity);
      prev.fill(-1);
      done.fill(0);
      dist[a] = 0;
      for (let it = 0; it < n; it++) {
        let u = -1;
        let best = Infinity;
        for (let i = 0; i < n; i++) {
          if (!done[i] && dist[i] < best) {
            best = dist[i];
            u = i;
          }
        }
        if (u < 0 || u === b) break;
        done[u] = 1;
        const L = adj[u];
        for (let k = 0; k < L.length; k += 2) {
          const v = L[k];
          if (done[v]) continue;
          const f = this.gate.get(u * 4096 + v);
          if (f && !(f & allow)) continue;
          let c = L[k + 1];
          if (avoid) {
            const q = nodes[v];
            const d = Math.hypot(q.x - avoid.x, q.z - avoid.z);
            if (d < avoid.r) c += (avoid.r - d) * 12;
          }
          if (best + c < dist[v]) {
            dist[v] = best + c;
            prev[v] = u;
          }
        }
      }
      if (a !== b && prev[b] < 0) return null;
      const out = [];
      for (let v = b; v >= 0; v = prev[v]) {
        out.push(v);
        if (v === a) break;
      }
      return out.reverse();
    }

    /** Can someone walk straight from one point to the other (nothing solid at knee or chest height)? */
    clear(ax, az, ay, bx, bz, by) {
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 0.05) return true;
      const dy = (by === undefined ? ay : by) - ay;
      const l3 = Math.hypot(len, dy);
      const flags = VH.COLLIDE ? VH.COLLIDE.SOLID : undefined;
      for (const off of [-0.25, 0.25]) {
        const ox = ax - (dz / len) * off;
        const oz = az + (dx / len) * off;
        for (const h of [0.4, 1.2]) {
          const r = this.physics.raycast(ox, ay + h, oz, dx / l3, dy / l3, dz / l3, l3, { flags, ground: false });
          if (r) return false;
        }
      }
      return true;
    }

    /** The nearest node a straight walk from (x, z) reaches (cached for fixed spots). */
    near(x, z, y, mode, fixed) {
      const key = fixed ? Math.round(x * 10) + ',' + Math.round(z * 10) + ',' + (mode || '') : null;
      if (key && this.cache.has(key)) return this.cache.get(key);
      const nodes = this.nodes;
      const yy = y === undefined ? 0.45 : y;
      const cand = [];
      for (let i = 0; i < nodes.length; i++) {
        const q = nodes[i];
        if (Math.abs(q.y - yy) > 1.2) continue;
        const d = dist2(q.x, q.z, x, z);
        if (d > 900) continue;
        cand.push(d, i);
      }
      let best = -1;
      let bestD = Infinity;
      // Up to five nearest, the first one in plain sight.
      for (let tries = 0; tries < 5; tries++) {
        let k = -1;
        let kd = Infinity;
        for (let c = 0; c < cand.length; c += 2) {
          if (cand[c] < kd) {
            kd = cand[c];
            k = c;
          }
        }
        if (k < 0) break;
        const i = cand[k + 1];
        cand[k] = Infinity;
        if (bestD === Infinity) {
          best = i;
          bestD = kd;
        }
        const q = nodes[i];
        if (this.clear(x, z, yy, q.x, q.z, q.y)) {
          best = i;
          break;
        }
      }
      if (best < 0) {
        // Nothing within 30 m: whichever is nearest at all.
        for (let i = 0; i < nodes.length; i++) {
          const d = dist2(nodes[i].x, nodes[i].z, x, z);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
      if (key) this.cache.set(key, best);
      return best;
    }
  }

  // ============================================================== queues
  /** A queue at a desk: people stand on its spots in order, the first is served. */
  class Line {
    constructor(id, spots, face, serve, extra) {
      this.id = id;
      this.spots = spots;
      this.face = face; //   the heading of whoever is at the front
      this.serve = serve; // [min, max] seconds at the front
      this.q = [];
      this.cap = spots.length + (extra === undefined ? 2 : extra);
      const n = spots.length;
      const a = spots[Math.max(0, n - 2)];
      const b = spots[n - 1];
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      this.ex = ((b.x - a.x) / l) * 1.1;
      this.ez = ((b.z - a.z) / l) * 1.1;
      this.open = true;
      this.coming = 0; // on their way to the back of it (they take a place when they get there)
      this._o = { x: 0, z: 0 };
    }

    full() {
      return this.q.length + this.coming >= this.cap;
    }

    spot(i) {
      if (i < this.spots.length) return this.spots[i];
      const s = this.spots[this.spots.length - 1];
      const k = i - this.spots.length + 1;
      this._o.x = s.x + this.ex * k;
      this._o.z = s.z + this.ez * k;
      return this._o;
    }

    leave(b) {
      const i = this.q.indexOf(b);
      if (i >= 0) this.q.splice(i, 1);
      else if (b.line === this && !b.joined) this.coming = Math.max(0, this.coming - 1);
    }
  }

  // ================================================================ props
  /** The rolling case: the shell (tinted per person) and its handle and wheels. */
  function caseGeos() {
    const s = new VH.GeometryBuilder({});
    const W = VH.col(0xffffff);
    s.box(-0.19, 0.05, -0.115, 0.19, 0.6, 0.115, W);
    s.box(-0.196, 0.3, -0.121, 0.196, 0.325, 0.121, VH.col(0xa8a8a8));
    for (const x of [-0.12, 0.12]) s.box(x - 0.035, 0.12, -0.125, x + 0.035, 0.52, -0.115, VH.col(0xd8d8d8));
    const h = new VH.GeometryBuilder({});
    const M = VH.col(0x9aa1a8);
    const D = VH.col(0x1e2124);
    h.box(-0.125, 0.6, 0.07, -0.105, 1.0, 0.09, M);
    h.box(0.105, 0.6, 0.07, 0.125, 1.0, 0.09, M);
    h.box(-0.135, 0.985, 0.06, 0.135, 1.035, 0.1, D);
    h.box(-0.17, 0.0, -0.1, -0.11, 0.065, -0.035, D);
    h.box(0.11, 0.0, -0.1, 0.17, 0.065, -0.035, D);
    h.box(-0.06, 0.6, -0.03, 0.06, 0.625, 0.03, D);
    return [s.build(), h.build()];
  }

  /** A backpack (worn: the spine's frame, straps over the shoulders). */
  function packGeo() {
    const b = new VH.GeometryBuilder({});
    const W = VH.col(0xffffff);
    const D = VH.col(0x7a7a7a);
    b.box(-0.15, -0.2, -0.09, 0.15, 0.2, 0.09, W);
    b.box(-0.12, -0.17, -0.13, 0.12, 0.02, -0.09, VH.col(0xcfcfcf));
    b.box(-0.155, 0.12, -0.095, 0.155, 0.135, 0.095, D);
    for (const x of [-0.1, 0.06]) b.box(x, -0.12, 0.09, x + 0.04, 0.22, 0.12, D);
    return b.build();
  }

  /** The cleaner's trolley: a frame, a bin bag, a bucket, a mop. */
  function cartGeo() {
    const b = new VH.GeometryBuilder({});
    const Y = VH.col(0xf2c21b);
    const G = VH.col(0x5a6068);
    const K = VH.col(0x1b1d21);
    b.box(-0.3, 0.12, -0.45, 0.3, 0.16, 0.45, G);
    b.box(-0.3, 0.7, -0.45, 0.3, 0.74, 0.1, G);
    for (const [x, z] of [[-0.28, -0.43], [0.28, -0.43], [-0.28, 0.43], [0.28, 0.43]]) b.box(x - 0.02, 0.0, z - 0.02, x + 0.02, 0.74, z + 0.02, G);
    b.box(-0.27, 0.16, -0.42, 0.27, 0.68, 0.05, K);
    b.cylinder(0, 0.16, 0.26, 0.17, 0.2, 0.3, 10, Y, true, VH.col(0x6aa6c8));
    b.box(-0.3, 0.86, 0.36, 0.3, 0.9, 0.4, G);
    b.box(0.12, 0.16, 0.25, 0.14, 1.25, 0.27, VH.col(0xc9a477));
    b.box(-0.3, 0.75, -0.46, 0.3, 0.98, -0.44, Y);
    return b.build();
  }

  /** The airport shuttle's roof sign (both sides lettered, lit at night). */
  function shuttleSign() {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 96;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 96);
    grad.addColorStop(0, '#2f7fe8');
    grad.addColorStop(1, '#1a4fb0');
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#ffd23c';
    g.fillRect(0, 84, 512, 12);
    g.fillStyle = '#ffffff';
    g.font = '800 50px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('AIRPORT SHUTTLE', 256, 44);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const b = new THREE.BoxGeometry(1.7, 0.34, 0.14);
    // Only the two long faces carry the lettering; the ends and top are plain blue.
    const uv = b.attributes.uv;
    for (let f = 0; f < 6; f++) {
      if (f === 4 || f === 5) continue;
      for (let k = 0; k < 4; k++) uv.setXY(f * 4 + k, 0.02, 0.5);
    }
    b.rotateY(Math.PI / 2);
    return { geo: b, mat: new THREE.MeshBasicMaterial({ map: tex }) };
  }

  /** Name cards for the meeting rail: one canvas, a strip per name. */
  function signAtlas() {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 64 * NAMES.length;
    const g = cv.getContext('2d');
    NAMES.forEach((name, i) => {
      const y = i * 64;
      g.fillStyle = '#fbfaf6';
      g.fillRect(0, y, 512, 64);
      g.strokeStyle = '#d0ccc2';
      g.lineWidth = 3;
      g.strokeRect(2, y + 2, 508, 60);
      g.fillStyle = i % 3 === 0 ? '#d23a2a' : i % 3 === 1 ? '#1b3f8a' : '#1f6b3a';
      let size = 44;
      g.font = '800 ' + size + 'px Arial, sans-serif';
      while (g.measureText(name).width > 480 && size > 18) g.font = '800 ' + --size + 'px Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(name, 256, y + 34);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ============================================================== brains
  /**
   * Everyone at the airport. The brain moves the body (walking a path,
   * shuffling up a queue, sitting, standing at a post, fleeing); what they
   * do next is up to AirportLife (life.next), which knows the place.
   */
  class Person {
    constructor(life, kind, o) {
      this.life = life;
      this.kind = kind; //  dep | arr | greet | staff | clean | cop | kerb
      this.stage = (o && o.stage) || '';
      this.mode = 'idle';
      this.speed = rnd(WALK[0], WALK[1]);
      this.path = null;
      this.pi = 0;
      this.wt = 0; //      seconds left in a wait
      this.face = null;
      this.act = null; //  what they do while waiting: phone, talk, reach, sign ...
      this.line = null;
      this.seat = -1;
      this.post = null;
      this.fear = null;
      this.gone = false;
      this.hostile = false;
      this.witness = true; // police.js: bystanders who phone it in
      this.t = Math.random() * 10;
      this.stuck = 0;
      this.flight = null;
      this.gate = null;
      this.case = null; // { color }: a rolling case
      this.pack = null; // { color }: a backpack
      this.prop = null; // { x, y, z, yaw, flat }: the bag set down somewhere (a belt)
      this.sign = -1;
      this.cart = null;
      this.pace = 0;
      this.lead = null; // the one they walk with
      this.a = null;
    }

    expired(a) {
      return this.gone || (a.dead && a.deadTime > 30 && !a.visible);
    }

    /** Hit, shot at or stunned (combat.js). */
    setAlert(a) {
      if (a.dead) return;
      this.life.hurt(this, a);
    }

    update(a, dt) {
      if (a.dead) return;
      const L = this.life;
      const an = a.anim;
      this.t += dt;
      // Back on their feet after being knocked down: our own panic, not the crowd's.
      if (a.state === 'flee') {
        a.state = 'walk';
        a.flee = null;
        L.scare(this, a, a.pos.x, a.pos.z, 4);
      }
      an.sprint = false;
      an.handsUp = 0;
      an.cower = 0;
      an.crouch = 0;
      an.talk = 0;
      an.pose = null;
      a.moveSpeed = 0;
      switch (this.mode) {
        case 'walk':
          if (this.walk(a, dt, this.speed)) L.arrived(this, a);
          break;
        case 'queue':
          L.queueStep(this, a, dt);
          break;
        case 'wait':
          this.wt -= dt;
          this.turn(a, dt);
          L.acting(this, a, dt);
          if (this.wt <= 0) L.waited(this, a);
          break;
        case 'sitdown':
        case 'sit':
        case 'standup':
          L.sitStep(this, a, dt);
          break;
        case 'post':
          L.postStep(this, a, dt);
          break;
        case 'follow':
          L.followStep(this, a, dt);
          break;
        case 'bag':
          L.bagStep(this, a, dt);
          break;
        case 'flee':
          an.sprint = true;
          if (this.walk(a, dt, this.speed)) L.fled(this, a);
          break;
        case 'runout':
          L.runOut(this, a, dt);
          break;
        case 'cower':
          L.cowerStep(this, a, dt);
          break;
        case 'cop':
          L.copStep(this, a, dt);
          break;
        case 'gone':
          a.moveSpeed = 0;
          break;
        default:
          this.turn(a, dt);
      }
      if (this.mode !== 'wait' && this.mode !== 'queue' && this.mode !== 'bag' && an.phone > 0) an.phone = Math.max(0, an.phone - dt * 3);
      // A rolling case: the right hand holds the handle back. A trolley: both hands on it.
      if (this.cart && this.mode === 'walk') an.pose = POSE.push;
      if (this.case && !this.prop && !an.pose && !an.cower && a.speed > 0.3) an.pose = POSE.carry;
    }

    turn(a, dt) {
      if (this.face !== null) a.heading = dampAngle(a.heading, this.face, 5, dt);
    }

    /** Walk the path; true once at its end. */
    walk(a, dt, speed) {
      const p = this.path;
      if (!p || this.pi >= p.length) return true;
      const w = p[this.pi];
      const dx = w.x - a.pos.x;
      const dz = w.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      const last = this.pi === p.length - 1;
      if (d < (last ? 0.3 : speed > 3 ? 1.4 : 0.85) || (a.blocked > (last ? 1.4 : 0.7) && d < 3)) {
        a.blocked = 0;
        this.pi++;
        this.stuck = 0;
        return this.pi >= p.length;
      }
      // Wedged for a while (someone in the way, a corner): try the next point, then ask again.
      if (a.blocked > 0.5) this.stuck += dt;
      if (this.stuck > 4) {
        this.stuck = 0;
        this.life.repath(this, a);
      }
      a.heading = dampAngle(a.heading, Math.atan2(dx, dz), speed > 3 ? 7 : 8, dt);
      a.moveSpeed = last ? Math.min(speed, d * 1.8 + 0.25) : speed;
      return false;
    }
  }

  // ========================================================= kerb driving
  /**
   * A car at the kerb: in along the inner westbound lane, across into the
   * kerb lane for its stop, then (go()) out into the inner lane again and
   * on its way. While stopped it counts as parked, so the traffic goes
   * round it (traffic.js: controller.atEnd).
   */
  class KerbDriver {
    constructor(life, job) {
      this.life = life;
      this.job = job;
      this.phase = 'in'; // in | stop | out
      this.atEnd = false;
      this.finished = false;
      this.blockT = 0;
      this._sense = 0;
      this._gap = Infinity;
      this._o = { x: 0, z: 0 };
      this.plan(job.x, true, life.innerZ, life.kerbZ);
    }

    /** Drive to x (stopping there, or on through), easing from lane zA across to zB. */
    plan(x, stop, zA, zB, ease) {
      this.tx = x;
      this.stop = stop;
      this.zA = zA;
      this.zB = zB;
      this.ease = ease || [x + 26, x + 5];
      this.atEnd = false;
    }

    zAt(x) {
      const [e0, e1] = this.ease;
      return lerp(this.zA, this.zB, smoothstep(e0, e1, x));
    }

    /** Pull away: across into the inner lane and on west. */
    go() {
      const v = this.job.v;
      this.phase = 'out';
      this.plan(v.pos.x - 60, false, this.life.kerbZ, this.life.innerZ, [v.pos.x - 2, v.pos.x - 16]);
      v.wake();
    }

    update(v, dt) {
      const inp = v.input;
      const speed = Math.max(0, v.vF);
      // Steering: pure pursuit on the line ahead (heading west, -x).
      const look = 3.5 + speed * 0.55;
      const tx = v.pos.x - look;
      const t = v.worldToLocal(tx, this.zAt(tx), this._o);
      const d2 = t.x * t.x + t.z * t.z;
      const curv = d2 > 0.01 ? (2 * t.x) / d2 : 0;
      const lock = lerp(0.62, 0.15, smoothstep(4, 46, speed)) * v.tune.steer;
      inp.steer = clamp(Math.atan(v.wheelbase * curv) / Math.max(0.05, lock), -1, 1);
      inp.boost = 0;
      // Speed: cruise, brake to the stop, keep back from whatever is ahead.
      let want = this.job.kind === 'bus' ? 8 : 9.5;
      const toGo = v.pos.x - this.tx;
      if (this.stop) want = Math.min(want, Math.sqrt(2 * 2.0 * Math.max(0, toGo - 0.15)));
      this._sense -= dt;
      if (this._sense <= 0) {
        this._sense = 0.15;
        this._gap = this.life.gapAhead(v);
      }
      const gap = this._gap;
      if (gap < 30) want = Math.min(want, Math.max(0, (gap - 2.2) * 0.9));
      if (this.stop && toGo < 0.25 && speed < 0.6) {
        inp.accel = 0;
        inp.handbrake = 1;
        inp.steer = 0;
        if (!this.atEnd) {
          this.atEnd = true;
          this.life.carStopped(this.job);
        }
        return;
      }
      // Waiting behind something that won't move: give up on the stop.
      if (gap < 6 && speed < 0.5) this.blockT += dt;
      else this.blockT = Math.max(0, this.blockT - dt);
      if (this.blockT > 12) {
        this.blockT = 0;
        this.life.carBlocked(this.job);
      }
      const err = want - speed;
      inp.handbrake = want < 0.2 && speed < 0.4 ? 1 : 0;
      inp.accel = err > 0 ? clamp(err * 0.6, 0, 1) : clamp(err * 0.5, -1, 0);
      if (!this.stop && v.pos.x < this.tx) this.finished = true;
    }

    onBump() {}
  }

  // ============================================================ the place
  class AirportLife {
    constructor(game) {
      this.game = game;
      this.saveKey = 'airportLife';
      this.watched = 0; //  flights Jay has seen take off
      const a = game.layout && game.layout.airport;
      this.ok = !!(a && game.crowd && game.world);
      this.T = (game.world && game.world.terminal) || null;
      this.on = false;
      this.list = []; //    every Person (p.a is the agent)
      this.cars = []; //    kerb jobs: { kind, v, d (driver), slot, ... }
      this._t = 0;
      this._dirT = 0;
      this._paT = rnd(12, 25);
      this._paQ = [];
      this._carT = 4;
      this._cabT = 2;
      this._busT = rnd(40, 90);
      this._calm = 0; //   seconds since the last scare inside
      this._fill = 0;
      this._arrivals = [];
      this._said = new Map();
      if (!this.ok) return;
      this.B = (this.T && this.T.bounds) || { x0: a.terminal.x0, z0: a.terminal.z0, x1: a.terminal.x1, z1: a.terminal.z1 };
      this.FY = this.T ? this.T.floorY : 0.45;
      this.outside = { id: 'outside', x0: this.B.x0, z0: this.B.z1, x1: this.B.x1, z1: this.B.z1 + 10, d: 0, w: 0, n: 0, want: 0 };
      [this.capIn, this.capOut] = this._quality();
      this._calm = 99;
      this._lanes(game);
      this._kerbData();
      if (this.T && this.T.nav && this.T.nav.nodes && this.T.nav.nodes.length) this._indoors(game);
      this._buildProps(game);
      this._carPark(game);
      this._bind();
    }

    // ------------------------------------------------------------- setup
    /** Airport Road's westbound lanes (the kerb lane and the one inside it). */
    _lanes(game) {
      this.kerbZ = -1187.2;
      this.innerZ = -1182.9;
      this.laneZ = -1186.6;
      const net = game.roadnet;
      const road = net && net.roads && net.roads.find((r) => r.name === 'Airport Road' || r.id === 'airport_rd');
      if (road && road.lanesPerDirection >= 2) {
        const p = net.lanePoint(road, -1, 0, -250, {});
        const q = net.lanePoint(road, -1, road.lanesPerDirection - 1, -250, {});
        this.innerZ = p.z;
        this.laneZ = q.z;
      }
    }

    /** Where cars stop and people wait outside (terminal.js's, or a plausible set of our own). */
    _kerbData() {
      const T = this.T;
      const K = T && T.kerb;
      const dep = (x) => ({ x, z: -1187.2, yaw: -PI / 2, kerb: { x: x + 1.0, z: -1189.6 } });
      this.K = {
        departures: (K && K.departures) || [-400, -330, -260].map(dep),
        arrivals: (K && K.arrivals) || [-172, -154].map(dep),
        taxiRank: (K && K.taxiRank) || [-130, -122, -114].map((x) => ({ x, z: -1187.2, yaw: -PI / 2 })),
        taxiQueue: (K && K.taxiQueue) || [-128.5, -127.4, -126.3, -125.2].map((x) => ({ x, z: -1189.7, yaw: -PI / 2 })),
        bus: (K && K.bus) || { x: -212, z: -1187.2, yaw: -PI / 2, kerb: { x: -215, z: -1192.4 } },
        walkZ: (K && K.walk && K.walk.z) || -1192.6,
      };
      this.kerbZ = this.K.departures[0].z;
      for (const s of this.K.departures.concat(this.K.arrivals)) s.busy = null;
      this.K.bus.busy = null;
      // The taxi queue: arrivals line up on the kerb; the cab at the head of the rank takes the first.
      const tq = this.K.taxiQueue;
      this.taxiLine = new Line('taxi', tq.map((s) => ({ x: s.x, z: s.z })), -PI / 2, [1e9, 1e9], 3);
      this.taxiLine.ex = 1.1;
      this.taxiLine.ez = 0;
      // Where people stand outside: either side of each door, and by the bus stop.
      const doors = (T && T.doors) || [-400, -330, -255, -165, -112].map((x, i) => ({ id: 'd' + i, x, z: this.B.z1, kind: x > -195 ? 'arrivals' : 'departures', out: { x, z: this.B.z1 + 1.3 } }));
      this.doors = doors;
      this.stand = [];
      for (const d of doors) for (const s of [-1, 1]) this.stand.push({ x: d.x + s * rnd(3.2, 5.5), z: this.K.walkZ - rnd(-0.6, 0.4), yaw: chance(0.5) ? 0 : PI, busy: null });
      const bk = this.K.bus.kerb;
      this.busStop = [-1.6, -0.6, 0.4, 1.4, 2.4].map((dx, i) => ({ x: bk.x + dx, z: bk.z + (i % 2 ? 0.5 : 0), yaw: PI / 2, busy: null }));
    }

    /** Desks, queues, posts and seats from world.terminal. */
    _indoors(game) {
      const T = this.T;
      this.nav = new Nav(T, game.physics);
      const N = this.nav;
      this.zones = (T.zones || []).map((z) => ({ id: z.id, x0: z.x0, z0: z.z0, x1: z.x1, z1: z.z1, d: 0, w: 0, n: 0, want: 0, gate: /^gate/.test(z.id) ? z.id.slice(4) : null }));
      this.zoneById = {};
      for (const z of this.zones) this.zoneById[z.id] = z;
      // Desks: a queue each, open or not.
      this.lines = {};
      this.desks = T.desks || [];
      const face = (d) => (d.queue && d.queue.length ? Math.atan2(d.x - d.queue[0].x, d.z - d.queue[0].z) : d.yaw + PI);
      for (const d of this.desks) {
        if (!d.queue || !d.queue.length) continue;
        const serve = d.kind === 'checkin' ? [7, 13] : d.kind === 'gate' ? [1.6, 2.8] : d.kind === 'cafe' ? [5, 9] : d.kind === 'hire' ? [10, 18] : [4, 8];
        const ln = new Line(d.id, d.queue, face(d), serve, d.kind === 'gate' ? 4 : 2);
        ln.desk = d;
        this.lines[d.id] = ln;
      }
      // Check-in: one desk open per airline, a second at the busiest.
      const groups = new Map();
      for (const d of this.desks) {
        if (d.kind !== 'checkin') continue;
        const k = d.code || d.airline || d.island;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(d);
      }
      let gi = 0;
      for (const g of groups.values()) {
        g.forEach((d, i) => (this.lines[d.id].open = i === 1 && CHECKIN_OPEN.includes(gi)));
        gi++;
      }
      for (const d of this.desks) if (this.lines[d.id] && d.kind !== 'checkin' && d.kind !== 'gate') this.lines[d.id].open = OPEN.test(d.id);
      // Security: the two middle lanes are open.
      this.sec = (T.security || []).map((ln, i, all) => {
        const open = all.length <= 2 || i === 1 || i === 2;
        const line = new Line(ln.id, ln.queue, PI, [0.4, 0.8], 2);
        line.open = open;
        line.lane = i;
        line.sec = ln;
        return line;
      });
      // Staff posts: the desks that are open, the security lanes, the gates, the shops and cafés.
      this.posts = [];
      const post = (role, s, zone, opts) => {
        const p = Object.assign({ role, x: s.x, z: s.z, yaw: s.yaw === undefined ? 0 : s.yaw, zone, p: null, open: true }, opts || {});
        this.posts.push(p);
        return p;
      };
      const zoneOf = (x, z) => this._zoneAt(x, z);
      for (const d of this.desks) {
        const ln = this.lines[d.id];
        const s = d.staff;
        if (!s) continue;
        if (d.kind === 'checkin' && ln && ln.open) post('checkin', s, zoneOf(s.x, s.z), { line: ln, code: d.code });
        else if (d.kind === 'info') post('info', s, zoneOf(s.x, s.z), { line: ln });
        else if (d.kind === 'gate') {
          post('gate', s, 'gate' + d.gate, { line: ln, gate: d.gate, needFlight: true });
          if (d.staff2) post('gate', d.staff2, 'gate' + d.gate, { line: ln, gate: d.gate, needFlight: true, boarding: true });
        } else if ((d.kind === 'cafe' || d.kind === 'shop' || d.kind === 'hire') && ln && ln.open) post(d.kind, s, zoneOf(s.x, s.z), { line: ln, food: !!d.food });
      }
      for (const ln of this.sec) {
        if (!ln.open) continue;
        const st = ln.sec.staff || [];
        if (st[0]) post('security', st[0], 'security', { line: ln, arch: true });
        if (st[1]) post('security', st[1], 'security', { line: ln, screen: true });
      }
      // Seats: who sits where.
      this.seats = T.seats || [];
      this.seatBy = new Array(this.seats.length).fill(null);
      this.seatsIn = {};
      this.seats.forEach((s, i) => (this.seatsIn[s.zone] || (this.seatsIn[s.zone] = [])).push(i));
      // A row of seats is left by its ends (the seat backs are solid).
      for (const s of this.seats) {
        if (/^gate/.test(s.zone) || !s.approach || Math.abs(Math.sin(s.yaw)) > 0.1) continue;
        let x0 = s.x;
        let x1 = s.x;
        for (let more = true; more;) {
          more = false;
          for (const o of this.seats) {
            if (Math.abs(o.z - s.z) > 0.05 || Math.abs(o.yaw - s.yaw) > 0.1) continue;
            if (o.x < x0 && x0 - o.x < 0.7) (x0 = o.x), (more = true);
            if (o.x > x1 && o.x - x1 < 0.7) (x1 = o.x), (more = true);
          }
        }
        if (x1 - x0 > 1) s.ends = [x0 - 0.7, x1 + 0.7];
      }
      this.gates = T.gates || [];
      this.gateBy = {};
      for (const g of this.gates) this.gateBy[g.gate] = g;
      this.carousels = (T.carousels || []).map((c) => ({ c, by: new Array((c.wait || []).length).fill(null) }));
      this.meet = (T.meet || []).map((m) => ({ x: m.x, z: m.z, yaw: m.yaw, busy: null }));
      this.boarding = new Map(); // gate → flight boarding now
      this.closed = new Set(); //   flight ids whose doors have shut
      // Where window shoppers stand: either side of a shop's counter queue, facing in.
      this.window = [];
      for (const d of this.desks) {
        if (d.kind !== 'shop' || !d.queue || d.queue.length < 3) continue;
        const q = d.queue[2];
        const f = face(d);
        for (const s of [-1, 1]) this.window.push({ x: q.x + s * 1.7, z: q.z, yaw: f, busy: null, zone: zoneOf(q.x, q.z) });
      }
      // The concourse's window wall: people stand and watch the planes.
      this.view = [];
      for (const g of this.gates) for (const dx of [-26, -20, -14, 6]) this.view.push({ x: g.x + dx, z: T.bounds.z0 + 1.1, yaw: PI, busy: null, gate: g.gate });
    }

    /** Parked cars across the road: ordinary parked-car spots in the car park's bays. */
    _carPark(game) {
      const V = game.vehicles;
      const C = game.layout.airport && game.layout.airport.carpark;
      if (!V || !V.spots || !C) return;
      const types = ['halcyon', 'halcyon', 'pipit', 'tern', 'tern', 'sovereign', 'mesa', 'porter', 'beater', 'pipit'].filter((t) => VH.Vehicle.typeSpec(t));
      if (!types.length) return;
      let n = 0;
      for (const [zc, yaw] of [[C.z0 + 6.5, PI], [C.z1 - 6.5, 0]]) {
        for (let x = C.x0 + 5.5; x < C.x1 - 5; x += 3) {
          const h = VH.math.hash2(Math.round(x * 10), Math.round(zc * 10) + 77);
          if (h > 0.5) continue;
          V.spots.push({ x, z: zc, heading: yaw + (h < 0.08 ? PI : 0), road: null, type: types[Math.floor(h * 1e4) % types.length], seed: Math.floor(h * 1e6), vehicle: null, used: false, airport: true });
          n++;
        }
      }
      this.parked = n;
    }

    _buildProps(game) {
      const scene = game.scene;
      const [shell, gear] = caseGeos();
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.08 });
      const gmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.4 });
      const MAXC = 72;
      this.caseMesh = new THREE.InstancedMesh(shell, mat, MAXC);
      this.gearMesh = new THREE.InstancedMesh(gear, gmat, MAXC);
      this.packMesh = new THREE.InstancedMesh(packGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), MAXC);
      for (const m of [this.caseMesh, this.gearMesh, this.packMesh]) {
        m.name = 'airport life props';
        m.count = 0;
        m.frustumCulled = false;
        m.castShadow = true;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(m);
      }
      this.caseMesh.setColorAt(0, new THREE.Color(1, 1, 1));
      this.packMesh.setColorAt(0, new THREE.Color(1, 1, 1));
      this.maxProps = MAXC;
      this.cartGeo = cartGeo();
      this.cartMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
      this.signTex = null;
      this.signMat = null;
      this._m = new THREE.Matrix4();
      this._m2 = new THREE.Matrix4();
      this._q = new THREE.Quaternion();
      this._e = new THREE.Euler(0, 0, 0, 'YXZ');
      this._v = new THREE.Vector3();
      this._s = new THREE.Vector3(1, 1, 1);
      this._c = new THREE.Color();
      this._packOff = new THREE.Matrix4().makeTranslation(0, 0.28, -0.19);
      this._signOff = new THREE.Matrix4().makeTranslation(0, 0.3, 0.36);
      this._tmp = { x: 0, z: 0 };
    }

    _bind() {
      const on = (ev, fn) => VH.events.on(ev, (e) => {
        if (this.on) fn(e || {});
      });
      on('airside:boarding', (e) => this._boardingCall(e));
      on('airside:closed', (e) => this._doorsClosed(e));
      on('airside:arrived', (e) => this._planeIn(e));
      on('terminal:carousel', (e) => this._bagsComing(e));
      on('crowd:threat', (e) => this._threat(e.x, e.z, e.radius || 30, e.kind));
      on('combat:melee', (e) => {
        const a = e.agent;
        if (a) this._threat(a.pos.x, a.pos.z, 14, 'fight');
      });
      VH.events.on('airside:takeoff', () => {
        const p = this.game.player.pos;
        if (Math.hypot(p.x + 250, p.z + 1300) < 900) this.watched++;
      });
    }

    // ----------------------------------------------------------- queries
    _zoneAt(x, z) {
      if (!this.zones) return 'outside';
      if (z > this.B.z1) return 'outside';
      if (z < this.B.z0) {
        // A jet bridge: the gate it leads from.
        for (const g of this.gates) if (Math.abs(x - g.x) < 16) return 'gate' + g.gate;
        return 'concourse';
      }
      for (const zz of this.zones) if (zz.gate && x >= zz.x0 && x <= zz.x1 && z >= zz.z0 && z <= zz.z1) return zz.id;
      for (const zz of this.zones) if (!zz.gate && x >= zz.x0 && x <= zz.x1 && z >= zz.z0 && z <= zz.z1) return zz.id;
      return 'concourse';
    }

    /** Distance from Jay to the terminal's footprint (0 inside). */
    _distT(p) {
      const B = this.B;
      const dx = Math.max(0, B.x0 - p.x, p.x - B.x1);
      const dz = Math.max(0, B.z0 - p.z, p.z - B.z1);
      return Math.hypot(dx, dz);
    }

    _quality() {
      const q = this.game.settings && this.game.settings.get ? this.game.settings.get('graphics.quality') : 'medium';
      return CAP[q] || CAP.medium;
    }

    _flights() {
      if (this._flightsAt === this._t) return this._fl;
      this._flightsAt = this._t;
      let list = [];
      const g = this.game;
      try {
        if (g.airside && g.airside.flights) list = g.airside.flights() || [];
        else if (g.terminal && g.terminal.flights) list = g.terminal.flights() || [];
      } catch (err) {
        list = [];
      }
      this._fl = list;
      try {
        this._st = g.airside && g.airside.stands ? g.airside.stands() || [] : [];
      } catch (err) {
        this._st = [];
      }
      return list;
    }

    /** The flight leaving from a gate soonest (or null). */
    _depAt(gate) {
      this._flights();
      const st = this._st && this._st.find((s) => s.gate === gate);
      if (st && st.departure && !this.closed.has(st.departure.id) && /^(parked|deplaning|boarding)$/.test(st.state || '')) return st.departure;
      const list = this._fl.filter((f) => f.kind === 'dep' && f.gate === gate && !/depart|closed|cancel/i.test(f.status || '') && !this.closed.has(f.id));
      return list[0] || null;
    }

    _canPop(x, y, z) {
      if (this._fill > 0) return true;
      const p = this.game.player.pos;
      const d = Math.hypot(p.x - x, p.z - z);
      return d > POP_R || !this.game.isVisible(x, y + 1, z, 1.1);
    }

    _droppable(a) {
      const p = this.game.player.pos;
      const d = Math.hypot(p.x - a.pos.x, p.z - a.pos.z);
      return !a.visible || d > 65;
    }

    people() {
      return this.list.map((b) => ({
        kind: b.kind, mode: b.mode, stage: b.stage, x: +b.a.pos.x.toFixed(2), y: +b.a.pos.y.toFixed(2), z: +b.a.pos.z.toFixed(2),
        zone: this._zoneAt(b.a.pos.x, b.a.pos.z), dead: b.a.dead, flight: b.flight ? b.flight.code : null, gate: b.gate, role: b.post ? b.post.role : null,
        case: !!b.case, pack: !!b.pack, visible: b.a.visible, id: b.a.id,
      }));
    }

    census() {
      const kind = {};
      const zone = {};
      const mode = {};
      let inside = 0;
      for (const b of this.list) {
        kind[b.kind] = (kind[b.kind] || 0) + 1;
        const z = this._zoneAt(b.a.pos.x, b.a.pos.z);
        zone[z] = (zone[z] || 0) + 1;
        mode[b.mode] = (mode[b.mode] || 0) + 1;
        if (z !== 'outside') inside++;
      }
      return { on: this.on, n: this.list.length, inside, outside: this.list.length - inside, kind, zone, mode, cars: this.cars.map((c) => c.kind + ':' + (c.d ? c.d.phase : '-')) };
    }

    // ---------------------------------------------------------- spawning
    _spawn(kind, x, z, o) {
      const g = this.game;
      o = o || {};
      const b = new Person(this, kind, o);
      const look = o.look || this._look(kind, o);
      const a = g.crowd.spawn(x, z, { look, faction: o.faction || 'civilian', role: 'airport', persistent: true, heading: o.heading === undefined ? Math.random() * PI * 2 : o.heading, name: o.name || null, y: o.y === undefined ? this.FY : o.y, health: o.health || 70, armor: o.armor || 0 });
      a.brain = b;
      b.a = a;
      if (kind === 'dep' || kind === 'arr' || kind === 'kerb') {
        if (o.case !== undefined ? o.case : chance(kind === 'dep' ? 0.78 : 0.15)) b.case = { color: pick(CASE_COLS) };
        if (chance(0.4)) b.pack = { color: pick(PACK_COLS) };
        if (chance(0.25)) b.speed *= 0.88;
      }
      this.list.push(b);
      return b;
    }

    _look(kind, o) {
      const L = VH.Crowd.randomLook();
      const U = (top, shirt, bottom, extra) => Object.assign(L, { top, trim: top, shirt, bottom, shoes: 0x1c1c1c, cap: false }, extra || {});
      switch (o.role || kind) {
        case 'checkin':
          U(0x1d2a44, AIRLINE_COL[o.code] || 0xf2f2ee, 0x1c1f26, { trim: AIRLINE_COL[o.code] || 0x1d2a44 });
          break;
        case 'gate':
          U(0x1d2a44, 0xf2f2ee, 0x1c1f26, { trim: 0xffd23c });
          break;
        case 'security':
          U(0x1b2433, 0xe9edf2, 0x15181d, { trim: 0x3a4a63 });
          break;
        case 'info':
          U(0x169aa1, 0xffffff, 0x22262c);
          break;
        case 'cafe':
          U(0x2b2b2b, chance(0.5) ? 0xffffff : 0xd8262e, 0x1c1c1f, { cap: chance(0.5) });
          break;
        case 'shop':
          U(0xf2f2ee, 0x2b2f35, 0x22262c, { trim: 0x7a3fb0 });
          break;
        case 'hire':
          U(0xffc93c, 0xffffff, 0x22262c);
          break;
        case 'clean':
          U(0x2f6fb5, 0x2f6fb5, 0x2e3f5c, { trim: 0xd8f21a });
          break;
        default:
          if (kind === 'dep' || kind === 'arr') {
            L.bag = chance(0.3);
            if (chance(0.25)) {
              // Smart travel: a jacket and trousers that match.
              const s = pick([0x1f2a38, 0x2d2f33, 0x3b4452, 0x4a3b2f, 0x5b5f66]);
              L.top = L.trim = L.bottom = s;
              L.shirt = chance(0.5) ? 0xf2f2f2 : 0xbcd3ea;
            }
          } else if (kind === 'greet') L.bag = chance(0.2);
      }
      return L;
    }

    _remove(b) {
      const a = b.a;
      this._release(b);
      b.gone = true;
      if (a && !a.removed) this.game.crowd.remove(a);
      const i = this.list.indexOf(b);
      if (i >= 0) this.list.splice(i, 1);
      if (b.cart) {
        b.cart.removeFromParent();
        b.cart = null;
      }
      if (b.signMesh) {
        b.signMesh.removeFromParent();
        b.signMesh.geometry.dispose();
        b.signMesh = null;
      }
    }

    /** Let go of whatever they held: a queue place, a seat, a spot, a post. */
    _release(b) {
      if (b.line) {
        b.line.leave(b);
        b.line = null;
      }
      b.joined = false;
      if (b.seat >= 0 && this.seatBy) {
        if (this.seatBy[b.seat] === b) this.seatBy[b.seat] = null;
        b.seat = -1;
      }
      if (b.spot) {
        if (b.spot.busy === b) b.spot.busy = null;
        b.spot = null;
      }
      if (b.wait) {
        const c = b.wait.c;
        if (c && c.by[b.wait.i] === b) c.by[b.wait.i] = null;
        b.wait = null;
      }
      if (b.post && b.post.p === b) b.post.p = null;
      if (b.pickup && b.pickup.busy === b) b.pickup.busy = null;
      b.pickup = null;
      if (this.taxiLine) this.taxiLine.leave(b);
    }

    // ------------------------------------------------------------- moving
    /** Off somewhere along the terminal's map (or straight there outside it). */
    go(b, a, x, z, then, o) {
      o = o || {};
      b.mode = o.flee ? 'flee' : 'walk';
      b.then = then;
      b.dest = { x, z };
      b.pi = 0;
      b.stuck = 0;
      const via = b.exitVia;
      b.exitVia = null;
      if (via && !o.flee) {
        const last = via[via.length - 1];
        b.path = via.concat(this._route(last.x, last.z, a.pos.y, x, z, o.mode || this._navMode(b), o.avoid, o.y));
      } else b.path = this._route(a.pos.x, a.pos.z, a.pos.y, x, z, o.mode || this._navMode(b), o.avoid, o.y);
      if (o.speed) b.speed = o.speed;
    }

    _navMode(b) {
      if (b.kind === 'dep') return 'dep';
      if (b.kind === 'arr') return 'arr';
      if (b.kind === 'staff' || b.kind === 'cop') return 'any';
      if (b.kind === 'clean') return b.side === 'air' ? 'air' : 'land';
      return 'land';
    }

    _route(fx, fz, fy, tx, tz, mode, avoid, ty) {
      const N = this.nav;
      const dest = { x: tx, z: tz };
      if (!N) return [dest];
      // Both ends outside the hall, or a straight walk: no need for the map.
      if (Math.hypot(tx - fx, tz - fz) < 7 && N.clear(fx, fz, fy, tx, tz, ty === undefined ? fy : ty)) return [dest];
      const a = N.near(fx, fz, fy, null, false);
      const b = N.near(tx, tz, ty === undefined ? this.FY : ty, null, true);
      if (a < 0 || b < 0) return [dest];
      const ix = N.path(a, b, mode, avoid);
      if (!ix) return [dest];
      const out = [];
      for (const i of ix) out.push(N.nodes[i]);
      // Skip the first node if we're already past it.
      if (out.length > 1) {
        const n0 = out[0];
        const n1 = out[1];
        if (dist2(fx, fz, n1.x, n1.z) < dist2(n0.x, n0.z, n1.x, n1.z) && N.clear(fx, fz, fy, n1.x, n1.z, n1.y)) out.shift();
      }
      const last = out[out.length - 1];
      if (dist2(last.x, last.z, tx, tz) > 0.04) out.push(dest);
      return out;
    }

    repath(b, a) {
      if (!b.dest || (b.mode !== 'walk' && b.mode !== 'flee')) return;
      b.path = this._route(a.pos.x, a.pos.z, a.pos.y, b.dest.x, b.dest.z, b.mode === 'flee' ? 'any' : this._navMode(b), b.mode === 'flee' ? b.avoid : null);
      b.pi = 0;
      b.repaths = (b.repaths || 0) + 1;
      // Hopelessly stuck and out of sight: gone.
      if (b.repaths > 4 && this._droppable(a)) b.gone = true;
    }

    _wait(b, t, face, act, then) {
      b.mode = 'wait';
      b.wt = t;
      b.face = face === undefined ? null : face;
      b.act = act || null;
      b.then = then;
    }

    /** What they do with their hands while they wait. */
    acting(b, a, dt) {
      const an = a.anim;
      switch (b.act) {
        case 'phone':
          an.phone = Math.min(1, an.phone + dt * 3);
          return;
        case 'talk':
          an.talk = 0.35 + 0.3 * Math.sin(b.t * 1.7);
          break;
        case 'reach':
          an.pose = POSE.reach;
          break;
        case 'lift':
          an.pose = POSE.lift;
          break;
        case 'sign':
          an.pose = POSE.sign;
          break;
        case 'arms':
          an.pose = POSE.armsOut;
          break;
        case 'hug':
          an.pose = POSE.hug;
          an.talk = 0.3;
          break;
        case 'mop':
          an.pose = POSE.mop;
          a.heading += Math.sin(b.t * 2.4) * dt * 0.8;
          break;
        case 'hands':
          an.pose = POSE.hands;
          break;
        default:
      }
      if (an.phone > 0) an.phone = Math.max(0, an.phone - dt * 3);
    }

    // ------------------------------------------------------------ queues
    _join(b, a, line, then) {
      if (!line || line.full()) return false;
      line.coming++;
      b.line = line;
      b.joined = false;
      b.then = then;
      b.served = 0;
      b.mode = 'queue';
      // Along the map to where the queue would end at its longest, then up to the back of it.
      const e = line.spot(line.cap - 1);
      const via = b.exitVia;
      b.exitVia = null;
      if (via) {
        const l = via[via.length - 1];
        b.path = via.concat(this._route(l.x, l.z, a.pos.y, e.x, e.z, this._navMode(b)));
      } else b.path = this._route(a.pos.x, a.pos.z, a.pos.y, e.x, e.z, this._navMode(b));
      b.pi = 0;
      return true;
    }

    /** Placed straight into a queue (spawned there). */
    _inQueue(b, line) {
      line.q.push(b);
      b.line = line;
      b.joined = true;
      b.mode = 'queue';
      b.path = null;
      b.served = 0;
    }

    queueStep(b, a, dt) {
      const line = b.line;
      if (!line || (b.joined && line.q.indexOf(b) < 0)) {
        b.line = null;
        this.next(b, a);
        return;
      }
      // Still on the way to the back of it.
      if (!b.joined) {
        const tail = line.spot(line.q.length);
        const near = Math.hypot(tail.x - a.pos.x, tail.z - a.pos.z) < 1.6;
        if (!near && b.path && b.pi < b.path.length && !b.walk(a, dt, b.speed)) return;
        b.joined = true;
        line.coming = Math.max(0, line.coming - 1);
        line.q.push(b);
      }
      b.path = null;
      const qi = line.q.indexOf(b);
      const s = line.spot(qi);
      const dx = s.x - a.pos.x;
      const dz = s.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.22 && !(a.blocked > 1.2 && d < 0.8)) {
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 8, dt);
        a.moveSpeed = Math.min(1.1, d * 1.8 + 0.2);
        b.served = 0;
        return;
      }
      const ahead = qi === 0 ? null : line.spot(qi - 1);
      const face = ahead ? Math.atan2(ahead.x - a.pos.x, ahead.z - a.pos.z) : line.face;
      a.heading = dampAngle(a.heading, face, 6, dt);
      if (qi > 0) {
        if (b.phone === undefined) b.phone = chance(0.35);
        if (b.phone) a.anim.phone = Math.min(1, a.anim.phone + dt * 2);
        return;
      }
      a.anim.phone = Math.max(0, a.anim.phone - dt * 3);
      // At the front: served.
      if (!b.served) b.served = rnd(line.serve[0], line.serve[1]);
      b.served -= dt;
      a.anim.talk = line.desk && line.desk.kind !== 'gate' ? 0.3 + 0.25 * Math.sin(b.t * 2.1) : 0;
      if (b.served <= 0) {
        // A desk with nobody at it doesn't serve (the queue just waits).
        if (line.post && !line.post.p && line.desk && line.desk.kind !== 'gate') {
          b.served = 1;
          return;
        }
        // Security keeps its place at the front until they're through the arch.
        if (line.lane === undefined) {
          line.leave(b);
          b.line = null;
          this._exitLine(b, a, line);
        }
        this.served(b, a, line);
      }
    }

    /** Out of a desk queue sideways, past the people still in it, not through them. */
    _exitLine(b, a, line) {
      const d = line.desk;
      if (!d || !(d.kind === 'checkin' || d.kind === 'hire' || d.kind === 'info') || line.spots.length < 2 || !this.nav) return;
      const s0 = line.spots[0];
      const s1 = line.spots[line.spots.length - 1];
      const l = Math.hypot(s1.x - s0.x, s1.z - s0.z) || 1;
      const ux = (s1.x - s0.x) / l;
      const uz = (s1.z - s0.z) / l;
      const y = a.pos.y;
      for (const side of chance(0.5) ? [1, -1] : [-1, 1]) {
        const p1 = { x: s0.x + uz * side * 1.3, z: s0.z - ux * side * 1.3 };
        const p2 = { x: s1.x + uz * side * 1.3 + ux * 1.2, z: s1.z - ux * side * 1.3 + uz * 1.2 };
        if (this.nav.clear(a.pos.x, a.pos.z, y, p1.x, p1.z, y) && this.nav.clear(p1.x, p1.z, y, p2.x, p2.z, y)) {
          b.exitVia = [p1, p2];
          return;
        }
      }
    }

    // ------------------------------------------------------------ seats
    _freeSeat(zone, near) {
      const list = this.seatsIn && this.seatsIn[zone];
      if (!list || !list.length) return -1;
      for (let k = 0; k < 12; k++) {
        const i = list[Math.floor(Math.random() * list.length)];
        if (this.seatBy[i]) continue;
        if (near && dist2(this.seats[i].x, this.seats[i].z, near.x, near.z) > 900) continue;
        // Not right beside a stranger, usually.
        const s = this.seats[i];
        let crowded = false;
        for (const j of list) {
          const o = this.seatBy[j];
          if (o && dist2(this.seats[j].x, this.seats[j].z, s.x, s.z) < 0.5) crowded = chance(0.7);
        }
        if (!crowded) return i;
      }
      return -1;
    }

    _sit(b, a, seat, t, pose, then) {
      b.seat = seat;
      this.seatBy[seat] = b;
      const s = this.seats[seat];
      b.then = then;
      b.sitT = t;
      b.sitPose = pose || (chance(0.45) ? POSE.sitPhone : POSE.sit);
      const ap = s.approach || s;
      if (s.ends) {
        const end = Math.abs(s.ends[0] - ap.x) < Math.abs(s.ends[1] - ap.x) ? s.ends[0] : s.ends[1];
        this.go(b, a, end, ap.z, 'seat');
        b.path.push({ x: ap.x, z: ap.z });
        return;
      }
      this.go(b, a, ap.x, ap.z, 'seat');
    }

    /** Placed straight in the seat (spawned there). */
    _seatNow(b, a, seat, t, pose, then) {
      b.seat = seat;
      this.seatBy[seat] = b;
      const s = this.seats[seat];
      b.then = then;
      b.sitT = t;
      b.sitPose = pose || (chance(0.45) ? POSE.sitPhone : POSE.sit);
      b.mode = 'sit';
      b.k = 1;
      b.wt = t;
      a.heading = s.yaw;
      this._seatPos(b, a, 1);
    }

    _seatPos(b, a, k) {
      const s = this.seats[b.seat];
      const ap = s.approach || s;
      const back = 0.06;
      const sx = s.x + Math.sin(s.yaw) * -back;
      const sz = s.z + Math.cos(s.yaw) * -back;
      a.pos.x = lerp(ap.x, sx, k);
      a.pos.z = lerp(ap.z, sz, k);
      a.pos.y = this.FY;
      a.vel.x = 0;
      a.vel.z = 0;
    }

    sitStep(b, a, dt) {
      const s = this.seats[b.seat];
      if (!s) {
        b.mode = 'idle';
        this.next(b, a);
        return;
      }
      a.heading = dampAngle(a.heading, s.yaw, 9, dt);
      if (b.mode === 'sitdown') {
        b.k = Math.min(1, (b.k || 0) + dt * 1.6);
        this._seatPos(b, a, b.k);
        if (b.k > 0.35) a.anim.pose = b.sitPose;
        if (b.k >= 1) {
          b.mode = 'sit';
          b.wt = b.sitT;
        }
        return;
      }
      if (b.mode === 'sit') {
        this._seatPos(b, a, 1);
        a.anim.pose = b.sitPose;
        if (b.sitPose === POSE.sit && Math.sin(b.t * 0.37 + a.id) > 0.92) a.anim.talk = 0.3;
        b.wt -= dt;
        if (b.wt <= 0 || b.getUp) {
          b.getUp = false;
          b.mode = 'standup';
        }
        return;
      }
      // Standing up.
      b.k = Math.max(0, b.k - dt * 1.6);
      this._seatPos(b, a, b.k);
      if (b.k > 0.5) a.anim.pose = b.sitPose;
      if (b.k <= 0) {
        if (this.seatBy[b.seat] === b) this.seatBy[b.seat] = null;
        // Out along the row to its end first.
        if (s.ends && s.approach) {
          const end = Math.abs(s.ends[0] - a.pos.x) < Math.abs(s.ends[1] - a.pos.x) ? s.ends[0] : s.ends[1];
          b.exitVia = [{ x: end, z: s.approach.z }];
        }
        b.seat = -1;
        b.mode = 'idle';
        this.next(b, a);
      }
    }

    // ------------------------------------------------------------- staff
    postStep(b, a, dt) {
      const P = b.post;
      const tx = b.shift ? P.x + b.shift.x : P.x;
      const tz = b.shift ? P.z + b.shift.z : P.z;
      const dx = tx - a.pos.x;
      const dz = tz - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.25 && !(a.blocked > 1 && d < 0.8)) {
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 7, dt);
        a.moveSpeed = Math.min(1.2, d * 2 + 0.2);
        return;
      }
      const ln = P.line;
      const serving = ln && ln.q.length && ln.q[0].a && !ln.q[0].path && ln.q[0].served && ln.q[0].served > 0;
      let face = P.yaw;
      // The security officer watches whoever is coming through the arch.
      if (P.arch && ln && ln.q.length) face = Math.atan2(ln.sec.arch.x - a.pos.x, ln.sec.arch.z + 1 - a.pos.z);
      a.heading = dampAngle(a.heading, face, 5, dt);
      const an = a.anim;
      if (serving) an.talk = 0.35 + 0.3 * Math.sin(b.t * 2.6);
      else if (P.role === 'cafe' && Math.sin(b.t * 0.6 + a.id) > 0.4) an.pose = POSE.reach;
      else if (P.screen) an.pose = POSE.hands;
      else if (P.role === 'gate' && this.boarding.has(P.gate)) an.pose = POSE.hands;
      // Café staff move between the till and the machines now and then.
      b.wt -= dt;
      if (b.wt <= 0) {
        b.wt = rnd(5, 14);
        if (P.role === 'cafe' && !serving) b.shift = b.shift ? null : { x: rnd(-1.6, 1.6), z: Math.cos(P.yaw) * -0.6 };
        else b.shift = null;
      }
    }

    _staff(post) {
      const role = post.role === 'gate' ? 'gate' : post.role;
      const b = this._spawn('staff', post.x, post.z, { role, code: post.code, heading: post.yaw, name: post.role === 'security' ? 'Security officer' : 'Airport staff', case: false, health: 80 });
      b.post = post;
      b.mode = 'post';
      b.wt = rnd(2, 10);
      b.pack = null;
      post.p = b;
      if (post.line) post.line.post = post;
      return b;
    }

    // ------------------------------------------------------ the travellers
    /** What happens next, by stage. */
    next(b, a) {
      const st = b.stage;
      const K = b.kind;
      if (K === 'dep') return this._depNext(b, a, st);
      if (K === 'arr') return this._arrNext(b, a, st);
      if (K === 'greet') return this._greetNext(b, a, st);
      if (K === 'kerb') return this._kerbNext(b, a, st);
      if (K === 'clean') return this._cleanNext(b, a);
      if (K === 'staff' && b.post) {
        b.mode = 'post';
        return;
      }
      this._leave(b, a);
    }

    arrived(b, a) {
      const then = b.then;
      b.path = null;
      if (then === 'seat') {
        b.mode = 'sitdown';
        b.k = 0;
        return;
      }
      if (then === 'gone') {
        b.mode = 'gone';
        b.gone = true;
        return;
      }
      if (typeof then === 'function') {
        b.then = null;
        then(b, a);
        return;
      }
      this.next(b, a);
    }

    waited(b, a) {
      const then = b.then;
      b.act = null;
      if (typeof then === 'function') {
        b.then = null;
        then(b, a);
        return;
      }
      this.next(b, a);
    }

    served(b, a, line) {
      const d = line.desk;
      if (line.lane !== undefined) return this._secDrop(b, a, line);
      if (d && d.kind === 'checkin') {
        // The case goes onto the belt.
        b.case = null;
        b.checked = true;
      }
      if (d && d.kind === 'gate') return this._downBridge(b, a);
      if (d && d.kind === 'cafe') b.bought = true;
      this.next(b, a);
    }

    /** Off home: out of sight, or a long way from Jay, they just go. */
    _leave(b, a) {
      b.stage = 'leave';
      if (this._droppable(a)) {
        b.gone = true;
        b.mode = 'gone';
        return;
      }
      const T = this.T;
      if (!T || a.pos.z > this.B.z1) {
        // Outside: along the pavement and away.
        const x = a.pos.x < (this.B.x0 + this.B.x1) / 2 ? this.B.x0 - 30 : this.B.x1 + 30;
        this.go(b, a, x, this.K.walkZ, 'gone', { mode: 'land' });
        return;
      }
      // Inside: to the nearest door that's theirs and out.
      const air = a.pos.z < (T.partitionZ || -1216) && b.kind !== 'arr';
      if (air) {
        // Airside folk wander off along the concourse.
        const N = this.nav.nodes;
        const ends = ['sp-425.5', 'sp-84', 'sp-150', 'sp-397'].map((id) => N[this.nav.ix[id]]).filter(Boolean);
        const far = ends.sort((p, q) => dist2(q.x, q.z, a.pos.x, a.pos.z) - dist2(p.x, p.z, a.pos.x, a.pos.z))[0];
        if (far) return this.go(b, a, far.x, far.z, 'gone', { mode: 'air' });
      }
      const d = this._nearestDoor(a.pos.x, null);
      this.go(b, a, d.out.x, d.out.z + 2.5, (bb, aa) => this._leave(bb, aa), { mode: b.kind === 'arr' ? 'arr' : 'land' });
    }

    _nearestDoor(x, kind) {
      let best = null;
      for (const d of this.doors) {
        if (kind && d.kind !== kind) continue;
        if (!best || Math.abs(d.x - x) < Math.abs(best.x - x)) best = d;
      }
      return best || this.doors[0];
    }

    // ---- departures
    _depNext(b, a, st) {
      const T = this.T;
      switch (st) {
        case 'enter': {
          // From the kerb through the nearest departures door.
          if (!T) {
            const d = this._nearestDoor(a.pos.x, 'departures');
            b.stage = 'inside';
            return this.go(b, a, d.x, this.B.z1 + 0.6, 'gone', { mode: 'land' });
          }
          const d = this._nearestDoor(a.pos.x, 'departures');
          b.stage = 'door';
          return this.go(b, a, d.in ? d.in.x : d.x, d.in ? d.in.z : this.B.z1 - 2.5, null);
        }
        case 'door':
          b.stage = b.case ? 'checkin' : chance(0.3) ? 'landside' : 'security';
          return this._depNext(b, a, b.stage);
        case 'checkin': {
          const ln = this._pickLine((l) => l.desk && l.desk.kind === 'checkin', a, b.flight);
          b.stage = 'checkedin';
          if (ln && this._join(b, a, ln)) return;
          return this._depNext(b, a, 'checkedin');
        }
        case 'checkedin':
          b.case = null;
          b.stage = chance(0.22) ? 'landside' : 'security';
          if (this._far(b, a, -300, -1212)) return;
          return this._depNext(b, a, b.stage);
        case 'landside': {
          b.stage = 'security';
          const r = Math.random();
          if (r < 0.4) {
            const s = this._freeSeat('landside');
            if (s >= 0) return this._sit(b, a, s, rnd(15, 45));
          }
          const ln = this._pickLine((l) => l.desk && (l.desk.id === 'pelican' || l.desk.id === 'sunrise' || (r > 0.85 && l.desk.kind === 'info')), a);
          if (ln && this._join(b, a, ln)) return;
          return this._depNext(b, a, 'security');
        }
        case 'security': {
          const ln = this._pickSec(a);
          b.stage = 'secured';
          if (ln && this._join(b, a, ln)) return;
          // No room in the queues: wait by the tapes a moment.
          b.stage = 'security';
          return this._wait(b, rnd(3, 6), null, 'phone');
        }
        case 'secured': {
          b.stage = 'gate';
          const r = Math.random();
          if (r < 0.32) return this._shop(b, a);
          if (r < 0.62) return this._cafe(b, a);
          return this._depNext(b, a, 'gate');
        }
        case 'gate':
          return this._toGate(b, a);
        case 'lounge':
          return this._atGate(b, a);
        case 'eat': {
          b.stage = 'gate';
          const s = this._freeSeat(this._zoneAt(a.pos.x, a.pos.z) === 'landside' ? 'landside' : 'food', a.pos);
          if (s >= 0) return this._sit(b, a, s, rnd(25, 70), POSE.sitEat);
          return this._depNext(b, a, 'gate');
        }
        case 'board':
          return this._toBoard(b, a);
        default:
          return this._leave(b, a);
      }
    }

    /** Somewhere a long way from Jay and out of sight: skip the walk (they get there without us). */
    _far(b, a, x, z) {
      const p = this.game.player.pos;
      if (Math.hypot(p.x - x, p.z - z) > 150 && Math.hypot(p.x - a.pos.x, p.z - a.pos.z) > 60 && this._droppable(a)) {
        b.gone = true;
        b.mode = 'gone';
        return true;
      }
      return false;
    }

    _pickLine(fn, a, flight) {
      let best = null;
      let bestS = Infinity;
      const code = flight && flight.code ? flight.code.split(' ')[0] : null;
      for (const id in this.lines) {
        const l = this.lines[id];
        if (!l.open || !fn(l) || l.full()) continue;
        if (l.post && !l.post.p && l.desk.kind !== 'gate') continue; // nobody at the desk
        let s = l.q.length * 6 + Math.hypot(l.spots[0].x - a.pos.x, l.spots[0].z - a.pos.z) * 0.15 + Math.random() * 4;
        if (code && l.desk.code === code) s -= 8;
        if (s < bestS) {
          bestS = s;
          best = l;
        }
      }
      return best;
    }

    _pickSec(a) {
      let best = null;
      let bestS = Infinity;
      for (const l of this.sec || []) {
        if (!l.open || l.full()) continue;
        const s = l.q.length * 5 + Math.abs(l.spots[0].x - a.pos.x) * 0.1 + Math.random() * 3;
        if (s < bestS) {
          bestS = s;
          best = l;
        }
      }
      return best;
    }

    /** At the front of a security lane: bag in a tray, through the arch, bag back. */
    _secDrop(b, a, line) {
      const ln = line.sec;
      const ax = ln.arch.x;
      const az = ln.arch.z;
      const bx = ln.belt ? ln.belt.x : ax - 2.1;
      b.lane = line.lane;
      this.go(b, a, ax - 0.8, az + 2.35, (bb, aa) => {
        this._wait(bb, rnd(2, 3.2), -PI / 2, 'reach', (b2, a2) => {
          // The bag rides the belt through the machine.
          if (b2.pack || b2.case) b2.prop = { x: bx, y: this.FY + 0.84, z: az + 2.3, yaw: 0, flat: true, belt: { z1: az - 3.4 } };
          const beep = chance(SEC_BEEP);
          b2.beep = beep;
          this.go(b2, a2, ax, az + 1.1, (b3, a3) => this.go(b3, a3, ax, az - 1.3, (b4, a4) => this._secArch(b4, a4, line, beep)), { mode: 'any' });
        });
      }, { mode: 'any' });
    }

    _secArch(b, a, line, beep) {
      if (b.line) {
        b.line.leave(b);
        b.line = null;
      }
      const T = this.game.terminal;
      if (T && T.archBeep) {
        try {
          T.archBeep(line.lane, beep);
        } catch (err) {
          /* the arch is terminal.js's */
        }
      }
      const ln = line.sec;
      const ax = ln.arch.x;
      const az = ln.arch.z;
      // Their bag comes out of the machine at the end of the belt: lift it off.
      const lift = (b2, a2) => {
        const P = b2.prop;
        if (P && P.belt && P.z > P.belt.z1 + 0.25) return this._wait(b2, 0.8, -PI / 2, null, lift);
        this._wait(b2, rnd(1.6, 2.6), -PI / 2, 'lift', (b3, a3) => {
          b3.prop = null;
          this.next(b3, a3);
        });
      };
      const pick = () => this.go(b, a, ax - 0.85, az - 2.6, lift, { mode: 'any' });
      if (beep) {
        // Set it off: arms out for the officer's wand.
        this._wait(b, rnd(3.5, 5), PI / 2, 'arms', () => pick());
        return;
      }
      pick();
    }

    _shop(b, a) {
      b.stage = 'gate';
      const z = this._zoneAt(a.pos.x, a.pos.z);
      if (chance(0.5)) {
        const ln = this._pickLine((l) => l.desk && l.desk.kind === 'shop' && this._zoneAt(l.spots[0].x, l.spots[0].z) !== 'landside' && Math.abs(l.spots[0].x - a.pos.x) < 80, a);
        if (ln && this._join(b, a, ln)) return;
      }
      const spots = (this.window || []).filter((s) => !s.busy && s.zone !== 'landside' && Math.abs(s.x - a.pos.x) < 90);
      if (spots.length) {
        const s = pick(spots);
        s.busy = b;
        b.spot = s;
        return this.go(b, a, s.x, s.z, (bb, aa) => this._wait(bb, rnd(8, 22), s.yaw, chance(0.3) ? 'phone' : null, (b2, a2) => {
          this._release(b2);
          this.next(b2, a2);
        }), { mode: 'air' });
      }
      if (z === 'shops') {
        const s = this._freeSeat('shops');
        if (s >= 0) return this._sit(b, a, s, rnd(20, 40));
      }
      return this._depNext(b, a, 'gate');
    }

    _cafe(b, a) {
      b.stage = 'eat';
      const ln = this._pickLine((l) => l.desk && l.desk.kind === 'cafe' && this._zoneAt(l.spots[0].x, l.spots[0].z) === 'food', a);
      if (ln && this._join(b, a, ln)) return;
      return this._depNext(b, a, 'eat');
    }

    _toGate(b, a) {
      b.stage = 'lounge';
      if (!b.gate || !this.gateBy[b.gate]) {
        const f = this._pickFlight();
        b.flight = f;
        b.gate = f ? f.gate : pick(this.gates).gate;
      }
      const g = this.gateBy[b.gate];
      if (!g) return this._leave(b, a);
      if (this._far(b, a, g.x, -1238)) return;
      return this._atGate(b, a);
    }

    _pickFlight() {
      if (!this.gateBy) return null;
      const deps = this._flights().filter((f) => f.kind === 'dep' && this.gateBy[f.gate] && !/depart|closed|cancel/i.test(f.status || '') && !this.closed.has(f.id));
      if (!deps.length) return null;
      return deps[Math.min(deps.length - 1, Math.floor(Math.random() * Math.min(3, deps.length)))];
    }

    _atGate(b, a) {
      const g = this.gateBy[b.gate];
      b.stage = 'board';
      if (this.boarding.has(b.gate) && (!b.flight || this.boarding.get(b.gate).id === b.flight.id)) return this._toBoard(b, a);
      const s = this._freeSeat('gate' + b.gate);
      if (s >= 0) return this._sit(b, a, s, 1e9);
      const v = (this.view || []).filter((q) => !q.busy && q.gate === b.gate);
      if (v.length) {
        const q = pick(v);
        q.busy = b;
        b.spot = q;
        return this.go(b, a, q.x, q.z, (bb) => this._wait(bb, 1e9, q.yaw, chance(0.4) ? 'phone' : null), { mode: 'air' });
      }
      return this.go(b, a, g.x - rnd(4, 20), -1233.9, (bb) => this._wait(bb, 1e9, PI, 'phone'), { mode: 'air' });
    }

    /** Boarding: up to the gate desk, a scan of the boarding pass, down the bridge. */
    _toBoard(b, a) {
      const g = this.gateBy[b.gate];
      const d = g && this.desks[g.desk];
      const ln = d && this.lines[d.id];
      b.stage = 'boarding';
      b.boardWait = 0;
      if (b.spot) this._release(b);
      if (ln && this._join(b, a, ln)) return;
      // The queue's full: wait a little where they are.
      b.stage = 'board';
      this._wait(b, rnd(3, 6), null, 'phone');
    }

    _downBridge(b, a) {
      const g = this.gateBy[b.gate];
      if (!g) return this._leave(b, a);
      const pts = [{ x: g.x + 1.0, z: -1239.6 }, { x: g.x, z: -1242.6 }];
      for (const p of g.bridge || []) pts.push(p);
      if (g.end) pts.push({ x: g.end.mouth !== undefined ? g.end.mouth + 0.3 : g.end.x, z: g.end.z });
      b.stage = 'bridge';
      b.mode = 'walk';
      b.path = pts;
      b.pi = 0;
      b.then = 'gone';
      b.dest = pts[pts.length - 1];
      b.speed = Math.max(b.speed, 1.3);
    }

    _boardingCall(e) {
      const gate = e.gate || (e.flight && e.flight.gate);
      if (!gate || !this.gateBy) return;
      this.boarding.set(gate, e.flight || { id: '?' });
      for (const b of this.list) {
        if (b.kind !== 'dep' || b.gate !== gate) continue;
        if (b.flight && e.flight && b.flight.id !== e.flight.id) continue;
        b.flight = e.flight || b.flight;
        b.boardAt = this._t + rnd(2, 55);
      }
      this._announce('boarding', e.flight, 6);
    }

    _doorsClosed(e) {
      const f = e.flight;
      if (!f) return;
      this.closed.add(f.id);
      for (const [g, fl] of this.boarding) if (fl && fl.id === f.id) this.boarding.delete(g);
      // Anyone still waiting for it has missed it.
      for (const b of this.list) {
        if (b.kind !== 'dep' || !b.flight || b.flight.id !== f.id || b.stage === 'bridge') continue;
        b.flight = null;
        b.boardAt = 0;
        if (b.line && b.line.desk && b.line.desk.kind === 'gate') {
          this._release(b);
          this._leave(b, b.a);
        }
      }
    }

    // ---- arrivals
    _planeIn(e) {
      if (!this.T || !this.gateBy) return;
      const g = this.gateBy[e.gate || (e.flight && e.flight.gate)];
      if (!g) return;
      const p = this.game.player.pos;
      const nearGate = Math.hypot(p.x - g.x, p.z + 1240) < 170;
      const nearRec = Math.hypot(p.x + 140, p.z + 1215) < 170;
      if (!nearGate && !nearRec) return;
      this._arrivals.push({ flight: e.flight || null, g, n: Math.round(rnd(7, 13)), t: nearGate ? rnd(1, 3) : rnd(25, 40), atRec: !nearGate });
    }

    _arrivalsTick(dt) {
      for (let i = this._arrivals.length - 1; i >= 0; i--) {
        const q = this._arrivals[i];
        q.t -= dt;
        if (q.t > 0) continue;
        q.t = rnd(2, 5.5);
        if (this._insideCount() < this.capIn + 4) this._arrival(q);
        if (--q.n <= 0) this._arrivals.splice(i, 1);
      }
    }

    _arrival(q) {
      const g = q.g;
      const N = this.nav;
      let b;
      if (q.atRec) {
        // Jay's by the reclaim hall: they turn up at its door from the concourse.
        const n = N.nodes[N.ix.rec_d];
        if (!n || !this._canPop(n.x, n.y, n.z)) return;
        b = this._spawn('arr', n.x + rnd(-0.6, 0.6), n.z, { heading: PI, case: false });
      } else {
        const e = g.end || g.bridge[g.bridge.length - 1];
        b = this._spawn('arr', (e.mouth !== undefined ? e.mouth + 0.6 : e.x), e.z + rnd(-0.3, 0.3), { heading: PI / 2, y: e.y || 3, case: chance(0.2) });
        // Up the bridge to the gate door, then on.
        const pts = (g.bridge || []).slice().reverse();
        b.path = pts;
        b.pi = 0;
        b.mode = 'walk';
        b.dest = pts[pts.length - 1];
      }
      b.flight = q.flight;
      b.gate = g.gate;
      b.hasBag = chance(0.68);
      b.stage = 'reclaim';
      b.then = null;
      if (q.atRec) this._arrNext(b, b.a, 'reclaim');
    }

    _arrNext(b, a, st) {
      switch (st) {
        case 'reclaim': {
          b.stage = 'exit';
          if (!b.hasBag || !this.carousels || !this.carousels.length) return this._arrNext(b, a, 'exit');
          let ci = -1;
          const T = this.game.terminal;
          if (T && T.carouselOf && b.flight) {
            try {
              ci = T.carouselOf(b.flight.id);
            } catch (err) {
              ci = -1;
            }
          }
          if (ci < 0) ci = b.flight ? Math.abs(hashStr(b.flight.id)) % this.carousels.length : 0;
          b.ci = ci;
          const C = this.carousels[ci];
          const free = [];
          C.by.forEach((o, i) => !o && free.push(i));
          if (!free.length) return this._arrNext(b, a, 'exit');
          const i = pick(free);
          C.by[i] = b;
          b.wait = { c: C, i };
          const w = C.c.wait[i];
          b.bagT = 0;
          this.go(b, a, w.x, w.z, (bb) => {
            bb.mode = 'bag';
            bb.face = w.yaw;
          });
          return;
        }
        case 'exit': {
          b.stage = 'met';
          const N = this.nav;
          const m = N && N.nodes[N.ix.meet];
          if (!m) return this._arrNext(b, a, 'out');
          if (this._far(b, a, m.x, m.z)) return;
          return this.go(b, a, m.x + rnd(-0.8, 0.8), m.z + rnd(-0.5, 0.5), null);
        }
        case 'met': {
          b.stage = 'out';
          // Somebody waiting for them?
          if (chance(0.5)) {
            const g = this.list.find((o) => o.kind === 'greet' && o.stage === 'waiting' && !o.lead && Math.hypot(o.a.pos.x - a.pos.x, o.a.pos.z - a.pos.z) < 16);
            if (g) {
              g.stage = 'found';
              g.lead = b;
              b.friend = g;
              this._release(g);
              this.go(g, g.a, a.pos.x + Math.sin(a.heading) * 0.9, a.pos.z + Math.cos(a.heading) * 0.9, (gg, ga) => {
                gg.face = Math.atan2(b.a.pos.x - ga.pos.x, b.a.pos.z - ga.pos.z);
                this._wait(gg, 2.4, gg.face, 'hug', (g2) => {
                  g2.mode = 'follow';
                });
              }, { mode: 'land' });
              return this._wait(b, 3.2, Math.atan2(g.a.pos.x - a.pos.x, g.a.pos.z - a.pos.z), 'hug', null);
            }
          }
          return this._arrNext(b, a, 'out');
        }
        case 'out':
          return this._outside(b, a);
        default:
          return this._leave(b, a);
      }
    }

    bagStep(b, a, dt) {
      a.heading = dampAngle(a.heading, b.face, 5, dt);
      b.bagT += dt;
      b.tryT = (b.tryT || 0) - dt;
      const T = this.game.terminal;
      if (b.tryT <= 0) {
        b.tryT = rnd(0.8, 1.6);
        let bag = null;
        if (T && T.takeBag && chance(0.35)) {
          try {
            bag = T.takeBag(b.ci, a.pos.x, a.pos.z, 2.3);
          } catch (err) {
            bag = null;
          }
        }
        if (bag || b.bagT > 150) {
          b.case = { color: bag ? bag.color : pick(CASE_COLS) };
          this._release(b);
          this._wait(b, 1.1, b.face, 'lift', (bb, aa) => this.next(bb, aa));
          return;
        }
      }
      if (Math.sin(b.t * 0.3 + a.id) > 0.6) a.anim.phone = Math.min(1, a.anim.phone + dt * 2);
      else a.anim.phone = Math.max(0, a.anim.phone - dt * 2);
    }

    /** Out of the arrivals hall: the taxi rank, the bus, a lift, or off on foot. */
    _outside(b, a) {
      const r = Math.random();
      b.stage = 'away';
      const d = this._nearestDoor(a.pos.x, 'arrivals');
      const out = (fn) => this.go(b, a, d.out ? d.out.x : d.x, (d.out ? d.out.z : this.B.z1) + 1.2, fn, { mode: b.kind === 'arr' ? 'arr' : 'land' });
      if (r < 0.42) return out((bb, aa) => this._toTaxi(bb, aa));
      if (r < 0.57) return out((bb, aa) => this._toBus(bb, aa));
      if (r < 0.75) {
        const s = this.K.arrivals.find((q) => !q.busy);
        if (s) {
          s.busy = b;
          b.pickup = s;
          return out((bb, aa) => this.go(bb, aa, s.kerb.x, s.kerb.z, (b2, a2) => this._wait(b2, 60, -PI / 2 + PI, 'phone', (b3, a3) => this._leave(b3, a3)), { mode: 'land' }));
        }
      }
      return out((bb, aa) => this._leave(bb, aa));
    }

    _toTaxi(b, a) {
      b.stage = 'taxi';
      if (!this._join(b, a, this.taxiLine)) return this._leave(b, a);
    }

    _toBus(b, a) {
      b.stage = 'bus';
      const s = this.busStop.find((q) => !q.busy);
      if (!s) return this._toTaxi(b, a);
      s.busy = b;
      b.spot = s;
      this.go(b, a, s.x, s.z, (bb) => this._wait(bb, 400, s.yaw, chance(0.6) ? 'phone' : null, (b2, a2) => this._leave(b2, a2)), { mode: 'land' });
    }

    // ---- greeters
    _greetNext(b, a, st) {
      switch (st) {
        case 'come': {
          const free = (this.meet || []).filter((m) => !m.busy);
          if (!free.length) return this._leave(b, a);
          const m = pick(free);
          m.busy = b;
          b.spot = m;
          b.stage = 'waiting';
          return this.go(b, a, m.x, m.z, (bb) => this._wait(bb, rnd(90, 240), m.yaw, bb.sign >= 0 ? 'sign' : chance(0.5) ? 'phone' : null, (b2, a2) => this._leave(b2, a2)), { mode: 'land' });
        }
        default:
          return this._leave(b, a);
      }
    }

    followStep(b, a, dt) {
      const L = b.lead;
      if (!L || L.gone || !L.a || L.a.removed || L.a.dead) {
        b.lead = null;
        return this._leave(b, a);
      }
      const la = L.a;
      // Walk beside them, a step behind (round whatever is in the way along the map).
      const side = (a.id % 2 ? 1 : -1) * 0.8;
      const tx = la.pos.x - Math.sin(la.heading) * 0.5 + Math.cos(la.heading) * side;
      const tz = la.pos.z - Math.cos(la.heading) * 0.5 - Math.sin(la.heading) * side;
      const dx = tx - a.pos.x;
      const dz = tz - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (b.path) {
        if (b.walk(a, dt, 1.9) || d < 1.5) b.path = null;
        return;
      }
      if (d > 3 && a.blocked > 0.8) {
        a.blocked = 0;
        b.path = this._route(a.pos.x, a.pos.z, a.pos.y, la.pos.x, la.pos.z, 'any');
        b.pi = 0;
        return;
      }
      if (d > 0.35) {
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 7, dt);
        a.moveSpeed = clamp(d * 1.4, 0, 2.2);
      } else a.heading = dampAngle(a.heading, la.heading, 4, dt);
      if (la.anim.phone > 0.5) a.anim.talk = 0.35 + 0.3 * Math.sin(b.t * 2);
      // Lost them altogether: head off.
      if (d > 30) {
        b.lead = null;
        this._leave(b, a);
      }
    }

    // ---- outside
    _kerbNext(b, a, st) {
      switch (st) {
        case 'smoke':
          b.kind = 'dep';
          b.stage = 'enter';
          return this._depNext(b, a, 'enter');
        default:
          return this._leave(b, a);
      }
    }

    // ---- cleaners
    _cleanNext(b, a) {
      const N = this.nav;
      if (!N) return this._leave(b, a);
      if (b.mopNext) {
        b.mopNext = false;
        return this._wait(b, rnd(5, 9), a.heading, 'mop');
      }
      const ids = b.side === 'air' ? ['sp-421', 'sp-397', 'sp-370', 'sp-336.9', 'sp-299.4', 'sp-268.5', 'sp-243.5', 'sp-214', 'sp-189', 'sp-150', 'sp-106', 'aw-397', 'fl-268.5'] : ['w-425.5', 'w-402.5', 'w-377.5', 'w-352.5', 'w-320', 'w-268', 'w-235', 'w-207', 'w-165', 'w-136', 'w-112', 'ai-402.5', 'ai-377.5'];
      const n = N.nodes[N.ix[pick(ids)]];
      if (!n) return this._leave(b, a);
      b.mopNext = chance(0.6);
      return this.go(b, a, n.x + rnd(-1, 1), n.z + rnd(-0.6, 0.6), null, { mode: b.side === 'air' ? 'air' : 'land', speed: 0.75 });
    }

    // ---- the police pair
    copStep(b, a, dt) {
      const g = this.game;
      const pol = g.police;
      // Trouble: they deal with it like any officer (police.js), then back to the beat.
      if (pol && pol.level > 0 && VH.Police && VH.Police.OfficerBrain) {
        const p = g.player.pos;
        const d = Math.hypot(p.x - a.pos.x, p.z - a.pos.z);
        if (d < 70) {
          if (!b.officer) b.officer = new VH.Police.OfficerBrain(pol, null);
          a.weapon = 'pistol';
          b.officer.update(a, dt);
          b.path = null;
          return;
        }
      }
      a.anim.aim = 0;
      if (b.lead) {
        this.followStep(b, a, dt);
        if (b.mode !== 'cop') return;
        return;
      }
      if (b.path && b.pi < b.path.length) {
        if (b.walk(a, dt, 1.0)) b.path = null;
        return;
      }
      b.wt -= dt;
      a.anim.talk = b.wt > 4 ? 0.3 : 0;
      if (b.wt > 0) return;
      b.wt = rnd(6, 16);
      const N = this.nav;
      const ids = ['w-402.5', 'w-352.5', 'w-268', 'w-207', 'w-136', 'w-91', 'info', 'meet', 'ab-377.5', 'w-235'];
      const n = N && N.nodes[N.ix[pick(ids)]];
      if (n) {
        b.dest = { x: n.x, z: n.z };
        b.path = this._route(a.pos.x, a.pos.z, a.pos.y, n.x, n.z, 'land');
        b.pi = 0;
      }
    }

    // ------------------------------------------------------------ danger
    _threat(x, z, r, kind) {
      if (!this.list.length) return;
      // Indoors a gunshot carries the length of the hall.
      const T = this.game.terminal;
      const inside = T && T.isInside ? T.isInside(x, z) : false;
      const R = kind === 'gun' || kind === 'blast' ? r * (inside ? 1.6 : 1.2) : kind === 'pavement' ? r : r * 1.2;
      for (const b of this.list) {
        const a = b.a;
        if (a.dead || a.removed) continue;
        const d = Math.hypot(a.pos.x - x, a.pos.z - z);
        if (d > R) continue;
        if (kind === 'pavement' && b.mode !== 'wait' && b.mode !== 'walk' && b.mode !== 'queue') continue;
        this.scare(b, a, x, z, d, kind);
      }
      if (inside || this._distT({ x, z }) < 15) this._calm = 0;
    }

    /** Frightened: cower or run (for the exits, away from it). */
    scare(b, a, x, z, d, kind) {
      if (b.kind === 'cop') return;
      if (b.mode === 'flee' || b.mode === 'runout') return;
      this._release(b);
      if (b.mode === 'sit' || b.mode === 'sitdown' || b.mode === 'standup') {
        if (this.seatBy[b.seat] === b) this.seatBy[b.seat] = null;
        b.seat = -1;
      }
      b.prop = null;
      b.fear = { x, z, kind };
      b.scared = true;
      const near = d < 12;
      if (kind === 'pavement') {
        // A car on the pavement: jump out of its way.
        const away = Math.atan2(a.pos.x - x, a.pos.z - z);
        return this.go(b, a, a.pos.x + Math.sin(away) * 4, a.pos.z + Math.cos(away) * 4, (bb, aa) => this._leave(bb, aa), { flee: true, speed: 4.6, mode: 'any' });
      }
      if (b.kind === 'staff' || (near && chance(0.45)) || chance(0.2)) {
        b.mode = 'cower';
        b.wt = rnd(4, 9) + (b.kind === 'staff' ? 6 : 0);
        b.face = Math.atan2(x - a.pos.x, z - a.pos.z);
        return;
      }
      this._flee(b, a);
    }

    _flee(b, a) {
      const f = b.fear || { x: a.pos.x, z: a.pos.z };
      b.avoid = { x: f.x, z: f.z, r: 22 };
      b.speed = rnd(RUN[0], RUN[1]);
      const T = this.T;
      if (!T || a.pos.z > this.B.z1) {
        b.mode = 'runout';
        b.wt = rnd(5, 9);
        return;
      }
      // The exit door that leads away from it (or the far end of the concourse).
      let best = null;
      let bestS = -Infinity;
      for (const d of this.doors) {
        const s = Math.hypot(d.x - f.x, d.z - f.z) * 1.2 - Math.hypot(d.x - a.pos.x, d.z - a.pos.z);
        if (s > bestS) {
          bestS = s;
          best = { x: d.out.x, z: d.out.z + 3 };
        }
      }
      const air = a.pos.z < (T.concourseZ || -1229) + 1;
      if (air && this.nav) {
        for (const id of ['sp-425.5', 'sp-84']) {
          const n = this.nav.nodes[this.nav.ix[id]];
          if (!n) continue;
          const s = Math.hypot(n.x - f.x, n.z - f.z) * 1.2 - Math.hypot(n.x - a.pos.x, n.z - a.pos.z) + 10;
          if (s > bestS) {
            bestS = s;
            best = { x: n.x, z: n.z, inside: true };
          }
        }
      }
      this.go(b, a, best.x, best.z, null, { flee: true, mode: 'any', avoid: b.avoid });
      b.refugeInside = !!best.inside;
    }

    fled(b, a) {
      if (b.refugeInside) {
        b.mode = 'cower';
        b.wt = rnd(8, 14);
        return;
      }
      b.mode = 'runout';
      b.wt = rnd(4, 8);
    }

    runOut(b, a, dt) {
      const f = b.fear || { x: a.pos.x, z: a.pos.z - 1 };
      let away = Math.atan2(a.pos.x - f.x, a.pos.z - f.z);
      // Outside the front: keep off the road.
      if (a.pos.z > this.K.walkZ - 1 && Math.cos(away) > 0.2) away = a.pos.x < f.x ? -PI / 2 : PI / 2;
      a.heading = dampAngle(a.heading, away + Math.sin(a.id * 1.7) * 0.4, 5, dt);
      a.moveSpeed = b.speed;
      a.anim.sprint = true;
      b.wt -= dt;
      if (b.wt <= 0 && this._droppable(a)) b.gone = true;
      if (b.wt < -20) b.gone = true;
    }

    cowerStep(b, a, dt) {
      const an = a.anim;
      an.cower = 1;
      an.crouch = 0.35;
      if (b.face !== null) a.heading = dampAngle(a.heading, b.face, 4, dt);
      b.wt -= dt;
      if (b.wt > 0 || this._calm < 3) return;
      b.fear = null;
      if (b.kind === 'staff' && b.post) {
        b.mode = 'post';
        b.scared = false;
        return;
      }
      if (this._calm > 6) this._leave(b, a);
      else this._flee(b, a);
    }

    /** Hit by Jay (or shot at): run, and that's a crime they'll report. */
    hurt(b, a) {
      const g = this.game;
      this._threat(a.pos.x, a.pos.z, 16, 'fight');
      if (a.lastAttacker === 'player' && g.police && g.police.crime && a.faction === 'civilian') g.police.crime('hitPed', a.pos.x, a.pos.z);
      if (b.mode !== 'flee' && b.mode !== 'runout') {
        b.mode = 'idle';
        this.scare(b, a, g.player.pos.x, g.player.pos.z, 30, 'hit');
        if (b.mode === 'cower' && b.kind !== 'staff') this._flee(b, a);
      }
    }

    // ------------------------------------------------------------- kerb
    /** The nearest thing ahead of a kerb car in its path: another car, Jay, someone in the road. */
    gapAhead(v) {
      const g = this.game;
      let best = Infinity;
      const o = this._tmp;
      const hx = v.hx + 0.9;
      for (const c of g.vehicles.list) {
        if (c === v || c.removed || Math.abs(c.pos.y - v.pos.y) > 3) continue;
        const dx = c.pos.x - v.pos.x;
        const dz = c.pos.z - v.pos.z;
        if (dx * dx + dz * dz > 1600) continue;
        v.worldToLocal(c.pos.x, c.pos.z, o);
        if (o.z <= 0 || Math.abs(o.x) > hx + c.hx * 0.6) continue;
        const gap = o.z - v.hz - c.hz;
        if (gap < best) best = gap;
      }
      const p = g.player;
      if (!p.inVehicle && !p.isDead) {
        v.worldToLocal(p.pos.x, p.pos.z, o);
        if (o.z > 0 && Math.abs(o.x) < hx + 0.3 && o.z - v.hz < best) best = o.z - v.hz;
      }
      for (const b of this.list) {
        const a = b.a;
        if (a.pos.z < this.kerbZ - 1.8) continue; // on the pavement
        v.worldToLocal(a.pos.x, a.pos.z, o);
        if (o.z > 0 && Math.abs(o.x) < hx && o.z - v.hz < best) best = o.z - v.hz;
      }
      return best;
    }

    _laneClear(x, len, self) {
      for (const c of this.game.vehicles.list) {
        if (c === self) continue;
        if (Math.abs(c.pos.z - this.innerZ) < 3 && c.pos.x > x - 10 && c.pos.x < x + len) return false;
        if (Math.abs(c.pos.z - this.kerbZ) < 2.4 && c.pos.x > x - 8 && c.pos.x < x + 8) return false;
      }
      return true;
    }

    /** Somewhere east along the road from its stop, out of Jay's sight, for a car to come from. */
    _carStart(sx) {
      const p = this.game.player.pos;
      for (const dx of [55, 80, 110, 150, 200, 260, 330]) {
        const x = sx + dx;
        if (x > 300) break;
        const d = Math.hypot(p.x - x, p.z - this.innerZ);
        if (d < 50) continue;
        if (d < 150 && this.game.isVisible(x, 1, this.innerZ, 3)) continue;
        if (!this._laneClear(x, 30)) continue;
        return x;
      }
      return null;
    }

    _fareSpot() {
      const f = this.game.activities && this.game.activities.taxi && this.game.activities.taxi.fare;
      if (!f) return null;
      return f.stage === 'pickup' ? f.from : f.to;
    }

    _slotFree(s) {
      if (s.busy) return false;
      const f = this._fareSpot();
      if (f && Math.abs(f.x - s.x) < 14 && Math.abs(f.z - s.z) < 10) return false;
      for (const c of this.game.vehicles.list) if (Math.abs(c.pos.x - s.x) < 6 && Math.abs(c.pos.z - s.z) < 2.6) return false;
      return true;
    }

    _car(kind, type, slot) {
      const g = this.game;
      if (!VH.Vehicle || !VH.Vehicle.typeSpec(type)) return null;
      const x0 = this._carStart(slot.x);
      if (x0 === null) return null;
      const spec = VH.Vehicle.typeSpec(type);
      const col = kind === 'bus' ? 0xf1f1ee : spec.palette ? pick(spec.palette) : 0xb8bcc0;
      const v = g.vehicles.spawn(type, x0, this.innerZ, -PI / 2, { role: 'airport', persistent: true, color: col });
      v.role = 'airport';
      v.persistent = true;
      v.driver = 'ai';
      const job = { kind, v, slot, t: 0, x: slot.x, people: [] };
      job.d = new KerbDriver(this, job);
      v.controller = job.d;
      v.setSpeed(8);
      if (slot.busy !== undefined) slot.busy = job;
      if (kind === 'bus' && v.model && v.model.root) {
        // The shuttle: a white minibus with its name on a sign on the roof.
        if (!this.busSign) this.busSign = shuttleSign();
        const m = new THREE.Mesh(this.busSign.geo, this.busSign.mat);
        m.position.set(0, spec.height + 0.2, 0.2);
        m.name = 'shuttle sign';
        v.model.root.add(m);
      }
      this.cars.push(job);
      return job;
    }

    /** A car reached its stop at the kerb. */
    carStopped(job) {
      const g = this.game;
      const v = job.v;
      job.stopped = this._t;
      if (job.kind === 'drop') {
        // Out they get, with their bags, and in through the doors.
        const n = chance(0.4) ? 2 : 1;
        if (g.vehicles.entry) g.vehicles.entry.exitDoor(v, -1);
        for (let i = 0; i < n; i++) {
          const w = v.localToWorld(-(v.hx + 0.55), (i ? -1.2 : 0.2), {});
          const b = this._spawn('dep', w.x, w.z, { heading: PI, y: 0.2, stage: 'enter' });
          b.flight = this._pickFlight();
          b.gate = b.flight ? b.flight.gate : null;
          b.mode = 'wait';
          b.wt = 0.6 + i * 0.8;
          b.face = PI;
          b.then = null;
          job.people.push(b);
        }
        job.leaveAt = this._t + rnd(5, 9);
      } else if (job.kind === 'bus') {
        if (g.vehicles.entry) g.vehicles.entry.exitDoor(v, -1);
        const n = Math.floor(rnd(2, 5));
        for (let i = 0; i < n; i++) {
          const w = v.localToWorld(-(v.hx + 0.6), 1.6 - i * 0.7, {});
          const b = this._spawn('dep', w.x, w.z, { heading: PI, y: 0.2, stage: 'enter' });
          b.flight = this._pickFlight();
          b.gate = b.flight ? b.flight.gate : null;
          b.mode = 'wait';
          b.wt = 0.5 + i * 0.9;
          b.face = PI;
          b.then = null;
        }
        job.leaveAt = this._t + rnd(16, 22);
        job.boardFrom = this._t + n * 0.9 + 2;
      } else if (job.kind === 'pickup') {
        job.leaveAt = this._t + 45;
      } else if (job.kind === 'cab') {
        job.leaveAt = Infinity;
      }
    }

    carBlocked(job) {
      if (job.d.phase === 'out') return;
      // Someone's in the way of the stop: carry on round and away.
      if (job.slot && job.slot.busy === job) job.slot.busy = null;
      job.d.go();
    }

    _cabSlot(i) {
      const r = this.K.taxiRank;
      return r[Math.min(i, r.length - 1)];
    }

    _kerbTick(dt) {
      const g = this.game;
      const mission = !!(g.missions && g.missions.run);
      for (let i = this.cars.length - 1; i >= 0; i--) {
        const c = this.cars[i];
        const v = c.v;
        const mine = v.controller === c.d && v.driver === 'ai';
        if (v.removed || v.wrecked || !mine || (g.vehicles.entering && g.vehicles.entering.v === v)) {
          // Taken (Jay jumped in, or it was smashed): an ordinary car from now on.
          if (!v.removed) {
            v.persistent = false;
            if (v.controller === c.d) v.controller = null;
            if (v.role === 'airport') v.role = v.wrecked ? 'wreck' : 'abandoned';
          }
          this._dropJob(c, i);
          continue;
        }
        c.t += dt;
        const d = c.d;
        if (d.phase === 'in' && d.atEnd) d.phase = 'stop';
        if (d.phase === 'stop') {
          if (v.speed < 0.2 && !v.sleeping && c.kind === 'cab') v.sleeping = true;
          if (c.kind === 'pickup') this._pickupStep(c);
          if (c.kind === 'bus') this._busStep(c);
          if (this._t > c.leaveAt) {
            if (c.kind === 'drop' && c.people.some((b) => !b.gone && b.a && Math.hypot(b.a.pos.x - v.pos.x, b.a.pos.z - v.pos.z) < 2.2)) continue;
            if (!this._laneClear(v.pos.x - 6, 26, v)) continue;
            if (c.slot && c.slot.busy === c) c.slot.busy = null;
            d.go();
          }
        }
        if (d.phase === 'out' && (d.finished || v.pos.x < d.tx + 10)) {
          // Clear of the terminal: an ordinary car in the traffic.
          this._handOver(c);
          this._dropJob(c, i);
        }
        if (c.t > (c.kind === 'cab' ? 900 : 240)) {
          this._handOver(c);
          this._dropJob(c, i);
        }
      }
      this._cabs(dt, mission);
      if (mission) return;
      // New arrivals at the departures kerb.
      this._carT -= dt;
      if (this._carT <= 0) {
        this._carT = rnd(9, 20) * (1 + (g.environment.nightFactor || 0) * 0.8);
        const drops = this.cars.filter((c) => c.kind === 'drop').length;
        if (drops < 3 && this._outsideCount() < this.capOut + 2) {
          const free = this.K.departures.filter((s) => this._slotFree(s));
          if (free.length) this._car('drop', chance(0.25) ? 'cab' : pick(CAR_TYPES), pick(free));
        }
      }
      // The shuttle.
      this._busT -= dt;
      if (this._busT <= 0) {
        this._busT = rnd(150, 230);
        if (this._slotFree(this.K.bus) && !this.cars.some((c) => c.kind === 'bus')) this._car('bus', 'porter', this.K.bus);
      }
    }

    _handOver(c) {
      const g = this.game;
      const v = c.v;
      if (v.removed) return;
      v.persistent = false;
      v.wake();
      if (g.traffic && VH.LaneDriver) {
        const ctl = new VH.LaneDriver(g.traffic);
        if (ctl.reacquire(v, 30)) {
          v.controller = ctl;
          v.role = 'traffic';
          return;
        }
      }
      v.controller = null;
      v.driver = null;
      v.role = 'abandoned';
    }

    _dropJob(c, i) {
      if (c.slot && c.slot.busy === c) c.slot.busy = null;
      if (c.kind === 'pickup' && c.who && c.who.pickup === c.slot) c.who.pickup = null;
      this.cars.splice(i, 1);
    }

    /** The taxi rank: cabs wait nose to tail; the one at the front takes the first in the queue. */
    _cabs(dt, mission) {
      const all = this.cars.filter((c) => c.kind === 'cab');
      const cabs = all.filter((c) => c.d.phase !== 'out');
      // Each cab moves up to its place in the rank.
      cabs.forEach((c, i) => {
        const s = this._cabSlot(i);
        const d = c.d;
        if (c.rank !== i && d.phase === 'stop' && Math.abs(c.v.pos.x - s.x) > 1) {
          c.rank = i;
          d.phase = 'in';
          d.plan(s.x, true, this.kerbZ, this.kerbZ);
          c.v.wake();
        } else c.rank = i;
      });
      // The head cab takes the first person in the queue.
      const head = cabs[0];
      const q = this.taxiLine.q[0];
      if (head && head.d.phase === 'stop' && !head.fare && q && q.a && !q.path && Math.hypot(q.a.pos.x - this.taxiLine.spots[0].x, q.a.pos.z - this.taxiLine.spots[0].z) < 0.8) {
        this.taxiLine.leave(q);
        q.line = null;
        head.fare = q;
        this._board(q, head, () => {
          head.leaveAt = this._t + 1.6;
          if (q.friend && !q.friend.gone) q.friend.gone = true;
        });
      }
      for (const c of all) {
        if (c.fare && c.leaveAt && this._t > c.leaveAt && c.d.phase === 'stop' && this._laneClear(c.v.pos.x - 6, 26, c.v)) c.d.go();
      }
      // Keep the rank stocked.
      this._cabT -= dt;
      if (this._cabT <= 0) {
        this._cabT = rnd(14, 30);
        const n = cabs.length;
        if (!mission && n < Math.min(4, this.K.taxiRank.length)) {
          const slot = this._cabSlot(n);
          if (this._slotFree({ x: slot.x, z: slot.z, busy: null })) this._car('cab', 'cab', { x: slot.x, z: slot.z });
        }
      }
    }

    /** Walk to the car's kerb side, the door opens, in they get. */
    _board(b, job, done) {
      const v = job.v;
      const w = v.localToWorld(-(v.hx + 0.45), -0.5, {});
      b.stage = 'boardcar';
      this.go(b, b.a, w.x, w.z, (bb) => {
        const g = this.game;
        if (g.vehicles.entry && !v.removed) g.vehicles.entry.exitDoor(v, -1);
        bb.mode = 'gone';
        bb.gone = true;
        if (done) done();
      }, { mode: 'land' });
    }

    _pickupStep(c) {
      const b = c.slot.busy && c.slot.busy.kind ? c.slot.busy : null;
      if (!c.who) {
        // Whoever's waiting at this spot (an arrival who asked for a lift).
        const w = this.list.find((o) => o.pickup === c.slot && !o.gone);
        if (w) c.who = w;
      }
      const who = c.who;
      if (who && !who.gone && who.a && !who.boarding && who.mode === 'wait') {
        who.boarding = true;
        this._board(who, c, () => {
          c.leaveAt = this._t + 1.5;
          if (who.friend && !who.friend.gone) who.friend.gone = true;
        });
      }
      return b;
    }

    _busStep(c) {
      if (!c.boardFrom || this._t < c.boardFrom) return;
      for (const s of this.busStop) {
        const b = s.busy;
        if (!b || b.gone || b.boarding || b.mode !== 'wait') continue;
        b.boarding = true;
        this._release(b);
        this._board(b, c, null);
        c.leaveAt = Math.max(c.leaveAt, this._t + 4);
      }
    }

    /** Someone asks for a lift at the arrivals kerb: a car comes for them. */
    _pickupsTick() {
      for (const s of this.K.arrivals) {
        const b = s.busy;
        if (!b || !b.kind) continue;
        if (b.gone || !b.a || b.a.removed) {
          s.busy = null;
          continue;
        }
        if (b.carCalled || b.mode !== 'wait') continue;
        b.carCalled = true;
        const job = this._car('pickup', pick(CAR_TYPES), { x: s.x, z: s.z });
        if (job) {
          job.slot = s;
          job.who = b;
          s.busy = b;
        }
      }
    }

    // ------------------------------------------------------- the director
    _insideCount() {
      let n = 0;
      for (const b of this.list) if (b.a.pos.z <= this.B.z1) n++;
      return n;
    }

    _outsideCount() {
      return this.list.length - this._insideCount();
    }

    /** Fill each part of the terminal near Jay, thin out the parts he has left. */
    _direct() {
      const g = this.game;
      const p = g.player.pos;
      const [capIn, capOut] = this._quality();
      this.capIn = capIn;
      this.capOut = capOut;
      const night = (g.environment && g.environment.nightFactor) || 0;
      const nightK = 1 - 0.3 * night;
      const panic = this._calm < 45;
      const w = (d) => clamp(1 - (d - 30) / 110, 0, 1);
      // Which side of the partition Jay is on: the other side gets a few, for when he goes through.
      const T = this.T;
      const jayLand = !T || p.z > (T.partitionZ || -1216);
      // Census.
      let staff = 0;
      let inside = 0;
      let outside = 0;
      const zones = this.zones || [];
      for (const z of zones) {
        z.d = Math.hypot(Math.max(0, z.x0 - p.x, p.x - z.x1), Math.max(0, z.z0 - p.z, p.z - z.z1));
        z.side = z.id === 'security' || !!LANDSIDE[z.id] === jayLand;
        z.w = w(z.d) * (z.side ? 1 : 0.3);
        z.n = 0;
      }
      const O = this.outside;
      if (O) {
        O.d = Math.hypot(Math.max(0, O.x0 - p.x, p.x - O.x1), Math.max(0, O.z0 - p.z, p.z - O.z1));
        O.w = w(O.d);
        O.n = 0;
      }
      for (const b of this.list) {
        const a = b.a;
        const here = this._zoneAt(a.pos.x, a.pos.z);
        // On their way somewhere near Jay: counted there already.
        if (b.aim && (here === b.aim || this._t - b.aimT > 70 || b.scared)) b.aim = null;
        const zid = b.aim || here;
        if (zid === 'outside') {
          outside++;
          if (O && b.kind !== 'staff') O.n++;
          continue;
        }
        inside++;
        if (b.kind === 'staff' || b.kind === 'clean' || b.kind === 'cop') {
          staff++;
          continue;
        }
        const z = this.zoneById && this.zoneById[zid];
        if (z) z.n++;
      }
      let budget = this._fill > 0 ? 8 : 2;
      // Staff at their posts near Jay.
      if (this.posts) {
        for (const P of this.posts) {
          const z = this.zoneById[P.zone];
          const d = z ? z.d + (z.side ? 0 : 25) : Math.hypot(P.x - p.x, P.z - p.z);
          let want = d < (P.role === 'checkin' || P.role === 'security' ? STAFF_R : STAFF_R - 15);
          if (want && P.needFlight) want = !!this._depAt(P.gate) && (!P.boarding || this.boarding.has(P.gate));
          if (want && !P.p && budget > 0 && inside < capIn && !panic && this._canPop(P.x, this.FY, P.z)) {
            this._staff(P);
            budget--;
            inside++;
            staff++;
          } else if (!want && P.p && P.p.mode === 'post' && d > STAFF_R + 25 && this._droppable(P.p.a)) {
            this._remove(P.p);
            staff--;
            inside--;
          }
        }
        this._extras(p, panic);
      }
      // Travellers: each part of the hall's share of the room left.
      if (zones.length) {
        let sum = 0;
        for (const z of zones) {
          const base = z.gate ? (this._depAt(z.gate) ? GATE_DEMAND[1] : GATE_DEMAND[0]) : DEMAND[z.id] || 0;
          z.want = panic ? 0 : base * z.w * nightK;
          if (z.id === 'baggage' && !panic) z.want = this._belts().length ? 7 * z.w * (z.side ? 1 : 0.3) : 0;
          sum += z.want;
        }
        const room = Math.max(0, capIn - staff - 3);
        const k = sum > room ? room / sum : 1;
        for (const z of zones) z.want *= k;
        // Too many here now (Jay walked away): a few quietly go.
        for (const z of zones) {
          if (z.n - z.want < 2.5 && !(inside > capIn && z.w < 0.5)) continue;
          const b = this.list.find((o) => this._spare(o) && this._zoneAt(o.a.pos.x, o.a.pos.z) === z.id);
          if (b) {
            this._remove(b);
            inside--;
            break;
          }
        }
        // Not enough: someone new, in the middle of whatever people do there.
        for (let k2 = 0; k2 < budget && inside < capIn; k2++) {
          let best = null;
          let bestN = 0.75;
          for (const z of zones) {
            const need = z.want - z.n;
            if (need > bestN) {
              bestN = need;
              best = z;
            }
          }
          if (!best) break;
          const b = this._spawnIn(best) || this._spawnFrom(best);
          best.n++;
          if (b) inside++;
          else best.want = best.n - 1; // nowhere for them to go this time
        }
      }
      // Outside.
      if (O && !panic) {
        O.want = capOut * O.w * nightK;
        if (O.n > O.want + 2.5) {
          const b = this.list.find((o) => this._spare(o) && o.a.pos.z > this.B.z1 && o.kind !== 'arr');
          if (b) this._remove(b);
        } else if (O.n < O.want - 0.75 && outside < capOut) this._spawnOut();
      }
    }

    /** Someone the director may take away: not staff, not committed to something, out of sight. */
    _spare(b) {
      if (b.kind === 'staff' || b.kind === 'clean' || b.kind === 'cop') return false;
      if (b.stage === 'bridge' || b.stage === 'boardcar' || b.boarding || b.mode === 'flee' || b.lead || b.friend) return false;
      return this._droppable(b.a);
    }

    /** The cleaners and the police pair. */
    _extras(p, panic) {
      if (panic) return;
      const have = (k, side) => this.list.some((b) => b.kind === k && (!side || b.side === side));
      const near = (x, z) => Math.hypot(p.x - x, p.z - z) < 150;
      const N = this.nav;
      const airside = p.z < (this.T.partitionZ || -1216);
      for (const [side, id] of [['land', 'w-352.5'], ['air', 'sp-268.5']]) {
        const n = N.nodes[N.ix[id]];
        if (!n || have('clean', side) || !near(n.x, n.z) || !this._canPop(n.x, n.y, n.z)) continue;
        if ((side === 'air') !== airside && this.list.some((b) => b.kind === 'clean')) continue;
        const b = this._spawn('clean', n.x, n.z, { role: 'clean', name: 'Cleaner', case: false });
        b.side = side;
        b.pack = null;
        b.case = null;
        const m = new THREE.Mesh(this.cartGeo, this.cartMat);
        m.matrixAutoUpdate = false;
        m.castShadow = true;
        m.name = 'cleaning trolley';
        this.game.scene.add(m);
        b.cart = m;
        this._cleanNext(b, b.a);
      }
      const w = N.nodes[N.ix['w-268']];
      if (w && !have('cop') && near(w.x, w.z) && this._canPop(w.x, w.y, w.z + 3)) {
        const look = VH.Police && VH.Police.COP_LOOK ? Object.assign({}, VH.Police.COP_LOOK, { skin: VH.Crowd.randomLook().skin }) : null;
        const lead = this._spawn('cop', w.x - 0.6, w.z + 0.4, { look, faction: 'police', name: 'Airport police', case: false, health: 100, armor: 50 });
        const pal = this._spawn('cop', w.x + 0.6, w.z + 0.4, { look: look ? Object.assign({}, look, { skin: VH.Crowd.randomLook().skin, longHair: chance(0.5), height: 0.97 }) : null, faction: 'police', name: 'Airport police', case: false, health: 100, armor: 50 });
        for (const b of [lead, pal]) {
          b.mode = 'cop';
          b.case = null;
          b.pack = null;
          b.wt = rnd(2, 6);
          b.a.weapon = 'pistol';
        }
        pal.lead = lead;
      }
    }

    /** A traveller somewhere in this part of the hall, partway through their trip. */
    _spawnIn(z) {
      const id = z.id;
      const ok = (x, zz) => this._canPop(x, this.FY, zz);
      const dep = (x, zz, o) => {
        const b = this._spawn('dep', x, zz, o);
        b.flight = this._pickFlight();
        b.gate = b.flight ? b.flight.gate : null;
        return b;
      };
      const inLine = (ln, o) => {
        if (!ln || ln.full()) return null;
        const s = ln.spot(ln.q.length);
        if (!ok(s.x, s.z)) return null;
        const b = dep(s.x, s.z, Object.assign({ heading: ln.face }, o));
        this._inQueue(b, ln);
        return b;
      };
      const seatIn = (zone, t, pose, stage, kind) => {
        const s = this._freeSeat(zone);
        if (s < 0) return null;
        const q = this.seats[s];
        if (!ok(q.x, q.z)) return null;
        const b = kind === 'arr' ? this._spawn('arr', q.x, q.z, { case: chance(0.5) }) : dep(q.x, q.z, { case: false, stage });
        b.stage = stage;
        this._seatNow(b, b.a, s, t, pose);
        return b;
      };
      switch (id) {
        case 'checkin': {
          const ln = this._pickLine((l) => l.desk && l.desk.kind === 'checkin', { pos: { x: rnd(-420, -360), z: -1205 } });
          const b = inLine(ln, { case: true, stage: 'checkedin' });
          if (b) return b;
          return null;
        }
        case 'landside': {
          const r = Math.random();
          if (r < 0.45) return seatIn('landside', rnd(20, 60), chance(0.3) ? POSE.sitEat : null, 'security');
          const ln = this._pickLine((l) => l.desk && (l.desk.id === 'pelican' || l.desk.id === 'sunrise' || l.desk.id === 'info'), { pos: { x: -240, z: -1208 } });
          return inLine(ln, { case: chance(0.3), stage: 'security' });
        }
        case 'security': {
          const ln = this._pickSec({ pos: { x: -318, z: -1214 } });
          return inLine(ln, { case: false, stage: 'secured' });
        }
        case 'shops': {
          if (chance(0.4)) {
            const b = seatIn('shops', rnd(20, 50), null, 'gate');
            if (b) return b;
          }
          const ln = this._pickLine((l) => l.desk && l.desk.kind === 'shop' && this._zoneAt(l.spots[0].x, l.spots[0].z) === 'shops', { pos: { x: -395, z: -1222 } });
          if (ln && chance(0.6)) return inLine(ln, { case: false, stage: 'gate' });
          const spots = this.window.filter((s) => !s.busy && s.zone === 'shops');
          if (!spots.length) return null;
          const s = pick(spots);
          if (!ok(s.x, s.z)) return null;
          const b = dep(s.x, s.z, { case: false, stage: 'gate', heading: s.yaw });
          s.busy = b;
          b.spot = s;
          this._wait(b, rnd(6, 20), s.yaw, chance(0.3) ? 'phone' : null, (bb, aa) => {
            this._release(bb);
            this.next(bb, aa);
          });
          return b;
        }
        case 'food': {
          if (chance(0.6)) {
            const b = seatIn('food', rnd(25, 80), POSE.sitEat, 'gate');
            if (b) return b;
          }
          const ln = this._pickLine((l) => l.desk && l.desk.kind === 'cafe' && this._zoneAt(l.spots[0].x, l.spots[0].z) === 'food', { pos: { x: -265, z: -1222 } });
          return inLine(ln, { case: false, stage: 'eat' });
        }
        case 'baggage': {
          const belts = this._belts();
          if (!belts.length) return null;
          const st = pick(belts);
          const C = this.carousels[st.i];
          const free = [];
          C.by.forEach((o, i) => !o && free.push(i));
          if (!free.length) return null;
          const i = pick(free);
          const w = C.c.wait[i];
          if (!ok(w.x, w.z)) return null;
          const b = this._spawn('arr', w.x, w.z, { heading: w.yaw, case: false });
          b.flight = st.flight;
          b.ci = st.i;
          b.hasBag = true;
          b.stage = 'exit';
          C.by[i] = b;
          b.wait = { c: C, i };
          b.mode = 'bag';
          b.face = w.yaw;
          b.bagT = 0;
          return b;
        }
        case 'arrivals': {
          const r = Math.random();
          if (r < 0.55) {
            const free = this.meet.filter((m) => !m.busy);
            if (free.length) {
              const m = pick(free);
              if (ok(m.x, m.z)) {
                const b = this._spawn('greet', m.x, m.z, { heading: m.yaw, case: false });
                b.pack = null;
                b.stage = 'waiting';
                m.busy = b;
                b.spot = m;
                if (chance(0.35)) this._giveSign(b);
                this._wait(b, rnd(60, 200), m.yaw, b.sign >= 0 ? 'sign' : chance(0.5) ? 'phone' : null, (bb, aa) => this._leave(bb, aa));
                return b;
              }
            }
          }
          if (r < 0.8) return seatIn(chance(0.5) ? 'arrivals' : 'arrivals', rnd(30, 90), null, 'out', 'arr');
          const ln = this._pickLine((l) => l.desk && l.desk.kind === 'hire', { pos: { x: -110, z: -1210 } });
          const b = inLine(ln, { case: true });
          if (b) {
            b.kind = 'arr';
            b.stage = 'away';
          }
          return b;
        }
        case 'concourse': {
          const N = this.nav;
          const ids = ['sp-397', 'sp-336.9', 'sp-299.4', 'sp-254.5', 'sp-214', 'sp-150', 'sp-106'];
          const n = N.nodes[N.ix[pick(ids)]];
          if (!n || !ok(n.x, n.z)) return null;
          const b = dep(n.x + rnd(-1, 1), n.z + rnd(-0.8, 0.8), { case: false, stage: 'gate' });
          this._toGate(b, b.a);
          return b;
        }
        default: {
          if (!z.gate) return null;
          const f = this._depAt(z.gate);
          if (chance(0.82)) {
            const b = seatIn(id, 1e9, null, 'board');
            if (b) {
              b.gate = z.gate;
              b.flight = f;
              if (this.boarding.has(z.gate)) b.boardAt = this._t + rnd(3, 40);
              return b;
            }
          }
          const v = this.view.filter((q) => !q.busy && q.gate === z.gate);
          if (!v.length) return null;
          const q = pick(v);
          if (!ok(q.x, q.z)) return null;
          const b = dep(q.x, q.z, { case: false, stage: 'board', heading: q.yaw });
          b.gate = z.gate;
          b.flight = f;
          q.busy = b;
          b.spot = q;
          this._wait(b, 1e9, q.yaw, chance(0.4) ? 'phone' : null);
          if (this.boarding.has(z.gate)) b.boardAt = this._t + rnd(3, 40);
          return b;
        }
      }
    }

    /** The carousels running with a flight's bags (terminal.js), as [{ i, flight }]. */
    _belts() {
      const T = this.game.terminal;
      if (!T || !T.carouselState || !this.carousels) return [];
      if (this._beltsAt === this._t) return this._bl;
      this._beltsAt = this._t;
      let st = [];
      try {
        st = T.carouselState() || [];
      } catch (err) {
        st = [];
      }
      this._bl = st.map((q, i) => ({ i, flight: q.flight, running: q.running })).filter((q) => q.running && q.flight && this.carousels[q.i]);
      return this._bl;
    }

    /** Somewhere Jay can't see someone appear. */
    _hidden(x, y, z) {
      const p = this.game.player.pos;
      return Math.hypot(p.x - x, p.z - z) > POP_R || !this.game.isVisible(x, y + 1, z, 1.2);
    }

    /**
     * Someone on their way to a part of the hall near Jay, from somewhere he
     * can't see: in through a departures door, along the concourse, out of
     * baggage reclaim.
     */
    _spawnFrom(z) {
      const N = this.nav;
      if (!N || z.id === 'baggage') return null;
      const aim = (b) => {
        b.aim = z.id;
        b.aimT = this._t;
        return b;
      };
      const p = this.game.player.pos;
      const order = (list) => list.sort((q, r) => Math.abs(q.x - p.x) - Math.abs(r.x - p.x) + rnd(-15, 15));
      if (LANDSIDE[z.id] || z.id === 'security') {
        if (z.id === 'arrivals') {
          for (const id of order(['rs-136', 'rs-112', 'rs-160', 'exit_s'].map((i) => N.nodes[N.ix[i]]).filter(Boolean))) {
            if (!this._hidden(id.x, id.y, id.z)) continue;
            const b = this._spawn('arr', id.x + rnd(-0.6, 0.6), id.z + rnd(-0.6, 0.6), { case: chance(0.75), heading: 0 });
            b.stage = 'exit';
            this.next(b, b.a);
            return aim(b);
          }
          return null;
        }
        for (const d of order(this.doors.filter((q) => q.kind === 'departures'))) {
          const x = d.out.x + rnd(-1.2, 1.2);
          const zz = this.K.walkZ + rnd(-0.3, 0.6);
          if (!this._hidden(x, 0.3, zz)) continue;
          const b = this._spawn('dep', x, zz, { stage: 'enter', y: 0.3, heading: PI, case: z.id === 'checkin' ? true : z.id === 'security' ? false : undefined });
          b.flight = this._pickFlight();
          b.gate = b.flight ? b.flight.gate : null;
          this.next(b, b.a);
          return aim(b);
        }
        return null;
      }
      // Airside: from along the concourse.
      const ids = ['sp-421', 'sp-397', 'sp-370', 'sp-336.9', 'sp-299.4', 'sp-268.5', 'sp-243.5', 'sp-214', 'sp-189', 'sp-150', 'sp-106', 'sp-84'];
      for (const n of order(ids.map((i) => N.nodes[N.ix[i]]).filter(Boolean))) {
        if (!this._hidden(n.x, n.y, n.z) || Math.abs(n.x - p.x) < 12) continue;
        const b = this._spawn('dep', n.x + rnd(-1, 1), n.z + rnd(-0.8, 0.8), { stage: 'gate', case: false });
        b.flight = this._pickFlight();
        b.gate = b.flight ? b.flight.gate : null;
        if (z.gate) {
          b.gate = z.gate;
          b.flight = this._depAt(z.gate);
          this._toGate(b, b.a);
        } else if (z.id === 'food') this._cafe(b, b.a);
        else if (z.id === 'shops') this._shop(b, b.a);
        else this._toGate(b, b.a);
        return aim(b);
      }
      return null;
    }

    _giveSign(b) {
      if (!this.signMat) {
        this.signTex = signAtlas();
        this.signMat = new THREE.MeshStandardMaterial({ map: this.signTex, roughness: 0.8, side: THREE.DoubleSide });
      }
      const i = Math.floor(Math.random() * NAMES.length);
      const geo = new THREE.PlaneGeometry(0.62, 0.22);
      const uv = geo.attributes.uv;
      const v0 = 1 - (i + 1) / NAMES.length;
      const v1 = 1 - i / NAMES.length;
      for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) > 0.5 ? v1 : v0);
      const m = new THREE.Mesh(geo, this.signMat);
      m.matrixAutoUpdate = false;
      m.name = 'name card';
      this.game.scene.add(m);
      b.sign = i;
      b.signMesh = m;
    }

    /** Outside: people by the doors, at the taxi queue, at the bus stop, coming along the pavement. */
    _spawnOut() {
      const r = Math.random();
      const p = this.game.player.pos;
      if (r < 0.32) {
        const s = this.stand.filter((q) => !q.busy && this._canPop(q.x, 0.25, q.z));
        if (!s.length) return null;
        const q = pick(s);
        const b = this._spawn('kerb', q.x, q.z, { heading: q.yaw, y: 0.25, stage: 'smoke' });
        b.flight = this._pickFlight();
        b.gate = b.flight ? b.flight.gate : null;
        q.busy = b;
        b.spot = q;
        this._wait(b, rnd(20, 60), q.yaw, chance(0.6) ? 'phone' : 'talk', (bb, aa) => {
          this._release(bb);
          this.next(bb, aa);
        });
        return b;
      }
      if (r < 0.55 && !this.taxiLine.full()) {
        const s = this.taxiLine.spot(this.taxiLine.q.length);
        if (!this._canPop(s.x, 0.25, s.z)) return null;
        const b = this._spawn('arr', s.x, s.z, { heading: this.taxiLine.face, y: 0.25, case: true });
        b.stage = 'taxi';
        this._inQueue(b, this.taxiLine);
        return b;
      }
      if (r < 0.7) {
        const s = this.busStop.filter((q) => !q.busy && this._canPop(q.x, 0.25, q.z));
        if (!s.length) return null;
        const q = pick(s);
        const b = this._spawn('arr', q.x, q.z, { heading: q.yaw, y: 0.25, case: chance(0.6) });
        b.stage = 'bus';
        q.busy = b;
        b.spot = q;
        this._wait(b, 400, q.yaw, chance(0.6) ? 'phone' : null, (bb, aa) => this._leave(bb, aa));
        return b;
      }
      // Along the pavement from one end, for the departures doors (or a greeter, for arrivals).
      const west = p.x > (this.B.x0 + this.B.x1) / 2 ? chance(0.35) : chance(0.65);
      const x = west ? this.B.x0 + 2 : this.B.x1 - 2;
      if (!this._canPop(x, 0.25, this.K.walkZ)) return null;
      if (this.meet && chance(0.3)) {
        const b = this._spawn('greet', x, this.K.walkZ, { heading: west ? PI / 2 : -PI / 2, y: 0.25, case: false });
        b.pack = null;
        if (chance(0.35)) this._giveSign(b);
        const d = this._nearestDoor(-140, 'arrivals');
        b.stage = 'come';
        this.go(b, b.a, d.in ? d.in.x : d.x, d.in ? d.in.z : this.B.z1 - 2, null, { mode: 'land' });
        return b;
      }
      const b = this._spawn('dep', x, this.K.walkZ, { heading: west ? PI / 2 : -PI / 2, y: 0.25, stage: 'enter', case: true });
      b.flight = this._pickFlight();
      b.gate = b.flight ? b.flight.gate : null;
      this.next(b, b.a);
      return b;
    }

    _bagsComing(e) {
      if (!e.flight) return;
      this._announce('bags', Object.assign({}, e.flight, { belt: e.n || 1 }), rnd(5, 14));
    }

    // ------------------------------------------------------------- props
    _props() {
      const g = this.game;
      const cm = this.caseMesh;
      const gm = this.gearMesh;
      const pm = this.packMesh;
      const m = this._m;
      const q = this._q;
      const e = this._e;
      const v = this._v;
      const s = this._s;
      const c = this._c;
      let nc = 0;
      let np = 0;
      const max = this.maxProps;
      for (const b of this.list) {
        const a = b.a;
        const show = a.visible && !a.hidden && !a.removed;
        if (b.cart) {
          b.cart.visible = show;
          if (show) {
            const hx = Math.sin(a.heading);
            const hz = Math.cos(a.heading);
            q.setFromAxisAngle(this._up || (this._up = new THREE.Vector3(0, 1, 0)), a.heading);
            v.set(a.pos.x + hx * 0.85, a.pos.y, a.pos.z + hz * 0.85);
            b.cart.matrix.compose(v, q, s);
            b.cart.matrixWorldNeedsUpdate = true;
          }
        }
        if (b.signMesh) {
          b.signMesh.visible = show && b.act === 'sign' && b.mode === 'wait';
          if (b.signMesh.visible) {
            b.signMesh.matrix.multiplyMatrices(a.rig.joints.spine.matrixWorld, this._signOff);
            b.signMesh.matrixWorldNeedsUpdate = true;
          }
        }
        if (!show) continue;
        if (b.case && nc < max) {
          if (b.prop) {
            // Set down: lying on a belt (moving along it) or standing.
            const P = b.prop;
            if (P.belt && P.z > P.belt.z1) P.z -= 0.55 / 60;
            e.set(P.flat ? -PI / 2 : 0, P.yaw, 0);
            v.set(P.x, P.y + (P.flat ? 0.12 : 0), P.z);
          } else {
            // Rolled along behind (tilted towards the hand), or stood upright beside them.
            const sc = a.look.height || 1;
            const hx = Math.sin(a.heading);
            const hz = Math.cos(a.heading);
            const rx = -hz; // right
            const rz = hx;
            const k = (b.roll = lerp(b.roll || 0, smoothstep(0.25, 0.9, a.speed), 0.15));
            const handY = 0.86 * sc;
            const tilt = Math.acos(clamp(handY / 1.03, 0.4, 1)) * k;
            const ox = 0.26 * sc;
            const back = 1.03 * Math.sin(tilt) + 0.08 * sc;
            const ux = a.pos.x + rx * lerp(0.42, ox, k) + hx * lerp(0.08, -back, k);
            const uz = a.pos.z + rz * lerp(0.42, ox, k) + hz * lerp(0.08, -back, k);
            e.set(tilt, a.heading, 0);
            v.set(ux, a.pos.y, uz);
          }
          q.setFromEuler(e);
          m.compose(v, q, s);
          cm.setMatrixAt(nc, m);
          gm.setMatrixAt(nc, m);
          c.setHex(b.case.color);
          cm.setColorAt(nc, c);
          nc++;
        }
        if (b.pack && np < max) {
          const P = b.prop;
          if (P && !b.case) {
            e.set(-PI / 2, 0, 0);
            q.setFromEuler(e);
            v.set(P.x, P.y + 0.1, P.z);
            if (P.belt && P.z > P.belt.z1) P.z -= 0.55 / 60;
            m.compose(v, q, s);
          } else m.multiplyMatrices(a.rig.joints.spine.matrixWorld, this._packOff);
          pm.setMatrixAt(np, m);
          c.setHex(b.pack.color);
          pm.setColorAt(np, c);
          np++;
        }
      }
      for (const [mesh, n] of [[cm, nc], [gm, nc], [pm, np]]) {
        mesh.count = n;
        mesh.visible = n > 0;
        if (n) {
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      }
      void g;
    }

    // ---------------------------------------------------------------- PA
    /** Queue an announcement (kind: boarding | final | bags | gate | delay | general). */
    _announce(kind, f, delay) {
      if (!this._paNear()) return;
      const key = kind + ':' + (f ? f.id : '');
      if (this._said.has(key)) return;
      this._said.set(key, this._t);
      this._paQ.push({ kind, f, at: this._t + (delay || 0) });
    }

    _paNear() {
      const g = this.game;
      const p = g.player.pos;
      if (this._distT(p) > 60) return false;
      return true;
    }

    _paText(kind, f) {
      const name = (fl) => (fl.airline ? fl.airline + ' flight ' : 'Flight ') + fl.code;
      switch (kind) {
        case 'boarding':
          return name(f) + ' to ' + f.city + ' is now boarding at gate ' + f.gate + '. Please have your boarding pass ready.';
        case 'final':
          return 'Final call for ' + name(f) + ' to ' + f.city + '. Please go to gate ' + f.gate + ' immediately.';
        case 'bags':
          return 'Passengers from ' + name(f) + ' from ' + f.city + ': your baggage is arriving on belt ' + f.belt + '.';
        case 'gate':
          return name(f) + ' to ' + f.city + ': please make your way to gate ' + f.gate + '.';
        case 'delay':
          return 'We\'re sorry to announce that ' + name(f) + ' to ' + f.city + ' is delayed. Please keep an eye on the screens.';
        case 'landed':
          return name(f) + ' from ' + f.city + ' has landed.';
        case 'pax': {
          const n = pick(PAX_NAMES);
          return 'Would passenger ' + n + ', travelling to ' + f.city + ', please go to gate ' + f.gate + ', where your flight is about to close.';
        }
        default: {
          const [kid, he] = pick(KIDS);
          return pick([
            'Please keep your baggage with you at all times. Unattended baggage may be removed.',
            'This is a reminder that smoking is not allowed anywhere in the terminal.',
            'Would the parents of a little ' + (he === 'he' ? 'boy' : 'girl') + ' called ' + kid + ' please come to the information desk, where ' + he + ' is waiting for you with an ice lolly.',
            'Liquids over one hundred millilitres must go in your hold baggage. Thank you.',
            'Lost property is at the information desk, next to Pelican Coffee.',
            'Please do not leave baggage unattended.',
            'Welcome to Vicehaven International. Please mind the step at the end of the moving walkway. There is no moving walkway. Thank you.',
            'Passengers are reminded to keep an eye on the departure screens for gate information.',
          ]);
        }
      }
    }

    _paTick(dt) {
      const g = this.game;
      if (g.state !== 'playing' || document.body.classList.contains('cutscene')) return;
      if (g.dialogue && (g.dialogue.mode === 'scene' || g.dialogue.mode === 'blackout')) return;
      this._paT -= dt;
      // Final calls, gate changes and delays from the boards.
      if (this._paNear() && (this._paCheckT = (this._paCheckT || 0) - dt) <= 0) {
        this._paCheckT = 3;
        for (const f of this._flights()) {
          if (f.kind !== 'dep') continue;
          if (/final/i.test(f.status || '')) this._announce('final', f, rnd(1, 6));
          else if (/delay/i.test(f.status || '') && chance(0.2)) this._announce('delay', f, rnd(2, 10));
          else if (/go to gate/i.test(f.status || '') && chance(0.15)) this._announce('gate', f, rnd(2, 10));
        }
      }
      // One at a time, and not on top of each other.
      const last = this._paLast || -99;
      let item = null;
      if (this._t - last > 22) {
        const i = this._paQ.findIndex((q) => q.at <= this._t);
        if (i >= 0) item = this._paQ.splice(i, 1)[0];
      }
      if (!item && this._paT <= 0) {
        this._paT = rnd(PA_GAP[0], PA_GAP[1]);
        if (this._paNear() && this._t - last > 30) {
          const deps = this._flights().filter((f) => f.kind === 'dep' && this.gateBy && this.gateBy[f.gate] && !/depart|closed|cancel/i.test(f.status || ''));
          item = chance(0.25) && deps.length ? { kind: 'pax', f: deps[0] } : { kind: 'general', f: null };
        }
      }
      // Stale ones are dropped (and old "already said" marks forgotten).
      this._paQ = this._paQ.filter((q) => this._t - q.at < 40);
      if (this._said.size > 60) for (const [k, t] of this._said) if (this._t - t > 900) this._said.delete(k);
      if (!item || !this._paNear()) return;
      this._paLast = this._t;
      this._paT = Math.max(this._paT, rnd(PA_GAP[0], PA_GAP[1]) * 0.6);
      this._pa(this._paText(item.kind, item.f));
    }

    _pa(text) {
      const g = this.game;
      this.lastPA = text;
      this.paCount = (this.paCount || 0) + 1;
      this._chime();
      // The caption.
      if (!this.paEl && g.hud && g.hud.root) {
        const el = document.createElement('div');
        el.className = 'vh-pa';
        el.innerHTML = '<span class="pa-tag"><span class="pa-bell"></span>Announcement</span><span class="pa-text"></span>';
        g.hud.root.append(el);
        this.paEl = el;
      }
      if (this.paEl) {
        this.paEl.querySelector('.pa-text').textContent = text;
        this.paEl.classList.add('show');
        clearTimeout(this._paHide);
        this._paHide = setTimeout(() => this.paEl && this.paEl.classList.remove('show'), Math.max(6000, text.length * 75));
      }
      // Spoken, if voices are on and nobody else is talking.
      const d = g.dialogue;
      if (d && d._speak && !d.active && g.settings.get('gameplay.voicedDialogue')) {
        if (!this._cast && d.addCast) {
          d.addCast({ airport_pa: { name: 'Announcement', voice: { gender: 'female', pitch: 1.05, rate: 0.95 } } });
          this._cast = true;
        }
        setTimeout(() => {
          if (!d.active) d._speak('airport_pa', text);
        }, 1500);
      }
    }

    /** The three-note airport chime, a little reverb tail. */
    _chime() {
      const au = this.game.audio;
      if (!au || !au.ready || !au._tone) return;
      const p = this.game.player.pos;
      const T = this.game.terminal;
      const inside = T && T.isInside ? T.isInside(p.x, p.z, p.y) : false;
      const k = inside ? 1 : clamp(1 - this._distT(p) / 70, 0.2, 0.7);
      const t = au.ctx.currentTime + 0.05;
      const notes = [783.99, 659.25, 523.25];
      notes.forEach((f, i) => {
        au._tone({ t: t + i * 0.42, freq: f, wave: 'sine', peak: 0.075 * k, attack: 0.01, decay: 1.4, bus: au.amb });
        au._tone({ t: t + i * 0.42, freq: f * 2, wave: 'sine', peak: 0.018 * k, attack: 0.01, decay: 0.7, bus: au.amb });
        au._tone({ t: t + i * 0.42 + 0.09, freq: f, wave: 'triangle', peak: 0.02 * k, attack: 0.05, decay: 1.6, lowpass: 1400, bus: au.amb });
      });
    }

    // ---------------------------------------------------------- ambience
    _soundTick(dt) {
      const g = this.game;
      const au = g.audio;
      if (!au || !au.ready || !au.brown || !au._loop) return;
      const p = g.player.pos;
      const T = g.terminal;
      const inside = !!(T && T.isInside && T.isInside(p.x, p.z, p.y));
      const dT = this._distT(p);
      // The hall's murmur: how many people are close.
      let near = 0;
      let walking = 0;
      for (const b of this.list) {
        const d2 = dist2(b.a.pos.x, b.a.pos.z, p.x, p.z);
        if (d2 < 900) {
          near++;
          if (d2 < 196 && b.a.speed > 0.6) walking++;
        }
      }
      const want = this.on ? (inside ? 0.035 + Math.min(near, 30) * 0.0028 : dT < 25 ? 0.012 + Math.min(near, 20) * 0.001 : 0) : 0;
      const music = this.on && inside ? 0.011 : 0;
      if (!this.snd && want > 0) {
        const ctx = au.ctx;
        const murmur = au._loop(au.brown, 'bandpass', 480, 0.7);
        const chatter = au._loop(au.white, 'bandpass', 1500, 2.2);
        // A soft pad: three sines through a low-pass, the chord changing slowly.
        const pad = ctx.createGain();
        pad.gain.value = 0;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        lp.connect(pad);
        pad.connect(au.amb);
        const osc = [0, 1, 2].map(() => {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.connect(lp);
          o.start();
          return o;
        });
        this.snd = { murmur, chatter, pad, osc, chord: 0, chordT: 0, m: 0, mu: 0 };
      }
      const S = this.snd;
      if (!S) return;
      const t = au.ctx.currentTime;
      if (Math.abs(want - S.m) > 0.003) {
        S.m = want;
        S.murmur.gain.gain.setTargetAtTime(want, t, 0.8);
        S.chatter.gain.gain.setTargetAtTime(want * 0.22, t, 0.8);
      }
      if (Math.abs(music - S.mu) > 0.001) {
        S.mu = music;
        S.pad.gain.setTargetAtTime(music, t, 1.5);
      }
      if (music > 0) {
        S.chordT -= dt;
        if (S.chordT <= 0) {
          S.chordT = 7;
          const CH = [[261.63, 329.63, 392.0], [220.0, 277.18, 329.63], [246.94, 311.13, 369.99], [196.0, 246.94, 293.66]];
          const ch = CH[S.chord++ % CH.length];
          S.osc.forEach((o, i) => o.frequency.setTargetAtTime(ch[i] / 2, t, 0.9));
        }
      }
      // Footsteps on the hard floor.
      if (inside && walking) {
        this._stepT = (this._stepT || 0) - dt * walking * 1.5;
        if (this._stepT <= 0) {
          this._stepT = 1;
          au._hit({ freq: rnd(2200, 3400), q: 1.6, peak: rnd(0.006, 0.016), decay: 0.04, bus: au.amb, pan: rnd(-0.6, 0.6) });
        }
      }
    }

    // ------------------------------------------------------------ update
    update(dt) {
      if (!this.ok) return;
      const g = this.game;
      this._t += dt;
      this._calm += dt;
      const p = g.player.pos;
      const d = this._distT(p);
      if (!this.on && d < NEAR) {
        this.on = true;
        this._fill = 2.5;
        this._carT = 1;
        this._cabT = 0.5;
      } else if (this.on && d > FAR) this._sleep();
      this._soundTick(dt);
      if (!this.on) return;
      if (this._fill > 0) this._fill -= dt;
      // Tidy away anyone gone (into a plane, a car, off home).
      for (let i = this.list.length - 1; i >= 0; i--) {
        const b = this.list[i];
        const a = b.a;
        if (a.removed || b.gone) {
          this._remove(b);
          continue;
        }
        if (a.dead) {
          if (!b.deadDone) {
            b.deadDone = true;
            this._release(b);
            b.mode = 'gone';
            if (b.case) b.prop = { x: a.pos.x + 0.4, y: a.pos.y, z: a.pos.z, yaw: a.heading, flat: true };
          }
          continue;
        }
        // Boarding when their flight is called.
        if (b.boardAt && this._t > b.boardAt && b.kind === 'dep' && b.stage === 'board') {
          b.boardAt = 0;
          if (b.mode === 'sit') b.getUp = true;
          else if (b.mode === 'wait') {
            b.wt = 0;
            b.then = (bb, aa) => this._toBoard(bb, aa);
          }
        }
      }
      this._dirT -= dt;
      if (this._dirT <= 0) {
        this._dirT = this._fill > 0 ? 0.1 : 0.4;
        this._direct();
        this._pickupsTick();
      }
      if (this.T) this._arrivalsTick(dt);
      this._kerbTick(dt);
      this._paTick(dt);
      this._props();
    }

    /** Jay's gone: everyone goes, the cars rejoin the traffic. */
    _sleep() {
      this.on = false;
      for (const b of this.list.slice()) this._remove(b);
      this.list.length = 0;
      for (let i = this.cars.length - 1; i >= 0; i--) {
        const c = this.cars[i];
        const v = c.v;
        if (!v.removed && v !== this.game.player.vehicle) {
          if (c.d.phase === 'stop' || !this.game.traffic) this.game.vehicles.remove(v);
          else this._handOver(c);
        }
        this._dropJob(c, i);
      }
      this._arrivals.length = 0;
      this._paQ.length = 0;
      if (this.taxiLine) this.taxiLine.q.length = 0;
      for (const ln of Object.values(this.lines || {})) ln.q.length = 0;
      for (const ln of this.sec || []) ln.q.length = 0;
      if (this.seatBy) this.seatBy.fill(null);
      for (const s of [].concat(this.K.departures, this.K.arrivals, [this.K.bus], this.stand, this.busStop, this.meet || [], this.window || [], this.view || [])) s.busy = null;
      for (const c of this.carousels || []) c.by.fill(null);
      for (const P of this.posts || []) P.p = null;
      this._props();
      if (this.paEl) this.paEl.classList.remove('show');
    }

    blips() {}

    reset() {
      if (!this.ok) return;
      this._sleep();
      this.watched = 0;
      this.boarding && this.boarding.clear();
      this.closed && this.closed.clear();
      this._said.clear();
      this._calm = 99;
      this._t = 0;
    }

    stop() {
      if (!this.ok) return;
      this._sleep();
      if (this.snd) {
        const au = this.game.audio;
        const t = au && au.ctx ? au.ctx.currentTime : 0;
        this.snd.murmur.gain.gain.setTargetAtTime(0, t, 0.2);
        this.snd.chatter.gain.gain.setTargetAtTime(0, t, 0.2);
        this.snd.pad.gain.setTargetAtTime(0, t, 0.2);
        this.snd.m = this.snd.mu = 0;
      }
    }

    stats() {
      return this.watched > 0 ? [["Flights you've watched leave", String(this.watched)]] : [];
    }

    serialize() {
      return { watched: this.watched };
    }

    load(d) {
      this.watched = (d && d.watched) || 0;
    }
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }

  AirportLife.Person = Person;
  AirportLife.Nav = Nav;
  VH.AirportLife = AirportLife;
})();
