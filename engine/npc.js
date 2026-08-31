'use strict';
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
    this.all = NPCS.map(def => ({
      def, id: def.id, name: def.name, face: def.face, role: def.role,
      /* Everybody works on the fourth floor. It is a call centre; that is the
         whole premise. Written down anyway, because the moment one person does
         not, every reader of `list` is already correct. */
      level: def.level || 'office',
      x: (def.desk[0] + .5) * TILE, y: (def.desk[1] + .5) * TILE,
      tx: def.desk[0], ty: def.desk[1], step: 0, speed: rnd(TILE * 1.05, TILE * 1.4), bob: rnd(0, 6.3),
      say: '', sayT: 0, nextSay: rnd(6, 22), stunTimer: 0, dest: 'desk', stuck: 0
    }));
    this.enter(World.level);
  },
  /* Recompute presence for a level. Called by Levels.go(); a filter once per
     transition rather than a filter every frame in five hot paths. */
  enter(level) {
    this.list = this.all.filter(n => n.level === (level || 'office'));
  },
  get(id) { return this.all.find(n => n.id === id); },
  /* Is this colleague on the level you are on. A job that points at somebody
     upstairs wants the way upstairs, not their desk coordinates applied to the
     floor you are on. */
  here(id) { return this.list.some(n => n.id === id); },
  destTile(n) {
    const sch = n.def.schedule || [];
    let d = 'desk';
    for (const [t, where] of sch) if (G.minutes >= t) d = where;
    n.dest = d;
    if (d === 'desk') return [n.def.desk[0], n.def.desk[1]];
    const w = WP[d]; return w ? w : [n.def.desk[0], n.def.desk[1]];
  },
  update(dt) {
    /* Whoever you are talking to stands still until you have finished. They
       used to keep walking their schedule mid-sentence and simply leave, which
       reads as a bug even when the dialogue carries on perfectly well. The rest
       of the floor keeps moving — the office does not stop for a chat. */
    const talkingTo = (Dialogue.on && Dialogue.npc && Dialogue.npc.id) || null;
    this.list.forEach(n => {
      n.bob += dt * 3.2;
      if (talkingTo && n.id === talkingTo) { n.walking = false; return; }
      if (n.stunTimer > 0) { n.stunTimer -= dt; return; }
      const [dx, dy] = this.destTile(n);
      const cx = n.x / TILE - .5, cy = n.y / TILE - .5;
      const ddx = dx - cx, ddy = dy - cy;
      const dist = Math.hypot(ddx, ddy);
      if (dist > .35) {
        const sp = n.speed * dt;
        let mx = 0, my = 0;
        if (Math.abs(ddx) > Math.abs(ddy)) mx = Math.sign(ddx); else my = Math.sign(ddy);
        if (!this.canGo(n, mx * sp, 0) && mx) { my = Math.sign(ddy) || (chance(.5) ? 1 : -1); mx = 0; }
        if (!this.canGo(n, 0, my * sp) && my && !mx) { mx = Math.sign(ddx) || (chance(.5) ? 1 : -1); my = 0; }
        /* Which way they are facing. The emoji never needed this — a sprite
           does, and it has to be set from the step actually taken rather than
           the direction wanted, or someone squeezing past a desk moonwalks. */
        if (mx || my) n.dir = Sprites.dirOf(mx, my);
        if (this.canGo(n, mx * sp, my * sp)) { n.x += mx * sp; n.y += my * sp; n.stuck = 0; n.step += sp / TILE * 2.6; }
        else {
          n.stuck += dt;
          const alt = chance(.5) ? [Math.sign(ddx) || 1, 0] : [0, Math.sign(ddy) || 1];
          if (this.canGo(n, alt[0] * sp, alt[1] * sp)) { n.x += alt[0] * sp; n.y += alt[1] * sp; }
          if (n.stuck > 4) { n.x = (dx + .5) * TILE; n.y = (dy + .5) * TILE; n.stuck = 0; }
        }
        n.walking = true;
      } else n.walking = false;
      n.sayT -= dt;
      n.nextSay -= dt;
      if (n.nextSay <= 0 && n.def.lines) {
        n.nextSay = rnd(14, 40);
        if (Cam.visible(n.x, n.y) && chance(.6)) { n.say = pick(n.def.lines); n.sayT = 4.2; }
      }
    });
  },
  canGo(n, dx, dy) {
    const nx = n.x + dx, ny = n.y + dy, r = TILE * .27;
    const pts = [[nx - r, ny - r], [nx + r, ny - r], [nx - r, ny + r], [nx + r, ny + r]];
    if (pts.some(([px, py]) => World.isSolid(Math.floor(px / TILE), Math.floor(py / TILE)))) return false;
    /* Colleagues do not walk through you. Without this they could stand on the
       player, who is blocked by them in turn, and the pair would deadlock. */
    if (G.state === 'play' && Math.hypot(nx - P.x, ny - P.y) < TILE * .55) return false;
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
