'use strict';
/* ---------------- Nav: the shortest way there ---------------- */
/* One breadth-first sweep per destination, kept, and everybody walking to that
   destination steps downhill on the result. A field is a step count per tile —
   how many moves from here to there — so reading it is four array lookups and
   nothing walks a path of its own.

   Why a field rather than a path each: twenty people share about a dozen
   destinations between them (a desk each, and then the kettle, the printer, the
   loo, Meeting Room 2), so the expensive half is done once for the kettle
   rather than once for each of the five people going to it. It also answers the
   other question we had no answer to — HOW FAR IS THAT, in steps you have to
   walk rather than as the crow flies through four partitions — which is what
   the compass arrow now counts down.

   The floor plan changes only when a level is built, so the cache is thrown
   away when World hands out a new one and never validated tile by tile. */
const Nav = {
  fields: new Map(), grid: null, level: null, stamp: -1,
  /* Enough for a desk each plus the shared destinations, and eviction is
     least-recently-asked, so the handful in use every frame stay put. */
  LIMIT: 48,
  /* World.build() assigns a NEW solid[] every time, so identity is the whole
     test: no equal-by-value comparison of three thousand tiles, and no flag for
     anyone to forget to set. The object count catches a door being unlocked or
     a level remembering that the trolley has been moved. */
  fresh() {
    const stamp = World.objects ? World.objects.length : -1;
    if (this.grid === World.solid && this.level === World.level && this.stamp === stamp) return;
    this.grid = World.solid; this.level = World.level; this.stamp = stamp;
    this.fields.clear();
  },
  clear() { this.fields.clear(); this.grid = null; },
  field(tx, ty) {
    if (!World.solid) return null;
    this.fresh();
    const k = tx + ',' + ty;
    const hit = this.fields.get(k);
    /* Re-inserting moves the key to the end of a Map's insertion order, which
       is what makes the eviction below least-recently-asked rather than
       oldest-built — the kettle must not be evicted at 11:00 by twenty desks. */
    if (hit) { this.fields.delete(k); this.fields.set(k, hit); return hit; }
    const f = this.build(tx, ty);
    if (this.fields.size >= this.LIMIT) this.fields.delete(this.fields.keys().next().value);
    this.fields.set(k, f);
    return f;
  },
  build(tx, ty) {
    const w = MAPW, h = MAPH, d = new Int32Array(w * h).fill(-1), q = new Int32Array(w * h);
    let head = 0, tail = 0;
    const seed = (x, y, v) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = y * w + x;
      if (d[i] !== -1 || World.isSolid(x, y)) return;
      d[i] = v; q[tail++] = i;
    };
    seed(tx, ty, 0);
    /* A waypoint can be ON something — the printer is a solid object and the
       spot in front of it is where you actually stand. Seed the four squares
       around it instead, so "go to the printer" means "go and stand at it"
       rather than "walk into it until the stuck timer fires". */
    if (!tail) { seed(tx - 1, ty, 1); seed(tx + 1, ty, 1); seed(tx, ty - 1, 1); seed(tx, ty + 1, 1); }
    while (head < tail) {
      const i = q[head++], x = i % w, y = (i - x) / w, v = d[i] + 1;
      seed(x - 1, y, v); seed(x + 1, y, v); seed(x, y - 1, v); seed(x, y + 1, v);
    }
    return d;
  },
  at(f, x, y) { return (!f || x < 0 || y < 0 || x >= MAPW || y >= MAPH) ? -1 : f[y * MAPW + x]; },
  /* Steps from one tile to another, or null when there is no way at all — a
     locked door between the two, or a tile nobody can stand on. */
  steps(fx, fy, tx, ty) {
    const v = this.at(this.field(tx, ty), fx, fy);
    return v < 0 ? null : v;
  },
  /* The next tile on the way. Downhill on the field, and diagonally where that
     is genuinely shorter — the sweep is four-connected, so a diagonal neighbour
     two steps closer is a corner being cut honestly rather than a shortcut
     through a desk. Both tiles it passes between have to be open, or people
     walk through the corner of the partition.

     `cost` is an optional extra price per tile, which is how somebody standing
     in the way becomes a reason to go round rather than a reason to stop. It
     can only pick between tiles that are already closer than this one, so no
     cost can send anybody backwards or into a loop. */
  next(fx, fy, tx, ty, cost) {
    const f = this.field(tx, ty);
    if (!f) return null;
    const here = this.at(f, fx, fy);
    if (here <= 0) return null;
    let bx = 0, by = 0, best = Infinity;
    const open = (x, y) => this.at(f, x, y) >= 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const x = fx + ox, y = fy + oy, v = this.at(f, x, y);
      if (v < 0 || v >= here) continue;
      if (ox && oy && !(open(x, fy) && open(fx, y))) continue;
      const c = v + (cost ? cost(x, y) : 0);
      if (c >= best) continue;
      best = c; bx = ox; by = oy;
    }
    return (bx || by) ? [fx + bx, fy + by] : null;
  }
};

/* ---------------- NPCManager ---------------- */
const NPCM = {
  /* `list` is who is standing on the level you are standing on, and `all` is
     the roster. Everything about presence — drawing, collision, who you are
     near enough to talk to, the dots on the minimap — reads `list`, and so
     none of it had to learn that levels exist: walking down the ladder empties
     the list and the office carries on existing without being drawn into the
     basement at the coordinates its colleagues occupy upstairs. Anything about
     a person rather than their whereabouts — a job that names them, a
     relationship, the rolodex — reads `all`. */
  list: [], all: [],
  /* Seconds since the page loaded, which is the clock the floor's own reactions
     run on. NOT G.minutes: an event that adds eleven minutes to the shift would
     end an evacuation before anybody had stood up. */
  now: 0, busyTiles: new Set(), boss: null, lastEvent: null,
  spawn() {
    this.all = NPCS.map(def => {
      const t = this.traits(def);
      return {
        def, id: def.id, name: def.name, face: def.face, role: def.role, t,
        /* Everybody works on the fourth floor. It is a call centre; that is the
           whole premise. Written down anyway, because the moment one person does
           not, every reader of `list` is already correct. */
        level: def.level || 'office',
        x: (def.desk[0] + .5) * TILE, y: (def.desk[1] + .5) * TILE,
        step: 0, speed: TILE * t.pace, bob: rnd(0, 6.3), dir: 2,
        say: '', sayT: 0, nextSay: rnd(6, 22), stunTimer: 0, dest: 'desk', destKey: '', stuck: 0,
        /* The square of carpet they have claimed, who they are talking to,
           what they are looking at and for how long, and when they may next
           strike up a conversation. All of it is where they are and what they
           are doing rather than who they are, so none of it is saved: a
           reloaded shift puts everybody at their desk and the day starts. */
        post: null, walking: false, chat: null, chatCool: rnd(5, 40), callOut: null,
        lookAt: null, lookT: 0, idleT: rnd(2, 9), evade: 0, evadeX: 0, evadeY: 0,
        /* The steering: the heading actually being held, the tile being crossed
           to, and how the walk is going — closest they have been to where they
           are going, and how long since that improved. Progress is what decides
           whether a walk is finished or hopeless; `stuck` only ever knew about
           the last frame, and somebody shuffling sideways for ever was, frame
           by frame, moving perfectly well. */
        hx: 0, hy: 1, next: null, nextFrom: '', best: 1e9, noProg: 0, gaveUp: null
      };
    });
    this.enter(World.level);
  },
  /* A stable number from a string. Used for the traits below and for which way
     round somebody joins a queue — anything that has to differ per person, not
     change between sessions, and cost the writing nothing. */
  hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },
  /* How this person moves through a building, as five numbers.

     Derived from the id rather than written into data/npcs.js on purpose: the
     editor rewrites that file from a fixed list of fields, so a trait typed
     into it would be silently dropped the first time somebody saved a person
     from the Talk tab. A hash is stable across sessions, different for each
     person, and costs the writing nothing — and a def may still overrule any
     of it with `traits:` if one ever wants to. */
  traits(def) {
    const h = this.hash(def.id);
    const bit = n => ((h >>> (n * 5)) & 31) / 31;
    return Object.assign({
      pace: 1 + bit(0) * .5,              /* tiles a second: an amble to a walk */
      social: .15 + bit(1) * .75,         /* how readily they start a conversation */
      restless: bit(2),                   /* whether standing still stays still */
      drift: Math.round(-3 + bit(3) * 9), /* minutes ahead of the timetable, or behind it */
      /* How close you get before they look up, in tiles. The floor of it is the
         reach of E — 1.05 tiles, engine/panels.js — so anybody you are close
         enough to talk to has already noticed you, whoever they are. */
      notice: 1.15 + bit(4) * .95
    }, def.traits || {});
  },
  /* Which way to face, given a direction to face in. Sprites.dirOf takes the
     dominant axis, and a walk of exactly 45° — which is most of them, since the
     field is happy to go diagonally — has no dominant axis: |dx| and |dy| trade
     places on floating-point noise and the sprite flips between facing sideways
     and facing down every single frame. That was the jitter.

     So the axis being faced now keeps it until the other one wins by half
     again, and only the sign changes freely. Turning a corner still reads
     immediately; walking a diagonal picks a face and holds it. */
  face(n, dx, dy) {
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (!ax && !ay) return n.dir;
    const sideways = n.dir === 1 || n.dir === 3;
    if (sideways ? ax * 1.5 >= ay : ay * 1.5 >= ax) {
      return sideways ? (dx < 0 ? 1 : 3) : (dy < 0 ? 0 : 2);
    }
    return Sprites.dirOf(dx, dy);
  },
  /* Recompute presence for a level. Called by Levels.go(); a filter once per
     transition rather than a filter every frame in five hot paths. */
  enter(level) {
    this.list = this.all.filter(n => n.level === (level || 'office'));
    /* Nobody carries a conversation, a claimed spot or a grudge against a
       doorway across a level change: all three are about a floor plan that is
       no longer loaded. */
    this.all.forEach(n => {
      this.hangUp(n); n.post = null; n.gaveUp = null; n.destKey = ''; n.callOut = null; this.repath(n);
    });
  },
  get(id) { return this.all.find(n => n.id === id); },
  /* Is this colleague on the level you are on. A job that points at somebody
     upstairs wants the way upstairs, not their desk coordinates applied to the
     floor you are on. */
  here(id) { return this.list.some(n => n.id === id); },
  /* Where the timetable says to be. `drift` is the minutes this person is ahead
     of it or behind it, which is the whole reason twenty people no longer stand
     up for their break in the same frame. */
  destTile(n) {
    /* Called away. An override on the timetable with an expiry on it, set by
       watchFloor() when something happens to the building — see REACT. */
    if (n.callOut) {
      if (this.now < n.callOut.until && WP[n.callOut.wp]) { n.dest = n.callOut.wp; return WP[n.callOut.wp]; }
      n.callOut = null;
    }
    const sch = n.def.schedule || [];
    const now = G.minutes + (n.t ? n.t.drift : 0);
    let d = 'desk';
    for (const [t, where] of sch) if (now >= t) d = where;
    n.dest = d;
    if (d === 'desk') return [n.def.desk[0], n.def.desk[1]];
    const w = WP[d]; return w ? w : [n.def.desk[0], n.def.desk[1]];
  },
  /* Is this square a way through rather than a place to be. Standing in a
     doorway stops everybody behind you getting in — which during a fire drill
     is the whole floor, queueing in the lobby behind one person who found a
     free square and stopped on it. Bev has a line about this. */
  inDoorway(x, y) {
    if (World.isOpening(x, y)) return true;
    return World.at(x, y).some(o => o.kind === 'door' || o.kind === 'exit' || o.kind === 'hatch');
  },
  /* Which square to actually stand on. Five people sent to `coffee` were sent
     to the same square of lino, where they spent the break shoving each other
     off it; a destination is a place in the room, so it is claimed one square
     at a time from the tiles around it.

     A desk is the exception and is exactly itself: it is a chair with a name on
     it, the renderer seats whoever stops on it, and two people cannot want the
     same one. */
  post(n, dx, dy) {
    if (n.post) return n.post;
    if (n.dest === 'desk') return (n.post = [dx, dy]);
    const taken = new Set();
    for (const o of this.list) if (o !== n && o.post) taken.add(o.post[0] + ',' + o.post[1]);
    /* The square they just walked away from because they could not get to it.
       One pick only: it is off the list for this choice and available again
       the next time anybody looks, including them. */
    if (n.gaveUp) { taken.add(n.gaveUp); n.gaveUp = null; }
    const f = Nav.field(dx, dy);
    /* A chair first, if there is a free one within a couple of squares of where
       they were sent. Every break table, the meeting room and the training room
       have them, the renderer already seats anybody who stops on one, and it
       was drawing twelve people standing bolt upright round a table with eight
       empty chairs at it. Sitting down is most of what a break is. */
    const chair = this.freeChair(n, dx, dy, taken, f);
    if (chair) return (n.post = chair);
    /* Outwards a shell at a time, so nearest to the thing they came for always
       wins. Three shells is forty-eight squares, which is more people than work
       here. Which square within a shell is the interesting half — see below. */
    const cx = n.x / TILE - .5, cy = n.y / TILE - .5;
    for (let ring = 0; ring <= 3; ring++) {
      const cells = [];
      for (let oy = -ring; oy <= ring; oy++) for (let ox = -ring; ox <= ring; ox++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== ring) continue;
        const x = dx + ox, y = dy + oy;
        if (World.isSolid(x, y) || taken.has(x + ',' + y) || this.inDoorway(x, y)) continue;
        /* Connected to the destination, not merely near it: the tile the other
           side of the break room wall is one square from the kettle and a walk
           round three corridors away from it. One field answers this for every
           candidate, which is why the destination's is the one asked. */
        if (f && Nav.at(f, x, y) < 0) continue;
        cells.push([x, y]);
      }
      if (!cells.length) continue;
      /* Of the free squares this close to the thing they came for, the one on
         the side they are arriving from. A spot chosen without regard to that
         is a spot on the far side of everybody already standing there, and the
         last four people into a busy break room spent the whole of lunch trying
         to cross it — each of them walking into the backs of the people who got
         there first, giving up, and choosing another square behind them.

         Rooms fill from the door now, which is also how a room fills. */
      cells.sort((a, b) => (Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))
        || (this.hash(n.id + a) % 8) - (this.hash(n.id + b) % 8));
      return (n.post = cells[0]);
    }
    /* Nothing free for three squares in any direction, which means the room is
       full — a fire drill, or lunch. Stand where you are rather than joining a
       scrum on a tile somebody else has already claimed. */
    const hx = Math.floor(n.x / TILE), hy = Math.floor(n.y / TILE);
    if (!World.isSolid(hx, hy) && !taken.has(hx + ',' + hy) && !this.inDoorway(hx, hy)) return (n.post = [hx, hy]);
    return (n.post = [dx, dy]);
  },
  /* The nearest chair to a destination that nobody has claimed and everybody
     can reach. Three squares: that reaches the far side of both break tables
     and the back row of the training room, and stops well short of the next
     room along. */
  freeChair(n, dx, dy, taken, f) {
    let best = null, bd = 9;
    for (const o of World.objects) {
      if (o.kind !== 'chair' || o.solid) continue;
      const d = Math.max(Math.abs(o.x - dx), Math.abs(o.y - dy));
      if (d > 3 || d >= bd) continue;
      if (taken.has(o.x + ',' + o.y) || World.isSolid(o.x, o.y)) continue;
      if (f && Nav.at(f, o.x, o.y) < 0) continue;
      /* Not the one you sit at all day. A desk chair is somebody's desk, and
         the only person who should ever be in it is the person whose name is
         on the monitor. */
      if (o.deskId || o.use === 'playerDesk') continue;
      best = [o.x, o.y]; bd = d;
    }
    return best;
  },
  /* What the floor does when something happens to it, keyed by the event id in
     data/office.js. The writing already says what the room does — thirty-one
     adults are now running, nobody moves for the test, everybody stands in the
     car park for eleven minutes — and this is that happening on the floor
     rather than only in the toast that announces it.

     Reading ids out of the content is a coupling and a deliberately loose one:
     an event not named here simply gets no reaction, and one that is renamed or
     deleted quietly stops having one. Nothing in this table can fail. */
  REACT: {
    /* Not a test. */
    firealarm2: { go: 'fireEsc', secs: 62, haste: 1.5 },
    /* A test. Nobody moves — they look up, and they go back to it, which is
       the joke the event is already making. Ron is in the lobby and out of
       range of the look, so Ron does not even look up. */
    firealarm: { look: 'fireEsc', secs: 2.6 },
    /* Thirty-one adults are now running. */
    pizza: { go: 'breakTable', secs: 75, haste: 1.55 },
    printerpoc: { look: 'printer', secs: 3 },
    kettlebreak: { look: 'kettle', secs: 3 },
    coffeeout: { look: 'coffee', secs: 3 }
  },
  watchFloor() {
    const ev = G.activeEvent;
    if (ev === this.lastEvent) return;
    this.lastEvent = ev;
    const r = ev && this.REACT[ev.id];
    if (!r) return;
    const until = this.now + r.secs;
    for (const n of this.list) {
      if (r.go && WP[r.go]) { n.callOut = { wp: r.go, until, haste: r.haste || 1 }; this.hangUp(n); }
      if (r.look && WP[r.look]) {
        const w = WP[r.look];
        /* Not in unison. Twenty heads turning on the same frame is a chorus
           line, not a room noticing something. */
        n.lookAt = { x: (w[0] + .5) * TILE, y: (w[1] + .5) * TILE };
        n.lookT = r.secs * rnd(.6, 1.35);
      }
    }
  },
  /* Is the manager standing over this person right now, somewhere it matters.
     At a desk or anywhere on the main floor it matters; in the break room at
     lunch it does not, and everybody in this building knows the difference. */
  lookBusy(n) {
    const b = this.boss;
    if (!b || b === n || Math.hypot(b.x - n.x, b.y - n.y) >= TILE * 3.4) return false;
    return n.dest === 'desk' || World.zoneAt(Math.floor(n.x / TILE), Math.floor(n.y / TILE)) === 'main';
  },
  update(dt) {
    this.now += dt;
    this.watchFloor();
    /* Where everybody who is standing still is standing, once per frame, as
       tile keys. The walk below prices these up so a knot of people is walked
       round rather than into — and nothing else reads it, so it is rebuilt
       rather than maintained. */
    this.busyTiles.clear();
    for (const n of this.list) if (!n.walking) this.busyTiles.add(Math.floor(n.x / TILE) + ',' + Math.floor(n.y / TILE));
    if (G.state === 'play') this.busyTiles.add(Math.floor(P.x / TILE) + ',' + Math.floor(P.y / TILE));
    this.boss = this.list.find(x => x.id === 'nigel') || null;
    /* Whoever you are talking to stands still until you have finished. They
       used to keep walking their schedule mid-sentence and simply leave, which
       reads as a bug even when the dialogue carries on perfectly well. The rest
       of the floor keeps moving — the office does not stop for a chat. */
    const talkingTo = (Dialogue.on && Dialogue.npc && Dialogue.npc.id) || null;
    const playing = G.state === 'play';
    this.list.forEach(n => {
      n.bob += dt * 3.2;
      if (n.sayT > 0) n.sayT -= dt;
      if (n.lookT > 0) n.lookT -= dt;
      if (n.chatCool > 0) n.chatCool -= dt;

      if (talkingTo && n.id === talkingTo) {
        /* Being spoken to. They stop, they break off whatever they were saying
           to somebody else, and they look at you: a colleague who answers a
           question with their back to you is the single most obvious tell that
           nobody is home behind the sprite. */
        n.walking = false; this.hangUp(n);
        n.dir = this.face(n, P.x - n.x, P.y - n.y);
        return;
      }
      if (n.stunTimer > 0) { n.stunTimer -= dt; n.walking = false; return; }

      const [dx, dy] = this.destTile(n);
      const key = n.dest + ':' + dx + ',' + dy;
      /* The timetable has moved them on. Give up the square of carpet, and stop
         talking — you can be mid-sentence when it gets to half past, and that
         is what an office sounds like. */
      if (key !== n.destKey) { n.destKey = key; n.post = null; this.hangUp(n); this.repath(n); }

      const [tx, ty] = this.post(n, dx, dy);
      const cx = n.x / TILE - .5, cy = n.y / TILE - .5;
      /* Arriving is closer than leaving: a settled person who is nudged half a
         square by somebody squeezing past does not set off walking again, which
         used to flick the walk cycle on and off where a room was busy.

         And standing IN the square, having stopped getting any closer to the
         middle of it, is arriving too. A person whose square is ringed by other
         people is held off its centre by the very act of everyone giving each
         other room: they were within a foot of where they were going and spent
         the rest of lunch being pushed off it and walking back. */
      const near = Math.hypot(tx - cx, ty - cy);
      const onPost = Math.floor(n.x / TILE) === tx && Math.floor(n.y / TILE) === ty;
      const there = near <= (n.walking ? .34 : .62) || (onPost && n.noProg > 1.5);
      if (!there) this.walk(n, dt, tx, ty);
      else {
        if (n.walking) this.repath(n);
        n.walking = false;
        this.settle(n, dt, dx, dy, playing);
      }

      this.chatter(n, dt, playing, talkingTo);

      /* The one-liners. Unchanged in what they are and when they fire, except
         that somebody already talking to a colleague does not also mutter to
         themselves over the top of it. */
      n.nextSay -= dt;
      if (n.nextSay <= 0 && n.def.lines) {
        n.nextSay = rnd(14, 40);
        if (!n.chat && Cam.visible(n.x, n.y) && chance(.6)) { n.say = pick(n.def.lines); n.sayT = 4.2; }
      }
    });
  },
  /* One step of the walk. Aim at the middle of the next tile on the way, lean
     away from anybody too close, and take what is left. */
  walk(n, dt, tx, ty) {
    this.hangUp(n);
    n.walking = true;
    const fx = Math.floor(n.x / TILE), fy = Math.floor(n.y / TILE);
    /* Is this walk actually getting anywhere, in STEPS LEFT TO WALK rather than
       as the crow flies.

       Two mistakes, one after the other. `stuck` counted frames in which
       nothing moved at all, and somebody shuffling sideways round a crowded
       break room moves perfectly well on every one of them while getting no
       closer to anything for half a minute. Straight-line distance fixed that
       and introduced a worse one: the way out of a room is often in the
       opposite direction to where you are going, so anybody walking up the
       floor to reach a door was, by that measure, going backwards, and a long
       enough corridor would have had them abandon a perfectly good walk in the
       middle of it. The field already knows the real answer and it is one
       array lookup. */
    const far = Nav.steps(fx, fy, tx, ty);
    const d = far === null ? Math.hypot(tx - (n.x / TILE - .5), ty - (n.y / TILE - .5)) : far;
    if (d < n.best - .1) { n.best = d; n.noProg = 0; } else n.noProg += dt;
    /* Which tile to cross to, decided ONCE per tile entered and then held.
       Somebody standing in the next square is a reason to go round them, worth
       about two and a half steps of detour — but the people in the way move,
       and re-asking every frame meant the answer changed under a walker
       mid-stride and swung them about. It can only ever choose between tiles
       already closer than this one, so it cannot send anybody backwards, in a
       circle, or through a wall. */
    const from = fx + ',' + fy;
    if (n.nextFrom !== from) {
      n.nextFrom = from;
      n.next = Nav.next(fx, fy, tx, ty, (x, y) => this.busyTiles.has(x + ',' + y) ? 2.5 : 0);
    }
    const step = n.next;
    /* No next tile means one of two things and the same answer does for both:
       the last stretch across the destination tile itself, and a destination
       the sweep never reached — somebody standing inside a desk, or a way that
       is walled off — where walking straight at it is what this always did. */
    const ax = step ? (step[0] + .5) * TILE : (tx + .5) * TILE;
    const ay = step ? (step[1] + .5) * TILE : (ty + .5) * TILE;
    let vx = ax - n.x, vy = ay - n.y;
    const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
    const gx = vx, gy = vy;
    const [sx, sy] = this.separate(n);
    vx += sx * .8; vy += sy * .8;
    if (n.evade > 0) { n.evade -= dt; vx += n.evadeX * .8; vy += n.evadeY * .8; }
    /* Give way, but never walk backwards to do it. Twelve people converging on
       one break room push each other about hard enough that the sum of the
       shoves can point the wrong way down the corridor, and somebody who has
       been pushed out of the room walks back in, and is pushed out again, for
       the whole of lunch. Anything that would reverse the walk is folded back
       towards where they were going: they still slide round each other, they
       just do it while making progress. */
    if (vx * gx + vy * gy < .2) { vx = vx * .35 + gx * .9; vy = vy * .35 + gy * .9; }
    const l2 = Math.hypot(vx, vy) || 1; vx /= l2; vy /= l2;
    /* Turn towards it rather than snapping to it. Everything above — the next
       tile, who is in the way, which side to squeeze past — can change between
       one frame and the next, and applied raw that is a person twitching. A
       fifth of a second of turn takes all of it out and costs about a fifth of
       a tile of accuracy, which no wall is close enough to mind. */
    const turn = 1 - Math.pow(.004, dt);
    n.hx += (vx - n.hx) * turn; n.hy += (vy - n.hy) * turn;
    const hl = Math.hypot(n.hx, n.hy) || 1;
    vx = n.hx / hl; vy = n.hy / hl;

    const sp = n.speed * (n.callOut ? n.callOut.haste : 1) * dt;
    const mx = vx * sp, my = vy * sp;
    const was = { x: n.x, y: n.y };
    if (this.canGo(n, mx, my)) { n.x += mx; n.y += my; }
    else {
      /* Slide along whichever axis was doing most of the work first, so
         somebody squeezing past a partition keeps going forwards rather than
         setting off sideways down the room. */
      const order = Math.abs(mx) >= Math.abs(my) ? [[mx, 0], [0, my]] : [[0, my], [mx, 0]];
      for (const [ox, oy] of order) if ((ox || oy) && this.canGo(n, ox, oy)) { n.x += ox; n.y += oy; break; }
    }
    const wx = n.x - was.x, wy = n.y - was.y;
    if (wx || wy) {
      n.stuck = 0;
      n.step += Math.hypot(wx, wy) / TILE * 2.6;
      /* Which way they are facing, from the held heading rather than from the
         last frame's step: the step is a fraction of a pixel and squeezing past
         a desk makes it point sideways for a moment, which used to turn them. */
      n.dir = this.face(n, n.hx, n.hy);
    } else {
      n.stuck += dt;
      /* Blocked by a person rather than a wall — the walls are already routed
         around. Pick a side ONCE and commit to it for half a second: rolling a
         new direction every frame is a person vibrating in a doorway. */
      if (n.evade <= 0 && n.stuck > .45) {
        const s = chance(.5) ? 1 : -1;
        n.evadeX = -vy * s; n.evadeY = vx * s; n.evade = .6;
      }
    }
    /* And whether or not this frame moved them, has the walk as a whole given
       up on itself. */
    if (n.noProg > 2.5) this.giveUp(n, tx, ty, d);
  },
  /* A walk that has stopped getting anywhere.

     Near enough: somebody two squares from where they were going, held up by
     people, has arrived as far as anyone watching is concerned. They take the
     square they are standing on — which is what a person does — and it becomes
     theirs, so nobody walks into it either.

     Not near enough: give the square up and take another, remembering the one
     just abandoned so the same jam is not chosen again a second later.

     And still nothing, out of sight: the last resort, which is the teleport
     this always had and which almost never fires now. */
  giveUp(n, tx, ty, d) {
    /* "Near enough" is the room, not a radius. Somebody who has got into the
       break room and cannot cross it because the break room is full of people
       is not stuck — they are in the break room, which is where they were
       going, and they should stand still and be in it. Measuring this in tiles
       instead was what kept the last few arrivals walking into backs for the
       whole of lunch. */
    const hx = Math.floor(n.x / TILE), hy = Math.floor(n.y / TILE);
    if (d <= 3 || World.zoneAt(hx, hy) === World.zoneAt(tx, ty)) {   /* d is steps left */
      const spot = this.freeSpotNear(n);
      if (spot) { n.post = spot; this.repath(n); return; }
    }
    if (n.noProg > 6) {
      n.gaveUp = n.post ? n.post.join(',') : null;
      n.post = null; this.repath(n);
      return;
    }
    if (n.noProg > 14 && !Cam.visible(n.x, n.y)) {
      n.x = (tx + .5) * TILE; n.y = (ty + .5) * TILE; this.repath(n);
    }
  },
  /* Forget everything about the walk in progress: where it was going, how well
     it was going, and which way it was leaning. Called whenever the target
     changes under it. */
  repath(n) {
    n.best = 1e9; n.noProg = 0; n.stuck = 0; n.evade = 0; n.next = null; n.nextFrom = '';
  },
  /* The nearest square to somebody that they can stand on and nobody has
     claimed — theirs first, then the ring around it. */
  freeSpotNear(n) {
    const hx = Math.floor(n.x / TILE), hy = Math.floor(n.y / TILE);
    const ring = [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (const [ox, oy] of ring) {
      const x = hx + ox, y = hy + oy;
      if (World.isSolid(x, y) || this.inDoorway(x, y)) continue;
      if (this.list.some(o => o !== n && o.post && o.post[0] === x && o.post[1] === y)) continue;
      return [x, y];
    }
    return null;
  },
  /* Lean away from anybody standing too close. Not collision — that is canGo —
     but the reason two people walking the same corridor drift apart instead of
     grinding along each other for the length of it. */
  separate(n) {
    let sx = 0, sy = 0;
    const R = TILE * .7;
    for (const o of this.list) {
      if (o === n) continue;
      const dx = n.x - o.x, dy = n.y - o.y, d = Math.hypot(dx, dy);
      if (d > R || d < .001) continue;
      const w = (R - d) / R;
      sx += dx / d * w; sy += dy / d * w;
    }
    if (G.state === 'play') {
      const dx = n.x - P.x, dy = n.y - P.y, d = Math.hypot(dx, dy);
      /* You get more room than a colleague does. You are the one being walked
         around, and being clipped by somebody on their way to the printer is
         read as the game shoving you. */
      if (d < R * 1.15 && d > .001) { const w = (R * 1.15 - d) / R * 1.5; sx += dx / d * w; sy += dy / d * w; }
    }
    return [sx, sy];
  },
  /* Arrived. What somebody does while they are not going anywhere, which is
     most of the day and was, until now, absolutely nothing. */
  settle(n, dt, dx, dy, playing) {
    /* Notice you. Everybody looks up when you are right beside them; how far
       away that starts is the one trait you can actually see. */
    if (playing && !n.chat) {
      const d = Math.hypot(P.x - n.x, P.y - n.y);
      /* How far away they look up from, and how long they hold it. Somebody
         fond of you notices you a square earlier and watches you go past;
         somebody who has told a colleague about you barely raises their head.
         It is the only place in the game where a relationship is visible
         without opening a panel or saying a word. */
      const rel = typeof Rel === 'undefined' ? 0 : Rel.get(n.id);
      if (d < TILE * (n.t.notice + clamp(rel, -3, 6) * .18)) {
        n.lookAt = P; n.lookT = Math.max(n.lookT, .9 + Math.max(0, rel) * .12);
      }
      /* A phone that has been ringing for a while. Everybody looks at it. This
         is a call centre, so nobody answers it. */
      else if (n.lookT <= 0 && typeof Phones !== 'undefined' && Phones.ringing && Phones.ringing.length && chance(dt * .3)) {
        const ph = Phones.ringing.find(q => q.lvl === n.level
          && Math.hypot((q.x + .5) * TILE - n.x, (q.y + .5) * TILE - n.y) < TILE * 5);
        if (ph) { n.lookAt = { x: (ph.x + .5) * TILE, y: (ph.y + .5) * TILE }; n.lookT = rnd(1, 2.4); }
      }
    }

    /* Which way they are facing, in order of what would actually hold somebody's
       attention: the person they are talking to, whatever they just looked up
       at, the thing they came over here for, and failing all of that the room. */
    const partner = n.chat && this.get(n.chat.with);
    if (partner) n.dir = this.face(n, partner.x - n.x, partner.y - n.y);
    /* The manager is standing over them. Whatever they were looking at, they
       are now looking at their screen. */
    else if (n.dest === 'desk' && this.lookBusy(n)) n.dir = 0;
    else if (n.lookT > 0 && n.lookAt) n.dir = this.face(n, n.lookAt.x - n.x, n.lookAt.y - n.y);
    else if (n.dest === 'desk') n.dir = 0;    /* the screen is on the far side of the desk */
    else if (n.post && (n.post[0] !== dx || n.post[1] !== dy)) n.dir = this.face(n, dx - n.post[0], dy - n.post[1]);

    /* Standing somewhere is not standing on one tile for four hours. The
       restless shift along the counter now and then; the still stay still.

       A step, not a decision: this used to drop the claimed square and ask for
       a new one from scratch, which in a full room could hand somebody a spot
       on the far side of everybody and send them back into the scrum they had
       just got out of. Shuffling is a square you can see from where you are. */
    n.idleT -= dt;
    if (n.idleT <= 0) {
      n.idleT = rnd(7, 20);
      if (!n.chat && n.dest !== 'desk' && chance(n.t.restless * .55)) {
        const spot = this.shuffleSpot(n, dx, dy);
        if (spot) { n.post = spot; this.repath(n); }
      }
    }
  },
  /* One square over: free, unclaimed, next to where they already are, and still
     within reach of the thing they came for. Anything further is not a shuffle,
     it is a journey, and a room full of people is no place for one. */
  shuffleSpot(n, dx, dy) {
    const hx = Math.floor(n.x / TILE), hy = Math.floor(n.y / TILE);
    const f = Nav.field(dx, dy);
    const out = [];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const x = hx + ox, y = hy + oy;
      if (World.isSolid(x, y) || this.inDoorway(x, y)) continue;
      if (Math.max(Math.abs(x - dx), Math.abs(y - dy)) > 3) continue;
      if (f && Nav.at(f, x, y) < 0) continue;
      if (this.list.some(o => o !== n && o.post && o.post[0] === x && o.post[1] === y)) continue;
      out.push([x, y]);
    }
    return out.length ? pick(out) : null;
  },
  /* Two people standing near each other for long enough start talking, in their
     own words — the one-liners each person already has. The pair is one
     conversation with a host and a guest: the host owns the timing and hands
     the turn back and forth, and the guest is along for it, which is why only
     one of them is ever mid-sentence. */
  chatter(n, dt, playing, talkingTo) {
    if (n.chat) {
      const o = this.get(n.chat.with);
      /* It ends when the other one leaves, is spoken to, or is no longer there
         at all. Both halves are torn down together — see hangUp. */
      if (!o || !o.chat || o.chat.with !== n.id || o.walking || n.walking
        || o.stunTimer > 0 || o.id === talkingTo) return this.hangUp(n);
      /* And it stops dead when the manager comes past. */
      if (this.lookBusy(n)) return this.hangUp(n);
      if (!n.chat.host) return;
      n.chat.t -= dt;
      if (n.chat.t > 0) return;
      if (n.chat.turns <= 0) return this.hangUp(n);
      /* One voice at a time in a small room. Three pairs talking at once put
         three bubbles over each other and none of them could be read, which is
         worse than a quiet break room — so a beat waits a second when somebody
         else nearby is mid-sentence. Not the person we are talking TO: they
         have just spoken, and waiting for them is waiting for ever. */
      if (this.list.some(x => x !== n && x !== o && x.sayT > 1.2
        && Math.hypot(x.x - n.x, x.y - n.y) < TILE * 3.4)) { n.chat.t = rnd(.8, 1.6); return; }
      n.chat.turns--;
      n.chat.t = rnd(3.2, 5);
      const who = n.chat.lead ? n : o;
      n.chat.lead = !n.chat.lead;
      if (who.def.lines && who.def.lines.length) {
        who.say = pick(who.def.lines); who.sayT = 3.4;
        /* They have just said something. Not twice. */
        who.nextSay = Math.max(who.nextSay, rnd(18, 45));
      }
      return;
    }
    if (!playing || n.walking || n.chatCool > 0 || n.stunTimer > 0) return;
    if (this.lookBusy(n)) return;
    if (!n.def.lines || !n.def.lines.length) return;
    if (!chance(dt * n.t.social * .55)) return;
    const o = this.list.find(o => o !== n && !o.walking && !o.chat && o.chatCool <= 0
      && o.stunTimer <= 0 && o.id !== talkingTo && o.def.lines && o.def.lines.length
      && Math.hypot(o.x - n.x, o.y - n.y) < TILE * 2.6);
    if (!o) return;
    n.chat = { with: o.id, host: true, t: .5, turns: ri(2, 5), lead: true };
    o.chat = { with: n.id, host: false, t: 0, turns: 0, lead: false };
    /* Long enough that the same two are not still at it when you come back
       from the loo, and different enough per pair that the room does not fall
       silent all at once. */
    n.chatCool = rnd(45, 130); o.chatCool = rnd(45, 130);
  },
  hangUp(n) {
    if (!n.chat) return;
    const o = this.get(n.chat.with);
    n.chat = null;
    if (o && o.chat && o.chat.with === n.id) o.chat = null;
  },
  canGo(n, dx, dy) {
    const nx = n.x + dx, ny = n.y + dy, r = TILE * .27;
    const pts = [[nx - r, ny - r], [nx + r, ny - r], [nx - r, ny + r], [nx + r, ny + r]];
    if (pts.some(([px, py]) => World.isSolid(Math.floor(px / TILE), Math.floor(py / TILE)))) return false;
    /* Colleagues do not walk through you, and no longer through each other
       either. Both tests are "would this step keep us as close as we already
       are" rather than a flat radius: a flat radius means two people who have
       ended up overlapping — a spawn, a teleport, you walking into somebody —
       can never move apart again, and the pair stand there for the rest of the
       shift. Being allowed out of an overlap is what unsticks it. */
    if (G.state === 'play') {
      const d = Math.hypot(nx - P.x, ny - P.y);
      if (d < TILE * .55 && d <= Math.hypot(n.x - P.x, n.y - P.y)) return false;
    }
    for (const o of this.list) {
      if (o === n) continue;
      const d = Math.hypot(nx - o.x, ny - o.y);
      /* Tighter than the half tile a person occupies, deliberately. Two people
         standing a tile apart leave a gap of exactly one tile, and at half a
         tile each nobody can ever pass between them — the break room fills up
         with a wall of colleagues and everyone still in the corridor stays
         there. Turning sideways to get past somebody is a thing people do. */
      if (d < TILE * .42 && d <= Math.hypot(n.x - o.x, n.y - o.y)) return false;
    }
    return true;
  },
  /* Somewhere to stand near a point: the first free tile round it that is not
     the one the player is on. Used by anything that puts a person on the floor
     from outside the walk — the manager appearing behind you, which used to
     land him wherever the arithmetic said and drew him standing inside a desk
     about a third of the time. */
  standNear(wx, wy) {
    const cx = Math.floor(wx / TILE), cy = Math.floor(wy / TILE);
    const ring = [[0, 0], [0, 1], [1, 0], [-1, 0], [1, 1], [-1, 1], [0, 2], [1, 2], [-1, 2],
                  [2, 0], [-2, 0], [0, -1], [2, 1], [-2, 1]];
    for (const [ox, oy] of ring) {
      const x = cx + ox, y = cy + oy;
      if (World.isSolid(x, y)) continue;
      const px = (x + .5) * TILE, py = (y + .5) * TILE;
      if (G.state !== 'title' && Math.hypot(px - P.x, py - P.y) < TILE * .8) continue;
      return [px, py];
    }
    return [wx, wy];
  },
  nearest(x, y, max) {
    let best = null, bd = max;
    this.list.forEach(n => { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n; } });
    return best;
  }
};

/* The waypoint. Thirty-two identical desks and no minimap on a phone, so
   "find your desk" needs to be a direction to walk in: a pin when the target
   is on screen, a compass arrow orbiting the player when it is not. */
const Guide = {
  tx: null, ty: null, label: '', flag: null,
  /* Set when the target is a colleague: they walk their own schedule, so the
     pin has to walk with them rather than mark where they were standing when
     you asked. */
  npc: null,
  /* A one-shot pin clears itself the moment you arrive. A tracked job's pin does
     not: you chose it, and it stands until the step moves on or you untrack it. */
  sticky: false,
  /* `flag` is the G.flags key that records arrival, so the guide knows not to
     come back after a save is reloaded. */
  set(tx, ty, label, flag) {
    this.tx = tx; this.ty = ty; this.label = label || ''; this.flag = flag || null;
    this.npc = null; this.sticky = false;
  },
  /* Point at a world object by its `use` handler — the player's desk would move
     if the floor plan were ever rearranged, and a hard-coded (25,26) would not. */
  setObject(use, label, flag) {
    if (flag && G.flags[flag]) return false;
    const o = World.objects.find(x => x.use === use);
    if (o) this.set(o.x, o.y, label, flag);
    return !!o;
  },
  /* A tracked job's target: an object, a colleague or a floor waypoint. Returns
     false when the target cannot be resolved, which is the caller's cue to leave
     the tracker pinless rather than to point at nothing in particular. */
  aim(t) {
    if (!t) return false;
    if (t.npc) {
      const n = NPCM.get(t.npc);
      if (!n) return false;
      if (!NPCM.here(t.npc)) return this.aimAcross(n.level, n.name);
      this.set(Math.floor(n.x / TILE), Math.floor(n.y / TILE), n.name, null);
      this.npc = t.npc; this.sticky = true;
      return true;
    }
    if (t.obj) {
      const o = World.objects.find(x => x.use === t.obj);
      if (!o) return this.aimAcross(Levels.whereIs(t.obj), null);
      this.set(o.x, o.y, o.name, null); this.sticky = true;
      return true;
    }
    /* Waypoints are named spots on the floor plan of the building, so one only
       means anything while you are in the building. */
    if (t.wp && WP[t.wp]) {
      if (Levels.current !== 'office') return this.aimAcross('office', t.label || null);
      this.set(WP[t.wp][0], WP[t.wp][1], t.label || 'this way', null); this.sticky = true;
      return true;
    }
    return false;
  },
  /* The target is somewhere else entirely. The pin cannot be put on it, but it
     can be put on the door out of here that leads towards it — which is the
     honest answer to "where is that" when the answer is "not on this floor",
     and better than the tracker going blank the moment you step outside. */
  aimAcross(levelId, what) {
    if (!levelId || levelId === Levels.current) return false;
    const link = Levels.route(levelId);
    if (!link) return false;
    const door = World.objects.find(x => x.use === link.via);
    if (!door) return false;
    this.set(door.x, door.y, what ? what + ' — this way' : door.name, null);
    this.sticky = true;
    return true;
  },
  /* How far away it is, in steps you have to walk rather than as the crow
     flies. The compass arrow used to divide the straight-line distance by the
     tile size and call it a number, which on this floor plan is a lie by a
     factor of three: the archive is eleven tiles away through a wall and forty
     round the corridor. Nav answers the real question, and falls back to the
     old guess for a target with no way to it at all — a pin the other side of
     a locked door still deserves a number. */
  steps() {
    if (this.tx === null) return 0;
    const s = Nav.steps(Math.floor(P.x / TILE), Math.floor(P.y / TILE), this.tx, this.ty);
    return s === null
      ? Math.round(Math.hypot((this.tx + .5) * TILE - P.x, (this.ty + .5) * TILE - P.y) / TILE) : s;
  },
  clear() { this.tx = this.ty = null; this.label = ''; this.flag = null; this.npc = null; this.sticky = false; },
  on() { return this.tx !== null && G.state === 'play'; },
  /* Arriving is enough — you should not have to interact with the thing to stop
     being pointed at it. A tracked job is the exception: the pin over the person
     you are walking to is what tells you which of twenty colleagues they are, so
     it stays put once you get there. */
  check() {
    if (this.npc) {
      const n = NPCM.get(this.npc);
      if (n) { this.tx = Math.floor(n.x / TILE); this.ty = Math.floor(n.y / TILE); }
    }
    if (this.tx === null || this.sticky) return;
    if (Math.hypot((this.tx + .5) * TILE - P.x, (this.ty + .5) * TILE - P.y) < TILE * 1.4) {
      if (this.flag) G.flags[this.flag] = true;
      this.clear(); Sfx.select();
    }
  },
  /* Called after a save is restored: put the pin back if it is still owed. A
     tracked job comes first — it is the one the player asked for. */
  restore() {
    this.clear();
    if (Track.aim()) return;
    this.setObject('playerDesk', 'Your desk', 'foundDesk');
  },
  /* Called on arriving somewhere new. The same question as after a restore —
     what is owed, and where is it from here — asked against a different map,
     which is why it cannot simply be left alone: the pin was holding tile
     coordinates that mean somewhere else now. */
  onLevel() { this.restore(); }
};

/* ---------------- Camera ---------------- */
const Cam = {
  x: 0, y: 0, w: 800, h: 600,
  /* Follow the player, but never past the edge of the map — and when the map is
     SMALLER than the window, centre it instead. The fourth floor is 2048px wide
     and no screen has ever been that big, so the clamp was only ever asked the
     easy question; a level of a dozen tiles asks the other one, and the old
     bounds crossed over (a minimum above the maximum), which pinned the whole
     map into the top-left corner with the rest of the window left as void. */
  bound(v, span, view) {
    const lo = -40, hi = span * TILE - view + 40;
    if (hi <= lo) return (span * TILE - view) / 2;
    return clamp(v, lo, hi);
  },
  follow(dt) {
    const tx = P.x - this.w / 2, ty = P.y - this.h / 2;
    const k = 1 - Math.pow(0.0015, dt);
    this.x = lerp(this.x, this.bound(tx, MAPW, this.w), k);
    this.y = lerp(this.y, this.bound(ty, MAPH, this.h), k);
  },
  snap() {
    this.x = this.bound(P.x - this.w / 2, MAPW, this.w);
    this.y = this.bound(P.y - this.h / 2, MAPH, this.h);
  },
  visible(wx, wy) { return wx > this.x - 60 && wx < this.x + this.w + 60 && wy > this.y - 60 && wy < this.y + this.h + 60; }
};
