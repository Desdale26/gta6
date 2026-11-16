/*
 * carnival-rides.js — Wonder Wharf's rides, each an attraction on the
 * carnival system (js/carnival.js, whose header documents the API):
 *
 *   dodgems    the Dodgems: 90 seconds in a bumper car against six others
 *   riptide    the Riptide roller coaster
 *   wheel      the Wonder Wheel
 *   skyhook    the Skyhook drop tower
 *   helter     the helter-skelter (climb the stair inside, slide down on a mat)
 *   carousel   the Galloping Horses
 *
 * The machinery (the wheel, the train, the tower's seats, the carousel, the
 * gates) is WharfLife's in districts/neonstrand.js; the rides here drive it
 * through carnival.life while Jay is on, and fill the seats with riders
 * (carnival.figures) when he isn't.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const Carnival = VH.Carnival;
  if (!Carnival) return;
  const KERB = 0.15;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const _v = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _m = new THREE.Matrix4();
  const _s = new THREE.Vector3(1, 1, 1);
  const POSE = Carnival.POSES;

  /** A cheap random that is the same every time for a seed (which seats have riders). */
  const hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // ================================================================ DODGEMS
  // The arena (neonstrand.js DODGEMS): the floor's top, the inside of the rails, the way in.
  const DG = { x0: 830.4, z0: 126.4, x1: 871.6, z1: 161.6, floor: KERB + 0.2, door: { x: 869.5, z: 158 }, out: { x: 874.5, z: 158 }, bay: { x: 866, z: 157 } };
  const CARS = 7;
  const CAR_R = 1.1; //       a car's bumper, as a circle
  const ROUND = 90; //        seconds a go
  const TINTS = [0xe0403a, 0x37b8ff, 0xffd24a, 0x7dcf6a, 0xff5c95, 0xb45cff, 0xff8a3c];

  const dodgems = {
    id: 'dodgems',
    name: 'the Dodgems',
    kind: 'ride',
    label: 'Drive the Dodgems',
    x: DG.out.x,
    z: DG.out.z,
    radius: 2.6,
    price: 5,
    scored: true,
    unit: 'points',
    sleep: 160,
    view: 'chase',
    hint: 'W / S or left stick  drive   ·   A / D  steer   ·   V  change view   ·   Esc / B  stop',
    barks: ['Dodgems! Bump your mates, it\'s what they\'re for!', 'Ninety seconds of bumping for five dollars!', 'Hit \'em before they hit you! Dodgems this way!'],

    setup(c) {
      this.c = c;
      // The cars: one instanced mesh, a glow at the top of each pole as another.
      const g = new VH.GeometryBuilder({});
      const w = VH.col(0xffffff), dark = VH.col(0x2a2c31), chrome = VH.col(0xc9ced4);
      g.box(-0.95, 0.04, -1.3, 0.95, 0.3, 1.35, dark); //   the rubber bumper all round
      g.box(-0.8, 0.3, -1.1, 0.8, 0.62, 1.05, w); //       body
      g.box(-0.7, 0.3, 1.05, 0.7, 0.55, 1.3, w); //        nose
      g.box(-0.62, 0.62, -1.08, 0.62, 1.12, -0.82, w); //  seat back
      g.box(-0.55, 0.45, -0.8, 0.55, 0.66, -0.15, dark); // seat
      g.box(-0.05, 0.62, 0.45, 0.05, 0.95, 0.55, chrome); // steering column
      g.box(-0.24, 0.92, 0.4, 0.24, 0.98, 0.6, dark); //    wheel
      g.box(-0.035, 1.12, -1.0, 0.035, DG.floor + 5.75 - DG.floor, -0.93, chrome); // the pole up to the grid
      this.mesh = new THREE.InstancedMesh(g.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.15 }), CARS);
      this.mesh.frustumCulled = false;
      const tc = new THREE.Color();
      for (let i = 0; i < CARS; i++) this.mesh.setColorAt(i, tc.set(TINTS[i]));
      c.game.scene.add(this.mesh);
      const sg = new THREE.OctahedronGeometry(0.16, 0);
      this.glow = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), CARS);
      this.glow.frustumCulled = false;
      c.game.scene.add(this.glow);
      // The cars' state, and a solid box each (nobody walks through one; a car driven at the rail stops).
      this.cars = [];
      for (let i = 0; i < CARS; i++) {
        const a = (i / CARS) * TAU;
        const car = {
          i,
          x: 851 + Math.cos(a) * 9,
          z: 144 + Math.sin(a) * 7,
          yaw: a + Math.PI / 2,
          vx: 0,
          vz: 0,
          steer: 0,
          throttle: 0,
          target: -1,
          tx: 851,
          tz: 144,
          think: hash(i) * 3,
          stuck: 0,
          reverse: 0,
          spark: 0,
          hitT: 0,
          col: c.movable(DG.x0 - 0.3, DG.z0 - 0.3, DG.x1 + 0.3, DG.z1 + 0.3, 0.92, 1.3, 0, DG.floor + 0.62, 'metal'),
        };
        this.cars.push(car);
      }
      this.round = { t: 0, on: true }; // the fair's own rounds while Jay isn't driving
      this.place(0);
    },

    // ------------------------------------------------------- the simulation
    /** Move every car on by dt. jay: the session (car 0 is his) or null. */
    sim(dt, jay) {
      const cars = this.cars;
      const P = this.c.game.player;
      const fierce = jay && jay.data.phase === 'play';
      for (const car of cars) {
        if (car.i === 0 && jay) continue; // Jay's own, driven below
        this.ai(car, dt, jay, fierce);
      }
      if (jay) this.drive(cars[0], dt, jay);
      for (const car of cars) {
        // A bumper car: thrust along its nose, it slides a little sideways, the floor's drag.
        const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
        const top = car.i === 0 && jay ? 5.6 : fierce ? 4.7 : 3.2;
        car.vx += fx * car.throttle * 7 * dt;
        car.vz += fz * car.throttle * 7 * dt;
        const along = car.vx * fx + car.vz * fz;
        const side = car.vx * fz - car.vz * fx;
        const side2 = side * Math.max(0, 1 - dt * 4.5);
        const along2 = clamp(along * Math.max(0, 1 - dt * (car.throttle ? 0.4 : 1.4)), -top * 0.6, top);
        car.vx = fx * along2 + fz * side2;
        car.vz = fz * along2 - fx * side2;
        car.yaw = wrap(car.yaw - car.steer * 2.3 * dt * (0.35 + 0.65 * clamp(Math.abs(along) / 2, 0, 1)) * (along < -0.1 ? -1 : 1));
        car.x += car.vx * dt;
        car.z += car.vz * dt;
        car.spark = Math.max(0, car.spark - dt * 3);
        if (car.hitT > 0) car.hitT -= dt;
        // The rails: bounce off.
        const r = CAR_R;
        if (car.x < DG.x0 + r) { car.x = DG.x0 + r; if (car.vx < 0) car.vx = -car.vx * 0.6; car.spark = 1; }
        if (car.x > DG.x1 - r) { car.x = DG.x1 - r; if (car.vx > 0) car.vx = -car.vx * 0.6; car.spark = 1; }
        if (car.z < DG.z0 + r) { car.z = DG.z0 + r; if (car.vz < 0) car.vz = -car.vz * 0.6; car.spark = 1; }
        if (car.z > DG.z1 - r) { car.z = DG.z1 - r; if (car.vz > 0) car.vz = -car.vz * 0.6; car.spark = 1; }
      }
      // Car on car: push apart, swap the speed along the line between them, and a little extra bounce.
      for (let a = 0; a < CARS; a++) {
        for (let b = a + 1; b < CARS; b++) {
          const A = cars[a], B = cars[b];
          const dx = B.x - A.x, dz = B.z - A.z;
          const d2 = dx * dx + dz * dz;
          if (d2 > 4 * CAR_R * CAR_R || d2 < 1e-6) continue;
          const d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
          const push = (2 * CAR_R - d) / 2;
          A.x -= nx * push; A.z -= nz * push;
          B.x += nx * push; B.z += nz * push;
          const va = A.vx * nx + A.vz * nz, vb = B.vx * nx + B.vz * nz;
          const closing = va - vb;
          if (closing <= 0) continue;
          const j = closing * 0.92 + 0.8; // restitution, and the arcade kick
          A.vx -= nx * j; A.vz -= nz * j;
          B.vx += nx * j; B.vz += nz * j;
          A.spark = B.spark = 1;
          this.bumped(A, B, va, -vb, closing, jay);
        }
      }
      // Jay on foot in the arena: the cars bounce off him (the physics keeps him out of them).
      if (!jay && P.pos.x > DG.x0 - 1 && P.pos.x < DG.x1 + 1 && P.pos.z > DG.z0 - 1 && P.pos.z < DG.z1 + 1) {
        for (const car of cars) {
          const dx = car.x - P.pos.x, dz = car.z - P.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < CAR_R + 0.5 && d > 1e-3) {
            const nx = dx / d, nz = dz / d;
            car.x = P.pos.x + nx * (CAR_R + 0.5);
            car.z = P.pos.z + nz * (CAR_R + 0.5);
            const vn = car.vx * nx + car.vz * nz;
            if (vn < 0) { car.vx -= nx * vn * 1.6; car.vz -= nz * vn * 1.6; }
          }
        }
      }
    },

    /** Two cars met. Who hit whom matters only when one of them is Jay's. */
    bumped(A, B, aIn, bIn, closing, jay) {
      const c = this.c;
      const P = c.game.player.pos;
      const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
      const near = Math.hypot(mx - P.x, mz - P.z);
      if (near < 40 && c.audio && closing > 0.6) c.audio.bump({ gain: clamp(closing / 6, 0.15, 1) * clamp(1 - near / 40, 0.1, 1) });
      if (closing > 2.2 && near < 60 && c.game.fx) c.game.fx.sparks(mx, DG.floor + 0.3, mz, 0, 0, 6, 3);
      if (!jay || jay.data.phase !== 'play') return;
      if (A.i !== 0 && B.i !== 0) return;
      const J = A.i === 0 ? A : B, O = A.i === 0 ? B : A;
      const jIn = A.i === 0 ? aIn : bIn, oIn = A.i === 0 ? bIn : aIn;
      if (closing < 1.1 || O.hitT > 0) return;
      O.hitT = 0.7;
      const s = jay;
      if (jIn >= oIn) {
        s.data.bumps++;
        const pts = 10 + Math.round(clamp(closing - 2, 0, 6) * 2);
        s.score += pts;
        s.ui.stat('bumps', 'Bumps', s.data.bumps);
        s.ui.stat('score', 'Points', s.score);
        s.ui.big(closing > 5 ? 'SMASH!' : 'BUMP!', 600);
        s.shake(0.6);
      } else {
        s.data.taken++;
        s.ui.stat('taken', 'Bumped by others', s.data.taken);
        s.ui.big('OOF!', 500);
        s.shake(0.9);
      }
    },

    /** A fair driver: pick someone to chase (often Jay, in a game), steer at them, back out of corners. */
    ai(car, dt, jay, fierce) {
      car.think -= dt;
      if (car.think <= 0) {
        car.think = 2.5 + hash(car.i * 7 + this.round.t) * 3.5;
        const r = hash(car.i * 13 + Math.floor(this.round.t * 3));
        if (fierce && r < 0.5) car.target = 0;
        else if (r < 0.8) car.target = Math.floor(hash(car.i + this.round.t) * CARS);
        else car.target = -1;
        if (car.target === car.i) car.target = -1;
        car.tx = DG.x0 + 4 + hash(car.i * 3 + this.round.t) * (DG.x1 - DG.x0 - 8);
        car.tz = DG.z0 + 4 + hash(car.i * 5 + this.round.t) * (DG.z1 - DG.z0 - 8);
      }
      if (!this.round.on && !fierce) {
        car.throttle = 0;
        car.steer = 0;
        return;
      }
      let tx = car.tx, tz = car.tz;
      if (car.target >= 0) {
        const T = this.cars[car.target];
        // Lead the target a little.
        tx = T.x + T.vx * 0.4;
        tz = T.z + T.vz * 0.4;
      }
      const want = Math.atan2(tx - car.x, tz - car.z);
      const err = wrap(want - car.yaw);
      const speed = Math.hypot(car.vx, car.vz);
      if (car.reverse > 0) {
        car.reverse -= dt;
        car.throttle = -0.8;
        car.steer = car.i % 2 ? 1 : -1;
        return;
      }
      car.stuck = car.throttle > 0.5 && speed < 0.6 ? car.stuck + dt : 0;
      if (car.stuck > 1.1) {
        car.stuck = 0;
        car.reverse = 0.9;
      }
      car.steer = clamp(-err * 1.8, -1, 1);
      car.throttle = Math.abs(err) < 1.3 ? 1 : 0.35;
      if (car.target < 0 && Math.hypot(tx - car.x, tz - car.z) < 3) car.think = 0;
    },

    /** Jay's car, from the keys or the stick. */
    drive(car, dt, s) {
      if (s.data.phase === 'walk' && !s.data.parked) {
        // The attendant brings the red car round to the way in.
        const dx = DG.bay.x - car.x, dz = DG.bay.z - car.z, d = Math.hypot(dx, dz);
        const sp = Math.hypot(car.vx, car.vz);
        if (d < 0.7 || s.data.t2 > 14) {
          car.throttle = car.steer = 0;
          car.vx *= 0.8;
          car.vz *= 0.8;
          if (sp < 0.3) s.data.parked = true;
          return;
        }
        s.data.t2 = (s.data.t2 || 0) + dt;
        if (car.reverse > 0) {
          car.reverse -= dt;
          car.throttle = -0.8;
          car.steer = 1;
          return;
        }
        car.stuck = sp < 0.4 ? car.stuck + dt : 0;
        if (car.stuck > 1.2) {
          car.stuck = 0;
          car.reverse = 0.8;
        }
        const err = wrap(Math.atan2(dx, dz) - car.yaw);
        car.steer = clamp(-err * 1.8, -1, 1);
        car.throttle = (Math.abs(err) < 1.2 ? 1 : 0.3) * clamp(d / 5, 0.3, 0.8) - (sp > d ? 0.6 : 0);
        return;
      }
      if (s.data.phase !== 'play') {
        car.throttle = 0;
        car.steer = 0;
        return;
      }
      const m = s.move();
      car.throttle = clamp(m.y + (s.down('fire') ? 1 : 0) - (s.down('aim') ? 1 : 0), -1, 1);
      car.steer = clamp(m.x, -1, 1);
    },

    /** Draw the cars, their glows and their drivers; move their solid boxes. */
    place(dt, jay) {
      const c = this.c;
      const t = c.game.time || 0;
      for (const car of this.cars) {
        _e.set(0, car.yaw, 0);
        _q.setFromEuler(_e);
        _v.set(car.x, DG.floor, car.z);
        _m.compose(_v, _q, _s);
        this.mesh.setMatrixAt(car.i, _m);
        car.col.move(car.x, car.z, car.yaw);
        // The spark where the pole meets the grid: always a flicker, a flash on a bump or a push off.
        const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
        const k = 0.25 + 0.75 * Math.max(car.spark, Math.abs(car.throttle) * 0.35 * (0.5 + 0.5 * Math.sin(t * 53 + car.i * 7)));
        _v.set(car.x - fx * 0.965, KERB + 5.85, car.z - fz * 0.965);
        _v2.set(k, k * 0.6, k);
        _m.compose(_v, _q, _v2);
        this.glow.setMatrixAt(car.i, _m);
        // The driver.
        if (car.i === 0 && jay) continue;
        if (!this.round.on && hash(car.i + 0.5) < 0.3) continue;
        c.figures.add('sit', car.x - fx * 0.35, DG.floor + 0.62, car.z - fz * 0.35, car.yaw, car.i);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
      this.glow.instanceMatrix.needsUpdate = true;
    },

    idle(dt) {
      // The fair's own rounds: three minutes of bumping, half a minute's change-over.
      const R = this.round;
      R.t = (R.t + dt) % 150;
      R.on = R.t < 120;
      this.sim(dt, null);
      this.place(dt, null);
    },

    sleepNow() {
      for (const car of this.cars) {
        car.vx = car.vz = car.throttle = car.steer = 0;
      }
    },

    // ------------------------------------------------------------- a go
    start(s) {
      const D = s.data;
      D.phase = 'walk';
      D.bumps = 0;
      D.taken = 0;
      D.leg = 0;
      s.score = 0;
      this.round.on = false; // everyone stops while Jay gets in
      const car = this.cars[0];
      car.target = -1;
      s.ui.caption('Find the red car and climb in.', 3000);
    },

    update(dt, s) {
      const D = s.data;
      const car = this.cars[0];
      this.sim(dt, s);
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
      if (D.phase === 'walk') {
        // In through the gap in the rail, round to the car's side, and in.
        if (D.leg === 0 && s.walk(DG.door.x, DG.door.z)) D.leg = 0.5;
        else if (D.leg === 0.5) {
          s.walk(DG.door.x, DG.door.z); // (waiting at the rail for the car)
          if (!D.parked) {
            const P = s.game.player.pos;
            s.chase(P.x, P.y, P.z, s.game.player.heading, 5, { height: 1.2 });
            return this.place(dt, s);
          }
          D.leg = 1;
          D.sx = car.x + Math.cos(car.yaw) * 1.5;
          D.sz = car.z - Math.sin(car.yaw) * 1.5;
        } else if (D.leg === 1 && s.walk(D.sx, D.sz, DG.floor)) {
          D.phase = 'count';
          D.t = 0;
        }
        const P = s.game.player.pos;
        s.chase(P.x, P.y, P.z, s.game.player.heading, 5, { height: 1.2 });
      }
      if (D.phase === 'count' || D.phase === 'play' || D.phase === 'done') this.seat(s, car, fx, fz);
      if (D.phase === 'count') {
        const before = D.t;
        D.t += dt;
        for (const [at, word] of [[0.4, '3'], [1.4, '2'], [2.4, '1'], [3.4, 'GO!']]) {
          if (before < at && D.t >= at) {
            s.ui.big(word, 800);
            s.sound(word === 'GO!' ? 'klaxon' : 'tick');
          }
        }
        if (D.t >= 3.4) {
          D.phase = 'play';
          D.t = ROUND;
          this.round.on = true;
          this.round.t = 0;
          for (const cc of this.cars) cc.think = hash(cc.i) * 0.5;
          s.ui.stat('bumps', 'Bumps', 0);
          s.ui.stat('taken', 'Bumped by others', 0);
          s.ui.stat('score', 'Points', 0);
        }
      } else if (D.phase === 'play') {
        D.t -= dt;
        s.ui.timer(D.t);
        if (D.t <= 0 || s.leaving) {
          D.early = D.t > 0;
          D.phase = 'done';
          D.t = 0;
          this.round.on = false;
          s.ui.timer(null);
          s.ui.big(s.leaving && !s.emergency ? 'STOP' : 'TIME!', 1200);
          s.sound('klaxon');
        }
      } else if (D.phase === 'done') {
        D.t += dt;
        if (D.t > 2) {
          D.phase = 'out';
          D.leg = 0;
          D.sx = car.x + Math.cos(car.yaw) * 1.5;
          D.sz = car.z - Math.sin(car.yaw) * 1.5;
          s.seat(null);
        }
      } else if (D.phase === 'out') {
        if (D.leg === 0 && s.walk(D.sx, D.sz, DG.floor, 0.4)) D.leg = 1;
        else if (D.leg === 1 && s.walk(DG.door.x, DG.door.z)) D.leg = 2;
        else if (D.leg === 2 && s.walk(DG.out.x, DG.out.z)) {
          if (D.refund) return s.end('left');
          // Points for bumps, and a bonus for staying out of trouble.
          const clean = Math.max(0, 50 - D.taken * 5);
          const score = s.score + (D.early ? 0 : clean);
          // A first go wins a couple; a fierce driver about twenty-five.
          const tickets = D.early ? Math.min(25, Math.round(D.bumps * 0.35)) : clamp(Math.round(D.bumps * 0.35 + clean / 10), 2, 25);
          s.finish({ score, tickets, completed: !D.early, text: D.bumps + (D.bumps === 1 ? ' bump' : ' bumps') + ', bumped ' + D.taken + (D.taken === 1 ? ' time' : ' times') });
          return;
        }
        const P = s.game.player.pos;
        s.chase(P.x, P.y, P.z, s.game.player.heading, 5, { height: 1.2 });
      }
      this.place(dt, s);
      // Driving sound: the motor's whine with the speed.
      if (c(s).audio) {
        const sp = Math.hypot(car.vx, car.vz);
        c(s).audio.ride(clamp(sp / 6, 0, 1) * 0.5, 0);
      }
    },

    /** Jay in his seat, and the camera. */
    seat(s, car, fx, fz) {
      s.seat(car.x - fx * 0.35, DG.floor + 0.62, car.z - fz * 0.35, car.yaw, 'hold');
      if (s.view === 'eye') s.eye(car.x - fx * 0.3, DG.floor + 1.55, car.z - fz * 0.3, car.yaw, { yawLimit: 2.4, recentre: true, pitch: -0.12, fov: 75 });
      else s.chase(car.x, DG.floor, car.z, car.yaw, 6.5, { height: 1.6, recentre: true });
    },

    escape(s) {
      if (s.data.phase === 'walk' || s.data.phase === 'count') {
        // Changed his mind before the start: his money back.
        if (!s.opts.free) s.game.player.money += this.price;
        s.data.phase = 'out';
        s.data.leg = 1;
        s.data.refund = true;
        s.leaving = true;
        this.round.on = true;
        s.seat(null);
        return true;
      }
      return false;
    },

    stop() {
      this.round.on = true;
      const car = this.cars[0];
      car.throttle = car.steer = 0;
    },
  };
  const c = (s) => s.carnival;
  Carnival.define(dodgems);

  // ================================================================ RIPTIDE
  // The station (neonstrand.js buildCoaster): a platform east of the track, its gate at z 140, a ramp up from the east.
  const RT = { deck: KERB + 1.0, gate: { x: 913.95, z: 140 }, wait: { x: 915.3, z: 140 }, foot: { x: 922.4, z: 139 } };
  const RT_SEATS = [-0.36, 0.36]; // across a car (two to a car, four cars)
  const _qt = new THREE.Quaternion();
  const _qy = new THREE.Quaternion();
  const _Y = new THREE.Vector3(0, 1, 0);

  /** Where car `car`'s seat `side` puts a rider's hips (into out), from the train as WharfLife placed it. */
  function trainSeat(L, car, side, out) {
    return out.set(RT_SEATS[side], 1.02, -0.5).applyQuaternion(L.carQ[car]).add(L.carPos[car]);
  }

  const riptide = {
    id: 'riptide',
    name: 'the Riptide',
    kind: 'ride',
    label: 'Ride the Riptide',
    x: RT.foot.x,
    z: RT.foot.z,
    radius: 2.2,
    prompts: [{ x: RT.wait.x + 0.3, z: RT.wait.z, y: RT.deck, radius: 1.6 }],
    exit: { x: RT.wait.x, z: RT.wait.z, y: RT.deck, yaw: Math.PI / 2 },
    price: 6,
    sleep: 230,
    view: 'eye',
    hint: 'Mouse / right stick  look around   ·   V  change view   ·   Esc / B  off when the train gets back',
    barks: ['The Riptide! Thirty-two metres up and only one way down!', 'Hold on to your hat, the Riptide\'s boarding now!', 'Six dollars a ride, screams are free!'],

    setup(c) {
      this.c = c;
    },

    /** The other riders, two to a car (a fresh lot each time the train stops), and the queue on the platform. */
    riders(L, jaySeat) {
      const c = this.c;
      const empty = c.closedFor > 0;
      const swap = L.trainState === 'station' && L.trainDwell < 4.5;
      const lap = L.laps + (swap ? 1 : 0);
      if (!(empty && L.trainState === 'station')) {
        for (let car = 0; car < 4; car++) {
          const q = L.carQ[car];
          _v2.set(0, 0, 1).applyQuaternion(q);
          const wild = (_v2.y < -0.2 && L.v > 7) || L.v > 15;
          for (let side = 0; side < 2; side++) {
            const k = car * 2 + side;
            if (k === jaySeat || hash(lap * 8 + k + 0.3) < 0.3) continue;
            trainSeat(L, car, side, _v);
            c.figures.add(wild && hash(k * 3 + lap) > 0.15 ? 'up' : 'sit', _v.x, _v.y, _v.z, 0, k + lap, q);
          }
        }
      }
      // The queue: a few at the gate while the train is out, fewer once they've got on.
      if (empty) return;
      const n = swap ? 1 : 2 + Math.floor(hash(lap + 0.7) * 4);
      for (let i = 0; i < n; i++) c.figures.add('stand', RT.wait.x + 0.5 + (i % 2) * 0.7, RT.deck, RT.wait.z + 1.2 + i * 0.85, -Math.PI / 2 + (hash(i + lap) - 0.5) * 0.6, i + lap * 3);
    },

    idle(dt, c) {
      const L = c.life;
      if (!L || !L.ok) return;
      L.trainHold = c.closedFor > 0; // shut: the train comes home and waits, empty
      this.riders(L, -1);
    },

    start(s) {
      const L = s.carnival.life;
      const D = s.data;
      D.phase = 'queue';
      D.car = 1;
      D.side = 0;
      L.trainHold = true; // whatever it's doing, it waits for Jay at the station
      s.ui.caption(L.trainState === 'station' ? 'All aboard!' : 'Wait at the gate for the train.', 2600);
    },

    /** The camera while Jay is on foot. */
    follow(s) {
      const P = s.game.player;
      s.chase(P.pos.x, P.pos.y, P.pos.z, P.heading, 5, { height: 1.3 });
    },

    update(dt, s) {
      const L = s.carnival.life;
      const D = s.data;
      const P = s.game.player;
      if (!L || !L.ok) return s.end('closed');
      this.riders(L, D.phase === 'queue' ? -1 : D.car * 2 + D.side);
      if (D.phase === 'queue') {
        // Up the ramp to the gate; wait there for the train.
        if (!D.atGate && s.walk(RT.wait.x, RT.wait.z)) D.atGate = true;
        if (D.atGate) {
          s.seat(RT.wait.x, RT.deck, RT.wait.z, -Math.PI / 2, 'stand');
          if (s.leaving) return this.off(s, true);
          if (L.trainState === 'station') {
            // The seat nearest the gate on the platform side.
            let bd = 1e9;
            for (let car = 0; car < 4; car++) for (let side = 0; side < 2; side++) {
              trainSeat(L, car, side, _v);
              const d = Math.abs(_v.z - RT.gate.z) - _v.x * 2;
              if (d < bd) { bd = d; D.car = car; D.side = side; }
            }
            s.carnival.gate('coaster', true);
            D.phase = 'board';
            D.leg = 0;
            D.t = 0;
          }
        }
        return this.follow(s);
      }
      if (D.phase === 'board') {
        D.t += dt;
        trainSeat(L, D.car, D.side, _v);
        if (D.leg === 0 && D.t > 0.6 && s.walk(RT.gate.x, RT.gate.z, RT.deck, 0.7)) D.leg = 1;
        else if (D.leg === 1 && s.walk(_v.x, _v.z, _v.y - 0.55, 0.5)) {
          D.phase = 'ride';
          D.t = 0;
          D.wasRun = false;
          D.lastI = Math.floor(L.s);
          s.carnival.gate('coaster', false);
          L.trainHold = false;
          L.trainDwell = Math.min(L.trainDwell, 3);
          s.game.cameraRig.pitch = 0;
          s.ui.caption('Bar down... here we go!', 2400);
          s.sound('ding');
        } else if (D.leg === 0) s.seat(P.pos.x, P.pos.y, P.pos.z, -Math.PI / 2, 'stand');
        if (D.phase === 'board') return this.follow(s);
      }
      if (D.phase === 'ride') {
        D.t += dt;
        if (L.trainState === 'run') D.wasRun = true;
        const q = L.carQ[D.car];
        _v2.set(0, 0, 1).applyQuaternion(q);
        const yaw = Math.atan2(_v2.x, _v2.z);
        const slope = Math.asin(clamp(_v2.y, -1, 1));
        // The drop: over the top of the lift hill and down.
        const i = Math.floor(L.s);
        if (D.lastI < L.topIndex && i >= L.topIndex && i < L.topIndex + 20) {
          s.sound('scream');
          s.sound('whoosh');
          s.shake(0.8);
        }
        D.lastI = i;
        const wild = (slope < -0.2 && L.v > 7) || L.v > 15;
        trainSeat(L, D.car, D.side, _v);
        s.seat(_v.x, _v.y, _v.z, yaw, wild ? 'up' : 'hold');
        // Tip his body with the car: the car's turn without its heading.
        _qy.setFromAxisAngle(_Y, yaw).invert();
        _qt.copy(q).multiply(_qy);
        s.tilt(_qt);
        const fast = clamp((L.v - 5) / 17, 0, 1);
        if (s.view === 'eye') {
          _v.set(RT_SEATS[D.side] * 0.9, 1.74, -0.3).applyQuaternion(q).add(L.carPos[D.car]);
          s.eye(_v.x, _v.y, _v.z, yaw, { pitch: slope * 0.9, pitchMin: -0.9, pitchMax: 0.8, yawLimit: 2.2, recentre: true, fov: c(s)._baseFov + 4 + fast * 14, shake: 0.08 + fast * 0.5 + (L.lift ? 0.05 : 0) });
        } else s.chase(L.carPos[D.car].x, L.carPos[D.car].y, L.carPos[D.car].z, yaw, 9, { height: 1.4, recentre: true, fov: c(s)._baseFov + fast * 8, shake: fast * 0.3 });
        if (c(s).audio) c(s).audio.ride(clamp(L.v / 20, 0.08, 1), fast, { clank: L.lift && L.trainState === 'run' ? 5.5 : 0, dt });
        if (s.leaving && !D.told) {
          D.told = true;
          s.ui.caption(s.emergency ? 'The train is coming back to the station.' : 'You\'re off when the train gets back.', 3000);
        }
        if (D.wasRun && L.trainState === 'station') {
          // Home: hold the train while he climbs out.
          L.trainHold = true;
          s.carnival.gate('coaster', true);
          D.phase = 'out';
          D.leg = 0;
          D.t = 0;
          s.seat(null);
          s.sound('cheer', { gain: 0.6 });
          c(s).audio && c(s).audio.rideStop();
        }
        return;
      }
      if (D.phase === 'out') {
        D.t += dt;
        if (D.leg === 0 && D.t > 0.4 && s.walk(RT.gate.x, RT.gate.z, RT.deck, 0.5)) D.leg = 1;
        else if (D.leg === 1 && s.walk(RT.wait.x, RT.wait.z, RT.deck, 0.7)) return this.off(s, false);
        return this.follow(s);
      }
    },

    /** Off the ride: the gate shut, the train free to go (refund: he never got on). */
    off(s, refund) {
      const L = s.carnival.life;
      s.carnival.gate('coaster', false);
      if (L) L.trainHold = false;
      if (refund && !s.opts.free) s.game.player.money += this.price;
      s.seat(null);
      s.end(refund ? 'left' : 'done');
    },

    escape(s) {
      if (s.data.phase === 'queue') {
        s.leaving = true;
        if (!s.data.atGate) this.off(s, true);
        return true;
      }
      return false;
    },

    stop(s) {
      const L = s.carnival.life;
      s.carnival.gate('coaster', false);
      if (L) L.trainHold = false;
    },
  };
  Carnival.define(riptide);

  // ================================================================== WHEEL
  // The Wonder Wheel (neonstrand.js WHEEL and buildWheelBase): a deck under the lowest gondola, its gate on the
  // ramp side, the axle along (sin yaw, cos yaw). Points here are (u across the wheel, v along the axle) from the hub.
  const WH = { x: 846, z: 38, yaw: Math.PI / 4, cars: 18, deck: KERB + 0.9, BOTTOM: -Math.PI / 2, cruise: 0.06, accel: 0.012 };
  const whAt = (u, v, out) => {
    const ax = Math.sin(WH.yaw), az = Math.cos(WH.yaw), px = Math.cos(WH.yaw), pz = -Math.sin(WH.yaw);
    out.x = WH.x + px * u + ax * v;
    out.z = WH.z + pz * u + az * v;
    return out;
  };
  const WH_WAIT = whAt(0.3, 2.5, {});
  const WH_GATE = whAt(0.3, 1.3, {});
  const WH_FOOT = whAt(0, 8.6, {});
  // Seats in a gondola, in its own frame (x across, z along the axle; y from the hanger): a bench at each end.
  const WH_SEATS = [[0.45, 0.72, -1], [-0.45, 0.72, -1], [0.45, -0.72, 1], [-0.45, -0.72, 1]]; // [x, z, facing ±z]

  /** Gondola i's seat k (hips) into out, and the way it faces (out.w). */
  function gondolaSeat(L, i, k, out, up) {
    L.gondola(i, out);
    const [sx, sz, f] = WH_SEATS[k];
    const c = Math.cos(WH.yaw), s = Math.sin(WH.yaw);
    const ly = up === undefined ? -2.8 : up;
    out.x += sx * c + sz * s;
    out.y += ly;
    out.z += -sx * s + sz * c;
    out.w = WH.yaw + (f > 0 ? 0 : Math.PI);
    return out;
  }

  const wheel = {
    id: 'wheel',
    name: 'the Wonder Wheel',
    kind: 'ride',
    label: 'Ride the Wonder Wheel',
    x: WH_FOOT.x,
    z: WH_FOOT.z,
    radius: 2.4,
    prompts: [{ x: WH_WAIT.x, z: WH_WAIT.z, y: WH.deck, radius: 1.6 }],
    exit: { x: WH_FOOT.x, z: WH_FOOT.z, yaw: WH.yaw },
    price: 4,
    sleep: 260,
    view: 'eye',
    hint: 'Mouse / right stick  look around   ·   V  change view   ·   Esc / B  hurry it round',
    barks: ['The Wonder Wheel! The best view in Vicehaven, four dollars!', 'Round and round and up over the bay! Wonder Wheel this way!', 'See your house from up there! Wonder Wheel!'],
    _p: new THREE.Vector3(),

    setup(c) {
      this.c = c;
    },

    /** Riders in the gondolas (one to three each, a new lot every few minutes) and a queue on the deck. */
    riders(L, jayCar, t) {
      const c = this.c;
      const lot = Math.floor(t / 240);
      const p = this._p;
      for (let i = 0; i < WH.cars; i++) {
        if (i === jayCar) continue;
        const h = hash(i * 17 + lot);
        const n = h < 0.25 ? 0 : h < 0.6 ? 2 : h < 0.85 ? 1 : 3;
        for (let k = 0; k < n; k++) {
          gondolaSeat(L, i, (k * 3 + i) % 4, p);
          c.figures.add('sit', p.x, p.y, p.z, p.w, i * 3 + k);
        }
      }
      if (c.closedFor > 0) return;
      const q = 2 + Math.floor(hash(lot + 0.4) * 3);
      for (let k = 0; k < q; k++) {
        whAt(0.3 + (k % 2) * 0.6, 3.0 + k * 0.8, p);
        c.figures.add('stand', p.x, k < 2 ? WH.deck : WH.deck - (k - 1) * 0.25, p.z, WH.yaw + Math.PI, k + lot);
      }
    },

    idle(dt, c) {
      const L = c.life;
      if (L && L.ok) this.riders(L, -1, c.game.time || 0);
    },

    start(s) {
      const L = s.carnival.life;
      const D = s.data;
      L.wheelDriven = true;
      // The gondola that will come down to the deck soonest.
      const step = TAU / WH.cars;
      let best = 0, bd = 1e9;
      for (let i = 0; i < WH.cars; i++) {
        const d = (((WH.BOTTOM - (L.angle + i * step)) % TAU) + TAU) % TAU;
        if (d < bd) { bd = d; best = i; }
      }
      D.car = best;
      D.togo = bd; //  radians still to turn before it's at the deck
      D.speed = WH.cruise * 0.75; // the wheel was turning
      D.phase = 'queue';
      s.ui.caption('Wait at the gate for your gondola.', 2500);
    },

    /** Turn the wheel on by up to D.togo, easing to a stop on the mark; returns true when there. */
    turn(dt, s, cruise) {
      const L = s.carnival.life;
      const D = s.data;
      const stop = Math.sqrt(2 * WH.accel * Math.max(0, D.togo));
      const want = Math.min(cruise, stop + 0.004);
      D.speed += clamp(want - D.speed, -WH.accel * 2 * dt, WH.accel * dt);
      const da = Math.min(D.togo, Math.max(0, D.speed) * dt);
      L.angle = (L.angle + da) % TAU;
      D.togo -= da;
      if (D.togo <= 1e-4) {
        D.togo = 0;
        D.speed = 0;
        return true;
      }
      return false;
    },

    follow(s) {
      const P = s.game.player;
      s.chase(P.pos.x, P.pos.y, P.pos.z, P.heading, 5, { height: 1.3 });
    },

    update(dt, s) {
      const L = s.carnival.life;
      const D = s.data;
      const P = s.game.player;
      if (!L || !L.ok) return s.end('closed');
      this.riders(L, D.car, s.game.time || 0);
      const p = this._p;
      if (D.phase === 'queue') {
        const there = this.turn(dt, s, WH.cruise);
        if (!D.atGate && s.walk(WH_WAIT.x, WH_WAIT.z)) D.atGate = true;
        if (D.atGate) {
          s.seat(WH_WAIT.x, WH.deck, WH_WAIT.z, WH.yaw + Math.PI, 'stand');
          if (s.leaving) return this.off(s, true);
          if (there) {
            s.carnival.gate('wheel', true);
            D.phase = 'board';
            D.leg = 0;
            D.t = 0;
          }
        }
        return this.follow(s);
      }
      if (D.phase === 'board') {
        D.t += dt;
        gondolaSeat(L, D.car, 0, p);
        if (D.leg === 0 && D.t > 0.7 && s.walk(WH_GATE.x, WH_GATE.z, WH.deck, 0.8)) D.leg = 1;
        else if (D.leg === 1 && s.walk(p.x, p.z, p.y + 2.8 - 3.25, 0.7)) {
          D.phase = 'ride';
          D.togo = Math.PI; // up to the top first
          D.half = 1;
          D.speed = 0;
          D.paused = 0;
          s.carnival.gate('wheel', false);
          s.game.cameraRig.pitch = 0.1;
          s.sound('ding');
          s.ui.caption('Sit back and enjoy the view.', 2600);
        } else if (D.leg === 0) s.seat(P.pos.x, P.pos.y, P.pos.z, WH.yaw + Math.PI, 'stand');
        if (D.phase === 'board') return this.follow(s);
      }
      if (D.phase === 'ride') {
        // One full turn in two halves, with a pause at the top for the view (unless he's asked to come down).
        const hurry = s.leaving;
        if (hurry && D.half === 1) {
          D.half = 2;
          D.togo += Math.PI;
        }
        if (D.half === 1.5) {
          D.paused += dt;
          if (D.paused > 7 || hurry) {
            D.half = 2;
            D.togo = Math.PI;
          }
        } else if (this.turn(dt, s, hurry ? WH.cruise * 2.5 : WH.cruise)) {
          if (D.half === 1) {
            D.half = 1.5;
            D.paused = 0;
          } else {
            s.carnival.gate('wheel', true);
            D.phase = 'out';
            D.leg = 0;
            D.t = 0;
            s.seat(null);
          }
        }
        if (D.phase === 'ride') {
          gondolaSeat(L, D.car, 0, p);
          const yaw = p.w;
          s.seat(p.x, p.y, p.z, yaw, 'sit');
          if (s.view === 'eye') {
            gondolaSeat(L, D.car, 0, p, -2.06);
            s.eye(p.x - Math.sin(yaw) * -0.08, p.y, p.z - Math.cos(yaw) * -0.08, yaw, { yawLimit: 3.05, pitchMin: -1.2, pitchMax: 1.0, fov: c(s)._baseFov + 6 });
          } else {
            L.gondola(D.car, p);
            s.chase(p.x, p.y - 3, p.z, yaw, 11, { height: 0.5 });
          }
          if (c(s).audio) c(s).audio.ride(0.05, clamp((p.y - 10) / 40, 0, 0.35));
          if (s.leaving && !D.told) {
            D.told = true;
            s.ui.caption(s.emergency ? 'The wheel is bringing everyone down.' : 'Bringing you down.', 2600);
          }
        }
        return;
      }
      if (D.phase === 'out') {
        D.t += dt;
        if (D.leg === 0 && D.t > 0.6 && s.walk(WH_GATE.x, WH_GATE.z, WH.deck, 0.7)) D.leg = 1;
        else if (D.leg === 1 && s.walk(WH_WAIT.x, WH_WAIT.z, WH.deck, 0.8)) return this.off(s, false);
        return this.follow(s);
      }
    },

    off(s, refund) {
      const L = s.carnival.life;
      s.carnival.gate('wheel', false);
      if (L) L.wheelDriven = false;
      if (refund && !s.opts.free) s.game.player.money += this.price;
      s.seat(null);
      s.end(refund ? 'left' : 'done');
    },

    escape(s) {
      if (s.data.phase === 'queue') {
        s.leaving = true;
        if (!s.data.atGate) this.off(s, true);
        return true;
      }
      return false;
    },

    stop(s) {
      const L = s.carnival.life;
      s.carnival.gate('wheel', false);
      if (L) L.wheelDriven = false;
    },
  };
  Carnival.define(wheel);

  // ================================================================ SKYHOOK
  // The drop tower (neonstrand.js TOWER, DROP, towerAt): twelve seats round the column facing out, a railed
  // ring on the base with its gate to the east. WharfLife runs the cycle (climb, pause, fall, brake, load).
  const SK = { x: 832, z: -18, base: KERB + 0.4, seats: 12, hipR: 2.42, hipUp: 0.56 };
  const skAt = (r, a, out) => {
    out.x = SK.x + Math.cos(a) * r;
    out.z = SK.z + Math.sin(a) * r;
    return out;
  };
  const SK_WAIT = skAt(6.05, 0, {});
  const SK_IN = skAt(3.45, 0, {});
  const SK_FOOT = skAt(8.2, 0, {});

  const skyhook = {
    id: 'skyhook',
    name: 'the Skyhook',
    kind: 'ride',
    label: 'Ride the Skyhook',
    x: SK_FOOT.x,
    z: SK_FOOT.z,
    radius: 2.2,
    prompts: [{ x: SK_WAIT.x, z: SK_WAIT.z, y: SK.base, radius: 1.4 }],
    exit: { x: SK_FOOT.x, z: SK_FOOT.z, yaw: Math.PI / 2 },
    price: 5,
    sleep: 220,
    view: 'eye',
    hint: 'Mouse / right stick  look around   ·   V  change view   ·   Esc / B  off at the bottom',
    barks: ['The Skyhook! Forty-seven metres straight up, and then... well, you\'ll see!', 'Five dollars to touch the sky! Skyhook!', 'Strap in, look down, scream! The Skyhook!'],
    _p: new THREE.Vector3(),
    cycle: 0,
    _lastT: 0,

    setup(c) {
      this.c = c;
    },

    /** Count the cycles (a fresh lot of riders each time round). */
    track(L) {
      if (L.dropT < this._lastT - 1) this.cycle++;
      this._lastT = L.dropT;
    },

    /** The riders on the ring (arms up on the way down) and the queue at the gate. */
    riders(L, jaySeat) {
      const c = this.c;
      const D = c.game.world.wonderWharf.drop;
      const loading = L.dropT >= D.end - D.load;
      const lot = this.cycle + (loading && L.dropT > D.end - D.load * 0.5 ? 1 : 0);
      const falling = L.dropT > D.climb + D.top && !loading;
      const p = this._p;
      if (!(c.closedFor > 0 && loading)) {
        for (let k = 0; k < SK.seats; k++) {
          if (k === jaySeat || hash(k * 5 + lot * 13) < 0.35) continue;
          const a = (k / SK.seats) * TAU;
          skAt(SK.hipR, a, p);
          c.figures.add(falling && hash(k + lot) > 0.2 ? 'up' : 'sit', p.x, L.towerY + SK.hipUp, p.z, Math.atan2(Math.cos(a), Math.sin(a)), k + lot * 3);
        }
      }
      if (c.closedFor > 0) return;
      const q = loading ? 1 : 2 + Math.floor(hash(lot + 0.2) * 3);
      for (let i = 0; i < q; i++) c.figures.add('stand', SK_FOOT.x + 0.4 + i * 0.8, KERB, SK_FOOT.z + (i % 2) * 0.6 - 0.3, -Math.PI / 2, i + lot);
    },

    idle(dt, c) {
      const L = c.life;
      if (!L || !L.ok) return;
      this.track(L);
      L.towerHold = c.closedFor > 0; // shut: it comes down and stays down
      this.riders(L, -1);
    },

    start(s) {
      const L = s.carnival.life;
      const D = s.data;
      L.towerHold = true;
      D.phase = 'queue';
      s.ui.caption('Wait at the gate for the seats to come down.', 2600);
    },

    follow(s) {
      const P = s.game.player;
      s.chase(P.pos.x, P.pos.y, P.pos.z, P.heading, 5, { height: 1.3 });
    },

    update(dt, s) {
      const L = s.carnival.life;
      const D = s.data;
      const P = s.game.player;
      if (!L || !L.ok) return s.end('closed');
      const DR = s.game.world.wonderWharf.drop;
      this.track(L);
      this.riders(L, D.phase === 'queue' ? -1 : 0);
      const loading = L.dropT >= DR.end - DR.load;
      if (D.phase === 'queue') {
        if (!D.atGate && s.walk(SK_WAIT.x, SK_WAIT.z)) D.atGate = true;
        if (D.atGate) {
          s.seat(SK_WAIT.x, SK.base, SK_WAIT.z, -Math.PI / 2, 'stand');
          if (s.leaving) return this.off(s, true);
          if (loading) {
            s.carnival.gate('tower', true);
            D.phase = 'board';
            D.leg = 0;
            D.t = 0;
          }
        }
        return this.follow(s);
      }
      if (D.phase === 'board') {
        D.t += dt;
        if (D.leg === 0 && D.t > 0.7 && s.walk(SK_IN.x, SK_IN.z, SK.base, 1.6)) {
          D.phase = 'ride';
          D.stage = 'wait';
          D.top = false;
          s.carnival.gate('tower', false);
          L.towerHold = false;
          L.dropT = Math.max(L.dropT, DR.end - 2.5); // the bar comes down; off in a moment
          s.game.cameraRig.pitch = 0;
          s.sound('clank', { gain: 1.2 });
          s.ui.caption('Shoulder bar down. Hold on!', 2400);
        } else if (D.leg === 0 && D.t <= 0.7) s.seat(P.pos.x, P.pos.y, P.pos.z, Math.PI, 'stand');
        if (D.phase === 'board') return this.follow(s);
      }
      if (D.phase === 'ride') {
        const t = L.dropT;
        // Where in the cycle: wait (loading) → climb → top → fall → brake → loading again (off).
        const stage = loading ? (D.stage === 'wait' ? 'wait' : 'done') : t < DR.climb ? 'climb' : t < DR.climb + DR.top ? 'top' : t < DR.climb + DR.top + DR.fall ? 'fall' : 'brake';
        if (stage !== D.stage) {
          if (stage === 'climb') s.ui.caption('Up we go...', 2000);
          if (stage === 'top') {
            s.ui.caption('Look at that view...', DR.top * 1000);
            s.sound('tick', { gain: 0.5 });
          }
          if (stage === 'fall') {
            s.sound('scream');
            s.sound('whoosh', { gain: 1.4 });
            s.shake(0.7);
          }
          if (stage === 'brake') {
            s.sound('thud', { gain: 1.2 });
            s.shake(1);
          }
          D.stage = stage;
        }
        // Brought down gently if the fair is alarmed on the way up.
        if (s.emergency && (stage === 'climb' || stage === 'top')) {
          L.towerDriven = true;
          L.towerY = Math.max(DR.lo, L.towerY - dt * 2);
          if (L.towerY <= DR.lo) {
            L.towerDriven = false;
            L.dropT = DR.end - DR.load + 0.01;
            D.stage = 'done';
          }
        }
        if (D.stage === 'done') {
          L.towerHold = true;
          s.carnival.gate('tower', true);
          D.phase = 'out';
          D.leg = 0;
          D.t = 0;
          s.seat(null);
          s.sound('cheer', { gain: 0.6 });
          c(s).audio && c(s).audio.rideStop();
          return this.follow(s);
        }
        const yaw = Math.PI / 2; // seat 0 faces east, over the midway
        const y = L.towerY + SK.hipUp;
        s.seat(SK.x + SK.hipR, y, SK.z, yaw, stage === 'fall' || stage === 'brake' ? 'up' : 'hold');
        const fallV = stage === 'fall' ? (t - DR.climb - DR.top) * 9.8 : 0;
        const k = clamp(fallV / 25, 0, 1);
        // At the top the view tips down to the ground far below (and stays there for the fall).
        D.pb = (D.pb || 0) + ((stage === 'top' || stage === 'fall' ? -0.35 : -0.05) - (D.pb || 0)) * Math.min(1, dt * 1.5);
        if (s.view === 'eye') s.eye(SK.x + SK.hipR + 0.12, y + 0.72, SK.z, yaw, { pitch: D.pb, yawLimit: 1.9, pitchMin: -1.0, pitchMax: 0.9, fov: c(s)._baseFov + 4 + k * 16, shake: stage === 'brake' ? 0.5 : stage === 'climb' ? 0.05 : k * 0.6 });
        else s.chase(SK.x + SK.hipR, y, SK.z, yaw - 0.6, 10, { height: 0.6, fov: c(s)._baseFov + k * 8 });
        if (c(s).audio) c(s).audio.ride(stage === 'climb' ? 0.12 : stage === 'brake' ? 0.5 : 0.04, k, { clank: stage === 'climb' ? 2.2 : 0, dt });
        if (s.leaving && !D.told) {
          D.told = true;
          s.ui.caption(s.emergency ? 'Bringing the seats down.' : 'You\'re off at the bottom.', 2600);
        }
        return;
      }
      if (D.phase === 'out') {
        D.t += dt;
        if (D.leg === 0 && D.t > 0.6 && s.walk(SK_WAIT.x, SK_WAIT.z, SK.base, 1.4)) return this.off(s, false);
        return this.follow(s);
      }
    },

    off(s, refund) {
      const L = s.carnival.life;
      s.carnival.gate('tower', false);
      if (L) {
        L.towerHold = false;
        L.towerDriven = false;
      }
      if (refund && !s.opts.free) s.game.player.money += this.price;
      s.seat(null);
      s.end(refund ? 'left' : 'done');
    },

    escape(s) {
      if (s.data.phase === 'queue') {
        s.leaving = true;
        if (!s.data.atGate) this.off(s, true);
        return true;
      }
      return false;
    },

    stop(s) {
      const L = s.carnival.life;
      s.carnival.gate('tower', false);
      if (L) {
        L.towerHold = false;
        L.towerDriven = false;
      }
    },
  };
  Carnival.define(skyhook);

  // ========================================================= HELTER-SKELTER
  // neonstrand.js HELTER, helterAt: Jay climbs the stair inside on his own feet (the door is open to all);
  // at the top, on the platform outside the way out, he pays, takes a mat and slides down the spiral.
  const HS = { x: 957, z: -33, R: 3, r: 4.4, turns: 3.25, top: KERB + 12.6, bottom: KERB + 0.6, floor: KERB + 12.8, door: Math.PI + Math.PI / 16, exit: Math.PI / 16, chute: 0.6, mat: 0.1 };
  HS.len = Math.hypot(TAU * HS.r * HS.turns, HS.top - HS.bottom);
  const HS_PLAT = { x: HS.x + Math.cos(HS.exit - 0.22) * 3.85, z: HS.z + Math.sin(HS.exit - 0.22) * 3.85 };
  const HS_DOOR = { x: HS.x + Math.cos(HS.door) * 4.6, z: HS.z + Math.sin(HS.door) * 4.6 };
  const _hp = [0, 0, 0, 0];
  /** The slide at u (0 top .. 1 bottom): the mat's middle on the chute into out, the way down it in out.w. */
  function helterSpot(u, out) {
    const a = HS.exit + u * HS.turns * TAU;
    out.x = HS.x + Math.cos(a) * HS.r;
    out.y = HS.top - u * (HS.top - HS.bottom) + HS.chute;
    out.z = HS.z + Math.sin(a) * HS.r;
    out.w = Math.atan2(-Math.sin(a), Math.cos(a));
    return out;
  }

  const helter = {
    id: 'helter',
    name: 'the Helter-Skelter',
    kind: 'ride',
    label: 'Take a mat and slide down',
    x: HS_PLAT.x,
    z: HS_PLAT.z,
    y: HS.floor,
    radius: 1.5,
    exit: { x: HS_DOOR.x, z: HS_DOOR.z, yaw: HS.door },
    price: 3,
    sleep: 200,
    view: 'eye',
    hint: 'Mouse / right stick  look around   ·   V  change view',
    _r: new THREE.Vector3(),
    barks: ['Helter-skelter! Up the stairs, grab a mat, round and round and down!', 'Three dollars at the top, the stairs are free! Helter-skelter!', 'Who\'s the fastest down the helter-skelter?'],
    _p: new THREE.Vector3(),

    setup(c) {
      this.c = c;
      // The mats: Jay's, and one under each of the sliders the fair sends down.
      const g = new THREE.BoxGeometry(0.62, 0.06, 1.15);
      this.mats = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x8a4fd0, roughness: 0.8 }), 4);
      this.mats.count = 0;
      this.mats.frustumCulled = false;
      c.game.scene.add(this.mats);
      this._matN = 0;
    },

    mat(x, y, z, yaw) {
      if (this._matN >= 4) return;
      _e.set(0, yaw, 0);
      _q.setFromEuler(_e);
      _v2.set(x, y - 0.06, z);
      _m.compose(_v2, _q, _s);
      this.mats.setMatrixAt(this._matN++, _m);
    },

    /** Sliders going down one after another (a gap of a few seconds), a couple waiting at the door. */
    riders(t, jay) {
      const c = this.c;
      const p = this._r; // (not _p: that's Jay's spot)
      this._matN = 0;
      if (c.closedFor <= 0) {
        for (let j = 0; j < 3; j++) {
          const cyc = Math.floor((t + j * 6) / 18);
          const u = (((t + j * 6) % 18) - 4) / 12;
          if (u < 0 || u > 1 || hash(cyc * 3 + j) < 0.3) continue;
          helterSpot(u, p);
          c.figures.add(hash(cyc + j) > 0.4 ? 'up' : 'sit', p.x, p.y + HS.mat, p.z, p.w, cyc + j);
          this.mat(p.x, p.y, p.z, p.w);
        }
        for (let i = 0; i < 2; i++) c.figures.add('stand', HS_DOOR.x - 0.9 - i * 0.8, KERB, HS_DOOR.z - 1.6 - i * 0.5, Math.PI / 2 - 0.4, i + 5);
      }
      if (jay) this.mat(jay.x, jay.y, jay.z, jay.w);
      this.mats.count = this._matN;
      this.mats.instanceMatrix.needsUpdate = true;
    },

    idle(dt, c) {
      this.riders(c.game.time || 0, null);
    },

    sleepNow() {
      this.mats.count = 0;
    },

    start(s) {
      const D = s.data;
      D.phase = 'onto';
      D.t = 0;
      D.u = 0;
      D.v = 0;
      s.carnival.gate('helter', true);
      s.ui.caption('Sit on the mat, arms in... off you go!', 2600);
    },

    update(dt, s) {
      const D = s.data;
      const P = s.game.player;
      const p = this._p;
      D.t += dt;
      if (D.phase === 'onto') {
        // Onto the top of the chute with the mat.
        helterSpot(0, p);
        const there = D.t > 0.7 && s.walk(p.x, p.z, p.y, 0.9);
        if (D.t <= 0.7) s.seat(P.pos.x, P.pos.y, P.pos.z, P.heading, 'stand');
        this.riders(s.game.time || 0, D.t > 0.7 ? p : null);
        if (there) {
          D.phase = 'slide';
          D.t = 0;
          D.v = 1.2;
          s.game.cameraRig.pitch = -0.15;
          s.sound('whoosh');
        } else return s.chase(P.pos.x, P.pos.y, P.pos.z, P.heading, 4.5, { height: 1.2 });
      }
      if (D.phase === 'slide') {
        if (D.t > 0.6 && !D.shut) {
          D.shut = true;
          s.carnival.gate('helter', false);
        }
        // Gravity down a gentle slope, the mat's drag: about seven metres a second at the bottom.
        D.v = Math.min(7.5, D.v + dt * 1.6);
        D.u = Math.min(1, D.u + (D.v * dt) / HS.len);
        helterSpot(D.u, p);
        const hipY = p.y + HS.mat + 0.05;
        s.seat(p.x, hipY, p.z, p.w, 'slide');
        this.riders(s.game.time || 0, p);
        const k = D.v / 7.5;
        if (s.view === 'eye') s.eye(p.x + Math.sin(p.w) * 0.15, hipY + 0.62, p.z + Math.cos(p.w) * 0.15, p.w, { yawLimit: 2.2, recentre: true, pitch: -0.12, fov: c(s)._baseFov + 6 + k * 8, shake: 0.12 * k });
        else s.chase(p.x, hipY, p.z, p.w + 0.9, 6, { height: 0.8, recentre: true });
        if (c(s).audio) c(s).audio.ride(0.12 + 0.18 * k, k * 0.6);
        if (D.u >= 1) {
          D.phase = 'off';
          D.t = 0;
          D.fx = p.x;
          D.fz = p.z;
          D.fy = hipY;
          D.w = p.w;
        }
        return;
      }
      if (D.phase === 'off') {
        // Shoot off the end onto the ground and stand up.
        const k = clamp(D.t / 0.55, 0, 1);
        const x = D.fx + Math.sin(D.w) * 2.6 * k, z = D.fz + Math.cos(D.w) * 2.6 * k;
        const y = D.fy + (KERB + 0.35 - D.fy) * k * k;
        p.set(x, y, z);
        p.w = D.w;
        this.riders(s.game.time || 0, k < 1 ? p : null);
        if (k < 1) {
          s.seat(x, y, z, D.w, 'slide');
          return s.chase(x, y, z, D.w, 5, { height: 1 });
        }
        s.seat(null);
        c(s).audio && c(s).audio.rideStop();
        s.sound('cheer', { gain: 0.5 });
        s.ui.caption('Wheee!', 1500);
        s.end('done');
      }
    },

    escape() {
      return true; // (it's over in a few seconds: nowhere to get off)
    },

    stop(s) {
      s.carnival.gate('helter', false);
    },
  };
  Carnival.define(helter);

  // =============================================================== CAROUSEL
  // The Galloping Horses (neonstrand.js CAROUSEL; WharfLife turns it): twelve horses, the outer six at 6.4 m,
  // the inner six at 4.6, on a platform 8.2 m across inside a fence with its gate to the west.
  const CR = { x: 935, z: -20, deck: KERB + 0.5, fence: 9.8, gateA: Math.PI, cruise: 0.42, accel: 0.1, turns: 2 };
  const crAt = (r, a, out) => {
    out.x = CR.x + Math.cos(a) * r;
    out.z = CR.z + Math.sin(a) * r;
    return out;
  };
  const CR_WAIT = crAt(10.7, CR.gateA, {});
  const CR_GATE = crAt(9.1, CR.gateA, {});
  const CR_FOOT = crAt(11.8, CR.gateA, {});

  const carousel = {
    id: 'carousel',
    name: 'the Galloping Horses',
    kind: 'ride',
    label: 'Ride the Galloping Horses',
    x: CR_FOOT.x,
    z: CR_FOOT.z,
    radius: 2.2,
    prompts: [{ x: CR_WAIT.x, z: CR_WAIT.z, radius: 1.4 }],
    exit: { x: CR_FOOT.x, z: CR_FOOT.z, yaw: -Math.PI / 2 },
    price: 3,
    sleep: 200,
    view: 'eye',
    hint: 'Mouse / right stick  look around   ·   V  change view   ·   Esc / B  off when your horse is back at the gate',
    barks: ['Roll up for the Galloping Horses! Three dollars, two turns, all the music you can handle!', 'A horse for everybody! Galloping Horses this way!', 'Grandmas, grandads, little ones, big ones: the Galloping Horses!'],
    _p: new THREE.Vector3(),
    _r: new THREE.Vector3(),
    lot: 0,
    _lastT: 0,

    setup(c) {
      this.c = c;
    },

    /** Riders astride most horses (a new lot each stop), a parent or two standing on the platform, a queue. */
    riders(L, jayHorse) {
      const c = this.c;
      if (L.carT < this._lastT - 1) this.lot++;
      this._lastT = L.carT;
      const p = this._r;
      const stopped = L.carSpeed < 0.02;
      for (let k = 0; k < 12; k++) {
        if (k === jayHorse || hash(k * 7 + this.lot * 3) < 0.3) continue;
        if (c.closedFor > 0 && stopped) continue;
        L.horse(k, p);
        c.figures.add('sit', p.x, p.y + 0.08, p.z, p.w, k + this.lot);
      }
      for (let j = 0; j < 2; j++) {
        if (c.closedFor > 0 && stopped) break;
        const a = L.carAngle + j * Math.PI + 0.35;
        crAt(5.5, a, p);
        c.figures.add('stand', p.x, CR.deck, p.z, -a, j + 9 + this.lot);
      }
      if (c.closedFor > 0) return;
      const q = stopped ? 1 : 2 + Math.floor(hash(this.lot + 0.6) * 3);
      for (let i = 0; i < q; i++) c.figures.add('stand', CR_WAIT.x - 0.8 - i * 0.75, KERB, CR_WAIT.z + (i % 2 ? 0.5 : -0.4), Math.PI / 2, i + this.lot * 2);
    },

    idle(dt, c) {
      const L = c.life;
      if (L && L.ok) this.riders(L, -1);
    },

    start(s) {
      const L = s.carnival.life;
      const D = s.data;
      L.carouselDriven = true;
      D.phase = 'queue';
      s.ui.caption('Wait at the gate for the horses to stop.', 2400);
    },

    /** Spin on by up to D.togo radians at up to `cruise`, easing to a stop on the mark; true when there. */
    turn(dt, s, cruise) {
      const L = s.carnival.life;
      const D = s.data;
      const stop = Math.sqrt(2 * CR.accel * Math.max(0, D.togo));
      const want = Math.min(cruise, stop + 0.01);
      L.carSpeed += clamp(want - L.carSpeed, -CR.accel * 1.5 * dt, CR.accel * dt);
      const da = Math.min(D.togo, Math.max(0, L.carSpeed) * dt);
      L.carAngle = (L.carAngle + da) % TAU;
      D.togo -= da;
      if (D.togo <= 1e-4) {
        D.togo = 0;
        L.carSpeed = 0;
        return true;
      }
      return false;
    },

    follow(s) {
      const P = s.game.player;
      s.chase(P.pos.x, P.pos.y, P.pos.z, P.heading, 5, { height: 1.3 });
    },

    update(dt, s) {
      const L = s.carnival.life;
      const D = s.data;
      const P = s.game.player;
      if (!L || !L.ok) return s.end('closed');
      const p = this._p;
      this.riders(L, D.phase === 'queue' ? -1 : D.horse);
      if (D.phase === 'queue') {
        // Bring it to a stop (it may be turning with a lot already on).
        L.carSpeed = Math.max(0, L.carSpeed - CR.accel * 1.5 * dt);
        L.carAngle = (L.carAngle + L.carSpeed * dt) % TAU;
        if (!D.atGate && s.walk(CR_WAIT.x, CR_WAIT.z)) D.atGate = true;
        if (D.atGate) {
          s.seat(CR_WAIT.x, KERB, CR_WAIT.z, Math.PI / 2, 'stand');
          if (s.leaving) return this.off(s, true);
          if (L.carSpeed <= 0) {
            // The outer horse nearest the gate.
            let bd = 1e9;
            for (let k = 1; k < 12; k += 2) {
              const a = L.carAngle + (k / 12) * TAU;
              const d = Math.abs(wrap(a - CR.gateA));
              if (d < bd) { bd = d; D.horse = k; }
            }
            s.carnival.gate('carousel', true);
            D.phase = 'board';
            D.leg = 0;
            D.t = 0;
          }
        }
        return this.follow(s);
      }
      if (D.phase === 'board') {
        D.t += dt;
        L.horse(D.horse, p);
        const ha = L.carAngle + (D.horse / 12) * TAU;
        if (D.leg === 0 && D.t > 0.7 && s.walk(CR_GATE.x, CR_GATE.z, KERB, 0.8)) D.leg = 1;
        else if (D.leg === 1 && s.walk(CR.x + Math.cos(ha) * 7.3, CR.z + Math.sin(ha) * 7.3, CR.deck, 1.0)) D.leg = 2;
        else if (D.leg === 2 && s.walk(CR.x + Math.cos(ha) * 6.85, CR.z + Math.sin(ha) * 6.85, CR.deck, 0.5)) {
          D.phase = 'ride';
          D.togo = CR.turns * TAU;
          D.mark = ha; // where he got on: back here to get off
          s.carnival.gate('carousel', false);
          s.game.cameraRig.pitch = 0;
          s.sound('ding');
          s.ui.caption('Hold on to the pole!', 2200);
        } else if (D.leg === 0 && D.t <= 0.7) s.seat(P.pos.x, P.pos.y, P.pos.z, 0, 'stand');
        if (D.phase === 'board') return this.follow(s);
      }
      if (D.phase === 'ride') {
        if (s.leaving && !D.told) {
          // Off when his horse next comes round to the gate (and there's room to slow down).
          D.told = true;
          const need = (L.carSpeed * L.carSpeed) / (2 * CR.accel);
          let left = D.togo % TAU;
          while (left < need) left += TAU;
          D.togo = Math.min(D.togo, left);
          s.ui.caption(s.emergency ? 'The horses are stopping.' : 'Off when your horse is back at the gate.', 2600);
        }
        if (this.turn(dt, s, CR.cruise)) {
          s.carnival.gate('carousel', true);
          D.phase = 'out';
          D.leg = 0;
          D.t = 0;
          s.seat(null);
        } else {
          L.horse(D.horse, p);
          s.seat(p.x, p.y + 0.08, p.z, p.w, 'astride');
          if (s.view === 'eye') s.eye(p.x + Math.sin(p.w) * 0.12, p.y + 0.08 + 0.78, p.z + Math.cos(p.w) * 0.12, p.w, { yawLimit: 2.6, pitchMin: -1.0, pitchMax: 0.8, fov: c(s)._baseFov + 4 });
          else s.chase(p.x, p.y, p.z, p.w + 1.2, 7, { height: 0.9 });
          if (c(s).audio) c(s).audio.ride(0, clamp(L.carSpeed / CR.cruise, 0, 1) * 0.12);
        }
        if (D.phase === 'ride') return;
      }
      if (D.phase === 'out') {
        D.t += dt;
        const ha = L.carAngle + (D.horse / 12) * TAU;
        if (D.leg === 0 && D.t > 0.4 && s.walk(CR.x + Math.cos(ha) * 7.3, CR.z + Math.sin(ha) * 7.3, CR.deck, 0.5)) D.leg = 1;
        else if (D.leg === 1 && s.walk(CR_GATE.x, CR_GATE.z, KERB, 1.0)) D.leg = 2;
        else if (D.leg === 2 && s.walk(CR_WAIT.x, CR_WAIT.z, KERB, 0.8)) return this.off(s, false);
        return this.follow(s);
      }
    },

    off(s, refund) {
      const L = s.carnival.life;
      s.carnival.gate('carousel', false);
      if (L) L.carouselDriven = false;
      if (refund && !s.opts.free) s.game.player.money += this.price;
      s.seat(null);
      s.end(refund ? 'left' : 'done');
    },

    escape(s) {
      if (s.data.phase === 'queue') {
        s.leaving = true;
        if (!s.data.atGate) this.off(s, true);
        return true;
      }
      return false;
    },

    stop(s) {
      const L = s.carnival.life;
      s.carnival.gate('carousel', false);
      if (L) L.carouselDriven = false;
    },
  };
  Carnival.define(carousel);
})();
