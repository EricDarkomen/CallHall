'use strict';
/* ---------------- TimeSystem + main loop ---------------- */
const Game = {
  acc: 0, mmT: 0, frozen: false, paused: false,
  /* A full-screen overlay hides the world entirely, so there is nothing to gain
     from redrawing it — and plenty to lose, since the blurred backdrop then has
     to be re-rasterised every frame. */
  overlayUp() { return !!Combat.E || Panels.on || Arcade.on || G.state === 'report' || G.state === 'ending'; },
  tick(dt) {
    if (this.paused) return;
    FX.update(dt);
    Dialogue.tick(dt);
    /* 'cut' is in here because the opening draws the real building behind it:
       a floor of people frozen mid-step under a caption about forty of them
       all saying "I completely understand" is a photograph, not an office. */
    if (G.state === 'play' || G.state === 'dialogue' || G.state === 'panel' || G.state === 'cut') NPCM.update(dt);
    movePlayer(dt);
    Cut.tick(dt);
    /* The opening owns the camera while it is running — it is looking at the
       building rather than following somebody standing still in reception. */
    if (Cine.on) Cine.camera(dt); else Cam.follow(dt);
    Interact.scan();
    Guide.check();
    Phones.tick(dt);
    /* A minigame runs on the page's ONE loop rather than a requestAnimationFrame
       of its own: the same dt, the same 50ms clamp, and the same stop when the
       tab goes away. Before the overlay check below, because that is where the
       world stops being drawn — and the arcade is one of the things that stops
       it. */
    if (Arcade.on) Arcade.frame(dt);
    if (G.state === 'play') {
      this.acc += dt * 1000;
      while (this.acc >= MS_PER_GAME_MIN) {
        this.acc -= MS_PER_GAME_MIN;
        G.minutes++;
        Chat.tick(); Mail.tick(); EventSys.tick();
        if (G.minutes % 7 === 0) Player.mod({ energy: -1 });
        if (G.minutes % 60 === 0) Save.write(true);   /* quiet hourly autosave */
        if (G.minutes >= DAY_END) { Report.show(); break; }
      }
      UI.hud();
    }
    if (this.overlayUp()) {
      /* draw one final frame, blur it into the canvas, then stop entirely */
      if (!this.frozen) { this.frozen = true; R.draw(dt); R.freeze(); }
      return;
    }
    this.frozen = false;
    this.mmT -= dt; if (this.mmT <= 0) { this.mmT = .25; R.minimap(); }
    R.draw(dt);
  },
  loop(now) {
    const dt = Math.min(.05, (now - (Game.last || now)) / 1000);
    Game.last = now;
    try { Game.tick(dt); } catch (e) { console.error(e); }
    requestAnimationFrame(Game.loop);
  },
  begin() {
    $('#titleScreen').classList.remove('on');
    $('#nameScreen').classList.remove('on');
    $('#lookScreen').classList.remove('on');
    $('#cutscene').classList.remove('on');
    /* The one door into the shift, so it is the one place that puts the
       opening's camera and the opening's stripped-down stage back — whichever
       of the four ways in got here, and whether the opening ran or not. */
    Cine.end();
    $('#game').classList.add('on');
    R.resize(); Cam.snap();
    G.state = 'play';
    UI.hud();
    UI.zone('CALLHALL Services · Fourth Floor');
    UI.objective('Find the fourth floor. Find your desk. Try not to be noticed.');
    Guide.setObject('playerDesk', 'Your desk', 'foundDesk');
    setTimeout(() => UI.toast('🧭', (TOUCH
      ? (Hand.pad === 'dpad'
          ? 'Move with the pad on the ' + Hand.padSide() + '.'
          : 'Put a thumb down anywhere in the bottom-' + Hand.padSide() + ' and push.')
        + ' Tap <span class="kbd">E</span> to interact.'
      : 'Move with <span class="kbd">WASD</span>. Interact with <span class="kbd">E</span>.')
      + ' Everything here can be inspected and most of it should not be.'), 900);
    setTimeout(() => UI.toast('📞', 'When a phone rings (☎️ glowing amber), walk to it and '
      + (TOUCH ? 'tap' : 'press') + ' <span class="kbd">E</span>. That is the job.'), 6000);
    setTimeout(() => { if (!Phones.ringing.length) Phones.ringRandom(); }, 12000);
  }
};

/* ---------------- The opening's camera ----------------
   The building the opening talks about is the building the game is about to
   start in, and the game already has a renderer that draws it — so the shot
   under the words is the real fourth floor, with the real twenty people on it,
   rather than a picture of one. That costs almost nothing: R.draw() is called
   on every frame of the opening already (to a hidden canvas), so all that is
   actually new is who owns the camera and taking the HUD off the screen.

   Two rules make it honest rather than a gimmick:

     nothing is shown until a beat asks for it. The first beat is outside the
     building and this level cannot draw a street, so the screen stays dark
     through it — see the `cam` note on CUT.

     the last shot is the tile the player is standing on, so the closing frame
     of the opening and the opening frame of the shift are the same frame and
     Game.begin()'s Cam.snap() has nothing left to move. */
const Cine = {
  on: false,
  cx: 0, cy: 0,      /* where the camera is being asked to look, in world px */
  dx: 0, dy: 0,      /* the direction the current move came in on */
  rate: .04,
  /* A shot that has finished arriving is a photograph. Creep along the line the
     move came in on so the frame is never quite still — five pixels a second,
     which is under a tile over a long beat and reads as a camera being held
     rather than as a camera moving. */
  CREEP: 5,

  begin() {
    this.on = true;
    document.body.classList.add('cinema');
    R.cinema = true;
    /* The game is switched on so its canvas is drawn and sized; body.cinema is
       what takes the HUD, the controls, the minimap and the rest back off. */
    $('#game').classList.add('on');
    R.resize();
    this.dx = 0; this.dy = 1;
    /* A little north of where the shift begins, so the first beat that does
       name a camera is a move down into reception rather than a cut to a frame
       that was already on the screen. */
    this.cx = P.x; this.cy = P.y - TILE * 5;
    Cam.x = Cam.bound(this.cx - Cam.w / 2, MAPW, Cam.w);
    Cam.y = Cam.bound(this.cy - Cam.h / 2, MAPH, Cam.h);
  },

  /* Tile coordinates, because that is what a level is written in and what the
     editor shows. `secs` is how long the move should take. */
  aim(tx, ty, secs) {
    const x = (tx + .5) * TILE, y = (ty + .5) * TILE;
    const d = Math.hypot(x - this.cx, y - this.cy);
    if (d > 1) { this.dx = (x - this.cx) / d; this.dy = (y - this.cy) / d; }
    this.cx = x; this.cy = y;
    /* The same exponential smoothing Cam.follow uses, with the rate solved for
       the time the beat asked for instead of fixed: 96% of the distance in
       `secs`, still decelerating afterwards. Framerate-independent, and it
       eases out on its own, which is what makes a pan look operated. */
    this.rate = Math.pow(.04, 1 / Math.max(.3, secs));
  },

  camera(dt) {
    this.cx += this.dx * this.CREEP * dt;
    this.cy += this.dy * this.CREEP * dt;
    const k = 1 - Math.pow(this.rate, dt);
    Cam.x = lerp(Cam.x, Cam.bound(this.cx - Cam.w / 2, MAPW, Cam.w), k);
    Cam.y = lerp(Cam.y, Cam.bound(this.cy - Cam.h / 2, MAPH, Cam.h), k);
  },

  /* Idempotent: Game.begin() calls it on every way into the shift, including
     the three that never ran an opening. */
  end() {
    this.on = false;
    R.cinema = false;
    document.body.classList.remove('cinema');
  }
};

/* ---------------- Opening cutscene ----------------
   CUT, the beats, is in data/office.js — including what each one is SHAPED
   like and where the camera goes, because both of those are writing.

   Two things here are worth knowing before changing any of it:

     a press finishes the line before it advances the beat. A typewriter with
     no way past it is a tax on everybody who reads faster than 62 characters a
     second, which is everybody.

     there is always a skip, from the first frame, and it is a button rather
     than something to be discovered. Twelve beats is about ninety seconds, and
     the second time somebody starts a shift they have read all of it. */
const Cut = {
  i: 0, on: false, full: '', typed: 0, typing: false,

  start() {
    this.i = 0; this.on = true; G.state = 'cut';
    $('#nameScreen').classList.remove('on');
    $('#lookScreen').classList.remove('on');
    const el = $('#cutscene');
    /* Written whole rather than toggled: this screen is also the induction page
       (Boot.help), which leaves `plain` behind it, and the beat kinds leave a
       k-* behind them. */
    el.className = 'screen on';
    Cine.begin();
    this.dots();
    this.show();
    el.onclick = () => this.next();
    /* The letterbox closes ON the opening rather than being there when it
       arrives, so the first thing that happens is a camera being set up. */
    requestAnimationFrame(() => { if (this.on) el.classList.add('framed'); });
  },

  show() {
    const c = CUT[this.i] || {}, el = $('#cutscene');
    el.classList.remove('k-scene', 'k-line', 'k-title');
    el.classList.add('k-' + (c.k || 'scene'));
    $('#cutFace').textContent = c.f || '';
    $('#cutLabel').textContent = c.l || '';
    this.full = String(c.t || '');
    /* The finished sentence, invisible, so the caption is already the height it
       will end up and the lower third does not grow a line under the reader. */
    $('#cutGhost').textContent = this.full;
    /* Reduced motion gets the whole line at once: a caret ticking across a
       sentence is motion whatever the stylesheet says, and the text speed
       setting is the one the player already chose for dialogue. */
    this.typed = FX.motion ? 0 : this.full.length;
    this.setTyping(this.typed < this.full.length);
    this.paint();
    /* Re-run the entrance, which is what makes a beat read as a change of shot
       rather than as text being swapped in place. */
    const card = $('#cutCard');
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    if (c.cam) { el.classList.add('world'); Cine.aim(c.cam[0], c.cam[1], c.len || 2.4); }
    this.dots();
    Sfx.cut();
  },

  setTyping(v) { this.typing = v; $('#cutscene').classList.toggle('typing', v); },
  paint() { $('#cutText').textContent = this.full.slice(0, Math.floor(this.typed)); },

  tick(dt) {
    if (!this.on || !this.typing) return;
    const before = this.typed;
    this.typed += dt * Dialogue.speed;
    /* One tick every few characters actually revealed, not once a frame: the
       modulo-on-frame version stacked up oscillators. */
    if (Math.floor(this.typed / 3) !== Math.floor(before / 3)) Sfx.type();
    if (this.typed >= this.full.length) { this.typed = this.full.length; this.setTyping(false); }
    this.paint();
  },

  /* A press: finish the line, or move on. */
  next() {
    if (!this.on) return;
    if (this.typing) { this.typed = this.full.length; this.setTyping(false); this.paint(); Sfx.blip(); return; }
    this.i++;
    if (this.i >= CUT.length) { this.finish(); return; }
    this.show();
  },

  skip() {
    if (!this.on) return;
    Sfx.select();
    this.finish(true);
  },

  /* Space and Enter reach the screen whichever of its two jobs it is doing:
     the opening advances, and the induction page Boot.help() borrows it for
     closes. Without this, a press on the help page ran Cut.next() against a
     stale beat index and started the shift from the title screen. */
  press() {
    if (this.on) { this.next(); return; }
    const el = $('#cutscene');
    if (el.classList.contains('on') && el.onclick) el.onclick();
  },

  /* The bars open and the grade lifts BEFORE the shift starts, so the opening
     ends by handing the camera over rather than by cutting to a HUD. `quick` is
     the skip, which is somebody saying get on with it: enough of an exit to
     read as one, not enough to be in the way. Reduced motion gets neither.

     `leaving` is what stops a second press arriving in the gap — Cut.on is
     already false, so press() would otherwise fall through to the induction
     page's handler. */
  leaving: false,
  finish(quick) {
    if (this.leaving) return;
    this.on = false;
    const el = $('#cutscene');
    el.onclick = null;
    el.classList.remove('typing', 'framed');
    const ms = !FX.motion ? 0 : quick ? 220 : 620;
    if (!ms) { el.classList.remove('world'); Game.begin(); return; }
    this.leaving = true;
    el.classList.add('leaving');
    setTimeout(() => {
      this.leaving = false;
      el.classList.remove('leaving', 'world');
      Game.begin();
    }, ms);
  },

  dots() {
    const box = $('#cutDots');
    if (box.children.length !== CUT.length) {
      box.innerHTML = '';
      CUT.forEach(() => box.appendChild(document.createElement('i')));
    }
    for (let n = 0; n < box.children.length; n++) {
      box.children[n].className = n < this.i ? 'done' : n === this.i ? 'now' : '';
    }
  }
};

/* ---------------- A level handed over by the editor ----------------
   editor.html can put the level it is editing into localStorage and open the
   game with `?try=<id>`. This is the whole of the game's side of that, and it
   is deliberately small and deliberately inert: no query string, no key, or a
   key naming a different level, and none of it runs.

   localStorage rather than sessionStorage, because the editor opens the game in
   a NEW TAB and keeps itself and its bench open behind it — and session storage
   belongs to one tab. A stale key costs nothing: it is only ever looked at when
   the URL asks for that exact level, and only the editor writes that URL.

   Why hand the level over at all rather than have the editor open
   `index.html?level=x`: the game loads from data/, so the simple version would
   play the FILE's level while you sit there looking at your edited one — a
   play button that silently ignores your work is worse than no play button.

   What crosses over is what makes a level a level and nothing else: its
   geometry and its objects, plus FURN and ZONES, which decide how everything
   in it is furnished and what the rooms are made of. All three are pure data.
   Writing and code do NOT cross: a dialogue `do()` and a move's `run()` are
   functions, JSON drops them, and rebuilding them would mean evaluating a
   string out of storage — which this project does not do anywhere. So a trial
   is a walk around your level with the file's writing in it, and it says so. */
const Trial = {
  KEY: 'callhall.trial',
  on: false,

  /* Present, parseable, and about the level the URL asks for. Anything else is
     a normal shift. */
  want() {
    try {
      const id = new URLSearchParams(location.search).get('try');
      if (!id) return null;
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      return (p && p.level && p.level.id === id) ? p : null;
    } catch (_) {
      /* No storage (a file:// origin refuses it outright), or nonsense in it.
         Either way: play the game normally. */
      return null;
    }
  },

  /* The two shared tables are replaced in place rather than reassigned: they
     are top-level `const`s that every reader closes over by name. */
  table(live, next) {
    if (!next) return;
    Object.keys(live).forEach(k => { if (!(k in next)) delete live[k]; });
    Object.keys(next).forEach(k => { live[k] = next[k]; });
  },

  apply(p) {
    this.on = true;
    this.table(FURN, p.furn);
    this.table(ZONES, p.zones);
    const d = p.level;
    const objects = d.objects || [], desks = d.desks || [];
    const def = {};
    Object.keys(d).forEach(k => { if (k !== 'objects' && k !== 'desks') def[k] = d[k]; });
    /* The catalogue wants a furnish() and the editor can only send a list, so
       the list is replayed — exactly what a level created in the editor and
       pasted into data/levels.js would do. Cloned per build, because a level
       is built more than once and `add` keeps what it is given. */
    def.furnish = function () {
      objects.forEach(o => this.add(JSON.parse(JSON.stringify(o))));
      if (desks.length) this.desks = JSON.parse(JSON.stringify(desks));
    };
    LEVELS[d.id] = def;
  },

  /* Straight into the shift. No title, no name, no cutscene: you pressed a
     button in a level editor, and every screen between that and the level is
     one more thing between you and the thing you are checking. */
  begin(p) {
    Player.init('Tester');
    resetRun();
    Game.begin();
    UI.zone((LEVELS[p.level.id] || {}).name || p.level.id);
    UI.objective('Trying ' + ((LEVELS[p.level.id] || {}).name || p.level.id) + ' from the editor.');
    Guide.clear && Guide.clear();
    setTimeout(() => UI.toast('🧪', 'This is your level, with the file’s writing in it — '
      + 'nothing here is saved and the shift you had is untouched. Close the tab to go back.'), 700);
  }
};

/* ---------------- Boot ---------------- */
const Boot = {
  init() {
    R.init(); Sprites.load(); Tiles.load();
    /* One level is built here — the fourth floor, because that is where the
       game starts. The rest of the catalogue is built the first time somebody
       goes there, which is what keeps this line the same length however many
       levels the catalogue grows to. */
    Levels.init();
    /* A level the editor handed over, if there is one. Before Levels.start, so
       the trial level is the one that gets built. */
    const trial = Trial.want();
    if (trial) Trial.apply(trial);
    Levels.start(trial ? trial.level.id : 'office', (trial && trial.entry) || 'start');
    NPCM.spawn(); bindInput();
    Arcade.init();
    Track.init();
    Settings.load();
    Player.init('Trainee'); UI.hud();
    $('#btnNew').onclick = () => { this.goFullscreen(); this.newGame(); };
    $('#btnLoad').onclick = () => { this.goFullscreen(); this.load(); };
    $('#btnHelp').onclick = () => this.help();
    /* Asked again here: two of the three ways in go through this button, and a
       browser that declined the first request often grants a later one. No-ops
       once it has worked. */
    $('#btnName').onclick = () => { this.goFullscreen(); this.acceptName(); };
    /* On the screen from the first frame of the opening, and it stops the
       press reaching the surface behind it — which advances a beat. */
    $('#btnSkip').onclick = e => { e.stopPropagation(); Cut.skip(); };
    $('#btnLookRandom').onclick = () => Look.random();
    $('#btnLookGo').onclick = () => { this.goFullscreen(); Look.accept(); };
    $('#nameInput').addEventListener('keydown', e => { if (e.code === 'Enter') this.acceptName(); e.stopPropagation(); });
    this.refreshLoadButton();
    if (trial) Trial.begin(trial);
    requestAnimationFrame(Game.loop);
  },
  /* A mobile browser spends a third of the phone on its own chrome and this
     game fits its layout to the pixels it is given. Must be requested inside
     the click — the only place a browser grants it — and is allowed to fail
     (a refusal, iOS Safari, a user who said no), so the rejection is
     swallowed. No orientation lock: the game is built for both ways up. */
  goFullscreen() {
    try {
      const el = document.documentElement;
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      const go = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!go) return;
      const r = go.call(el, { navigationUI: 'hide' });
      if (r && r.catch) r.catch(() => {});
      /* No orientation lock. The game is built for both ways up — the mobile
         suite tests portrait and landscape — and deciding which way somebody
         holds their phone is not this button's business. */
    } catch (_) { /* not available: play in the tab */ }
  },
  newGame() {
    Sfx.init();
    /* Don't quietly overwrite a shift somebody is part-way through. */
    if (Save.has() && !confirm('There is a saved shift in this browser. Starting a new one will overwrite it. Continue?')) return;
    Sfx.select();
    G.state = 'name';
    $('#titleScreen').classList.remove('on');
    $('#nameScreen').classList.add('on');
    setTimeout(() => $('#nameInput').focus(), 120);
  },
  acceptName() {
    const v = ($('#nameInput').value || '').trim() || pick(['Grant', 'Jo', 'Sam', 'Aisha', 'Bex', 'Callum']);
    Player.init(v.slice(0, 14));
    resetRun();
    Sfx.select();
    /* Section 2 of the form. It brings the wardrobe in itself — nothing has
       been fetched for it up to this point — and hands on to the cutscene. */
    Look.open();
  },
  /* Show what is actually in the save rather than a permanently hopeful button. */
  refreshLoadButton() {
    const b = $('#btnLoad'), n = $('#btnNew'), s = Save.peek();
    if (!s) {
      b.disabled = true; b.textContent = 'No saved shift';
      b.title = 'Nothing saved in this browser yet.';
      b.classList.remove('primary'); n.classList.add('primary');
      return;
    }
    b.disabled = false;
    /* textContent, so no escaping — esc() here would render a literal &amp; */
    b.textContent = 'Continue — ' + (s.name || 'Trainee') + ', day ' + (s.day || 1) + ', ' + clockStr(s.minutes || DAY_START);
    /* With a shift in progress, continuing is the expected action; starting over
       is the one that throws work away, so it should not look like the default. */
    b.classList.add('primary'); n.classList.remove('primary');
    n.textContent = 'Start a new shift';
  },
  load() {
    if (!Save.has()) { Sfx.deny(); return; }
    Sfx.init();
    $('#titleScreen').classList.remove('on');
    $('#game').classList.add('on');
    R.resize();
    if (!Save.read()) { $('#game').classList.remove('on'); $('#titleScreen').classList.add('on'); return; }
    G.state = 'play'; Cam.snap();
    /* the objective survives in the save but lives in the DOM, so put it back */
    UI.objective(G.objective || 'Answer phones. Survive until 17:00.');
    UI.hudDirty();
    UI.zone(ZONES[World.zoneAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE))]
      ? ZONES[World.zoneAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE))].name
      : 'CALLHALL Services');
  },
  /* The induction page borrows the opening's screen, and `plain` is what stops
     it arriving as one: no letterbox, no camera, no typing, no skip — the
     laminated sign this always was, scrolling, because it is very long. */
  help() {
    G.state = 'cut';
    $('#titleScreen').classList.remove('on');
    const el = $('#cutscene');
    el.className = 'screen plain on';
    $('#cutLabel').textContent = 'Induction · how to play';
    $('#cutFace').textContent = '🧭';
    $('#cutGhost').textContent = '';
    $('#cutText').innerHTML =
      '<span class="who">The job</span>'
      + 'You answer the telephone for a company that sells something the training never quite names. '
      + 'Nobody expects you to enjoy it. A surprising number of people will be glad you are there.<br><br>'
      + (TOUCH
        ? (Hand.pad === 'dpad'
            ? 'Walk with the pad in the bottom-' + Hand.padSide() + '.'
            : 'Walk by putting a thumb down anywhere in the bottom-' + Hand.padSide() + ' of the screen and pushing — the stick comes to your thumb, and how far you push it is how fast you walk.')
          + ' Tap <b>E</b> to talk to people, inspect objects, and answer ringing phones. Once someone is talking, tap the conversation box to carry on and tap a reply to choose what to say. <b>☰</b> opens your jobs, inventory and the rest. Left-handed, or would rather have a d-pad? <b>☰ · Menu</b> has both.'
        : 'Walk around with <b>WASD</b> or the arrow keys. Press <b>E</b> to talk to people, inspect objects, and answer ringing phones. Press <b>Space</b> to advance dialogue and <b>1–9</b> to choose what to say.') + '<br><br>' +
      '<b>Difficult calls are turn-based.</b> Your <b>Patience</b> is your health and their <b>Frustration</b> is the thing you are reducing, which is a fair description of the job and was not intended as one. Coffee, cubicles and chairs restore you. So does being spoken to kindly, which happens roughly once a day and is not on the rota.<br><br>' +
      '<b>Listen to them.</b> Every turn the caller gives something away — a child shouting in the background, a reference number read out twice, a title given unprompted. That is the <b>tell</b>, and it says what they want right now: to be heard, a straight answer, this to be over, or to be taken seriously. Pick a reply that gives them that and it lands properly and builds <b>Rapport</b>; pick one that does not and it falls short. Repeat the same line and they stop believing it. Get Rapport high enough and you can stop reducing anything and simply <b>land the call</b>, which pays better than winning it.<br><br>' +
      '<b>Talk to everybody.</b> There are twenty people in this building and every one of them will tell you something if you ask twice. Several of them are the only person alive who knows a particular thing, and not one of them has written it down, and that is not carelessness — it is the only job security anybody here has.<br><br>' +
      '<b>Go everywhere.</b> Thirteen rooms, three of which are not on the floor plan — and the building is not all of it. There is a way down to the car park, and there is something under the archive. Sit on the step outside. Read the suggestion box. Look at the photograph in the archive. The building is the plot.<br><br>' +
      '<b>J</b> jobs · <b>I</b> inventory · <b>K</b> skills · <b>C</b> office chat · <b>M</b> email · <b>P</b> profile · <b>L</b> achievements · <b>Esc</b> menu and settings.<br><br>' +
      'The shift runs 09:00 to 17:00. Survive it. Then do it again, because that is the actual game and it is also the actual job.<br><br>' +
      '<i>This document is Rev. 7. Rev. 6 is the version in the folder on your desk. The differences are not marked.</i>';
    el.onclick = () => { el.onclick = null; el.classList.remove('on'); $('#titleScreen').classList.add('on'); G.state = 'title'; };
  }
};
addEventListener('DOMContentLoaded', () => Boot.init());
