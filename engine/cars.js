'use strict';
/* ---------------- Cars ----------------
   The one thing on the map that is not on the map. Everything else in this
   engine lives on a tile: the furniture is keyed by tile, the walls are a grid,
   collision asks World.isSolid(tx, ty) and a colleague walks from one tile
   centre to the next. A car is at a PIXEL, at an ANGLE, at a SPEED, and
   sometimes with the player inside it — so it gets its own list, its own
   update and its own three lines in the draw order, and nothing else has to
   learn what it is.

   Three things live here.

   THE CARS THEMSELVES. Built from a level's `cars:` list (data/levels.js) into
   World.cars, which travels with the level the way its objects and its walls
   do: leave the pool car in the middle of Fenn Street, walk into the building,
   come back out, and it is still in the middle of Fenn Street.

   DRIVING. One car at a time, and only one that says `drive: true`. The player
   is moved to wherever the car is on every frame rather than being carried by
   it — which is why the camera, the minimap, the street names and the save all
   keep working without knowing anybody is driving: they all read P.x and P.y,
   and P.x and P.y are the car.

   TRAFFIC. A car with a `route:` drives itself round it for ever, keeping
   left, slowing for corners and stopping for whatever is in front of it —
   which is usually the player, parked across both lanes, having got out. It
   also reads the tarmac under its own route, so it steers away from a kerb
   rather than up one, reverses out of the things a route cannot know about,
   gives way to the right where two of them want the same junction, and goes
   round anything parked that is never going to move. See the note above
   steerTraffic().

   What is deliberately NOT here: anybody gets hurt. A car in this game stops
   for a person, always, whoever is driving it. The comedy out there is a
   twenty-two-space car park with forty staff in it, not a pavement. */
const Cars = {
  /* The car the player is sitting in, or null. Kept here rather than on P
     because P is what Save.write serialises: a car hung off it would go into
     localStorage as a detached copy of itself and come back as an object that
     looks like a car, is not in World.cars, and cannot be got out of. */
  driving: null,
  /* Which streets have been driven through since getting in. Emptied on the
     way in, so the achievements below are a drive rather than a lifetime.
     Zone ids, because a zone out here IS a street — see the note above ZONES
     in data/world.js. */
  seen: null,
  LAP: ['street', 'aldergate', 'fenn', 'cargate'],
  GRID: ['street', 'high', 'aldergate', 'cargate', 'marlow', 'fenn', 'corven'],
  /* Held down to sound the horn, and how long it has been held — one press is
     a note, leaning on it is leaning on it. */
  horn: false, hornT: 0,

  /* ---- building ----
     A level's own `cars:` entries turned into cars. Tile positions become
     pixels here and nowhere else, so the catalogue can go on being written in
     tiles like `entries:` and `rooms:` are. */
  build(list) {
    return (list || []).map((c, i) => {
      /* A model says what a car IS; `body`/`roof` let one car be that model in
         a different colour, which is the difference between seven models and
         seven cars. Copied rather than written through, or one silver estate
         would repaint every estate in the game. */
      const base = CARS[c.model] || CARS.saloon;
      const def = (c.body || c.roof)
        ? Object.assign({}, base, c.body ? { body: c.body } : null, c.roof ? { roof: c.roof } : null)
        : base;
      const car = {
        id: 'c' + i, def, model: c.model, name: c.name || 'A car',
        use: c.use || null, canDrive: !!c.drive, traffic: !!c.traffic,
        /* Body-frame velocity: how fast it is going along its own nose, and
           how fast it is sliding sideways. Both start at nothing, including
           for traffic — a car pulls away rather than appearing at speed. */
        fwd: 0, lat: 0, dents: 0, wob: Math.random() * 6.28,
        x: (c.x || 0) * TILE, y: (c.y || 0) * TILE,
        a: this.heading(c.face),
        /* Brake lights, so they can be lit by braking, by traffic slowing for
           a corner and by a collision, without three places drawing them. */
        braking: false, stopped: 0, honkT: 0,
        /* What a driver is in the middle of. All nothing here, so a parked car
           carries the same fields as a moving one and steerTraffic() never has
           to test whether a car has been driven yet: how long it has been
           stuck with nothing in front of it, how long it has been off the
           road, how long it has left of a reverse, how many shunts it has had
           at the same thing, and how long it has left of going round something
           and on which side. See the note above steerTraffic(). */
        stuck: 0, lost: 0, back: 0, shunt: 0, pull: 0, pullSide: 1, rerouted: false,
        /* What is holding it up, published for the car behind: the give-way
           rule is the only thing out there that needs to know what somebody
           ELSE can see. */
        blockedBy: null, wheel: 0,
        /* SERVICE. A vehicle with `stops:` pulls up at each of them, waits,
           and goes — see the note over serveStop(). Everything else on this
           network has an empty list and never looks at any of it. */
        stops: (c.stops || []).map(q => ({ x: q.at[0] * TILE, y: q.at[1] * TILE, secs: q.secs || 6 })),
        stopFor: 0, stopIdx: -1, stopCool: 0, serving: 0
      };
      if (c.route && c.route.length > 1) {
        car.route = c.route.map(p => ({ x: p[0] * TILE, y: p[1] * TILE }));
        car.leg = (c.leg || 0) % car.route.length;
        car.cruise = c.cruise || 150;
        /* Put it `along` tiles down its opening leg and pointed along it, so
           four cars written into one route do not all start on top of each
           other at the same corner. */
        const from = car.route[car.leg], to = car.route[(car.leg + 1) % car.route.length];
        const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const t = Math.min(0.96, ((c.along || 0) * TILE) / d);
        car.x = from.x + (to.x - from.x) * t;
        car.y = from.y + (to.y - from.y) * t;
        car.a = Math.atan2(to.y - from.y, to.x - from.x);
      }
      return car;
    });
  },
  /* Compass to radians, because a car in a bay is written as facing north and
     not as facing -1.5707963. 0 is east and y grows downwards, which is what
     every other angle in this engine means. */
  heading(face) {
    return face === 'n' ? -Math.PI / 2 : face === 's' ? Math.PI / 2
      : face === 'w' ? Math.PI : 0;
  },
  list() { return World.cars || []; },

  /* ---- the frame ----
     Called once from Game.tick, before the camera follows anything: the car is
     where the player is, so it has to have moved before the camera asks. */
  update(dt) {
    const cars = this.list();
    if (!cars.length) { this.driving = null; return; }
    /* A car the level swapped out from under us. Cannot currently happen — you
       cannot reach a door from a driving seat — but a dangling reference here
       would be a camera following a car on a level nobody is on. */
    if (this.driving && cars.indexOf(this.driving) < 0) this.driving = null;
    if (G.state === 'play' && this.driving) this.drive(this.driving, dt);
    for (const car of cars) {
      if (car === this.driving) continue;
      if (car.traffic && G.state === 'play') this.steerTraffic(car, dt);
      this.move(car, dt);
    }
    this.sync();
    this.showControls();
    if (this.driving) {
      /* The player IS the car while they are in it. Everything that follows
         the player — the camera, the minimap dot, the street name, the save —
         follows this and needed no changing. */
      P.x = this.driving.x; P.y = this.driving.y;
      P.moving = Math.abs(this.driving.fwd) > 6;
      if (typeof zoneCheck === 'function') zoneCheck();
      const z = World.zoneAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
      if (z && this.seen) {
        this.seen.add(z);
        /* Two of these, and they are not the same shape. A LAP is the original
           block: four streets, back where you started. The GRID is every
           street on the map, which cannot be done as one circuit and has to be
           driven as a route somebody worked out. Both are emptied by getting
           in rather than kept for ever, so each is a drive and not a diary. */
        if (this.LAP.every(k => this.seen.has(k))) Ach.get('a_lap');
        if (this.GRID.every(k => this.seen.has(k))) Ach.get('a_grid');
      }
      if (Sfx.on) Sfx.engine(true, Math.abs(this.driving.fwd) / this.driving.def.top);
      this.hornT = this.horn ? this.hornT + dt : 0;
      if (this.horn && this.hornT < dt * 1.5) { Sfx.horn(); Peds.honk(P.x, P.y); }
    } else if (Sfx.engine) Sfx.engine(false);
  },

  /* Which tiles the cars are standing on this instant, for World.isSolid — see
     the note there. Rebuilt whole every frame rather than diffed: it is a
     dozen cars covering four tiles each, and a set that is rebuilt cannot go
     stale in a way nobody notices. */
  sync() {
    const set = World.carTiles || (World.carTiles = new Set());
    set.clear();
    /* The ground the player is standing on, which no car may claim.
       Without this, getting out was a trap. The collision box is 19px across
       and a tile is 32, so standing beside a car your box reaches into the
       tile the car is on — and a tile a car is on is solid, so every direction
       is blocked, and a walking step is 1.8px, which is smaller than the
       overlap, so no number of steps ever gets you out of it. You could not
       move again for the rest of the shift.
       Stated as a rule rather than patched at the door: a car never takes the
       ground out from under somebody who is already standing on it. You got
       out of it, or it drove into you, and either way you are allowed to walk
       away from it. It cannot help you walk INTO one — those tiles are solid
       until you are already on them, which you cannot be. */
    const pr = TILE * .3;
    const ptx0 = Math.floor((P.x - pr) / TILE), ptx1 = Math.floor((P.x + pr) / TILE);
    const pty0 = Math.floor((P.y - pr) / TILE), pty1 = Math.floor((P.y + pr) / TILE);
    const underfoot = (tx, ty) => tx >= ptx0 && tx <= ptx1 && ty >= pty0 && ty <= pty1;
    for (const car of this.list()) {
      /* Not the car you are in. Walking out of your own car would otherwise be
         walking out into a solid tile, which puts you back where you started
         for ever. */
      if (car === this.driving) continue;
      const d = car.def, c = Math.cos(car.a), s = Math.sin(car.a);
      const hl = d.len / 2, hw = d.wid / 2;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [u, v] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw]]) {
        const px = car.x + u * c - v * s, py = car.y + u * s + v * c;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px);
        y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      /* The tiles its corners land in, inset slightly: a car whose bumper is a
         pixel over a tile line has not really taken that tile, and claiming it
         makes a parked car a tile wider than it looks. */
      const tx0 = Math.floor((x0 + 5) / TILE), tx1 = Math.floor((x1 - 5) / TILE);
      const ty0 = Math.floor((y0 + 5) / TILE), ty1 = Math.floor((y1 - 5) / TILE);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (!underfoot(tx, ty)) set.add(tx + ',' + ty);
      }
    }
  },

  /* ---- driving ----
     Throttle, brake and steering, in that order, and a body that carries on
     going the way it was going. It is an arcade model on purpose: the front
     wheels turn the car, the car slides a little when the back end is asked to
     do something sudden, and none of it is a simulation of a differential. */
  drive(car, dt) {
    const d = car.def;
    let th = Keys.up - Keys.down, st = Keys.right - Keys.left;
    /* ONE THUMB PER JOB. The left stick steers and only steers — its x, and
       nothing else — and the right one is the throttle: push it up to go, pull
       it down to brake and then reverse. Its y is positive downwards and
       forward is up, hence the sign.
       This used to be one stick doing both, and it could not work: steering
       meant pushing sideways, pushing sideways took the forward component out
       of the same vector, less speed meant less bite (see the taper below), so
       the harder you asked it to turn the less it turned. Either stick alone
       still does its own half, and the keys still do both, so nothing that
       worked before has stopped working. */
    if (Stick.on) st = clamp(Stick.x * 1.5, -1, 1);
    if (Throttle.on) th = clamp(-Throttle.y * 1.3, -1, 1);

    car.braking = false;
    if (th > 0.05) car.fwd += d.acc * th * dt;
    else if (th < -0.05) {
      /* Down is the brake while you are going forwards and reverse once you
         have stopped, which is one pedal doing two things and is what everybody
         expects from a car in a game. */
      if (car.fwd > 8) { car.fwd -= d.acc * 2.6 * -th * dt; car.braking = true; }
      else car.fwd += d.acc * 0.7 * th * dt;
    } else {
      /* Off the throttle it slows on its own, and comes to an actual stop
         rather than creeping for ever at a hundredth of a pixel. */
      const drop = 46 * dt;
      car.fwd = Math.abs(car.fwd) <= drop ? 0 : car.fwd - Math.sign(car.fwd) * drop;
    }
    car.fwd -= car.fwd * 0.55 * dt;
    car.fwd = clamp(car.fwd, -d.top * 0.42, d.top);

    /* Steering does nothing at a standstill, because it does nothing at a
       standstill: the front wheels turn, and turning them turns the car only
       if the car is going somewhere. Full lock by about a seventh of top speed
       — low enough that manoeuvring in a bay is steering rather than shunting
       — and reversed when reversing, which is the whole of why parking is
       harder than driving.
       And a little LESS lock the faster it is going, which is the opposite of
       what this used to do and is what a car does: full lock at seventy is not
       a turn, it is an incident. */
    const bite = Math.min(1, Math.abs(car.fwd) / (d.top * 0.14));
    const settled = 1 - 0.32 * Math.min(1, Math.abs(car.fwd) / d.top);
    if (st) car.a += st * d.turn * dt * bite * settled * (car.fwd < 0 ? -1 : 1);
    /* Where the front wheels are pointing, for the renderer. Eased rather than
       snapped, because a wheel that reaches full lock in one frame reads as a
       glitch and a wheel that takes a fifth of a second reads as steering. */
    car.wheel = lerp(car.wheel || 0, st, Math.min(1, dt * 12));

    this.move(car, dt);
  },

  /* Where a car ends up this frame: the body-frame velocity turned into a
     world one, the sideways part of it damped by how much grip the thing has,
     and the result tried against the world. Shared by the one being driven and
     the ones driving themselves, so they cannot disagree about what a wall is. */
  move(car, dt) {
    const d = car.def;
    const c = Math.cos(car.a), s = Math.sin(car.a);
    /* Grip is what stops a car being a train. The lateral component decays
       towards nothing every frame; what survives is the slide, and it survives
       longest on the cars with the lowest number. */
    car.lat *= Math.exp(-d.grip * dt);
    if (Math.abs(car.lat) < 0.5) car.lat = 0;
    let vx = c * car.fwd - s * car.lat, vy = s * car.fwd + c * car.lat;
    if (!vx && !vy) { car.stopped += dt; return; }

    /* What it was doing on the way in. Kept, because everything below is about
       what happened to it and by then there is no speed left to judge it by. */
    const was = car.fwd, x0 = car.x, y0 = car.y;
    let hit = 0;                       /* 0 clear, 1 along something, 2 into it */
    const nx = car.x + vx * dt, ny = car.y + vy * dt;
    if (!this.hits(car, nx, ny)) { car.x = nx; car.y = ny; }
    else if (!this.hits(car, nx, car.y)) { car.x = nx; hit = 1; }
    else if (!this.hits(car, car.x, ny)) { car.y = ny; hit = 1; }
    else hit = 2;

    /* Back out of the movement it ACTUALLY MADE into the body frame, so that
       next frame's heading change slides the car instead of teleporting its
       momentum. This is the whole of the handling model: everything above
       decides where the nose points, and this decides how much the rest of it
       agrees.
       Actually made, and not what it asked for. That distinction used to be
       missing — this line read `vx * c + vy * s`, the velocity it WANTED —
       and it was quietly the worst thing in this file. A refused move put the
       speed it was refused at straight back into car.fwd, so a car held
       against a wall was a car doing thirty that was not going anywhere: it
       never read as stopped, the scrape and the prang below never took a penny
       off it, prang() fired at full speed every frame for as long as you leant
       on the throttle, and the traffic could not tell being wedged against a
       kerb from waiting behind a bus. Everything downstream of this is better
       for it, and the whole of the recovery logic in steerTraffic() depends on
       it being true. */
    const ax = (car.x - x0) / dt, ay = (car.y - y0) / dt;
    car.fwd = ax * c + ay * s;
    car.lat = -ax * s + ay * c;
    if (hit === 1) this.scrape(car, 0.8, was);
    else if (hit === 2) this.prang(car, was);
    car.stopped = Math.abs(car.fwd) < 4 ? car.stopped + dt : 0;

    /* WEDGED. Everything above can only refuse a move, and refusing every move
       is exactly what a car inside something gets: hit a wall at an angle where
       neither axis on its own clears it, or have another car creep into you,
       and every candidate is rejected — including the ones going the right way.
       It could not be driven again. Ever.
       So ask which way is OUT and shuffle that way. Not a special case for
       walls or for cars but the same depenetration everything that moves in
       this game now gets (see Collide.pushOut, and the same three lines at the
       end of movePlayer): being stuck is a state the collision system has to
       end, not one it is allowed to enforce. Slowly, so that leaning on a wall
       is a car resting against a wall rather than a car being pushed off it. */
    const out = Collide.carPush(car);
    if (out) {
      const m = Math.hypot(out[0], out[1]) || 1, step = Math.min(m, TILE * 3 * dt);
      car.x += out[0] / m * step; car.y += out[1] / m * step;
    }

    /* Rubber, off the back wheels, when the back end is going somewhere the
       front end did not ask it to. Only the car being driven leaves any: four
       traffic cars taking the same corner all day would be a permanent cloud,
       and the point of it is feedback to the person doing the steering. */
    if (car === this.driving && Math.abs(car.lat) > 46 && FX.motion && chance(0.55)) {
      const bx = car.x - c * d.len * 0.4, by = car.y - s * d.len * 0.4;
      /* Thrown gently upwards because FX.update pulls everything down at
         260px/s²: over the half-second these live, the two cancel and the
         smoke sits where the tyre left it instead of raining off the car. */
      FX.parts.push({ x: bx + rnd(-6, 6), y: by + rnd(-6, 6), vx: rnd(-12, 12), vy: rnd(-70, -40),
        life: rnd(.35, .6), t: 0, c: 'rgba(24,26,30,.8)' });
    }
  },

  /* A wall, a lamppost, a wheelie bin or another car, at this position. Six
     points rather than four: a car is nearly two tiles long and two corners on
     the same side can straddle a bollard between them. */
  hits(car, x, y) { return !Collide.carFits(car, x, y); },

  /* Along something rather than into it. Costs speed and makes a noise; no
     dent, because a scrape down a wall is not an event. */
  scrape(car, keep, was) {
    if (Math.abs(was) > 40 && car === this.driving) { FX.shake(2); Sfx.scrape(); }
    car.fwd *= keep; car.lat *= 0.2;
  },
  /* Into something. The speed it WAS doing decides whether this is a nudge or
     the sort of thing that gets mentioned at a team meeting — passed in, since
     by the time this is called the car has already been stopped dead by the
     thing it hit and its own speed would say every collision was a nudge. */
  prang(car, was) {
    const v = Math.abs(was);
    car.fwd = -was * 0.18; car.lat = 0;
    if (v < 26) return;
    if (car === this.driving) {
      FX.shake(Math.min(9, v / 22));
      Sfx.thud(v / car.def.top);
      if (v > 110 && ++car.dents === 1) {
        UI.toast('🚗', 'That will have left a mark. Nobody saw. Somebody always saw.', 'bad');
        count('bullshit');
      }
    } else Sfx.thud(0.4);
  },

  /* ---- traffic ----
     A car with a `route:` drives itself round it for ever. Four things, in
     this order, and the order is the design: keep to the lane, keep off the
     pavement, stop for what is in front, and get yourself out of it when the
     first three have already gone wrong.

     THE LANE. Pure pursuit, as it always was: aim at a point a car's length or
     two further down the route rather than at the corner itself, turn towards
     it, and start slowing for the corner while still on the straight. The
     target is taken from the car's PROJECTION onto the lane rather than from
     the car, which is what quietly steers a shoved car back onto its line
     without anything having to notice it was shoved.

     THE PAVEMENT, which is new, and is the whole reason this section has
     grown. The old version had no idea where the road was. A route is a line
     somebody drew down a lane and nothing in here ever read the tarmac under
     it — so a car knocked off its line by the player parked across it, by
     another car creeping at a junction, or by the depenetration that stops a
     wedge being permanent, went back to steering at its target from wherever
     it had been left, and frequently that was the footway. There it stayed:
     it could only ever go FORWARDS, forwards was a shop front, and it sat
     against the window with its wheels turned for the rest of the day.
     Beached, which is the right word, and there were three of them at once
     outside the Greggs.

     So a driver now knows three things it did not:

       WHERE THE ROAD IS. World.surf already says which tiles are tarmac. That
       was art — the road surface, and the kerb R.kerbs() derives wherever it
       meets paving — and it turns out to be the map the drivers needed. Each
       one probes ahead of its own front wings and steers away from a kerb
       before it mounts one, which is what a driver does and is very much
       cheaper than getting a car off a pavement afterwards.

       WHEN IT IS STUCK, which is not the same as being held up. Sitting still
       with a bus in front of you is traffic. Sitting still with NOTHING in
       front of you is a car against something the route does not know about.
       A second of that and it reverses — off the throttle, tail swung back
       towards its own lane, reverse lights on, exactly the shunt everybody has
       done in a supermarket car park — and then has another go.

       WHICH LEG IT IS ACTUALLY ON. A car shoved a street and a half used to
       steer for the leg it was on when it was shoved, straight across
       everything in between. Now, after a few seconds off the road, it looks
       at its whole route and takes the leg it is nearest and pointing along —
       the difference between a driver who is lost and one who is on the wrong
       road and knows it.

     AND ONE FLOURISH, because a queue behind something that is never going to
     move is not traffic either: after a few seconds behind a STATIONARY car,
     and only where the offside is clear road it actually fits in, it pulls out
     and goes round. It will not do that for a person. Nothing in this file
     ever does anything about a person except stop for them. */

  /* Is this pixel road? The surfaces are declared for the renderer's benefit
     and they are the only description of the road network anybody has written
     down; reading one costs an array lookup and gives every driver out there
     the one fact they were missing. */
  onRoad(x, y) {
    return World.surfAt(Math.floor(x / TILE), Math.floor(y / TILE)) === 'tarmac';
  },
  /* Pulling up, waiting, and going again. Returns the speed the vehicle
     should be asking for, which is the only thing it changes.

     `stopIdx` is which stop it is at, and it is remembered rather than
     recomputed so that a bus sitting at one for six seconds does not spend
     those six seconds rediscovering it. `stopCool` is the second or two after
     pulling away during which every stop is invisible to it — without that a
     bus leaves a stop at walking pace, is still within reach of it, and serves
     it again for ever. */
  serveStop(car, want, c, s, dt) {
    if (car.stopFor > 0) {
      car.stopFor -= dt;
      if (car.stopFor <= 0) { car.stopFor = 0; car.stopIdx = -1; car.stopCool = 2.2; }
      return 0;
    }
    car.serving = 0;
    if (car.stopCool > 0) { car.stopCool -= dt; car.serving = 0; return want; }
    for (let i = 0; i < car.stops.length; i++) {
      const st = car.stops[i];
      const dx = st.x - car.x, dy = st.y - car.y;
      /* Along its own nose, so a stop on the far carriageway — or one it has
         already gone past — is not one it is approaching. */
      const ahead = dx * c + dy * s;
      const dist = Math.hypot(dx, dy);
      if (dist > TILE * 6 || ahead < -TILE * 0.6) continue;
      if (dist < TILE * 1.3 || ahead < 0) { car.stopFor = st.secs; car.stopIdx = i; car.serving = 0; return 0; }
      /* Slow over the last six tiles rather than standing on the brakes at the
         pole, which is what a bus does and what a bus looks like.

         `dist` is in PIXELS and the constant has to be scaled for that: at the
         far edge of the window this should be asking for about cruise and at
         the pole for nothing, which is a shade under one. It was 24, which is
         thirty times too big, so the ramp never bound on anything and the bus
         went from 120 to a dead stop inside four tenths of a second — correct
         to the tile, and an emergency stop rather than a bus service. */
      car.serving = 1;
      return Math.min(want, Math.max(0, (dist - TILE * 1.1) * 0.8));
    }
    return want;
  },
  /* Is a vehicle standing at this tile with its doors open — asked by
     engine/npc.js, which has six people at a bus stop who would otherwise
     have to evaporate. */
  stoppedAt(tx, ty) {
    for (const car of this.list()) {
      if (car.stopFor <= 0 || car.stopIdx < 0) continue;
      const st = car.stops[car.stopIdx];
      if (Math.hypot(st.x - (tx + .5) * TILE, st.y - (ty + .5) * TILE) < TILE * 3) return car;
    }
    return null;
  },

  /* Is this car's route drawn on road AT ALL? Asked once per car and
     remembered. Nothing above should start second-guessing a route on a level
     that declares no surfaces: every probe would come back "off the road",
     every car would spend the day reversing, and a level that declares none is
     supposed to be exactly the level it always was. */
  routeIsRoad(car) {
    if (car.tarmac === undefined) car.tarmac = car.route.every(p => this.onRoad(p.x, p.y));
    return car.tarmac;
  },

  steerTraffic(car, dt) {
    const d = car.def, R = car.route, n = R.length;
    if (car.honkT > 0) car.honkT = Math.max(0, car.honkT - dt);

    /* Where it is on its route: how far along this leg, measured along the leg
       rather than as the crow flies, so being pushed a foot off the lane does
       not read as progress or as going backwards. */
    const from = R[car.leg], to = R[(car.leg + 1) % n];
    const sx = to.x - from.x, sy = to.y - from.y, len = Math.hypot(sx, sy) || 1;
    const ux = sx / len, uy = sy / len;
    let t = ((car.x - from.x) * ux + (car.y - from.y) * uy) / len;
    if (t >= 1) { car.leg = (car.leg + 1) % n; return; }
    t = Math.max(0, t);

    /* Off the road, on a route that is a road. Not an emergency on its own —
       half a wheel over a kerb at a junction is a Tuesday — but a car that has
       been off it for a few seconds is a car whose idea of which leg it is on
       is no longer worth anything. */
    const road = this.routeIsRoad(car);
    const astray = road && !this.onRoad(car.x, car.y);
    car.lost = astray ? car.lost + dt : 0;
    if (!astray) car.rerouted = false;
    else if (car.lost > 2.5 && !car.rerouted) { car.rerouted = true; this.relocate(car); return; }
    /* Half a minute of it, and it has not been shoved off its lane — it has
       been shoved somewhere a lane cannot get it back from. See rejoin(). */
    else if (car.lost > 30 && this.rejoin(car)) return;

    /* Reversing out of something. Owns the car until its timer runs out. */
    if (car.back > 0) { this.shuntBack(car, dt, from, ux, uy, t * len); return; }

    /* ---- where to aim ----
       How far ahead: short, and shorter still when it has slowed down. A long
       look-ahead is smooth on a motorway and cuts the corner by two tiles at a
       crossroads, which out here means turning through the oncoming lane.
       Because the speed below falls as the corner comes up and this falls with
       the speed, the car tightens its own line into a junction. Shorter again
       when it is off the road, because it has a kerb to come back over and
       wants to be turning towards it now rather than in a moment. */
    let ahead = astray ? TILE * 0.9 : TILE * 1.15 + car.fwd * 0.3;
    let li = car.leg, lt = t, tx = to.x, ty = to.y;
    for (let guard = 0; guard <= n; guard++) {
      const f = R[li], g = R[(li + 1) % n];
      const dx = g.x - f.x, dy = g.y - f.y, L = Math.hypot(dx, dy) || 1;
      const rem = (1 - lt) * L;
      if (ahead <= rem) { const u = lt + ahead / L; tx = f.x + dx * u; ty = f.y + dy * u; break; }
      ahead -= rem; li = (li + 1) % n; lt = 0;
    }
    /* Out and round something parked. The target is shifted a lane sideways
       for as long as the manoeuvre lasts and then let go of, so the car steers
       out, goes past and comes back to its own line by itself. It is not given
       a new route and it does not need one. */
    if (car.pull > 0) {
      car.pull -= dt;
      tx += -uy * car.pullSide * TILE * 1.6;
      ty += ux * car.pullSide * TILE * 1.6;
    }

    /* Turn towards it, by the shortest way round. */
    let err = Math.atan2(ty - car.y, tx - car.x) - car.a;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;

    /* ---- the kerb ----
       Two probes, off either front wing and a stopping distance in front of
       them. One on the road and one off it is a kerb coming up on that side,
       and the answer is a nudge away from it — before it is mounted, which is
       the entire point, because a car that has already mounted one needs the
       whole recovery below and a car that has not needs nine degrees of
       steering.
       A corner is not a kerb: at a junction the road opens out on both sides
       and both probes agree, and where they do not — the inside of a tight
       left-hander — the turn itself is the bigger number and must win. So this
       is faded out as the steering error grows, and only ever trims. */
    const c = Math.cos(car.a), s = Math.sin(car.a);
    let bias = 0, noseOff = false;
    if (road && !astray) {
      const look = d.len * 0.5 + Math.max(TILE * 0.7, car.fwd * 0.4);
      const px = car.x + c * look, py = car.y + s * look;
      const k = d.wid * 0.5 + 6;
      const rOK = this.onRoad(px - s * k, py + c * k);
      const lOK = this.onRoad(px + s * k, py - c * k);
      noseOff = !this.onRoad(px, py);
      if (rOK !== lOK) bias = (rOK ? 0.55 : -0.55) * (1 - Math.min(1, Math.abs(err) / 0.85));
    }
    car.a += clamp((err + bias) * 2.6, -d.turn, d.turn) * dt;
    car.wheel = clamp((err + bias) * 1.6, -1, 1);

    /* ---- how fast ----
       Its own cruise, less the harder it is having to turn, and nothing at all
       if there is something in the way. */
    let want = car.cruise * (1 - Math.min(0.74, Math.abs(err) * 1.5));
    /* Slow for the corner before it is turning at all, because the corner is a
       fact about the road rather than about the steering wheel. */
    if ((1 - t) * len < TILE * 3.5) want = Math.min(want, car.cruise * 0.5);
    /* A kerb straight ahead, or a wheel already over one. Walking pace, on the
       grounds that everything that goes wrong out here goes wrong at speed. */
    if (noseOff) want = Math.min(want, car.cruise * 0.42);
    if (astray) want = Math.min(want, 52);

    /* ---- THE BUS STOP ------------------------------------------------
       A route point a vehicle SERVES rather than passes. Everything else out
       here treats stopping as a failure to be recovered from — the kerb, the
       queue, the stuck detector — because until now nothing on this network
       had any reason to stop anywhere on purpose.

       A stop is served when the bus is approaching one it has not just done:
       `want` is ramped down over the last few metres so it arrives at a halt
       rather than braking on top of it, then held at nothing for the dwell,
       then a short cooldown so it does not immediately re-serve the stop it is
       still sitting at.

       Nothing here suppresses the queue behind it, and that is deliberate: a
       car held up by a stopped bus is a car held up by a stopped bus, and the
       give-way and pull-round rules below already know exactly what to do
       about one. It is the most realistic traffic this town has. */
    if (car.stops.length) want = this.serveStop(car, want, c, s, dt);

    const block = this.blocker(car);
    /* What is holding THIS car up, for the car behind to read next frame — see
       the give-way rule below. A person is not recorded: nobody negotiates
       priority with somebody on a crossing. */
    car.blockedBy = (block && block !== 'person') ? block : null;
    car.braking = !!block;
    if (block) want = 0;

    if (block && block !== 'person') {
      /* NOBODY WAITS FOR EVER, and the reason two cars can wait for ever is
         that each of them can see the other in the way. The rule for that is
         the one on the sign: give way to the right. Each car publishes what is
         blocking it, so a deadlock is something this car can recognise — and
         in a deadlock the one with the other on its LEFT goes first. Nose to
         nose, where neither is to the other's right, the ids decide, because
         something has to and a coin lands differently every frame.
         The old timer race is kept underneath it as a backstop: whatever else
         is true, after four seconds behind a car somebody creeps, slowly
         enough that nudging the thing in front is silent (see prang()). */
      const v = -(block.x - car.x) * s + (block.y - car.y) * c;
      const deadlock = block.blockedBy === car;
      const mine = deadlock && (Math.abs(v) > TILE * 0.6 ? v < 0 : car.id < block.id);
      if (car.stopped > (mine ? 1.6 : 4)) want = Math.max(want, 20);
      /* And round it, if it is parked rather than queueing and the offside is
         genuinely clear. Committed to for a few seconds: a pull-out
         reconsidered every frame is a car twitching at a kerb. */
      if (car.pull <= 0 && Math.abs(block.fwd) < 6 && car.stopped > 3.4) {
        const side = this.roomToPass(car, block);
        if (side) { car.pull = 3.2; car.pullSide = side; }
      }
      if (car.pull > 0) want = Math.max(want, 34);
    }

    /* ---- stuck ----
       Which is not being held up: there is nothing in front of it, it is
       asking to go, and it is not going. That can only be something the route
       does not know about — a kerb, a bollard, the corner of a bus shelter —
       and the answer to all of them is the same one a person would use, which
       is reverse and try again. Counted up and down rather than latched, so a
       car inching through a tight junction never triggers it.
       Three shunts against the same thing is not a manoeuvre, it is a driver
       who came off the road somewhere else entirely, so the third one re-reads
       the route as well. */
    /* A bus at a stop is not stuck: it is doing the one thing it is for. The
       ramp above can leave it asking for a little speed while barely moving,
       which is exactly the shape this detector was written to catch. */
    if (car.stopFor > 0 || car.stopCool > 0 || car.serving) car.stuck = 0;
    else if (!block && want > 12 && Math.abs(car.fwd) < 8) car.stuck += dt;
    else car.stuck = Math.max(0, car.stuck - dt * 2);
    if (car.stuck > 1.1) {
      car.stuck = 0; car.pull = 0;
      car.back = 1.0 + (car.shunt % 3) * 0.35;
      if (++car.shunt % 3 === 0) this.relocate(car);
      return;
    }

    if (want > car.fwd) car.fwd = Math.min(want, car.fwd + d.acc * dt);
    else car.fwd = Math.max(want, car.fwd - d.acc * 2.2 * dt);
    if (car.fwd < 1.5 && car.fwd > -1.5) car.fwd = 0;

    /* Held up for long enough to have an opinion about it. Once, quietly, and
       then it waits like everybody else. */
    if (car.braking && car.stopped > 2.4 && !car.honkT) { Sfx.horn(); car.honkT = 6; }
  },

  /* Reversing out of it. Not a special case for kerbs but the manoeuvre any
     driver uses when forwards has stopped being a direction: off the throttle,
     back the better part of a car's length, tail swung towards where the lane
     is. The reverse lights come on for nothing, because the renderer has lit
     the back pair below four miles an hour backwards since the day it was
     written.
     Aiming the TAIL is the trick. The heading it wants is the opposite of the
     way it is about to travel, so steering at a point on its own lane BEHIND
     it swings the nose off whatever it is against and leaves the car pointing
     down its own lane when it stops — which is a three-point turn done in two,
     and is why it usually only takes one go. */
  shuntBack(car, dt, from, ux, uy, along) {
    const d = car.def;
    car.back -= dt;
    car.braking = false;
    /* Something behind it, and it stops. The rule at the top of this file is
       about people and it does not stop being about people in reverse. */
    if (this.blocker(car, -1)) { car.back = 0; car.fwd = 0; return; }
    const b = TILE * 1.6;
    const gx = from.x + ux * (along - b), gy = from.y + uy * (along - b);
    let err = Math.atan2(car.y - gy, car.x - gx) - car.a;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;
    car.a += clamp(err * 1.6, -d.turn, d.turn) * dt;
    car.wheel = clamp(-err, -1, 1);
    car.fwd = Math.max(-d.top * 0.15, car.fwd - d.acc * 1.2 * dt);
  },

  /* Which leg of its own route is it actually nearest? Perpendicular distance
     to each leg, clamped to the ends so a car level with the middle of one is
     not judged by how far it is from that leg's corner.
     With one condition that is the whole value of the function: a leg it would
     have to turn round to drive is not the leg it is on, however near it
     looks. The two carriageways of a street are eight feet apart and point in
     opposite directions, and a car that picks the wrong one of them rejoins
     the traffic head-on — which is a worse outcome than the pavement it is
     being got off. */
  relocate(car) {
    const R = car.route, n = R.length;
    let best = car.leg, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const f = R[i], g = R[(i + 1) % n];
      const dx = g.x - f.x, dy = g.y - f.y, L2 = dx * dx + dy * dy || 1;
      const u = clamp(((car.x - f.x) * dx + (car.y - f.y) * dy) / L2, 0, 1);
      const px = f.x + dx * u, py = f.y + dy * u;
      const facing = Math.cos(Math.atan2(dy, dx) - car.a);
      const dist = Math.hypot(car.x - px, car.y - py) + (facing < 0 ? TILE * 8 : 0);
      if (dist < bd) { bd = dist; best = i; }
    }
    /* `lost` is deliberately NOT reset. It is the clock on this whole spell off
       the road, and rejoin() below is the end of it — a car that re-read its
       route every few seconds and started the clock again each time would
       shunt against the same wall until the building fell down. */
    car.leg = best; car.shunt = 0;
  },

  /* THE LAST RESORT, and the only thing in this file that moves a car rather
     than driving one. A car can be left somewhere no route will get it back
     from: shoved through a gap, round a corner, and up onto a footway with a
     block of shops between it and every leg it owns. It is not stuck — it is
     driving, slowly, steering for its lane like a sensible car — but what it
     is driving round is a pedestrian precinct and it is never going to arrive.
     So after half a minute of that it gives up and rejoins its route at the
     nearest point on it that it fits, facing the right way, AND ONLY WHERE
     NOBODY IS LOOKING. Off camera that is a car that was not there when you
     looked, which is what every car you are not looking at is; on camera it is
     a car vanishing, which is a bug. Until it is off camera it keeps driving,
     so the worst this can ever look like from inside the game is a lost
     driver — and the worst it can look like from outside is a car that got
     itself back on the road while you were somewhere else. */
  rejoin(car) {
    if (typeof Cam !== 'undefined' && Cam.visible && Cam.visible(car.x, car.y)) return false;
    const R = car.route, n = R.length;
    const f = R[car.leg], g = R[(car.leg + 1) % n];
    const dx = g.x - f.x, dy = g.y - f.y, L = Math.hypot(dx, dy) || 1;
    const u = clamp(((car.x - f.x) * dx + (car.y - f.y) * dy) / (L * L), 0, 1);
    /* Pointed along the leg BEFORE anything is asked about fitting: carFits
       tests the box at the angle the car is holding, and the angle it is
       holding is whatever it was doing on the pavement. */
    const held = car.a;
    car.a = Math.atan2(dy, dx);
    for (const shift of [0, -TILE * 3, TILE * 3, -TILE * 6, TILE * 6]) {
      const uu = clamp(u + shift / L, 0, 1);
      const px = f.x + dx * uu, py = f.y + dy * uu;
      if (!Collide.carFits(car, px, py)) continue;
      car.x = px; car.y = py; car.fwd = 0; car.lat = 0;
      car.lost = 0; car.stuck = 0; car.back = 0; car.shunt = 0; car.pull = 0;
      car.rerouted = false;
      return true;
    }
    /* Its own lane occupied along its whole length is a lane with the traffic
       on it. It goes back to driving and asks again next frame. */
    car.a = held;
    return false;
  },

  /* Is there room to go round the thing in front? Where the car would BE
     halfway past it — a car's length beyond, a body's width to the side — and
     both questions asked of that spot: is it road, and does the car fit in it.
     An offside that is clear tarmac with a lamppost in it is not room, and
     neither is one that is somebody's front garden. The offside first, because
     that is the side you overtake on in a country that drives on the left, and
     the nearside only if the offside will not have it. */
  roomToPass(car, block) {
    const c = Math.cos(car.a), s = Math.sin(car.a);
    const u = car.def.len * 0.5 + block.def.len * 0.9;
    for (const side of [1, -1]) {
      const k = side * (car.def.wid * 0.5 + block.def.wid * 0.5 + 8);
      const px = car.x + c * u - s * k, py = car.y + s * u + c * k;
      if (this.routeIsRoad(car) && !this.onRoad(px, py)) continue;
      if (!Collide.carFits(car, px, py)) continue;
      return side;
    }
    return 0;
  },

  /* What is in the next couple of car lengths — the car it is queueing behind,
     the string 'person' for anybody on foot, or null. Distance scales with
     speed, so a car doing thirty starts braking further back than one
     crawling. `dir` is -1 to ask the same question of what is behind it, which
     is what reversing needs and is the same geometry backwards.
     It returns the blocker rather than a yes or no because the answer decides
     three different things: whether to brake, whether this is a deadlock worth
     applying a priority rule to, and whether the thing in front is parked and
     worth going round. */
  blocker(car, dir) {
    const c = Math.cos(car.a) * (dir || 1), s = Math.sin(car.a) * (dir || 1);
    const reach = car.def.len * 0.55 + Math.max(TILE, Math.abs(car.fwd) * 0.75);
    const px = car.x + c * reach, py = car.y + s * reach;
    for (const other of this.list()) {
      if (other === car) continue;
      /* In this car's own frame: how far in front, and how far off to one
         side. A radius round the probe point was the first version of this and
         it stopped the whole of Bellhaven Road dead behind a car parked at the
         kerb — which is not in the lane, is not in the way, and which every
         driver in the country goes round without slowing down. `v` is measured
         against the other car's actual width as projected across this one's
         path, so a car sitting broadside genuinely does block it. */
      const dx = other.x - car.x, dy = other.y - car.y;
      const u = dx * c + dy * s, v = -dx * s + dy * c;
      if (u < 0 || u > reach + other.def.len / 2) continue;
      const rel = other.a - car.a;
      const side = Math.abs(Math.cos(rel)) * other.def.wid / 2 + Math.abs(Math.sin(rel)) * other.def.len / 2;
      if (Math.abs(v) < car.def.wid / 2 + side + 2) return other;
    }
    /* A person is not a bollard: it stops, and it stops early. This is the
       only rule in this file that is about anything other than geometry, and
       it is the only one with no way round it — a car will go round a parked
       car and it will never go round somebody on a crossing. */
    if (!this.driving && Math.hypot(P.x - px, P.y - py) < TILE * 1.15) return 'person';
    for (const nn of NPCM.list) if (Math.hypot(nn.x - px, nn.y - py) < TILE) return 'person';
    /* And the people on the street, who are the reason the crossings work. The
       rule was written before there were any pedestrians to apply it to; this
       is the line that finally gives it somebody to stop for. */
    for (const p of Peds.list()) if (Math.hypot(p.x - px, p.y - py) < TILE * 1.15) return 'person';
    return null;
  },
  /* Kept as the question everybody outside this file asks, and the one the
     give-way lines in data/levels.js point at. */
  aheadBlocked(car) { return !!this.blocker(car); },

  /* ---- getting in and out ---- */

  /* The car within reach, for Interact. Cars are not World.objects — they are
     not on a tile and cannot be in byTile — so the interaction scan asks here
     as a third question alongside the furniture and the colleagues. */
  near(x, y) {
    let best = null, bd = TILE * 1.5;
    for (const car of this.list()) {
      if (!car.use) continue;
      const d = Math.hypot(car.x - x, car.y - y) - car.def.len * 0.28;
      if (d < bd) { bd = d; best = car; }
    }
    return best;
  },
  /* Which controls are on screen. The whole of the difference between walking
     and driving, as far as the phone is concerned: a second stick appears in
     the other corner for the throttle, and the button that has always been
     there says what it does now instead of which key it is. Called from both
     ends of getting in and out so there is one place that can be wrong. */
  showControls() {
    const on = !!this.driving;
    /* Idempotent, because update() calls it every frame. That is deliberate:
       there are three other places that can drop `driving` — a level swapping
       out from under it, a cache eviction, a save being loaded — and a control
       layout that is only corrected by the two polite exits is a layout that
       eventually shows a throttle to somebody on foot. Checked against the
       last value so the common case is one comparison and no DOM. */
    if (this._shown === on) return;
    this._shown = on;
    document.body.classList.toggle('driving', on);
    const e = $('#touchE');
    if (e) e.textContent = on ? 'OUT' : 'E';
  },
  take(car) {
    if (!car || !car.canDrive || this.driving) return false;
    this.driving = car;
    this.seen = new Set();
    car.fwd = car.lat = 0;
    Keys.up = Keys.down = Keys.left = Keys.right = 0;
    releaseSticks();
    this.showControls();
    Sfx.door();
    Ach.get('a_drive');
    UI.toast('🚗', TOUCH
      ? 'Two sticks: the <b>left</b> one steers, the <b>amber</b> one on the right is the throttle — push it up to go, pull it down to brake and then reverse. Tap <span class="kbd">OUT</span> to get out.'
      : '<span class="kbd">W</span> to go, <span class="kbd">S</span> to brake and then reverse, <span class="kbd">A</span>/<span class="kbd">D</span> to steer. <span class="kbd">H</span> is the horn. <span class="kbd">E</span> to get out.');
    return true;
  },
  /* Out, onto the nearest bit of ground that will have you. The driver's door
     first, because that is the door you are sitting against; then the other
     side, then the back — a car pulled up hard against a wall still has to be
     gettable out of, or the game has a hole in it. */
  getOut() {
    const car = this.driving;
    if (!car) return false;
    if (Math.abs(car.fwd) > 34) {
      Sfx.deny();
      UI.toast('🚗', 'Not at this speed. Stop the car like a person.');
      return false;
    }
    const c = Math.cos(car.a), s = Math.sin(car.a);
    const d = car.def;
    /* Both doors first, then further out on both sides, then the back, then
       the front. Ordered by where a person would actually get out, and gone
       through until one of them FITS — which is the whole point of testing it
       with the same box the walking does rather than with the one tile the
       middle of them lands in. A spot whose centre is clear but whose elbow is
       in a wing mirror is not a spot. */
    const spots = [];
    for (const r of [d.wid / 2 + 20, d.wid / 2 + 38]) spots.push([-6, -r], [-6, r]);
    for (const r of [d.wid / 2 + 20, d.wid / 2 + 38]) spots.push([d.len * 0.3, -r], [d.len * 0.3, r], [-d.len * 0.3, -r], [-d.len * 0.3, r]);
    spots.push([-d.len / 2 - 20, 0], [d.len / 2 + 20, 0], [-d.len / 2 - 38, 0], [d.len / 2 + 38, 0]);
    /* Best rather than first. A spot that FITS can still be a slot between the
       car and a trolley with one way out of it; a spot you can step away from
       in three directions is a pavement. Scored by how many ways out it has,
       with the order above as the tie-break, so the driver's door still wins
       when both are equally open. */
    let put = null, best = -1;
    for (const [u, v] of spots) {
      const px = car.x + u * c - v * s, py = car.y + u * s + v * c;
      if (!playerFits(px, py)) continue;
      let room = 0;
      for (const [ax, ay] of [[14, 0], [-14, 0], [0, 14], [0, -14]]) {
        if (playerFits(px + ax, py + ay)) room++;
      }
      if (room > best) { best = room; put = [px, py]; }
      if (best === 4) break;
    }
    /* Nowhere at all — wedged between a wall and another car. You still get
       out, standing where the car is, and the rule in sync() above is what
       makes that recoverable rather than the same trap by another route. */
    car.fwd = car.lat = 0;
    this.driving = null;
    this.parked(car);
    if (put) { P.x = put[0]; P.y = put[1]; }
    P.dir = 2; P.moving = false;
    Keys.up = Keys.down = Keys.left = Keys.right = 0;
    releaseSticks();
    this.showControls();
    Sfx.door();
    if (Sfx.engine) Sfx.engine(false);
    /* Now that nobody is in it, it is a solid object again — this frame,
       rather than next, or the step out lands in a car that has not yet
       remembered it is one. */
    this.sync();
    return true;
  },
  /* Out with no ceremony and no moving anybody: the level is going away. */
  getOutQuietly() {
    if (!this.driving) return;
    this.driving.fwd = this.driving.lat = 0;
    this.driving = null;
    releaseSticks();
    this.showControls();
    if (Sfx.engine) Sfx.engine(false);
  },
  /* Did that count as parking it? Asked of the paint rather than of a list of
     bays kept in here: a level draws its bays in `paint:` and this reads the
     same rectangles, so a car park somebody redraws is a car park this agrees
     with. Straight, too, within about fifteen degrees — a car left across two
     bays at an angle is exactly what this building already has one of. */
  parked(car) {
    if (!car.canDrive) return;
    const banks = (World.def && World.def.paint || []).filter(p => p.p === 'bays');
    const tx = car.x / TILE, ty = car.y / TILE;
    for (const b of banks) {
      const [x1, y1, x2, y2] = b.r;
      if (tx < x1 || tx > x2 + 1 || ty < y1 || ty > y2 + 1) continue;
      /* Nose up the bay: the open side says which way the car came in, so the
         way it should be pointing is the opposite of it. */
      const want = this.heading(b.open === 's' ? 'n' : b.open === 'n' ? 's' : b.open === 'e' ? 'w' : 'e');
      let err = car.a - want;
      while (err > Math.PI) err -= Math.PI * 2;
      while (err < -Math.PI) err += Math.PI * 2;
      if (Math.abs(err) < 0.26) {
        Ach.get('a_parked');
        UI.toast('🅿️', 'Parked. Straight, between the lines, first go. Nobody will ever know.', 'good');
      }
      return;
    }
  }
};
