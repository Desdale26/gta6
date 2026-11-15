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
})();
