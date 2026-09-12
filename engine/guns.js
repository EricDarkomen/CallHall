'use strict';
/* ---------------- The guns ----------------

   The game is called Call of Duty: Customer Service and for eleven months the
   only thing in it you could point at anybody was a policy. This is the rest of
   the joke: there ARE guns in this building, and they are the guns an office
   actually has — a foam dart blaster, a water pistol and a thing somebody made
   out of a post tray and four elastic bands — all three of them from the box
   Marketing brought back from the 2019 away day and nobody has opened since.
   Nothing in here hurts anybody. What it does is make twenty adults turn round,
   which is the only ammunition this game has ever had.

   ---- THEY ARE DRAWN, NOT FETCHED ----

   Every gun below is a picture written out in the source: a grid of characters
   and a palette to look them up in. That is the same decision the cars made and
   it is made for the same two reasons. The first is the licence — every pixel
   in art/ is third-party, fetched and licence-checked by the sprite build, and
   the kit this game pins is mediaeval-through-Victorian: there is no blaster in
   it and there was never going to be one. The second is rotation. A twin-stick
   game aims through every angle, not through the eight a sprite sheet would
   give it, so the art has to be something that can be turned — and a bitmap
   baked once at 1:1 and rotated about its grip is exactly that.

   Read the arrays. They are pictures. That is the point of writing them this
   way: moving the trigger guard is moving a `g`.

   ---- WHAT A GUN IS ----

     n, e, d       what it is called, its emoji, and what it is when you look
                   at it in the inventory.
     mag, reload   how many, and how long the fumbling takes.
     rate          shots per second, held down.
     speed, range  tiles per second, and how many tiles before it is spent.
     spread        radians of inaccuracy per shot. A water pistol has a lot.
     kick          pixels of screen shake.
     shot          how the thing in the air is drawn.
     art           the picture, facing right, with its grip and muzzle marked.

   The binding to the thing in your pocket runs the OTHER way, from data: an
   entry in ITEMS carries a `gun:` naming its key here, and that is the whole
   of it — see Item.give(). Nothing in this file has to keep a second list of
   what the player is carrying.

   Everything else — the aiming, the firing, the flying and the reacting — is
   one object below, because there is exactly one of these in the world at a
   time and it is in the player's hands. */

const GUNS = {
  /* Orange, enormous, and the only one of the three that came out of a box
     with a brand on it. Six darts, a proper clunk, and slow enough across a
     room that you can watch one go. */
  dart: {
    n: 'Foam Dart Blaster', e: '🔫',
    d: 'Six darts. Four are the originals. Two are from a different set and everybody can tell.',
    mag: 6, reload: 1.7, rate: 3.1, speed: 9.4, range: 7.6, spread: 0.05, kick: 1.8,
    shot: { len: 7, w: 3, body: '#ff8a3d', tip: '#ffe27a', trail: 0 },
    art: {
      pivot: [6, 10], muzzle: [17, 4],
      pal: { o: '#1d2230', O: '#ff7a2f', w: '#9fb0c9', W: '#e8eef7', Y: '#ffe27a', B: '#2f6fd0', g: '#151922' },
      px: [
        '.....ooooooo......',
        '....oOOOOOOOoo....',
        '...oOOOOOOOOOOooo.',
        '...oOOOOOOOOOOOOOo',
        '...oOOOwWWWWWWWWWY',
        '...oOOOwWWWWWWWWWY',
        '...oOOOOOOOOOOOOOo',
        '...oOOOOOOOoooooo.',
        '....oOOgggo.......',
        '....oBBBBo........',
        '.....oBBo.........',
        '.....oBBo.........',
        '......oo..........'
      ]
    }
  },
  /* A post tray, four bands and a bulldog clip. Nobody remembers who made it.
     It is the fastest thing in the box and it holds four. */
  band: {
    n: 'Elastic Band Pistol', e: '📎',
    d: 'Made out of a post tray, four bands and a bulldog clip by somebody who is no longer with the company.',
    mag: 4, reload: 1.1, rate: 2.4, speed: 13.5, range: 5.4, spread: 0.02, kick: 1.2,
    shot: { len: 5, w: 2, body: '#e2554f', tip: '#e2554f', trail: 4 },
    art: {
      pivot: [3, 8], muzzle: [17, 3],
      pal: { o: '#1d2230', B: '#c9a06a', b: '#8d6a42', r: '#e2554f', K: '#2a2f3a' },
      px: [
        '....rrrrrrrrrrrrrr',
        '..................',
        '..ooooooooooooooo.',
        '.oBBBBBBBBBBBBBBBo',
        '.oBbbbbbbbbbbbbbBo',
        '.oBBBBooooooooooo.',
        '.oBBBo............',
        'oKKKKo............',
        'oKKKKo............',
        'oKKKo.............',
        '.ooo..............'
      ]
    }
  },
  /* From the same box, still with a 2019 price sticker on the tank. It holds
     forty and it carries about three tiles, which is the whole personality. */
  water: {
    n: 'Water Pistol', e: '💦',
    d: 'Translucent pink. A 2019 price sticker on the tank. Fill it at the sink, not at the cooler — Terry has views.',
    mag: 40, reload: 2.4, rate: 11, speed: 7.2, range: 3.6, spread: 0.17, kick: 0.5,
    shot: { len: 3, w: 2, body: '#7fd8ff', tip: '#dff4ff', trail: 0 },
    art: {
      pivot: [5, 9], muzzle: [17, 3],
      pal: { o: '#1d2230', C: '#6fd0f2', c: '#a9e7fb', P: '#e46ba8', n: '#c9d6e8' },
      px: [
        '......ooooooo.....',
        '.....oCCCCCCCoo...',
        '...ooCCcccCCCCCoo.',
        '..oCCCCCCCCCCCCCCo',
        '..onnnnnnnnnnnnnno',
        '..oCCCCCCCCCCCCCCo',
        '...ooCCCCCCCCCooo.',
        '.....oCCCCCCo.....',
        '.....oCCPPCo......',
        '.....oPPPPo.......',
        '......oPPo........',
        '......oPo.........',
        '......oo..........'
      ]
    }
  }
};

/* ---- and the two things you swing ----
   Melee is in the same table, on the same controls, drawn by the same code,
   because it is the same thing: something in your hands, pointed where the
   right stick is pointed. A `melee` block instead of a magazine is the whole
   of the difference — no ammo, no reload, and an ARC swept through the aim
   rather than a thing sent down it.

     arc      radians swept, centred on the aim.
     reach    tiles, from the middle of you to the middle of them.
     swing    seconds the sweep takes. The pose is two frames; this is how
              long they last.
     rate     swings per second, held down. */
GUNS.noodle = {
  n: 'Foam Sword', e: '🗡️',
  d: 'From the same box. LOOK ALIVE is printed down the blade in a typeface that was chosen by somebody, at a computer, for money.',
  melee: true, arc: 1.6, reach: 1.35, swing: 0.22, rate: 2.6, kick: 1,
  art: {
    pivot: [4, 3], muzzle: [21, 3],
    pal: { o: '#1d2230', F: '#b48cff', f: '#d9c6ff', G: '#2a2f3a', Y: '#ffd166' },
    px: [
      '..........oooooooooooo',
      '.......ooYFFFFFFFFFFFo',
      '..ooooYYYFFffffffffFFo',
      '..oGGGoYYYFFFFFFFFFFFo',
      '..ooooYYYFFffffffffFFo',
      '.......ooYFFFFFFFFFFFo',
      '..........oooooooooooo'
    ]
  }
};
GUNS.pack = {
  n: 'Rolled-Up Compliance Pack', e: '📜',
  d: 'Five hundred and one pages, rolled, with a band round it. The five hundred and first page is the one that says you have read the other five hundred.',
  melee: true, arc: 1.35, reach: 1.55, swing: 0.3, rate: 1.6, kick: 2.4,
  art: {
    pivot: [4, 3], muzzle: [20, 3],
    pal: { o: '#1d2230', W: '#e8e2d4', P: '#bdb6a4', r: '#e2554f' },
    px: [
      '....oooooooooooooooo..',
      '..ooWWWWWrWWWWWWWWWo..',
      '..oWWWWWWrWWWWWWWWWWo.',
      '..oPPPPPPrPPPPPPPPPPo.',
      '..oWWWWWWrWWWWWWWWWWo.',
      '..ooWWWWWrWWWWWWWWWo..',
      '....oooooooooooooooo..'
    ]
  }
};

const Guns = {
  /* The order Q walks, and the order the box hands them over in: the three you
     fire, then the two you swing. */
  ORDER: ['dart', 'band', 'water', 'noodle', 'pack'],

  /* ---- state ----
     What is OWNED is in G.guns and is saved: which ones you have, which is in
     your hand, how much is left in each, and who you have already hit today.
     What is HAPPENING is here and is not saved — coming back to a shift with
     the gun still up and the trigger still held would be a strange way to
     rejoin an office. */
  shots: [],
  armed: false,      /* is it out */
  a: 0,              /* where it is pointing, radians, screen space */
  want: false,       /* is the trigger held */
  cool: 0, reloadT: 0, flash: 0, holster: 0, hint: 0,
  /* A swing in progress: how much of it is left, how long it was, which
     bearing it started from, and who it has already caught. A swing hits
     each person once however long the arc dwells on them. */
  swingT: 0, swingFor: 0.3, swingA: 0, swingHit: null,

  /* How far the shoulders may turn past the direction the sprite is drawn
     facing before the sprite gives up and faces the other way. Four rows of
     art and any angle of aim: the difference between the two is taken up at
     the waist, and this is the cap on it. The head is twenty-five pixels above
     the hip, so every tenth of a radian moves it two and a half pixels
     sideways — which on a body fourteen pixels wide is a great deal further
     than it sounds, and past about a third of a radian a person stops reading
     as twisting and starts reading as falling over. */
  TWIST: 0.30,
  /* ---- the hold pose ----
     WHICH FRAME THE TOP HALF IS, per direction, while something is in your
     hands. Not the walk frame, which is what it used to be and which is why
     the blaster floated in front of somebody strolling along with their arms
     swinging by their sides. These are the kit's run frames — the only poses
     in it with the elbows bent and, side on, a fist punched out in front —
     held STILL rather than played: the legs walk, the top half is braced, and
     braced is what carrying something looks like.

     Read off the sheet rather than chosen by eye: in the side rows the skin
     of the leading hand reaches thirteen pixels forward of centre in frame 10
     and nowhere near that in any other, and 11 is the fullest two-handed
     front-on pose. Up, left, down, right. */
  HOLD: [11, 10, 11, 10],
  /* The two ends of a swing, same rows: 8 has the arm drawn back across the
     body and 10 has it extended. A punch, in two frames, which is all a
     swing needs. See melee below. */
  SWING: [8, 10],

  /* Where the hands are, relative to the point the sprite stands on, in the
     pose above: fifteen up is the fist in the side rows and ten out is where
     that fist is, so the grip of the thing is IN the hand rather than in
     front of the chest.

     The rise is split because this is a three-quarter view and up and down are
     not the same question. Pointing away from the camera is pointing up the
     screen, and a gun held at a flat chest height while aiming that way
     disappears behind its owner — aimed at the far wall the blaster was simply
     not on screen — so it lifts over the shoulder. Pointing at the camera only
     has to clear the hands, so it barely drops at all: the old symmetric
     number put it down at the knees. */
  HAND_Y: -15, HAND_OUT: 10, RISE_UP: 12, RISE_DOWN: 4,
  /* Where a shot is born and how high it is drawn. It travels on the GROUND
     plane like everything else in this game — that is what lets it be tested
     against people and walls with the same arithmetic everything else uses —
     and is simply drawn at chest height, which is where the muzzle is. */
  SPAWN_R: 15, SHOT_Z: -11,
  /* Taller than a desk. A dart goes over a desk, a worktop, a bin and a chair,
     because it is thrown at chest height and those are not chest height; it
     stops at a wall, a cabinet, a vending machine and a shut door. The drawn
     size is the only height this game has ever had, and it turns out to be
     enough to answer the question. */
  STOP_H: 24,

  /* ---- what you own ---- */
  state() {
    if (!G.guns) G.guns = { have: [], gun: null, ammo: {}, hit: {} };
    const g = G.guns;
    if (!Array.isArray(g.have)) g.have = [];
    if (!g.ammo) g.ammo = {};
    if (!g.hit) g.hit = {};
    return g;
  },
  have() { return this.state().have.filter(id => GUNS[id]); },
  any() { return this.have().length > 0; },
  id() {
    const g = this.state();
    if (g.gun && GUNS[g.gun] && g.have.indexOf(g.gun) >= 0) return g.gun;
    return this.have()[0] || null;
  },
  def() { return GUNS[this.id()] || null; },
  ammo() { const id = this.id(); return id ? (this.state().ammo[id] || 0) : 0; },

  give(id) {
    if (!GUNS[id]) return false;
    const g = this.state();
    if (g.have.indexOf(id) < 0) g.have.push(id);
    g.ammo[id] = GUNS[id].mag;
    /* The first one you pick up is the one in your hand, and the second and
       third do not take it off you. Taking all three out of the away-day box
       is three calls to this in one line, and the last of them used to win —
       so opening the box left you holding the water pistol, which is the
       third-funniest of the three and not the one anybody reached for. */
    if (!g.gun || !GUNS[g.gun] || g.have.indexOf(g.gun) < 0) g.gun = id;
    return true;
  },
  /* Put one of them in your hand by name. Refuses one you do not have, which
     is the only way this can be asked wrongly. */
  select(id) {
    if (!GUNS[id] || this.have().indexOf(id) < 0) { Sfx.deny(); return false; }
    this.state().gun = id;
    this.reloadT = 0; this.cool = 0.15;
    return true;
  },
  /* Walk the ones you actually have, in catalogue order, so Q is the same
     three in the same order every time rather than the order you found them. */
  next() {
    const list = this.ORDER.filter(k => this.have().indexOf(k) >= 0);
    if (list.length < 2) return false;
    const g = this.state();
    g.gun = list[(list.indexOf(this.id()) + 1) % list.length];
    this.reloadT = 0; this.cool = 0.2;
    const d = GUNS[g.gun];
    UI.toast(d.e, d.n + (d.melee ? '' : ' — ' + this.ammo() + '/' + d.mag));
    Sfx.blip();
    return true;
  },

  /* ---- may it be out at all ----
     One question, asked by everything: the keyboard, the stick, the update and
     the renderer. A gun is a thing you are holding in the world, so anything
     that takes the world away takes it with them — and that includes being
     behind a wheel, where both hands are already spoken for and where the
     right-hand stick is the throttle. */
  can() {
    return G.state === 'play' && this.any()
      && !(typeof Cars !== 'undefined' && Cars.driving)
      && !Dialogue.on && !Panels.on && !Arcade.on && !(typeof Combat !== 'undefined' && Combat.E);
  },

  arm(on) {
    on = !!on && this.can();
    if (on === this.armed) { if (on) this.holster = this.HOLSTER; return; }
    this.armed = on;
    this.want = false;
    this.holster = this.HOLSTER;
    if (on) {
      this.cool = Math.max(this.cool, 0.12);
      /* Out with nothing in it is out with nothing in it: start the fumbling
         now rather than on a trigger pull that cannot happen. Without this, a
         gun put away halfway through a reload — which is what letting go of
         the stick with an empty magazine does — came back out empty for ever,
         because reloading is only ever started by firing. */
      if (!this.melee() && this.ammo() <= 0) this.reload();
      Sfx.draw();
      /* Said once, the first time, and said in whichever words this device
         deserves — the same rule every other instruction in this game follows. */
      if (!G.flags.gunHint) {
        G.flags.gunHint = true;
        UI.toast(this.def().e, TOUCH
          ? 'The <b>' + this.def().n + '</b> is out. The stick on the ' + Hand.btnSide()
            + ' aims it, and it fires where you push it.'
          : '<b>' + this.def().n + '</b> out. The mouse or the arrow keys aim it, and it fires '
            + 'where you point. <b>R</b> reloads, <b>Q</b> swaps, <b>G</b> puts it away.');
      }
    } else {
      this.reloadT = 0;
    }
  },
  /* Seconds of nobody touching the aim before it goes back in your pocket. It
     exists for the thumb: on a phone there is no "holster" button and there
     should not be one — you let go of the stick, and a moment later you are
     somebody walking through an office again. */
  HOLSTER: 2.6,
  toggle() { this.arm(!this.armed); },

  /* ---- pointing it ----
     Two ways in, and they mean slightly different things. `point` is a vector
     from a stick or a pair of arrow keys: it aims AND it pulls the trigger,
     which is what a twin-stick right hand does. `at` is a place on the map —
     the mouse — which aims and nothing else, because a mouse has its own
     button and taking the click away from it would be rude. */
  point(dx, dy) {
    const m = Math.hypot(dx, dy);
    if (m < 0.001) { this.want = false; return; }
    this.arm(true);
    if (!this.armed) return;
    this.a = Math.atan2(dy, dx);
    this.holster = this.HOLSTER;
    /* Past half a push is a shot. Below it you are turning to face something,
       which is a thing people do with a gun in their hand and which should not
       cost a dart. */
    this.want = m > 0.52;
  },
  at(wx, wy) {
    if (!this.armed) return;
    this.a = Math.atan2(wy - (P.y + this.HAND_Y), wx - P.x);
    this.holster = this.HOLSTER;
  },
  trigger(on) {
    if (on && !this.armed) this.arm(true);
    this.want = !!on && this.armed;
    if (this.want) this.holster = this.HOLSTER;
  },

  /* ---- the twist ----
     The one piece of this that everybody in the building gets and not just the
     person holding the gun. A sprite sheet has four directions; an aim has
     every angle; a person resolves the difference by turning their shoulders
     and leaving their feet where they are. So the renderer is told two things
     rather than one — which row the LEGS are drawn from, and which row the
     TORSO is — and the leftover angle between the aim and the row it picked is
     handed over as a lean. Sprites.draw() takes it and Sprites.twisted() does
     the cutting.

     Anyone can be handed one. The player twists because they are aiming;
     a colleague twists because somebody has just hit them with a foam dart and
     they are turning round to find out who, which is the same movement and the
     same three lines of code. */
  twist(angle) {
    const dir = Sprites.dirOf(Math.cos(angle), Math.sin(angle));
    const card = [-Math.PI / 2, Math.PI, Math.PI / 2, 0][dir];
    let d = angle - card;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    /* Facing the camera, a turn to the aimer's right is a lean to the screen's
       right; facing away it is the other way round. Left and right take the
       residual as it comes, because there it is simply the barrel rising and
       falling and the shoulders go with it. */
    if (dir === 2) d = -d;
    return { dir, lean: clamp(d, -this.TWIST, this.TWIST) };
  },
  /* ---- and how far the feet are allowed to disagree with it ----
     A waist is not a swivel. The first version of this let the legs take the
     direction of travel whatever the shoulders were doing, and walking west
     while aiming east drew somebody whose top half was turned through a
     hundred and eighty degrees — which is not a pose, it is an injury.

     So the legs may be a QUARTER TURN from the shoulders and no more, which
     with four directions means they may be the row either side of the torso's
     and never the one opposite it. Ask for the opposite — walk away from what
     you are pointing at — and the feet give up the argument rather than the
     spine: they take the aim's own row and the walk cycle plays in reverse.
     You back up facing the thing, which is exactly what a person does and is
     one flag to the frame lookup.

     Standing still, the feet simply come round to the aim, because somebody
     who has stopped to point at something is facing it. */
  legs(tdir) {
    if (!P.moving) return { dir: tdir, back: false };
    const mv = P.dir ?? 2;
    if ((mv + 2) % 4 === tdir) return { dir: tdir, back: true };
    return { dir: mv, back: false };
  },
  /* The player's own: which row the shoulders are, which frame they hold,
     how far the lean goes — and, as a side effect, where the feet end up.
     Null when there is nothing in your hands, which is the single blit
     everybody has always been.

     P.dir is WRITTEN here rather than returned, so that everything downstream
     that has ever asked which way the player is facing — the renderer, and
     whatever asks next — gets one answer. movePlayer sets it from the
     direction of travel a moment earlier in the same frame; this is the part
     that knows travel is no longer the only thing pointing it. */
  pose() {
    if (!this.armed) return null;
    const t = this.twist(this.a);
    t.frame = this.swingT > 0 ? this.SWING[this.swingT > this.swingFor * .55 ? 0 : 1] : this.HOLD[t.dir];
    const l = this.legs(t.dir);
    P.dir = l.dir; this.back = l.back;
    return t;
  },
  /* Whether the walk is playing backwards this frame. Set by pose(), read by
     the renderer one line later. */
  back: false,
  /* Somebody else's: they have `watch` set to a bearing and a moment to hold
     it for. Set by a dart landing on them. */
  watchOf(who) {
    if (!who || !who.watch || who.watch.till < R.t) return null;
    return this.twist(who.watch.a);
  },
  watch(who, x, y, secs) {
    if (!who) return;
    who.watch = { a: Math.atan2(y - who.y, x - who.x), till: R.t + (secs || 2.2) };
  },

  /* ---- firing, and swinging ---- */
  melee() { const d = this.def(); return !!(d && d.melee); },
  ready() {
    const d = this.def();
    if (!d || !this.armed || this.cool > 0) return false;
    /* Nothing to be out of, and nothing to put back in. */
    if (d.melee) return this.swingT <= 0;
    return this.reloadT <= 0 && this.ammo() > 0;
  },
  /* The one thing the trigger does, whichever of the five is in your hand. */
  pull() { if (this.melee()) this.swing(); else this.shoot(); },
  reload() {
    const d = this.def(); if (!d || d.melee || !this.armed) return false;
    if (this.reloadT > 0 || this.ammo() >= d.mag) return false;
    this.reloadT = d.reload;
    Sfx.reload();
    return true;
  },
  fill() {
    const id = this.id(); if (!id) return;
    this.state().ammo[id] = GUNS[id].mag;
    UI.hudDirty();
  },
  shoot() {
    const d = this.def(); if (!d) return;
    const g = this.state(), id = this.id();
    g.ammo[id] = Math.max(0, (g.ammo[id] || 0) - 1);
    this.cool = 1 / d.rate;
    this.flash = 0.06;
    const a = this.a + rnd(-d.spread, d.spread);
    const sp = d.speed * TILE;
    this.shots.push({
      x: P.x + Math.cos(a) * this.SPAWN_R, y: P.y + Math.sin(a) * this.SPAWN_R,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a,
      left: d.range * TILE, gun: id, t: 0
    });
    if (d.kick) FX.shake(d.kick);
    Sfx.gun(id);
    /* Empty is not a failure state to be announced, it is a click and then the
       fumbling. Reloading itself is automatic because the alternative on a
       phone is a fourth control for a thing that has exactly one answer. */
    if (!g.ammo[id]) this.reload();
    UI.hudDirty();
  },

  /* ---- the swing ----
     A sweep rather than a thing in the air, and everything about it is one
     angle moving: the weapon is drawn at the sweep's bearing rather than the
     aim's, and anybody the sweep passes over within reach gets caught by it
     as it goes. That is why the hit test is per frame and not at the moment
     the button went down — the swing arrives at the person on the left of the
     arc before the person on the right, which is the whole reason a swing
     feels different from a shot. */
  swing() {
    const d = this.def(); if (!d || !d.melee) return;
    this.swingT = this.swingFor = d.swing;
    this.swingA = this.a;
    this.swingHit = new Set();
    this.cool = 1 / d.rate;
    if (d.kick) FX.shake(d.kick);
    Sfx.swing(this.id());
    UI.hudDirty();
  },
  /* Where the weapon is pointing this instant: the arc is swept from one side
     to the other over the life of the swing, so t runs 0 → 1 and the bearing
     runs from a − arc/2 to a + arc/2. */
  sweep() {
    const d = this.def();
    if (!d || !d.melee || this.swingT <= 0) return this.a;
    const t = 1 - this.swingT / (this.swingFor || 1);
    return this.swingA + (t - 0.5) * d.arc;
  },
  /* Who the blade is on top of this frame. Reach is measured centre to centre
     and the blade is given a width of its own — a sweep that only caught what
     was exactly on the line would pass through somebody between two frames at
     any speed worth swinging at. */
  BLADE: 0.42,
  swept(dt) {
    const d = this.def(); if (!d || !d.melee || this.swingT <= 0) return;
    const sa = this.sweep(), r = d.reach * TILE;
    const test = (o, kind) => {
      if (this.swingHit.has(o)) return;
      const dx = o.x - P.x, dy = o.y - P.y;
      if (Math.hypot(dx, dy) > r) return;
      let df = Math.atan2(dy, dx) - sa;
      while (df > Math.PI) df -= Math.PI * 2;
      while (df < -Math.PI) df += Math.PI * 2;
      if (Math.abs(df) > this.BLADE) return;
      /* Through a wall is not through a wall. The same question a dart asks
         at the tile it is in, asked at the halfway point of the reach — you
         cannot hit somebody round a corner with a rolled-up compliance pack,
         however much you would like to. */
      if (this.stopped(P.x + Math.cos(sa) * r * 0.6, P.y + Math.sin(sa) * r * 0.6)) return;
      this.swingHit.add(o);
      this.land(this.id(), o, kind, o.x, o.y - 6);
    };
    if (typeof NPCM !== 'undefined' && NPCM.list) NPCM.list.forEach(n => test(n, 'npc'));
    if (typeof Peds !== 'undefined') Peds.list().forEach(q => test(q, 'ped'));
  },

  /* ---- what is in the way ----
     Walls, and anything solid that is drawn taller than a desk. Deliberately
     NOT Collide.free(): that is the question a pair of feet asks, and a foot
     box is stopped by every bin, chair and worktop in the building — none of
     which is at chest height, and all of which a dart sails over. */
  stopped(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH) return true;
    if (World.solid[ty][tx]) return true;
    const here = World.at(tx, ty);
    for (let i = 0; i < here.length; i++) {
      const o = here[i];
      if (!o.solid) continue;
      const f = o.fdef || FURN[o.kind] || {};
      if (f.mount === 'surface') continue;      /* it is standing on a worktop */
      if ((f.size || TILE) >= this.STOP_H) return true;
    }
    return false;
  },

  /* ---- the frame ---- */
  update(dt) {
    if (!this.can() && this.armed) this.arm(false);
    if (this.flash > 0) this.flash -= dt;
    if (this.armed) {
      if (this.reloadT > 0 && (this.reloadT -= dt) <= 0) { this.reloadT = 0; this.fill(); }
      if (this.cool > 0) this.cool -= dt;
      if (this.want && this.ready()) this.pull();
      /* A swing is a moving thing for a quarter of a second, so it is stepped
         like one: the arc advances, and anybody it reaches is reached now. */
      if (this.swingT > 0) { this.swept(dt); this.swingT = Math.max(0, this.swingT - dt); }
      /* Nothing has touched the aim for a while: put it away. The keyboard
         refreshes this on every aim and the stick on every frame it is held,
         so this only ever runs out when somebody has genuinely stopped. */
      if ((this.holster -= dt) <= 0) this.arm(false);
    }
    this.step(dt);
    this.hud();
  },

  /* The things in the air. Stepped in pieces no longer than a third of a tile:
     a dart at thirteen tiles a second covers most of a person in one frame,
     and a hit test that only looks at where it ENDED UP is a dart that goes
     through people and walls at exactly the speeds that matter. */
  step(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.t += dt;
      const dist = Math.hypot(s.vx, s.vy) * dt;
      const steps = Math.max(1, Math.ceil(dist / (TILE / 3)));
      let gone = false;
      for (let k = 0; k < steps && !gone; k++) {
        s.x += s.vx * dt / steps; s.y += s.vy * dt / steps;
        s.left -= dist / steps;
        if (this.stopped(s.x, s.y)) { this.splat(s, null); gone = true; break; }
        const who = this.whoIsThere(s);
        if (who) { this.splat(s, who.o); this.land(s.gun, who.o, who.kind, s.x, s.y + this.SHOT_Z); gone = true; break; }
        if (s.left <= 0) { this.splat(s, null); gone = true; }
      }
      if (gone) this.shots.splice(i, 1);
    }
  },
  /* Everybody a shot could be touching, in the order the game already draws
     them: the twenty colleagues, then whoever is walking past outside. */
  whoIsThere(s) {
    const r = TILE * 0.42;
    if (typeof NPCM !== 'undefined' && NPCM.list) {
      for (const n of NPCM.list) {
        if (Math.abs(n.x - s.x) < r && Math.abs(n.y - s.y) < r) return { o: n, kind: 'npc' };
      }
    }
    if (typeof Peds !== 'undefined') {
      for (const p of Peds.list()) {
        if (Math.abs(p.x - s.x) < r && Math.abs(p.y - s.y) < r) return { o: p, kind: 'ped' };
      }
    }
    return null;
  },

  /* ---- and what everybody does about it ---- */
  NPC_LINES: {
    dart: ['Oi.', 'Right.', 'That was my ear.', 'Very mature.', 'Is that from the away day?',
      'You are aware we have visitors.', 'I felt that through the headset.', 'Put it back in the box.'],
    band: ['OW.', 'That actually stings.', 'That is not a toy, that is stationery.',
      'Right, who — oh. Of course.', 'That is coming out of somebody’s wellbeing budget.'],
    water: ['Do you mind.', 'That is my keyboard.', 'It is a work laptop.', 'Lovely. Thank you.',
      'I have a call in four minutes.', 'That had better be water.'],
    noodle: ['En garde, then.', 'We did this in 2019 as well.', 'It is nine in the morning.',
      'LOOK ALIVE. I am aware.', 'Do that again and I will get mine.'],
    pack: ['That is the compliance pack.', 'Five hundred and one pages, that.',
      'You have hit me with the policy.', 'Careful, that is load-bearing.', 'Read it, don’t swing it.']
  },
  PED_LINES: ['Alright.', 'Excuse me?', 'Yes, thank you.', 'I saw that.', 'Mate.',
    'On a Tuesday as well.', 'Wonderful.'],

  /* One person, hit by one of the five. Everything below this line is the same
     whether it arrived through the air or on the end of a swing, which is why
     it takes an id and a place rather than a shot. */
  land(id, who, kind, x, y) {
    const d = GUNS[id] || GUNS.dart;
    FX.parts.push(...this.spray(x, y, d.melee ? 4 : 3, d.melee ? '#ffe27a' : d.shot.body));
    if (d.melee) Sfx.bonk(); 
    if (typeof FX !== 'undefined') FX.burst(who.x, who.y - 18, d.e, 3, d.melee ? '#ffd166' : d.shot.body);
    /* They turn to look at whoever did it, upper body first, feet later, which
       is the same twist the player is using to aim and the reason it lives in
       one place. */
    this.watch(who, P.x, P.y, 2.6);
    if (kind === 'ped') {
      if (who.sayT <= 0) { who.say = pick(this.PED_LINES); who.sayT = 2.4; }
      return;
    }
    who.stunTimer = Math.max(who.stunTimer || 0, 0.9);
    if (who.sayT <= 0) { who.say = pick(this.NPC_LINES[id] || this.NPC_LINES.dart); who.sayT = 3.2; }
    if (typeof Faces !== 'undefined') Faces.flash(who.id, id === 'band' || id === 'pack' ? 'anger' : 'shock', 1.6);
    /* It costs you something, once per person per shift. A second dart at the
       same person is the same joke and should not be a second grudge — and
       forty darts at Marjorie should not put her below anything a conversation
       can recover. */
    const hit = this.state().hit;
    if (!hit[who.id]) {
      hit[who.id] = true;
      Rel.add(who.id, -1);
      P.stats.chaos = (P.stats.chaos || 0) + 0.5;
      const n = Object.keys(hit).length;
      if (n >= 5) Ach.get('a_foamwar');
    }
  },
  /* The end of a shot, wherever it ended. A dart bounces and lies there for a
     moment, water goes everywhere, a band simply stops existing. */
  splat(s, who) {
    const d = GUNS[s.gun] || GUNS.dart;
    const x = s.x, y = s.y + this.SHOT_Z;
    if (s.gun === 'water') { FX.parts.push(...this.spray(x, y, 5, d.shot.body)); Sfx.splat(); }
    else { FX.parts.push(...this.spray(x, y, 3, d.shot.body)); Sfx.plink(); }
    /* What it did to the person it hit is land()'s: a dart that stops at a
       wall and a dart that stops at Marjorie make the same puff, and only one
       of them is an event. */
  },
  spray(x, y, n, colour) {
    const out = [];
    /* Nothing at all when Motion is off. Every other particle in the game is
       gated on that setting inside FX.burst(); these are pushed straight into
       the list, so they have to ask for themselves. */
    if (!FX.motion) return out;
    for (let i = 0; i < n; i++) {
      out.push({ x, y, vx: rnd(-40, 40), vy: rnd(-50, 10), t: 0, life: rnd(.25, .5), c: colour, sz: 3 });
    }
    return out;
  },

  /* ---- the picture ----
     Baked once per gun at 1:1 and kept. A grid of characters into a canvas of
     pixels: nothing here is clever, and the only rule is that `.` is nothing
     and every other character must be in the palette, or it is nothing too. */
  art(id) {
    this._art = this._art || new Map();
    const had = this._art.get(id);
    if (had) return had;
    const a = GUNS[id] && GUNS[id].art;
    if (!a) return null;
    const w = a.px[0].length, h = a.px.length;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = a.px[y];
      for (let x = 0; x < row.length; x++) {
        const col = a.pal[row[x]];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    const out = { cv, w, h, pivot: a.pivot, muzzle: a.muzzle };
    this._art.set(id, out);
    return out;
  },

  /* One gun, in one pair of hands, pointing wherever it is pointing. `x, y` is
     the point the person stands on; everything else is worked out from there.

     Mirrored rather than rotated past the vertical: a gun turned 170 degrees is
     a gun lying on its back, which is not how anybody holds one. Flipping it
     about the barrel instead keeps the grip under the hand and the sights on
     top, which is what a side-on gun does when its owner turns round. */
  paint(c, x, y, ang, id, out) {
    const art = this.art(id || this.id());
    if (!art) return;
    const flip = Math.abs(ang) > Math.PI / 2;
    const ax = x + Math.cos(ang) * (out === undefined ? this.HAND_OUT : out);
    /* Asymmetric on purpose — see RISE_UP and RISE_DOWN. */
    const s = Math.sin(ang);
    const ay = y + this.HAND_Y + s * (s < 0 ? this.RISE_UP : this.RISE_DOWN);
    const sm = c.imageSmoothingEnabled;
    c.imageSmoothingEnabled = false;
    c.save();
    c.translate(Math.round(ax), Math.round(ay));
    c.rotate(ang);
    if (flip) c.scale(1, -1);
    c.drawImage(art.cv, -art.pivot[0], -art.pivot[1]);
    /* The flash, at the muzzle, in the muzzle's own frame — which is why it is
       inside the transform rather than worked out in world coordinates. */
    if (this.flash > 0 && this.armed) {
      const d = GUNS[id || this.id()];
      c.globalAlpha = clamp(this.flash / 0.06, 0, 1);
      c.fillStyle = d && d.shot ? d.shot.tip : '#ffe27a';
      c.fillRect(art.muzzle[0], art.muzzle[1] - 1, 4, 3);
      c.fillRect(art.muzzle[0] + 2, art.muzzle[1] - 2, 2, 5);
      c.globalAlpha = 1;
    }
    c.restore();
    c.imageSmoothingEnabled = sm;
  },
  /* What is in the player's hands, wherever it is pointing this instant: the
     aim, or the sweep of a swing in progress. The renderer calls this rather
     than paint() so that the swing is the same one line as the gun.

     A swung thing goes out to arm's length and comes back, because an arm
     that stays bent through a swing is somebody waving. Eased on the sine of
     the swing so it is furthest out at the middle of the arc, which is where
     it hits. */
  held(c, x, y) {
    if (!this.armed) return;
    const d = this.def();
    if (d && d.melee && this.swingT > 0) {
      const t = 1 - this.swingT / (this.swingFor || 1);
      this.paint(c, x, y, this.sweep(), null, this.HAND_OUT + Math.sin(t * Math.PI) * 7);
      return;
    }
    this.paint(c, x, y, this.a);
  },
  /* In front of somebody or behind them, which is the whole of the depth
     sorting a held object needs: aiming away from the camera puts it on the
     far side of the body, and it is drawn first. The SWEEP decides it during
     a swing, not the aim — a sword swung across the top of the arc passes
     behind the head and comes back in front of the chest, and following it is
     free. */
  behind() {
    if (!this.armed) return false;
    const a = (this.def() && this.def().melee && this.swingT > 0) ? this.sweep() : this.a;
    return Math.sin(a) < -0.34;
  },

  /* Everything in the air. Drawn as pixels rather than as sprites — a dart is
     seven pixels by three and a rectangle at an angle is exactly that. */
  paintShots(c) {
    for (const s of this.shots) {
      const d = GUNS[s.gun] || GUNS.dart, sh = d.shot;
      const x = s.x, y = s.y + this.SHOT_Z;
      c.save();
      c.translate(x, y);
      c.rotate(s.a);
      if (sh.trail) {
        c.globalAlpha = 0.35; c.fillStyle = sh.body;
        c.fillRect(-sh.len - sh.trail, -sh.w / 2 + 0.5, sh.trail, 1);
        c.globalAlpha = 1;
      }
      c.fillStyle = sh.body;
      c.fillRect(-sh.len / 2, -sh.w / 2, sh.len, sh.w);
      c.fillStyle = sh.tip;
      c.fillRect(sh.len / 2 - 2, -sh.w / 2, 2, sh.w);
      c.restore();
    }
  },

  /* ---- the readout ----
     What is in your hand and what is left in it, as one line. Only while it is
     out: a magazine count on the screen of an office simulator the rest of the
     time would be the game telling you what it thinks it is about. */
  hud() {
    const el = $('#gunHud');
    if (!el) return;
    const on = this.armed && this.can();
    /* Called every frame from update(), so it is written as a comparison and
       not as a DOM write: the readout changes about six times a magazine and
       rewriting it sixty times a second would be innerHTML churn under the one
       thing in this game that has to stay at sixty. */
    const d = on ? this.def() : null;
    const sig = on ? this.id() + ':' + (d.melee ? '' : this.ammo()) + ':' + (this.reloadT > 0 ? 'r' : '') : '';
    if (sig === this._hudSig) return;
    this._hudSig = sig;
    el.hidden = !on;
    if (!on) return;
    /* A thing you swing has nothing to count, and a row of pips that never
       moves is a row of pips that means nothing. It says what it is and stops
       there. */
    let right = 'swing';
    if (!d.melee) {
      const n = this.ammo();
      right = '';
      for (let i = 0; i < Math.min(d.mag, 12); i++) right += i < n ? '▮' : '▯';
      if (d.mag > 12) right = n + '/' + d.mag;
    }
    el.innerHTML = '<span class="gh-e">' + d.e + '</span><span class="gh-n">' + esc(d.n) + '</span>'
      + '<span class="gh-a' + (this.reloadT > 0 ? ' rl' : '') + '">'
      + (this.reloadT > 0 ? 'reloading' : right) + '</span>';
  },

  /* A level swap, a save being loaded, a shift ending: the things in the air
     belong to the room they were fired in. */
  clear() {
    this.shots.length = 0;
    this.armed = false; this.want = false; this.reloadT = 0; this.cool = 0;
    this.swingT = 0; this.swingHit = null;
  }
};
