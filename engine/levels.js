'use strict';
/* ---------------- Level loading and streaming ----------------
   World holds one map — whichever level is loaded. This holds the rest of them,
   decides when to build one and when to throw it away, and moves the player
   between them.

   Three ideas, and they are the whole file:

   A level is BUILT LAZILY. Nothing but the fourth floor exists when the game
   starts; the basement is built the first time somebody lifts the hatch. That
   is what keeps boot the same length it has always been however many levels the
   catalogue grows to.

   A built level is KEPT. Re-entering one is a reference assignment, not a
   rebuild, so walking in and out of a door costs nothing and — much more
   importantly — the level is still in the state you left it. The cache is
   bounded (BUDGET) because an unbounded cache is not a cache, and the hub is
   pinned because it is the level with twenty colleagues and a queue of phones
   on it and it is never the right thing to evict.

   Neighbours are PREFETCHED while nothing is happening. Once you are standing
   somewhere, whatever is one door away gets built during an idle slot, so the
   transition itself never has to wait for one. This is the streaming: it is not
   chunks of an open world, because the maps here are a few thousand tiles and
   the honest unit is the room, but the shape is the same — build ahead of the
   player, keep what is close, drop what is far.

   Nothing outside this file names a destination. An act says take('hatch') and
   the link table in data/levels.js says where the hatch goes, which is also
   what lets route() work out which door to point at for somewhere two levels
   away. */
const Levels = {
  /* Built levels kept besides the pinned hub. Two is enough to make a there-
     and-back-again free while keeping the ceiling on memory obvious. */
  BUDGET: 2,
  cache: new Map(),
  /* Least-recently-used first. Which one to drop when the budget is exceeded. */
  order: [],
  current: null,
  /* Set while a transition is in flight, so a second one cannot start on top of
     it — two overlapping transitions leave the player on one level with the
     other level's arrival point. */
  moving: false,

  /* Every field of World that belongs to the map rather than to the builder.
     Swapping levels is assigning this list across, which is why it has to be
     complete: anything left off is silently retained from the previous level,
     and a stale `desks` draws the fourth floor's workstations on the road. */
  FIELDS: ['def', 'level', 'solid', 'zone', 'seed', 'ao', 'objects', 'byTile',
    'doorways', 'desks', 'worktops', 'tables', 'counters', 'blocked'],

  /* Object fields that a level's own state may change after it is built, and
     that therefore have to survive being evicted and rebuilt. Everything else
     about an object is derived from the definition and comes back identical. */
  MUT: ['ringing', 'waited', 'hot', 'locked', 'st'],

  init() {
    /* The catalogue is keyed by id, so the id need not be written twice — and
       cannot disagree with itself. */
    for (const id in LEVELS) LEVELS[id].id = id;
    this.cache.clear(); this.order = []; this.current = null; this.moving = false;
  },
  def(id) { return LEVELS[id] || null; },
  /* The level definitions, in catalogue order. */
  ids() { return Object.keys(LEVELS); },

  /* ---- the cache ---- */

  snapshot() {
    const r = {};
    this.FIELDS.forEach(k => r[k] = World[k]);
    r.w = MAPW; r.h = MAPH;
    return r;
  },
  apply(rec) {
    this.FIELDS.forEach(k => World[k] = rec[k]);
    MAPW = rec.w; MAPH = rec.h;
  },
  /* Build a level into a record WITHOUT disturbing the one on screen. World is
     the only thing that can build, so it is borrowed and handed back — which is
     what lets prefetch run while the player is standing somewhere else. */
  build(id) {
    const def = this.def(id);
    if (!def) return null;
    const live = World.level ? this.snapshot() : null;
    World.build(def);
    const rec = this.snapshot();
    const keep = this.state[id];
    if (keep) this.reapply(rec, keep);
    if (live) this.apply(live);
    return rec;
  },
  /* The record for a level, building it if this is the first time anybody has
     asked. Every path to a level goes through here. */
  /* Deliberately does NOT trim. Trimming here evicts by a `current` that has
     not been updated yet, so with a tight budget the level being loaded is
     thrown out of the cache between being built and being stood on — it still
     draws, because the record is applied either way, but it is no longer the
     cache's and every change made on it is dropped on the way out. Both callers
     trim once they have finished moving. */
  ensure(id) {
    let rec = this.cache.get(id);
    if (!rec) {
      rec = this.build(id);
      if (!rec) return null;
      this.cache.set(id, rec);
    }
    this.touch(id);
    return rec;
  },
  built(id) { return this.cache.has(id); },
  touch(id) {
    this.order = this.order.filter(x => x !== id);
    this.order.push(id);
  },
  /* Drop the least recently used, keeping the hub and whatever is on screen.
     What a level remembers is captured first, so coming back to an evicted one
     is indistinguishable from coming back to a cached one. */
  trim() {
    const droppable = this.order.filter(id =>
      id !== this.current && !(this.def(id) || {}).hub);
    while (droppable.length > this.BUDGET) {
      const id = droppable.shift();
      const rec = this.cache.get(id);
      if (rec) this.state[id] = this.capture(rec);
      this.cache.delete(id);
      this.order = this.order.filter(x => x !== id);
    }
  },

  /* ---- what a level remembers ----
     Keyed by level id and by object id, both of which are stable: `furnish` is
     a fixed sequence of add() calls, so the tenth object built is the tenth
     object built every time. Lives in G, so it goes into the save with
     everything else and a restored shift finds the basement as it was left. */
  get state() {
    if (!G.levelState) G.levelState = {};
    return G.levelState;
  },
  capture(rec) {
    const out = {};
    (rec.objects || []).forEach(o => {
      let bag = null;
      this.MUT.forEach(k => {
        if (o[k] === undefined || o[k] === null || o[k] === false) return;
        (bag = bag || {})[k] = o[k];
      });
      if (bag) out[o.id] = bag;
    });
    return out;
  },
  reapply(rec, keep) {
    const byId = new Map((rec.objects || []).map(o => [o.id, o]));
    for (const id in keep) {
      const o = byId.get(id);
      if (o) Object.assign(o, keep[id]);
    }
  },
  /* Called before writing a save: fold the live level's state in, so the record
     in G is current for every level and not just the evicted ones. */
  freeze() {
    const rec = this.cache.get(this.current);
    if (rec) this.state[this.current] = this.capture(rec);
  },

  /* ---- going somewhere ---- */

  /* The one way the player changes level. `entry` names an arrival point in the
     destination's own `entries`; anything unnamed lands on `start`, and a level
     with neither is a level nobody can reach, which is a data error rather than
     something to paper over at runtime. */
  go(id, entry, opts) {
    opts = opts || {};
    const def = this.def(id);
    if (!def || this.moving) return false;
    /* Named entry, then the conventional one, then whatever the level declares
       first. The last fallback matters more than it looks: resume() asks for
       'start' on a level that may only have a 'ladder', and without it a shift
       saved in the basement reloads standing on the fourth floor — silently,
       because a level that refuses to load leaves the previous one on screen
       and nothing about that reads as an error. */
    const entries = def.entries || {};
    const at = entries[entry] || entries.start || Object.values(entries)[0];
    if (!at) { console.warn('level ' + id + ' has no entry points at all'); return false; }

    const swap = () => {
      /* Fold the live level back into its own record before letting go of it.
         The arrays are shared by reference so mutation is already visible, but
         a rebuild reassigns them, and this is the one line that makes that
         case safe rather than subtly wrong. */
      if (this.current && this.cache.has(this.current)) this.cache.set(this.current, this.snapshot());
      this.apply(this.ensure(id));
      this.current = id;
      G.level = id;
      /* Now that `current` says where the player is, it is safe to drop the
         level furthest from them. */
      this.trim();

      P.x = at[0] * TILE; P.y = at[1] * TILE;
      P.vx = P.vy = 0; P.moving = false;
      Stick.release && Stick.release();

      /* Presence: who is standing on this level, which phones can be heard
         ringing, and a minimap that is of this map rather than the last one. */
      NPCM.enter(id);
      Guide.onLevel();
      R.levelChanged();
      Cam.snap();

      /* Forget which room you were in and let movePlayer notice you are
         somewhere new on its next frame. It already owns naming the room,
         awarding the fifteen for a room you have not been in before and
         checking whether that was the last one — and one rule in one place
         beats a second copy here that has to be kept in step with it. */
      G.lastZone = null;
      if (!opts.quiet) Sfx.door();
      /* Whatever is one door from here, built while nothing is happening. */
      this.prefetch();
    };

    if (opts.quiet) { swap(); return true; }
    this.transition(swap);
    return true;
  },

  /* Follow a way out by the `use` handler of the thing you took. The act never
     names a destination — data/levels.js does — so moving a level, renaming it
     or putting a second door onto it is a change to the catalogue and to
     nothing else. */
  take(via, opts) {
    const link = ((World.def && World.def.links) || []).find(l => l.via === via);
    if (!link) return false;
    return this.go(link.to, link.entry, opts);
  },
  /* Is there a way out of here by this handler at all — for an act that wants
     to offer the choice only when it leads somewhere. */
  links(via) {
    return ((World.def && World.def.links) || []).find(l => l.via === via) || null;
  },

  /* The first link to take to get from one level to another, breadth-first over
     the link graph. What makes a job whose target is on another level pointable
     at: the tracker cannot pin the thing itself, but it can pin the door. */
  route(toId, fromId) {
    fromId = fromId || this.current;
    if (!fromId || fromId === toId || !this.def(toId)) return null;
    const seen = new Set([fromId]);
    const queue = [];
    ((this.def(fromId) || {}).links || []).forEach(l => {
      if (seen.has(l.to)) return;
      seen.add(l.to); queue.push({ first: l, at: l.to });
    });
    while (queue.length) {
      const n = queue.shift();
      if (n.at === toId) return n.first;
      ((this.def(n.at) || {}).links || []).forEach(l => {
        if (seen.has(l.to)) return;
        seen.add(l.to); queue.push({ first: n.first, at: l.to });
      });
    }
    return null;
  },
  /* Which level an object with this `use` is on. Only built levels can answer —
     an unbuilt one would have to be built to be searched, and building every
     level to find out where the printer is defeats the point of building them
     lazily. In practice the neighbours are built, because prefetch built them
     the moment you arrived. */
  whereIs(use) {
    if (World.objects.some(o => o.use === use)) return this.current;
    for (const [id, rec] of this.cache) {
      if (id !== this.current && rec.objects.some(o => o.use === use)) return id;
    }
    return null;
  },

  /* ---- streaming ----
     One neighbour per idle slot. Splitting them up matters: building two levels
     back to back inside one callback is a frame the player watches go by, and
     the whole point of doing it early is that nobody ever sees it happen. */
  prefetch() {
    const want = ((World.def && World.def.links) || [])
      .map(l => l.to).filter(id => this.def(id) && !this.built(id));
    if (!want.length) return;
    const idle = window.requestIdleCallback || (fn => setTimeout(() => fn(), 220));
    idle(() => {
      const next = want.find(id => !this.built(id));
      if (!next) return;
      this.ensure(next);
      this.trim();
      /* Whatever the newly built level's own budget did to the cache, ask
         again: the list was taken before it ran. */
      this.prefetch();
    });
  },

  /* ---- the curtain ----
     A build that is already cached takes no time at all, so this is not hiding
     a stall — it is hiding the cut. Walking through a door and being somewhere
     else on the same frame reads as a glitch rather than as travel. Reduced
     motion gets the swap with no fade, which is the same thing without the
     part that moves. */
  transition(swap) {
    const el = $('#fade');
    if (!el || !FX.motion) { swap(); return; }
    this.moving = true;
    el.classList.add('on');
    setTimeout(() => {
      try { swap(); } finally {
        el.classList.remove('on');
        this.moving = false;
      }
    }, 190);
  },

  /* ---- boot and save ----
     resetRun() and a restored save both come through here, so there is one
     definition of "the game is on a level" and it cannot be half-done. */
  start(id, entry) {
    this.cache.clear(); this.order = []; this.current = null; this.moving = false;
    return this.go(id || 'office', entry || 'start', { quiet: true });
  },
  /* Put a restored save back on the level it was saved on. The position comes
     from the save rather than from the entry point — you are where you were
     standing, not at the door. */
  resume() {
    const id = this.def(G.level) ? G.level : 'office';
    const x = P.x, y = P.y;
    this.start(id, 'start');
    P.x = x; P.y = y;
    Cam.snap();
  }
};
