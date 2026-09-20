'use strict';
const Menu = {
  _done() { Settings.save(); Panels.render(); },
  save() { Save.write(); },
  load() { Save.read(); Panels.close(); },
  newgame() { if (confirm('Erase this shift and start again?')) { localStorage.removeItem(SAVE_KEY); location.reload(); } },
  sound() { Sfx.on = !Sfx.on; if (Sfx.on) Sfx.init(); else Sfx.holdMusic(false); this._done(); },
  music() { Sfx.music = !Sfx.music; if (!Sfx.music) Sfx.holdMusic(false); this._done(); },
  vol() { Sfx.setVolume(Sfx.volume >= 0.6 ? 0.08 : Sfx.volume + 0.14); this._done(); },
  anim() { R.animate = !R.animate; this._done(); },
  motion() { FX.motion = !FX.motion; if (!FX.motion) { FX.parts.length = 0; FX.shakeAmt = 0; } this._done(); },
  emoji() { R.emojiScale = R.emojiScale >= 1.3 ? 0.85 : R.emojiScale + 0.15; R._fontCache.clear(); this._done(); },
  speed() { Dialogue.speed = Dialogue.speed >= 200 ? 30 : Dialogue.speed >= 100 ? 999 : Dialogue.speed + 40; this._done(); },
  southpaw() { Hand.left = !Hand.left; Hand.apply(); Sfx.select(); this._done(); },
  padstyle() { Hand.pad = Hand.pad === 'dpad' ? 'stick' : 'dpad'; Hand.apply(); Sfx.select(); this._done(); },
  /* Entering has to happen inside this click — see Boot.goFullscreen. Leaving
     does not, but it belongs on the same button. */
  fullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const off = document.exitFullscreen || document.webkitExitFullscreen;
      if (off) { const r = off.call(document); if (r && r.catch) r.catch(() => {}); }
    } else Boot.goFullscreen();
    Sfx.select();
    /* The state only changes once the browser says so, and it may refuse. */
    setTimeout(() => Panels.render(), 220);
  }
};

/* ---------------- SaveSystem ---------------- */
const Save = {
  write(quiet) {
    /* A trial is somebody checking a level in the editor, and the hourly
       autosave would quietly overwrite the shift they actually have. */
    if (typeof Trial !== 'undefined' && Trial.on) return false;
    try {
      /* Fold the level you are standing on into G.levelState first. The evicted
         levels put themselves there on the way out; the live one has never been
         asked, and without this the save records every level's state except the
         one the player has actually been changing. */
      Levels.freeze();
      const data = { P: { ...P }, G: { ...G }, v: 2, at: Date.now() };
      delete data.G.activeEvent;      /* holds a function; not serialisable */
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      if (!quiet) UI.toast('💾', 'Shift saved. It will still be here. Unlike the fridge contents.', 'good');
      return true;
    } catch (e) { if (!quiet) UI.toast('💾', 'Could not save. Your browser has said no.', 'bad'); return false; }
  },
  has() { return !!this.peek(); },
  /* Read the header without applying it — used by the title screen. */
  peek() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d || !d.P || !d.G) return null;
      return { name: d.P.name, day: d.G.day, minutes: d.G.minutes, level: d.P.level, at: d.at };
    } catch (e) { return null; }
  },
  read() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d || !d.P || !d.G) { UI.toast('↻', 'No saved shift found.', 'bad'); return false; }
      /* Start from pristine defaults so a save written by an older build cannot
         leave new fields undefined and take the game down mid-frame. */
      resetRun();
      Object.assign(P, d.P); Object.assign(G, d.G);
      G.totals = Object.assign(freshTotals(), G.totals || {});
      G.todayStats = G.todayStats || {}; G.flags = G.flags || {}; G.quests = G.quests || {};
      G.achievements = G.achievements || {}; G.rel = G.rel || {}; G.callers = G.callers || {};
      G.chat = G.chat || []; G.mail = G.mail || []; G.endings = G.endings || [];
      G.discovered = G.discovered || {}; G.chatSent = G.chatSent || {}; G.mailSent = G.mailSent || {};
      P.equipment = Object.assign({ headset: null, trinket: null, mug: null }, P.equipment || {});
      P.inventory = Array.isArray(P.inventory) ? P.inventory.filter(i => ITEMS[i]) : [];
      P.skills = P.skills || {};
      G.activeEvent = null;
      G.state = 'play';
      /* The face the shift was saved with. The parts sheets are lazy, so this
         is the other place they get fetched — and it is deliberately not waited
         on: until they arrive the player is the row the build baked, which is a
         person rather than a hole. A save written before the creator existed
         has no `look` and simply keeps that row. */
      if (G.look) Look.load(() => Look.apply());
      /* Back onto the level the shift was saved on, with what that level
         remembered reapplied as it is rebuilt. After the assign above, so
         G.level and G.levelState are the saved ones and not the defaults
         resetRun() just put there — and it restores the saved position rather
         than the entry point, because you are where you were standing, not at
         the door you last came through. */
      Levels.resume();
      /* The season the save was written in decides what the ground outside is
         made of, and the ground is baked. Say so before the first frame, or a
         shift loaded in December is played on August's grass until something
         else happens to invalidate the tiles. */
      Sky.resume();
      Player.recalc(); Cam.snap(); UI.hudDirty(); Guide.restore();
      UI.toast('↻', 'Shift restored. Day ' + G.day + ', ' + clockStr(G.minutes) + '.', 'good');
      return true;
    } catch (e) { console.warn(e); UI.toast('↻', 'Save file is corrupt. Fitting, really.', 'bad'); return false; }
  }
};

/* Settings live apart from the save file, so they survive a new game. */
const Settings = {
  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY)); } catch (e) { s = null; }
    /* Respect the operating system's reduced-motion preference by default. */
    const prefersCalm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    s = s || {};
    Sfx.on = s.sound !== false;
    Sfx.music = s.music !== false;
    Sfx.setVolume(typeof s.volume === 'number' ? s.volume : 0.32);
    R.animate = s.animate !== false;
    FX.motion = typeof s.motion === 'boolean' ? s.motion : !prefersCalm;
    R.emojiScale = typeof s.emojiScale === 'number' ? clamp(s.emojiScale, 0.7, 1.6) : 1;
    Dialogue.speed = typeof s.textSpeed === 'number' ? clamp(s.textSpeed, 20, 999) : 62;
    Hand.left = s.southpaw === true;
    Hand.pad = s.pad === 'dpad' ? 'dpad' : 'stick';
    Hand.apply();
  },
  save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        sound: Sfx.on, music: Sfx.music, volume: Sfx.volume, animate: R.animate,
        motion: FX.motion, emojiScale: R.emojiScale, textSpeed: Dialogue.speed,
        southpaw: Hand.left, pad: Hand.pad
      }));
    } catch (e) { /* private browsing; settings just won't persist */ }
  }
};

/* ---------------- End of shift report ----------------
   FIVE O'CLOCK USED TO BE A DOOR SLAMMING. The minute the clock reached it the
   world froze, a full-screen performance summary went up over whatever you were
   doing, and the only thing on it you could press said "Clock out". If you were
   at your desk that was a summary. If you were halfway round a roundabout in a
   pool car — which the game has allowed for some time now — it was the game
   taking the wheel off you to show you a spreadsheet.

   The clock stopped being a curtain in engine/sky.js, for the same reason and
   in the same words: the shift ending is not the day ending. This is the other
   half of that. Five o'clock is now a LINE, not a screen. The queue closes, the
   toast says so, the figures are written, and nothing is taken away from you —
   and the report itself moves to where every other piece of this company's
   paperwork already lives, the portal, where it can be read at five past, or at
   nine that evening, or never.

   Which has a second effect worth having: the page is live. It is today's
   figures whenever you open it, so a shift is something you can check at half
   eleven rather than a verdict delivered once, after everything it describes is
   already over. See Panels.r_shift(). */
const Report = {
  /* Today's numbers, in the order a person would read them. Today's, not the
     lifetime totals — reading them off G.totals made every day after the first
     look like a triumph.

     `covered` is the newest row and it is here rather than in the middle,
     beside the other call figures, because of what it says: these are the calls
     the floor took while you were out of the building. A day spent driving is a
     day with a small tally, and this is the line that explains why rather than
     letting the player think the queue simply went quiet. It is omitted when it
     is nought, because on a day spent at the desk it is not a fact about
     anything. */
  rows() {
    const t = G.todayStats;
    const r = [
      ['📞 Calls handled', t.calls || 0],
      ['😊 Customers satisfied', t.satisfied || 0],
      ['💔 Customers emotionally damaged', t.angered || 0],
      ['🙈 Customers transferred to Dave', t.transfers || 0]
    ];
    if (t.covered) r.push(['🤝 Covered by the floor', t.covered]);
    return r.concat([
      ['☕ Coffee consumed', t.coffee || 0],
      ['🖨️ Printer incidents', t.printer || 0],
      ['🚽 Toilet minutes', t.toiletMin || 0],
      ['💼 Corporate phrases deployed', t.bullshit || 0],
      ['⌨️ Minutes of actual work', t.worked || 0],
      ['⭐ XP gained', t.xp || 0],
      ['💷 Earned today', '£' + (t.money || 0).toFixed(2)],
      ['🌩️ Unexplained incidents', t.events || 0]
    ]);
  },
  /* The rating, which is the joke, and the footnote, which is the joke's
     second half. Not shown before five: a verdict on a shift that is still
     running is the one thing this company has never actually done. */
  verdict() {
    const t = G.todayStats, calls = t.calls || 0;
    const v = [
      ['Outstanding*', 'The Outstanding rating is capped at 5% of headcount per site and has already been allocated.'],
      ['Exceeds Expectations*', 'Expectations were lowered on Tuesday.'],
      ['Meets Expectations*', 'Management reserves the right to redefine expectations.'],
      ['Developing*', '“Developing” is not a criticism. It is a category. It is also a criticism.'],
      ['Statistically Acceptable*', 'Your performance is statistically acceptable. No individual has assessed it.']
    ];
    let vi = 4;
    if (calls >= 12 && P.rep > 40) vi = 0;
    else if (calls >= 8 && P.rep > 15) vi = 1; else if (calls >= 4) vi = 2; else if (calls >= 2) vi = 3;
    return v[vi];
  },
  /* What the evening says on the way out. Drawn once per clock-out rather than
     on every render, so opening the page twice does not reshuffle the world
     behind it — it is a thing that happened, not a slot machine. */
  LEAVING: [
    'Karen has sent a message that says “quick one” and nothing else. It can wait. It has to wait.',
    'On the way out, Ron says “alright”. You say “alright”. It is the best conversation of the day.',
    'Somebody has left the printer running. It is printing. Nobody sent anything.',
    'You get to the bus stop before you realise you are still wearing the lanyard.',
    'Bev is coming in as you are going out. She says “night, love”. She has been here since six. She will be here at six tomorrow.',
    'Forty screens are still on behind you, saying WELCOME to an empty room, all night, to nobody.',
    'You push your chair in without deciding to. You will do this for the rest of your life now and you know exactly whose fault it is.',
    'Somebody on the fire escape laughs at something. The door is propped open with the fire extinguisher. It always is.',
    'In the lift lobby, the lift arrives. Nobody gets in. The lift is decorative. It has always been decorative.',
    'Three streets away you catch yourself saying “bear with me” to a man in a shop and you have to stand still for a second.',
    'The pigeon is on the handrail. It watches you go. It does not go anywhere. It works here more than you do.',
    'Tomorrow’s target has been set. It is today’s result. Nobody set it. It set itself at 03:00.'
  ],
  /* CLOCKING OFF. What used to be spread across show() and next() and a button
     nobody chose to press: the queue closes, the day is written down, and one
     line goes into the notification log. The world is not touched. You are
     standing where you were standing at 16:59, doing whatever you were doing,
     and the evening is already yours — see the note over Sky.pace(). */
  post() {
    Sfx.holdMusic(false);
    Phones.clearAll();
    G.flags.leaving = pick(this.LEAVING);
    Ach.get('a_first');
    Q.restand();
    UI.toast('🕔', '<b>That is five.</b> The phones are somebody else\'s now. '
      + 'Your figures for the day are in the portal, under <b>Shift</b>'
      + (TOUCH ? ' — <b>☰ · Shift</b>.' : ' — press <span class="kbd">T</span>.'), 'gold');
    Save.write(true);
    UI.hud();
  }
};

/* ---------------- Endings ---------------- */
/* ENDINGS, the text of them, is in data/office.js. */
const Endings = {
  available() {
    const a = [];
    if (G.flags.finalDone) a.push('spread', 'ceo');
    if (P.level >= 6 || P.rep >= 40) a.push('ladder');
    if (G.totals.coffee >= 8) a.push('coffee');
    if (Rel.get('steve') >= 2) a.push('it');
    if (G.flags.kevinFound) a.push('kevin');
    if (G.flags.complaintBeaten || Rel.get('alan') >= 5) a.push('alan');
    if (Rel.get('bev') >= 5 || G.flags.bevBag) a.push('bev');
    if (G.flags.marcusResolved) a.push('marcus');
    if (G.flags.tomaszFreeze && Rel.get('tomasz') >= 4) a.push('tomasz');
    if (G.flags.pigeonFriend) a.push('pigeon');
    a.push('stay', 'escape');
    return [...new Set(a)];
  },
  offer() {
    G.flags.endingShown = true;
    const opts = this.available();
    Dialogue.say('📊', 'AFTER', 'The floor, 17:02, everyone gone', [
      'The gridlines fade. You are standing on the management floor holding a mug, and the monitor in the corner is showing a screensaver for the first time in sixteen years.',
      'Karen appears in the doorway with a form. There is always a form.',
      'So: what happens to you now?'],
      opts.map(k => ({ t: ENDINGS[k].t, to: null, do() { Endings.show(k); } })));
  },
  show(k) {
    const e = ENDINGS[k];
    if (!G.endings.includes(k)) G.endings.push(k);
    G.state = 'ending';
    Sfx.holdMusic(false); Sfx.levelup();
    $('#endBody').innerHTML = '<div class="ending-title">' + e.t + '</div>' +
      e.b.map(p => '<p class="ending-text">' + esc(p) + '</p>').join('') +
      '<div class="h2">Final numbers</div>' +
      '<div class="rep-row"><span>Level</span><span>' + P.level + ' · ' + RANKS[P.rank].n + '</span></div>' +
      '<div class="rep-row"><span>Calls handled</span><span>' + G.totals.calls + '</span></div>' +
      '<div class="rep-row"><span>Days survived</span><span>' + G.day + '</span></div>' +
      '<div class="rep-row"><span>Achievements</span><span>' + Ach.count() + ' / ' + Object.keys(ACHS).length + '</span></div>' +
      '<div class="rep-row"><span>Endings found</span><span>' + G.endings.length + ' / ' + Object.keys(ENDINGS).length + '</span></div>' +
      '<p style="margin-top:16px;color:var(--dim);font-size:13px;font-style:italic">Thank you for calling CALLHALL. Your feedback is important to us and will be stored in a spreadsheet.</p>';
    $('#ending').classList.add('on');
    Save.write();
  }
};
