'use strict';
/* ---------------- TimeSystem + main loop ---------------- */
const Game = {
  acc: 0, mmT: 0, frozen: false, paused: false,
  /* A full-screen overlay hides the world entirely, so there is nothing to gain
     from redrawing it — and plenty to lose, since the blurred backdrop then has
     to be re-rasterised every frame. */
  overlayUp() { return !!Combat.E || Panels.on || G.state === 'report' || G.state === 'ending'; },
  tick(dt) {
    if (this.paused) return;
    FX.update(dt);
    Dialogue.tick(dt);
    if (G.state === 'play' || G.state === 'dialogue' || G.state === 'panel') NPCM.update(dt);
    movePlayer(dt);
    Cam.follow(dt);
    Interact.scan();
    Guide.check();
    Phones.tick(dt);
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
    $('#cutscene').classList.remove('on');
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

/* ---------------- Opening cutscene ---------------- */
/* CUT, the slides, is in data/office.js. */
const Cut = {
  i: 0,
  start() {
    this.i = 0; G.state = 'cut';
    $('#nameScreen').classList.remove('on');
    $('#cutscene').classList.add('on');
    this.show();
    $('#cutscene').onclick = () => this.next();
  },
  show() {
    const c = CUT[this.i];
    $('#cutFace').textContent = c.f;
    $('#cutLabel').textContent = c.l;
    $('#cutText').innerHTML = '<span class="who">' + esc(c.l) + '</span>' + esc(c.t);
    Sfx.blip();
  },
  next() {
    this.i++;
    if (this.i >= CUT.length) { $('#cutscene').onclick = null; Game.begin(); return; }
    this.show();
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
    Levels.init(); Levels.start('office', 'start');
    NPCM.spawn(); bindInput();
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
    $('#nameInput').addEventListener('keydown', e => { if (e.code === 'Enter') this.acceptName(); e.stopPropagation(); });
    this.refreshLoadButton();
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
    Cut.start();
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
  help() {
    G.state = 'cut';
    $('#titleScreen').classList.remove('on');
    $('#cutscene').classList.add('on');
    $('#cutLabel').textContent = 'Induction · how to play';
    $('#cutFace').textContent = '🧭';
    $('#cutText').innerHTML =
      '<span class="who">The job</span>' + (TOUCH
        ? (Hand.pad === 'dpad'
            ? 'Walk with the pad in the bottom-' + Hand.padSide() + '.'
            : 'Walk by putting a thumb down anywhere in the bottom-' + Hand.padSide() + ' of the screen and pushing — the stick comes to your thumb, and how far you push it is how fast you walk.')
          + ' Tap <b>E</b> to talk to people, inspect objects, and answer ringing phones. Once someone is talking, tap the conversation box to carry on and tap a reply to choose what to say. <b>☰</b> opens your jobs, inventory and the rest. Left-handed, or would rather have a d-pad? <b>☰ · Menu</b> has both.'
        : 'Walk around with <b>WASD</b> or the arrow keys. Press <b>E</b> to talk to people, inspect objects, and answer ringing phones. Press <b>Space</b> to advance dialogue and <b>1–9</b> to choose what to say.') + '<br><br>' +
      'Difficult calls are turn-based. Your <b>Patience</b> is your health. Their <b>Frustration</b> is the thing you are reducing. Coffee, cubicles and chairs restore you. So does being spoken to kindly, which happens about once a day.<br><br>' +
      '<b>Listen to them.</b> Every turn the caller gives something away — a child shouting in the background, a reference number read out twice, a title given unprompted. That is the <b>tell</b>, and it says what they want right now: to be heard, a straight answer, this to be over, or to be taken seriously. Pick a reply that gives them that and it lands properly and builds <b>Rapport</b>; pick one that does not and it falls short. Repeat the same line and they stop believing it. Get Rapport high enough and you can stop reducing anything and simply <b>land the call</b>, which pays better than winning it.<br><br>' +
      '<b>Talk to everybody.</b> There are twenty people in this building and every one of them will tell you something if you ask twice. Several of them are the only person who knows a particular thing, and none of them have written it down.<br><br>' +
      '<b>Go everywhere.</b> Thirteen rooms, three of which are not on the floor plan — and the building is not all of it. There is a way down to the car park, and there is something under the archive. Sit on the step outside. Read the suggestion box. Look at the photograph in the archive. The building is the plot.<br><br>' +
      '<b>J</b> jobs · <b>I</b> inventory · <b>K</b> skills · <b>C</b> office chat · <b>M</b> email · <b>P</b> profile · <b>L</b> achievements · <b>Esc</b> menu and settings.<br><br>' +
      'The shift runs 09:00 to 17:00. Survive it. Then do it again, because that is the actual game and it is also the actual job.';
    $('#cutscene').onclick = () => { $('#cutscene').onclick = null; $('#cutscene').classList.remove('on'); $('#titleScreen').classList.add('on'); G.state = 'title'; };
  }
};
addEventListener('DOMContentLoaded', () => Boot.init());
