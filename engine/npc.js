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
     walk through the corner of the partition. */
  next(fx, fy, tx, ty) {
    const f = this.field(tx, ty);
    if (!f) return null;
    const here = this.at(f, fx, fy);
    if (here <= 0) return null;
    let bx = 0, by = 0, best = here;
    const open = (x, y) => this.at(f, x, y) >= 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const v = this.at(f, fx + ox, fy + oy);
      if (v < 0 || v >= best) continue;
      if (ox && oy && !(open(fx + ox, fy) && open(fx, fy + oy))) continue;
      best = v; bx = ox; by = oy;
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
        post: null, walking: false, chat: null, chatCool: rnd(5, 40),
        lookAt: null, lookT: 0, idleT: rnd(2, 9), evade: 0, evadeX: 0, evadeY: 0
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
      notice: 1 + bit(4)                  /* how close you get before they look up, in tiles */
    }, def.traits || {});
  },
  /* Recompute presence for a level. Called by Levels.go(); a filter once per
     transition rather than a filter every frame in five hot paths. */
  enter(level) {
    this.list = this.all.filter(n => n.level === (level || 'office'));
    /* Nobody carries a conversation, a claimed spot or a grudge against a
       doorway across a level change: all three are about a floor plan that is
       no longer loaded. */
    this.all.forEach(n => { this.hangUp(n); n.post = null; n.stuck = 0; n.evade = 0; n.destKey = ''; });
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
    const sch = n.def.schedule || [];
    const now = G.minutes + (n.t ? n.t.drift : 0);
    let d = 'desk';
    for (const [t, where] of sch) if (now >= t) d = where;
    n.dest = d;
    if (d === 'desk') return [n.def.desk[0], n.def.desk[1]];
    const w = WP[d]; return w ? w : [n.def.desk[0], n.def.desk[1]];
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
    const f = Nav.field(dx, dy);
    /* Outwards a shell at a time, and round each shell from a different point
       per person: nearest to the thing they came for wins, and the queue for
       the kettle does not form in the same direction every day with the third
       person to arrive always standing in the doorway. Three shells is
       forty-eight squares, which is more people than work here. */
    const spin = this.hash(n.id);
    for (let ring = 0; ring <= 3; ring++) {
      const cells = [];
      for (let oy = -ring; oy <= ring; oy++) for (let ox = -ring; ox <= ring; ox++)
        if (Math.max(Math.abs(ox), Math.abs(oy)) === ring) cells.push([ox, oy]);
      const off = spin % cells.length;
      for (let i = 0; i < cells.length; i++) {
        const r = cells[(i + off) % cells.length];
        const x = dx + r[0], y = dy + r[1];
        if (World.isSolid(x, y) || taken.has(x + ',' + y)) continue;
        /* Connected to the destination, not merely near it: the tile the other
           side of the break room wall is one square from the kettle and a walk
           round three corridors away from it. One field answers this for every
           candidate, which is why the destination's is the one asked. */
        if (f && Nav.at(f, x, y) < 0) continue;
        return (n.post = [x, y]);
      }
    }
    return (n.post = [dx, dy]);
  },
  update(dt) {
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
        n.dir = Sprites.dirOf(P.x - n.x, P.y - n.y);
        return;
      }
      if (n.stunTimer > 0) { n.stunTimer -= dt; n.walking = false; return; }

      const [dx, dy] = this.destTile(n);
      const key = n.dest + ':' + dx + ',' + dy;
      /* The timetable has moved them on. Give up the square of carpet, and stop
         talking — you can be mid-sentence when it gets to half past, and that
         is what an office sounds like. */
      if (key !== n.destKey) { n.destKey = key; n.post = null; this.hangUp(n); n.stuck = 0; n.evade = 0; }

      const [tx, ty] = this.post(n, dx, dy);
      const cx = n.x / TILE - .5, cy = n.y / TILE - .5;
      if (Math.hypot(tx - cx, ty - cy) > .34) this.walk(n, dt, tx, ty);
      else { n.walking = false; n.stuck = 0; n.evade = 0; this.settle(n, dt, dx, dy, playing); }

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
    const step = Nav.next(fx, fy, tx, ty);
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

    const sp = n.speed * dt;
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
      /* Which way they are facing. The emoji never needed this — a sprite
         does, and it has to be set from the step actually taken rather than
         the direction wanted, or someone squeezing past a desk moonwalks. */
      n.dir = Sprites.dirOf(wx, wy);
    } else {
      n.stuck += dt;
      /* Blocked by a person rather than a wall — the walls are already routed
         around. Pick a side ONCE and commit to it for half a second: rolling a
         new direction every frame is a person vibrating in a doorway. */
      if (n.evade <= 0 && n.stuck > .45) {
        const s = chance(.5) ? 1 : -1;
        n.evadeX = -vy * s; n.evadeY = vx * s; n.evade = .6;
      }
      /* Blocked, and near enough. Stop here — the last two tiles of a walk
         across a full break room are people, not floor, and standing where you
         got to is what a person does. The tile they are on becomes the spot
         they have claimed, so nobody walks into it either. */
      if (n.stuck > 1.5) {
        const hx = Math.floor(n.x / TILE), hy = Math.floor(n.y / TILE);
        const free = !this.list.some(o => o !== n && o.post && o.post[0] === hx && o.post[1] === hy);
        if (free && Math.hypot(tx - hx, ty - hy) <= 1.6 && !World.isSolid(hx, hy)) {
          n.post = [hx, hy]; n.stuck = 0; n.evade = 0; return;
        }
      }
      /* Still nowhere, and not near enough to shrug it off: give the spot up
         and take another. Somebody else has usually taken the good one, and a
         person who ends up standing a bit further along is both what happens in
         a queue for a kettle and the thing that unjams the queue. */
      if (n.stuck > 3) { n.post = null; n.stuck = 0; n.evade = 0; return; }
      /* The old safety valve, kept, and now genuinely a last resort: twelve
         seconds of getting nowhere, and only where nobody can watch it happen.
         It used to fire after four seconds in plain view, which is how Priya
         came to teleport across the break room in front of people. */
      if (n.stuck > 12 && !Cam.visible(n.x, n.y)) {
        n.x = (tx + .5) * TILE; n.y = (ty + .5) * TILE; n.stuck = 0; n.evade = 0;
      }
    }
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
      if (d < TILE * n.t.notice) { n.lookAt = P; n.lookT = Math.max(n.lookT, .9); }
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
    if (partner) n.dir = Sprites.dirOf(partner.x - n.x, partner.y - n.y);
    else if (n.lookT > 0 && n.lookAt) n.dir = Sprites.dirOf(n.lookAt.x - n.x, n.lookAt.y - n.y);
    else if (n.dest === 'desk') n.dir = 0;    /* the screen is on the far side of the desk */
    else if (n.post && (n.post[0] !== dx || n.post[1] !== dy)) n.dir = Sprites.dirOf(dx - n.post[0], dy - n.post[1]);

    /* Standing somewhere is not standing on one tile for four hours. The
       restless shift along the counter now and then; the still stay still. */
    n.idleT -= dt;
    if (n.idleT <= 0) {
      n.idleT = rnd(7, 20);
      if (!n.chat && n.dest !== 'desk' && chance(n.t.restless * .55)) n.post = null;
    }
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
