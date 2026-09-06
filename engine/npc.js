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
  /* PEOPLE WHO ARE NOT MOVING ARE PART OF THE MAP.

     This is the thing that was missing, and everything that went wrong when you
     stood in a doorway follows from not having it. The sweep knew about walls
     and knew nothing about anybody standing still, so a person in the only door
     into the break room was, to every route on the floor, thin air: fifteen
     people walked at the door, arrived at the same square, and stayed there
     shoving, because as far as the map was concerned the way was clear and they
     simply had not got there yet.

     `mask` is that map, one byte a tile, rebuilt when it changes:

       1  a colleague standing at their spot: passable, at the price of six
          squares of walking, which is the difference between going round
          somebody and squeezing past them.

       2  YOU, standing still: passable at fourteen, which is most of the way
          across the floor. Where there is any way round at all they take it —
          they walk round you in a corridor without either of you noticing —
          and where there is not, the route still exists, so they come to the
          door and WAIT there rather than pretending the room does not exist.
          Being a wall was the other extreme and read as the whole floor
          quietly deciding not to have lunch.

     Weighted tiles mean the sweep is Dijkstra rather than breadth-first. Same
     shape, same result where nothing is in the way, and about as fast at this
     size — a floor is under three thousand squares. */
  mask: null, sig: '', COST: [0, 6, 14],
  /* Told by NPCM once things have settled, not every frame: rebuilding the
     routes is cheap but not free, and a crowd shuffling about would otherwise
     rebuild them sixty times a second. */
  setDynamic(sig, block, slow) {
    if (sig === this.sig) return;
    this.sig = sig;
    if (!World.solid) return;
    const m = new Uint8Array(MAPW * MAPH);
    for (const k of slow) { const [x, y] = k.split(',');
      if (x >= 0 && y >= 0 && x < MAPW && y < MAPH) m[y * MAPW + +x] = 1; }
    for (const k of block) { const [x, y] = k.split(',');
      if (x >= 0 && y >= 0 && x < MAPW && y < MAPH) m[y * MAPW + +x] = 2; }
    this.mask = m;
    /* Only the routes that account for people. The compass's own field ignores
       them by definition, so there is nothing in it to go stale. Measured at
       about ten rebuilds a second and a third of a millisecond a frame on a
       floor of twenty people, which is cheaper than being clever about it: a
       version of this that kept stale routes and refreshed a couple per frame
       was no faster and answered with yesterday's traffic. */
    for (const k of [...this.fields.keys()]) if (k[0] !== 'p') this.fields.delete(k);
  },
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
  /* `plain` ignores who is standing where. The compass wants to tell you how
     far you have to walk, not how busy the corridor is this second, and a
     number that jumped by six every time somebody stopped in it would be
     worse than no number. */
  field(tx, ty, plain) {
    if (!World.solid) return null;
    this.fresh();
    const k = (plain ? 'p:' : '') + tx + ',' + ty;
    const hit = this.fields.get(k);
    /* Re-inserting moves the key to the end of a Map's insertion order, which
       is what makes the eviction below least-recently-asked rather than
       oldest-built — the kettle must not be evicted at 11:00 by twenty desks. */
    if (hit) { this.fields.delete(k); this.fields.set(k, hit); return hit; }
    const f = this.build(tx, ty, plain);
    if (this.fields.size >= this.LIMIT) this.fields.delete(this.fields.keys().next().value);
    this.fields.set(k, f);
    return f;
  },
  build(tx, ty, plain) {
    const w = MAPW, h = MAPH, N = w * h;
    const d = new Int32Array(N).fill(-1);
    const m = plain ? null : this.mask;
    /* A binary heap of (cost, tile) packed into one number, which is all
       Dijkstra needs and avoids an object per square. */
    const heap = [];
    const push = v => {
      let i = heap.length; heap.push(v);
      while (i > 0) { const p = (i - 1) >> 1; if (heap[p] <= heap[i]) break;
        const t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        for (let i = 0; ;) {
          const l = i * 2 + 1, r = l + 1; let s = i;
          if (l < heap.length && heap[l] < heap[s]) s = l;
          if (r < heap.length && heap[r] < heap[s]) s = r;
          if (s === i) break;
          const t = heap[s]; heap[s] = heap[i]; heap[i] = t; i = s;
        }
      }
      return top;
    };
    const open = (x, y) => !(x < 0 || y < 0 || x >= w || y >= h) && !World.isSolid(x, y);
    const seed = (x, y, v) => { if (!open(x, y)) return; push(v * N + (y * w + x)); };
    seed(tx, ty, 0);
    /* A waypoint can be ON something — the printer is a solid object and the
       spot in front of it is where you actually stand. Seed the four squares
       around it instead, so "go to the printer" means "go and stand at it"
       rather than "walk into it until the stuck timer fires". */
    if (!heap.length) { seed(tx - 1, ty, 1); seed(tx + 1, ty, 1); seed(tx, ty - 1, 1); seed(tx, ty + 1, 1); }
    while (heap.length) {
      const v = pop(), i = v % N, cost = (v - i) / N;
      if (d[i] !== -1) continue;
      d[i] = cost;
      const x = i % w, y = (i - x) / w;
      const step = (nx, ny) => {
        if (!open(nx, ny)) return;
        const j = ny * w + nx;
        if (d[j] !== -1) return;
        push((cost + 1 + (m ? this.COST[m[j]] : 0)) * N + j);
      };
      step(x - 1, y); step(x + 1, y); step(x, y - 1); step(x, y + 1);
    }
    return d;
  },
  at(f, x, y) { return (!f || x < 0 || y < 0 || x >= MAPW || y >= MAPH) ? -1 : f[y * MAPW + x]; },
  /* Steps from one tile to another, or null when there is no way at all — a
     locked door between the two, or a tile nobody can stand on. */
  steps(fx, fy, tx, ty, plain) {
    const v = this.at(this.field(tx, ty, plain), fx, fy);
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
  now: 0, busyTiles: new Set(), stillTiles: new Map(), boss: null, lastEvent: null, dynAt: 0, stillFor: 0,
  pvx: 0, pvy: 0,
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
        hx: 0, hy: 1, next: null, nextFrom: '', best: 1e9, noProg: 0, gaveUp: null,
        /* Where they decided to go, when they set off, when they got there and
           how long they mean to stay. See destTile. */
        errand: null,
        /* Standing somewhere on purpose, rather than merely being near it. */
        parked: false, waitDoor: 0, holdWant: null, holdFor: 0, lastAim: 'desk', retry: 0,
        queued: 0, waitingFor: null, wayBack: null, wayFor: 0, squeeze: 0
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
      this.hangUp(n); n.post = null; n.gaveUp = null; n.destKey = ''; n.callOut = null;
      n.errand = null; this.repath(n);
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
  /* Where the timetable says to be, in its own words. `drift` is the minutes
     this person is ahead of it or behind it, which is why twenty people no
     longer stand up for their break in the same frame. */
  scheduled(n) {
    const sch = n.def.schedule || [];
    const now = G.minutes + (n.t ? n.t.drift : 0);
    let d = 'desk';
    for (const [t, where] of sch) if (now >= t) d = where;
    return d;
  },
  /* How long the writer meant somebody to be there, in real seconds: the gap to
     the next entry in their day. A game minute is 430ms, which is the whole
     problem below. */
  slotSecs(n) {
    const sch = n.def.schedule || [];
    const now = G.minutes + (n.t ? n.t.drift : 0);
    let start = DAY_START, end = DAY_END;
    for (let i = 0; i < sch.length; i++) {
      if (now >= sch[i][0]) { start = sch[i][0]; end = i + 1 < sch.length ? sch[i + 1][0] : DAY_END; }
    }
    return (end - start) * MS_PER_GAME_MIN / 1000;
  },
  /* WHERE SOMEBODY IS ACTUALLY GOING.

     The timetable proposes and an errand disposes, because the timetable is
     written in game minutes and the building is crossed in real ones. A game
     minute is 430ms: Dave's coffee at 10:15 is fifteen game minutes, which is
     six and a half seconds, and the walk from his desk to the break room is
     nearer thirty. Read literally — which is what this did — he sets off, gets
     as far as the break room door, is told his coffee break ended while he was
     in the corridor, and turns round and walks back. Seventeen of the twenty
     have a slot too short to reach, so the floor was mostly people reversing in
     doorways, all day, and it read exactly as badly as it sounds.

     So: setting off somewhere is a commitment. They go, they arrive, they stay
     long enough for it to have been worth going — the shorter of what the
     writer wrote and their own patience for standing about — and only then does
     the timetable get a say again. Nothing in data/npcs.js changes, and what it
     says now happens: Dave has a coffee at quarter past ten.

     A desk is not an errand. Going back to your desk is what you do when there
     is nothing else, and it can be interrupted by anything. */
  destTile(n) {
    /* Called away. An override on everything, with an expiry on it, set by
       watchFloor() when something happens to the building — see REACT. */
    if (n.callOut) {
      if (this.now < n.callOut.until && WP[n.callOut.wp]) {
        n.errand = null; n.dest = n.callOut.wp; return WP[n.callOut.wp];
      }
      n.callOut = null;
    }
    const want = this.scheduled(n);
    const e = n.errand;
    if (e) {
      /* Still on the way. The timetable can say what it likes. */
      if (!e.arrived && this.now - e.began < 90) return this.aim(n, e.wp);
      /* Been and stood there. It is over when they have had their moment AND
         the day has moved on; if the timetable still wants them here they stay,
         which is what a lunch break is. */
      const done = e.arrived && this.now - e.arrived >= e.dwell;
      if (!done && this.now - e.began < 90) return this.aim(n, e.wp);
      n.errand = null;
    }
    if (want !== 'desk' && WP[want]) {
      /* Not the instant the clock says so. Nobody stands up mid-sentence
         because it has become half past: they finish the thing they are doing
         and then they go. Without the wait the timetable's entries — which
         cluster, because a day has a shape — took the whole floor out of their
         chairs on the same frame, and twenty people crossing the office at once
         is a fire drill, not a Tuesday. */
      if (n.holdWant !== want) { n.holdWant = want; n.holdFor = this.now + rnd(1, 11); }
      if (this.now < n.holdFor) return this.aim(n, n.lastAim || 'desk');
      /* Forgotten once they have set off, so the next time the day asks them to
         go there they take a moment about it again rather than leaping up. */
      n.holdWant = null;
      n.errand = { wp: want, began: this.now, arrived: 0,
        /* Long enough to have been worth the walk, short enough that a quick
           one reads as a quick one. */
        dwell: clamp(this.slotSecs(n), 7, 26) };
      return this.aim(n, want);
    }
    return this.aim(n, want);
  },
  /* Resolve a destination name to the square it means, and record it. */
  aim(n, where) {
    n.dest = n.lastAim = where;
    if (where === 'desk') return [n.def.desk[0], n.def.desk[1]];
    const w = WP[where];
    return w ? w : [n.def.desk[0], n.def.desk[1]];
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
  /* A doorway is one square wide and holds ONE person. Not a timer, not a
     token, not a rule about which way everybody is going: the square either has
     somebody in it or it does not, and if it does you wait for it.

     Both cleverer versions of this failed in opposite directions. A three
     second hold on the door halved the way into the break room and left two
     thirds of the floor in the corridor. Letting people going the same way
     share it meant that the moment you stepped out of a doorway the eight
     people who had been waiting for you all walked into it at once and jammed
     — which is the same heap as before, just delayed by however long you stood
     there. Occupancy is the honest test and it is the fastest one: a person
     crosses a square in under a second, so a door still passes two people a
     second, which is a door.

     The second loop is the queue's order. Two people arriving together would
     otherwise both find it empty on the same frame and both step in; the one
     nearer has it, and a tie goes to whoever's name says so, so both of them
     reach the same answer without either having to ask. */
  doorClear(n, x, y) {
    for (const o of this.list) {
      if (o === n) continue;
      if (Math.floor(o.x / TILE) === x && Math.floor(o.y / TILE) === y) return false;
    }
    /* You in the doorway stop it being free — unless this is somebody who has
       already waited for you and is edging past, which is the one case where
       two people are in a doorway on purpose. */
    if (!(n.squeeze > 0) && G.state === 'play'
      && Math.floor(P.x / TILE) === x && Math.floor(P.y / TILE) === y) return false;
    const cx = (x + .5) * TILE, cy = (y + .5) * TILE;
    const mine = Math.hypot(cx - n.x, cy - n.y);
    for (const o of this.list) {
      if (o === n || !o.walking || !o.next) continue;
      if (o.next[0] !== x || o.next[1] !== y) continue;
      const theirs = Math.hypot(cx - o.x, cy - o.y);
      if (theirs < mine - 2 || (Math.abs(theirs - mine) <= 2 && this.hash(o.id) < this.hash(n.id))) return false;
    }
    return true;
  },
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
    /* Long enough for the whole floor to get through the stairwell door, which
       is one square wide and now takes people one at a time: twenty of them
       queueing for it is most of a minute before the last one is through, and
       the drill should last longer than the queue for it. */
    firealarm2: { go: 'fireEsc', secs: 88, haste: 1.5 },
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
  /* Hand the routes the people. Three times a second rather than sixty: a crowd
     shuffling about would otherwise rebuild every route on the floor every
     frame, and none of this changes fast enough to notice.

     A colleague standing somewhere is a square worth going round. YOU standing
     somewhere, once you have actually stopped, are a square nobody can cross —
     which is the whole point: with you in the only doorway the break room comes
     back unreachable, and fifteen people who would otherwise walk into your
     back and shove find that out before they set off. Move, and it is a door
     again within a third of a second. */
  dynamics() {
    if (this.now < this.dynAt) return;
    const dt = this.now - this.dynAt + .34;
    this.dynAt = this.now + .34;
    const slow = [], block = [];
    for (const n of this.list) if (!n.walking) slow.push(Math.floor(n.x / TILE) + ',' + Math.floor(n.y / TILE));
    if (G.state === 'play') {
      this.stillFor = P.moving ? 0 : this.stillFor + dt;
      const k = Math.floor(P.x / TILE) + ',' + Math.floor(P.y / TILE);
      /* Standing still you are worth going a long way round; walking you are
         worth going round the way a colleague is, because you will probably not
         be there by the time they arrive. Being in the map ONLY when stopped
         was why somebody walking towards you would keep coming until they were
         nose to nose with you: while you were moving there was nothing in the
         map to go round. */
      if (this.stillFor > .35) block.push(k); else slow.push(k);
    } else this.stillFor = 0;
    Nav.setDynamic(block.join('|') + '#' + slow.join('|'), block, slow);
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
    /* Which way you are going, so somebody can tell being walked into from
       being walked past. */
    this.pvx = P.x - (this.pxWas === undefined ? P.x : this.pxWas);
    this.pvy = P.y - (this.pyWas === undefined ? P.y : this.pyWas);
    this.pxWas = P.x; this.pyWas = P.y;
    this.watchFloor();
    this.dynamics();
    /* Where everybody who is standing still is standing, once per frame, as
       tile keys. The walk below prices these up so a knot of people is walked
       round rather than into — and nothing else reads it, so it is rebuilt
       rather than maintained. */
    this.busyTiles.clear(); this.stillTiles.clear();
    for (const n of this.list) if (!n.walking) {
      const k = Math.floor(n.x / TILE) + ',' + Math.floor(n.y / TILE);
      this.busyTiles.add(k); this.stillTiles.set(k, n);
    }
    if (G.state === 'play') {
      const k = Math.floor(P.x / TILE) + ',' + Math.floor(P.y / TILE);
      this.busyTiles.add(k);
      /* Only when you have actually stopped: waiting behind somebody who is
         walking is waiting for nothing, and they are gone next frame anyway. */
      if (!P.moving) this.stillTiles.set(k, P);
    }
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
      /* Edging past you lasts until they are past you. Ticking it down on a
         timer meant the squeeze expired the instant it started working: they
         inched forward, that counted as movement, the wait reset, and the whole
         negotiation began again — about a fiftieth of a square at a time. */
      if (n.squeeze > 0) {
        if (G.state === 'play' && Math.hypot(P.x - n.x, P.y - n.y) < TILE * 1.3) n.squeeze = 1.2;
        else n.squeeze -= dt;
      }

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

      /* Long enough waiting for the door to clear: have another look. If it is
         still blocked they will be back here in a moment, having lost nothing
         but a glance down the corridor. */
      if (n.retry && this.now > n.retry) { n.retry = 0; n.post = null; this.repath(n); }
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
      /* Parked is a decision, not a distance. Somebody who has stopped
         somewhere stays stopped until the square changes under them or they are
         shoved the better part of a square off it — not because a colleague
         squeezed past and the arithmetic briefly said they were half an inch
         too far away. That reading is what had people setting off again the
         instant they arrived. */
      if (n.parked && (near > 1.05 || (!onPost && near > .8))) n.parked = false;
      const there = n.parked || near <= (n.walking ? .34 : .62) || (onPost && n.noProg > 1.5);
      if (!there) this.walk(n, dt, tx, ty);
      else {
        if (n.walking) this.repath(n);
        n.walking = false; n.parked = true; n.waitDoor = 0;
        /* Got there. From here the errand is a thing that happened rather than
           a thing being attempted, and the clock on standing about starts. */
        if (n.errand && !n.errand.arrived) n.errand.arrived = this.now;
        this.makeWay(n, playing);
        this.nestle(n, dt, tx, ty);
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
    /* There is no way there at all right now — somebody is standing in the only
       door. Not a reason to walk at it: a reason to wait. */
    if (far === null && Nav.mask) return this.waitOut(n);
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
    /* Decided once per square entered and then held. Re-asking when somebody
       walks into the chosen square sounds obviously right and is not: the
       routes already price people standing still, so the answer would flip
       between "the square beside you looks better from here" and "this one
       looks better from there" — and in a crowded room, where the chosen square
       is somebody else half the time, it cost a third of the floor their lunch.
       The map does the going-round; this only has to follow it. */
    if (n.nextFrom !== from) {
      n.nextFrom = from;
      /* The second term is a lane. Twenty people walking the same corridor to
         the same room have the same field in front of them and, without this,
         take the identical squares in the identical order and arrive as one
         lump. A fixed dislike of particular squares, different for each person
         and worth well under a step, breaks that tie differently for each of
         them: the same crowd fans out across the width of the corridor and
         reads as people going the same way rather than a queue of one file. */
      /* Both terms are worth less than a single step, deliberately. The routes
         themselves now price people standing still — six squares for a
         colleague, fourteen for you — and that is a global cost every square
         agrees on. A big LOCAL penalty on top of it fights the route: with you
         on the one square into the break room, the square beside you looked
         cheaper from here and the route looked cheaper from there, and somebody
         crossed between the two for the rest of the afternoon. So: a nudge to
         step around somebody where it costs nothing, a per-person dislike of
         particular squares so a crowd fans out across a corridor, and no
         opinion strong enough to argue with the map. */
      n.next = Nav.next(fx, fy, tx, ty, (x, y) =>
        (this.busyTiles.has(x + ',' + y) ? 2.5 : 0) + (this.hash(n.id + ':' + x + ',' + y) % 64) / 100);
    }
    const step = n.next;
    /* Waiting for somebody to come the other way through a door. Standing, not
       shuffling: a queue at a door is people standing behind each other, and a
       walk cycle running on the spot is the tell that nothing is really being
       simulated. Held for its whole duration rather than re-asked every frame,
       or they flicker between standing and walking sixty times a second. */
    if (n.waitDoor > 0) {
      n.waitDoor -= dt; n.walking = false;
      /* Waiting your turn is not failing to get anywhere: without this, a busy
         door would eventually convince somebody that the walk was hopeless and
         send them to stand somewhere else. */
      n.noProg = Math.max(0, n.noProg - dt);
      return;
    }
    /* SOMEBODY IS STANDING IN THE NEXT SQUARE, SO WAIT.

       This is the queue, and it is the piece that was missing. The route knows
       about people standing still and prices them at six squares — so if it
       still wants to go through one, there is no way round worth taking, and
       walking into their back is not going to produce one. Stop and wait.

       It propagates, which is the point: the first person waits for you, the
       second waits for the first, and a line forms back down the corridor
       instead of everybody arriving at the same square and shoving. That was
       the mob. Nobody was ever waiting for anybody. How long they wait, and
       for whom, is holdOn below. */
    const who = step && this.stillTiles.get(step[0] + ',' + step[1]);
    /* Somebody in the way, whether or not we are still prepared to wait for
       them, is not the walk failing — it is the walk queueing. Six people gave
       up three steps from the fire escape door and stood in the lobby for the
       whole drill because the clock on a hopeless walk kept running while they
       were second in a queue. */
    if (who) n.noProg = Math.max(0, n.noProg - dt);
    /* Twenty seconds of queueing for a door somebody is standing in is long
       enough to decide you did not want a coffee that much. The errand is
       dropped and the day moves on — which is what stops the entire floor
       accumulating in one corridor while you read a poster. */
    if (n.queued > 20) {
      n.queued = 0; n.errand = null; n.post = null; n.holdWant = null;
      this.repath(n); n.walking = false;
      return;
    }
    /* Waiting for YOU, and it has gone on long enough: they are going to edge
       past. Set outside the branch below and refreshed while you are still
       there, because once the wait is spent they stop taking that branch at all
       — and a squeeze that expires the moment it is needed is a person walking
       up to you, deciding to get past, and then not. */
    if (who === P && n.queued > 2) n.squeeze = 1.2;
    if (who && this.holdOn(n, who)) {
      /* Counted every frame. It used to set the quarter-second hold below as
         well, which returns before this line — so waiting for twenty seconds
         put about one and a half on the clock, nobody ever reached the point of
         edging past, and a person in a doorway was a wall after all. */
      n.queued += dt; n.walking = false;
      n.waitingFor = who === P ? 'player' : who.id;
      n.dir = this.face(n, (step[0] + .5) * TILE - n.x, (step[1] + .5) * TILE - n.y);
      /* If it is you in the way, they look at you. It is the only way to tell
         from the screen that you are the reason nothing is happening. */
      if (who === P) { n.lookAt = P; n.lookT = Math.max(n.lookT, 1.2); }
      /* And they hold their own square while they wait rather than pressing up
         against the back of the person in front, so a queue is a line of people
         one square apart instead of a heap with a direction. */
      this.nestle(n, dt, fx, fy);
      return;
    }
    n.waitingFor = null;
    if (step && this.inDoorway(step[0], step[1]) && !this.doorClear(n, step[0], step[1])) {
      n.walking = false; n.waitDoor = .2;
      n.noProg = Math.max(0, n.noProg - dt);
      n.dir = this.face(n, (step[0] + .5) * TILE - n.x, (step[1] + .5) * TILE - n.y);
      return;
    }
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

    /* Easing in, and not barging: somebody arriving slows into the last square
       rather than stopping dead on it, and somebody walking up behind a person
       who is standing still slows down instead of shoving.

       Not both at once, and neither of them far from the target. Compounded —
       and measured in steps rather than in distance, which meant the whole last
       square — they multiplied out to a fifth of walking pace across a crowded
       room, and twenty people crawling the last stretch is twenty people
       arriving in a heap. */
    let pace = n.speed * (n.callOut ? n.callOut.haste : 1);
    const eu = Math.hypot(tx - (n.x / TILE - .5), ty - (n.y / TILE - .5));
    if (eu < .9) pace *= clamp(.5 + eu * .55, .5, 1);
    else if (step && this.busyTiles.has(step[0] + ',' + step[1])) pace *= .72;
    const sp = pace * dt;
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
      /* Not while edging past somebody: the whole point is that it takes a few
         steps and they are not starting the wait again for each one. */
      if (!(n.squeeze > 0)) n.queued = 0;
      n.step += Math.hypot(wx, wy) / TILE * 2.6;
      /* Which way they are facing, from the held heading rather than from the
         last frame's step: the step is a fraction of a pixel and squeezing past
         a desk makes it point sideways for a moment, which used to turn them. */
      n.dir = this.face(n, n.hx, n.hy);
    } else {
      n.stuck += dt;
      /* Blocked by a person rather than a wall — the walls are already routed
         around. Step to your OWN RIGHT, always, and commit to it for half a
         second.

         Which side used to be a coin toss, and a coin toss is how two people
         end up doing the little dance in a doorway: both of them step the same
         way, block each other again, and roll again. Everybody keeping right is
         the rule actual corridors run on — two people walking into each other
         both step right and pass, without either of them having to know that
         the other one exists. */
      if (n.evade <= 0 && n.stuck > .45) {
        const rx = -vy, ry = vx;
        const ok = this.canGo(n, rx * TILE * .3, ry * TILE * .3);
        n.evadeX = ok ? rx : -rx; n.evadeY = ok ? ry : -ry; n.evade = .6;
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
  /* SOMEBODY IS WAITING FOR YOU. MOVE.

     The last thing missing, and the one that turns every remaining jam back
     into people. Anyone who has stopped somewhere can be standing exactly where
     somebody else has to walk, and until now the answer was for the other
     person to wait — for ever, if the spot was in a corridor a square wide.
     A fire drill ended with Bev parked in the one lane into the stairwell and
     seven colleagues queueing behind her in perfect order for the whole of it.

     So: if anybody is waiting on the square you are standing on, take a
     different one. Same for you walking into somebody — they get out of your
     way rather than making you go round, which is the difference between a
     crowd and a set of bollards.

     They keep the new square. Where they stand is not the point; that they are
     in the break room is. */
  /* Sitting down, as the renderer means it: stopped on a chair. */
  seated(n) {
    return !n.walking && !!Sprites.seatedAt(Math.floor(n.x / TILE), Math.floor(n.y / TILE));
  },
  makeWay(n, playing) {
    /* Nobody stands up for you. They are sitting down — at a break table, in
       the meeting room, in the Good Chair — and a chair is not in anybody's
       way: you walk round it, as you would. Getting up because somebody came
       near was the single least human thing on this floor. */
    if (this.seated(n)) return;
    /* And back again, once whoever it was has gone past. Stepping aside has to
       be a step aside: without the way back they take the new square as theirs,
       get asked again by the next person, take another, and by the end of lunch
       have been shuffled across the room by a series of individually reasonable
       decisions. That is the arriving-then-wandering-off this had before, back
       by a different road. */
    if (n.wayBack && this.now > n.wayFor) {
      const [bx, by] = n.wayBack, k = bx + ',' + by;
      const free = !this.stillTiles.has(k)
        && !this.list.some(o => o !== n && o.post && o.post[0] === bx && o.post[1] === by);
      n.post = free ? n.wayBack : n.post;
      n.wayBack = null;
      if (free) { this.repath(n); return; }
    }
    if (this.now < n.wayFor) return;
    let asked = this.list.some(o => o.waitingFor === n.id);
    /* And for you, only when you are actually walking INTO them rather than
       past them or round them: near, moving, and moving towards. Standing next
       to somebody is not a request for them to move. */
    if (!asked && playing && P.moving) {
      const dx = n.x - P.x, dy = n.y - P.y, d = Math.hypot(dx, dy);
      if (d < TILE * .8 && (this.pvx * dx + this.pvy * dy) > 0) asked = true;
    }
    if (!asked) return;
    const spot = this.freeSpotNear(n, true);
    if (spot) {
      if (!n.wayBack) n.wayBack = n.post;
      n.post = spot; this.repath(n);
      n.wayFor = this.now + rnd(2.5, 4.5);
    }
  },
  /* How long to wait for whoever is in the next square, which depends entirely
     on whether they are ever going to move.

     YOU: indefinitely. You are a person, you are going somewhere, and walking
     into your back would not make you go there faster.

     Somebody waiting in a queue: indefinitely as well, because the queue clears
     from the front — unless they are waiting for US, which is two people being
     polite at each other for the rest of the shift. That one is settled by
     name, so exactly one of the two gives up and squeezes past.

     Somebody who has arrived and is standing at their spot: three seconds, and
     then squeeze past them. They are not going anywhere at all, and a colleague
     standing between you and the kettle is not a reason to give up on tea. */
  holdOn(n, who) {
    /* Two and a half seconds for anybody, and then edge past them.

       It used to be "wait for the player indefinitely", on the grounds that you
       are going somewhere and walking into your back will not help. True, and
       it made three squares of the building — a doorway and the square either
       side of it — into a wall whenever you stood on one, because two people
       cannot be in a one-square gap at once. Nobody would put up with that in a
       corridor; they wait a moment, and then they edge past you, and everybody
       pretends not to notice. See `squeeze` in canGo.

       That second rule started out cleverer — wait for as long as they are
       waiting for somebody who is not you, because a queue clears from the
       front — with a tie-break for two people politely waiting for each other.
       It handled two. Nine people at a break room door wait in a ring, A for B
       for C for A, and no pairwise rule sees it: they stood in the corridor
       mouth for the rest of lunch being immaculately polite. A bounded wait
       cannot deadlock however many people are in the knot, and two and a half
       seconds is still long enough that an ordinary queue never reaches it. */
    /* You: a couple of seconds, then edge past — see `squeeze` in canGo.
       A colleague: six, which is long enough that a queue always clears from
       the front before anybody in it gives up, and short enough that a ring of
       people politely waiting for each other cannot last. Bounded, because no
       pairwise politeness rule can see a ring of nine. */
    if (who === P) {
      /* ONE person edges past you after a couple of seconds. A QUEUE waits.
         Somebody getting on with their day squeezes by and you barely notice;
         twelve people doing it one after another is a scrum going through you,
         and the difference between the two is whether anybody is queueing
         behind them. The head of a queue holds the line — and the twenty
         seconds that drops an errand drains it if you stay put. */
      return this.list.some(o => o !== n && o.waitingFor === n.id) || n.queued < 2.5;
    }
    /* Behind somebody who is themselves waiting, this is a queue and queues
       clear from the front, so hold the line. Behind somebody who has simply
       stopped somewhere, two and a half seconds and then go round them.

       Neither is unbounded. A ring of people politely waiting for each other
       cannot be seen by any rule that only looks at one pair, so the long wait
       is long rather than infinite, and the twenty seconds that drops the
       errand entirely sits behind it as a backstop. */
    return n.queued < (who.waitingFor ? 25 : 2.5);
  },
  /* Nowhere to go for the moment. Stand somewhere out of the way — not in a
     doorway, not on top of anybody — and try again in a few seconds.

     This is what fifteen people did instead of piling into the back of somebody
     standing in the break room door. It is also just what people do: you get to
     the corridor, you see the door is blocked, and you wait, near it, until it
     is not. */
  waitOut(n) {
    n.walking = false;
    if (!n.parked) {
      const spot = this.freeSpotNear(n);
      if (spot) { n.post = spot; n.parked = true; this.repath(n); n.parked = true; }
    }
    n.retry = this.now + rnd(1.5, 4);
  },
  /* Forget everything about the walk in progress: where it was going, how well
     it was going, and which way it was leaning. Called whenever the target
     changes under it. */
  repath(n) {
    n.best = 1e9; n.noProg = 0; n.stuck = 0; n.evade = 0; n.next = null; n.nextFrom = '';
    n.parked = false; n.waitDoor = 0;
  },
  /* The nearest square to somebody that they can stand on and nobody has
     claimed — theirs first, then the ring around it. */
  freeSpotNear(n, notHere) {
    const hx = Math.floor(n.x / TILE), hy = Math.floor(n.y / TILE);
    const ring = [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (const [ox, oy] of ring) {
      if (notHere && !ox && !oy) continue;
      const x = hx + ox, y = hy + oy;
      if (World.isSolid(x, y) || this.inDoorway(x, y)) continue;
      if (this.list.some(o => o !== n && o.post && o.post[0] === x && o.post[1] === y)) continue;
      return [x, y];
    }
    return null;
  },
  /* Standing on your own square but not in the middle of it, because that is
     where the crowd let them stop. Ease into the middle: a few pixels a second,
     no walk cycle, and only ever into space nobody else is in. Twenty people
     each ending up on the centre of their own square is a room that reads as
     people standing about; twenty people stopped wherever the shoving left them
     is a heap. */
  nestle(n, dt, tx, ty) {
    const ax = (tx + .5) * TILE - n.x, ay = (ty + .5) * TILE - n.y;
    const d = Math.hypot(ax, ay);
    if (d < 1.2) return;
    const sp = Math.min(d, TILE * .5 * dt);
    const mx = ax / d * sp, my = ay / d * sp;
    if (this.canGo(n, mx, my)) { n.x += mx; n.y += my; }
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
    /* Somebody edging past you in a doorway has decided to be close to you.
       Leaning away from you at the same time is the two halves of one person
       disagreeing, and the lean wins, so they hover at arm's length for ever. */
    if (G.state === 'play' && !(n.squeeze > 0)) {
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
      /* Once every couple of minutes for the restless, and never for the still.
         It was ten times that, which across twenty people is somebody shifting
         about every three seconds somewhere in the room — not a room of people,
         a room of fidgeting. */
      n.idleT = rnd(14, 40);
      if (!n.chat && n.dest !== 'desk' && !this.seated(n) && chance(n.t.restless * .35)) {
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
      /* How much room you get. Normally rather more than a colleague, because
         being clipped by somebody on their way to the printer reads as the game
         shoving you. But somebody who has waited for you in a doorway and got
         nowhere gets to breathe in and edge past instead — which is what a
         person does, and is the difference between a doorway and a wall. */
      const d = Math.hypot(nx - P.x, ny - P.y);
      /* Squeezing has to actually get past, and "no step that fails to increase
         the distance" cannot: crossing a doorway somebody is standing in means
         getting closer before getting further away, so at anything but a
         shoulder's width they stop at arm's length and stay there for ever.
         A fifth of a square is a shoulder's width. */
      const room = n.squeeze > 0 ? TILE * .18 : TILE * .55;
      if (d < room && d <= Math.hypot(n.x - P.x, n.y - P.y)) return false;
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
    const s = Nav.steps(Math.floor(P.x / TILE), Math.floor(P.y / TILE), this.tx, this.ty, true);
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
