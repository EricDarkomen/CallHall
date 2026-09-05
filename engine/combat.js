'use strict';
/* ---------------- CombatSystem: customer service ---------------- */
/* Between phases the player gets a breather. Without it a multi-phase fight is
   a pure damage race that only a maxed-out build can survive. */
const PHASE_HEAL = 0.30, PHASE_ENERGY = 0.20;

const Combat = {
  E: null, turn: 1, busy: false,
  startCall(hot) {
    if (G.totals.calls === 0) {
      const c = CALLERS[0];
      return this.begin({
        caller: c.id, name: 'Mrs Aitken, Motherwell', face: '🧑', sub: 'Re: a bill that is £4 more than expected',
        frus: 30, maxFrus: 30, cpat: 140, maxCpat: 140, agg: 3, boss: null,
        lines: { open: ['Hiya. Sorry to bother you. Bit of a boring one, this — my bill’s four pound more than last month and I just wondered why.'],
          mid: ['No, no, you’re fine, take your time.', 'Sorry, is it me being thick?', 'You’re new, aren’t you? You’ve got a new voice.'],
          hot: ['I don’t want to be difficult.', 'It’s only four pound. It’s the not knowing.'],
          win: ['Oh, brilliant. Thanks ever so much. You’ve been really good, actually. First time I’ve got a straight answer.'] }
      });
    }
    const pool = CALLERS.filter(c => !c.mystery || (Q.active('q_kevin') && G.flags.kevinLore));
    let c = null, r = Math.random() * pool.reduce((s, x) => s + x.w, 0);
    for (const x of pool) { r -= x.w; if (r <= 0) { c = x; break; } }
    c = c || pool[0];
    const dayScale = 1 + (G.day - 1) * 0.12 + (G.minutes > 840 ? 0.15 : 0);
    this.begin({
      caller: c.id, name: c.name, face: c.face, sub: 'Re: ' + pick(c.issues),
      frus: Math.round(c.frus * dayScale * (hot ? 1.3 : 1)), maxFrus: Math.round(c.frus * dayScale * (hot ? 1.3 : 1)),
      cpat: c.pat, maxCpat: c.pat, agg: c.agg * (hot ? 1.4 : 1), lines: c, boss: null
    });
  },
  startBoss(key) {
    const b = BOSSES[key];
    this.bossKey = key; this.bossPhase = 0;
    const ph = b.phases[0];
    this.begin({
      caller: 'boss', name: ph.n, face: b.face, sub: b.sub, boss: key,
      frus: ph.frus, maxFrus: ph.frus, cpat: 999, maxCpat: 999, agg: ph.agg,
      lines: { open: [ph.lines[0]], mid: ph.lines, hot: ph.lines, win: ['...'] }
    });
  },
  begin(E) {
    this.E = E; this.turn = 1; this.busy = false; this.over = false; this.onlyBS = true;
    /* Per-call state for reading the caller: what they want, what they are
       giving away, how much of you has got through, and which lines they have
       already heard from you today. */
    E.rap = 0; E.used = {}; E.wear = {}; E.matched = 0; E.landed = false;
    /* How hard they came in, and how many turns running you have answered a
       question they were not asking. Both drive `agg`, which is otherwise a
       constant per caller and made every call the same shape whatever you did
       in it — see play(). */
    E.base = E.agg; E.miss = 0;
    this.shiftNeed(E, true);
    G.state = 'combat'; $('#combat').classList.add('on');
    $('#cbTitle').textContent = E.boss ? 'ENCOUNTER · ' + BOSSES[E.boss].title : 'Incoming call · queue position ' + ri(1, 9);
    $('#cbLog').innerHTML = '';
    Sfx.ring(); setTimeout(() => { if (Combat.E) Sfx.holdMusic(true); }, 1200);
    $('#cbHold').textContent = pick(['♪ hold music: “Greensleeves”, but wrong',
      '♪ hold music: four bars of jazz, forever', '♪ hold music: someone’s ringtone from 2007',
      '♪ hold music: it has a saxophone and it is not sorry']);
    this.line(pick(E.lines.open), 'say');
    this.refresh();
  },
  line(txt, cls) { $('#cbLine').innerHTML = '<span class="' + (cls || 'say') + '">' + esc(txt) + '</span>'; },
  /* Pick what they want next. Certain callers lean a certain way — the elderly
     caller who rang partly for the company, the technical one who wants an
     answer and not a hug — so the roll is weighted rather than uniform, and the
     same caller type now plays consistently instead of surprising you. */
  needBias(E) {
    const bias = {
      elderly: ['heard', 'heard', 'heard', 'answer'],
      confused: ['answer', 'answer', 'heard', 'speed'],
      tech: ['answer', 'answer', 'answer', 'respect'],
      corporate: ['respect', 'respect', 'answer', 'speed'],
      test: ['respect', 'respect', 'answer', 'answer'],
      silent: ['heard', 'heard', 'answer', 'heard'],
      grief: ['heard', 'heard', 'heard', 'respect'],
      small: ['heard', 'speed', 'answer', 'respect'],
      car: ['speed', 'speed', 'answer', 'heard'],
      regular: ['heard', 'answer', 'speed', 'respect']
    };
    return bias[E.caller] || ['heard', 'answer', 'speed', 'respect'];
  },
  /* What follows what. A call has a shape — they want to be heard, and then
     once they have been they want the actual answer, and then they want their
     afternoon back — and a want rolled fresh from the same bag every turn had
     no shape at all: it was four sides of a die, and the tell might as well
     have been random noise you learned to ignore.

     The follow-on is still filtered through the caller's own bias, so the
     technical caller never suddenly wants a hug and the bereaved one is never
     asked to hurry up. It is what the caller could want next, in the order a
     person would want it. */
  NEXT: {
    heard:   ['answer', 'answer', 'respect', 'heard'],
    answer:  ['speed', 'respect', 'answer', 'heard'],
    speed:   ['answer', 'respect', 'speed', 'heard'],
    respect: ['answer', 'heard', 'speed', 'respect']
  },
  shiftNeed(E, force) {
    const pool = this.needBias(E);
    let n;
    /* Most of the time the next want follows from the last one; the rest of the
       time it is whatever this caller leans towards, which keeps them from
       becoming a sequence you can recite. */
    if (!force && E.need && chance(.65)) {
      const on = this.NEXT[E.need].filter(x => pool.includes(x));
      n = on.length ? pick(on) : pick(pool);
    } else n = pick(pool);
    /* Never repeat the same need twice running unless the caller is one of the
       single-minded ones — two identical turns reads as the tell being broken. */
    for (let i = 0; i < 3 && n === E.need && !force; i++) n = pick(pool);
    E.need = n;
    E.tell = pick(TELLS[n] || TELLS.heard);
  },
  log(t) {
    const d = document.createElement('div'); d.textContent = t;
    const l = $('#cbLog'); l.appendChild(d); l.scrollTop = l.scrollHeight;
    while (l.children.length > 30) l.firstChild.remove();
  },
  refresh() {
    const E = this.E; if (!E) return;
    $('#cbFace').textContent = E.face; $('#cbName').textContent = E.name; $('#cbIssue').textContent = E.sub;
    $('#cbTimer').textContent = 'TURN ' + this.turn;
    const meter = (id, pct, label) => {
      const el = $(id); el.style.width = clamp(pct, 0, 100) + '%';
      if (el.parentElement) {
        el.parentElement.setAttribute('aria-valuenow', String(Math.round(clamp(pct, 0, 100))));
        el.parentElement.setAttribute('aria-valuetext', label);
      }
    };
    meter('#cbFrus', E.frus / E.maxFrus * 100, Math.max(0, Math.round(E.frus)) + ' frustration');
    $('#cbFrusV').textContent = Math.max(0, Math.round(E.frus));
    meter('#cbCPat', E.cpat / E.maxCpat * 100, E.cpat > 900 ? 'endless patience' : Math.max(0, Math.round(E.cpat)) + ' patience left');
    $('#cbCPatV').textContent = E.cpat > 900 ? '∞' : Math.max(0, Math.round(E.cpat));
    meter('#cbYou', P.patience / P.patMax * 100, Math.round(P.patience) + ' of your patience left');
    $('#cbYouV').textContent = Math.round(P.patience);
    meter('#cbRap', E.rap || 0, Math.round(E.rap || 0) + ' rapport');
    $('#cbRapV').textContent = Math.round(E.rap || 0);

    /* The tell. Named as a want rather than a mechanic — "they want a straight
       answer" is the same information as need:'answer' and reads like a person. */
    const tellBox = $('#cbTell');
    if (E.tell && NEEDS[E.need]) {
      /* "still" when they have been asking for the same thing for two turns and
         not getting it. The tell already changed wording; this says it is the
         same want underneath, which is the difference between a caller being
         random and a caller being ignored. */
      tellBox.innerHTML = NEEDS[E.need].e + ' <span class="tt">' + esc(E.tell) + '</span> '
        + '<span class="tw">· ' + (E.miss >= 2 ? 'still wants ' : 'wants ') + esc(NEEDS[E.need].n) + '</span>';
    } else tellBox.innerHTML = '';

    const box = $('#cbMoves'); box.innerHTML = '';
    let key = 0;
    MOVES.forEach(m => {
      if (m.need && !Sk.rank(m.need)) return;
      if (m.show && !m.show(E)) return;
      key++;
      const b = document.createElement('button'); b.className = 'move'; b.type = 'button';
      const cost = [];
      if (m.cost.pat) cost.push('−' + m.cost.pat + '❤️');
      if (m.cost.ene) cost.push('−' + m.cost.ene + '⚡');
      /* How much of this one they have already heard today. Objective, so it
         belongs on the button; whether it suits them is for you to work out. */
      const uses = (E.used && E.used[m.id]) || 0;
      /* The badge reports staleness now, not lifetime use: it has to tell you
         whether saying it again would work, which is the decision in front of
         you. A move you last used six turns ago is fresh again. */
      const stale = (E.wear && E.wear[m.id]) || 0;
      if (stale >= 0.8) b.classList.add('worn');
      if (m.id === 'land') b.classList.add('primary');
      b.innerHTML = '<span class="mc">' + cost.join(' ') + '</span>' +
        (stale >= 0.8 ? '<span class="mw">heard it · ' + uses + '×</span>' : '') +
        '<div class="mn">' + (key < 10 ? '<span class="mk">' + key + '</span>' : '') + m.e + ' ' + esc(m.n) + '</div>' +
        '<div class="md">' + esc(m.d) + '</div>';
      b.disabled = !!(this.busy || (m.cost.ene && P.energy < m.cost.ene));
      if (m.cost.ene && P.energy < m.cost.ene) b.title = 'Not enough energy. Have a coffee.';
      b.onclick = () => this.play(m);
      box.appendChild(b);
    });
    UI.hud();
  },
  play(m) {
    /* Every step of a turn is separated from the next by a timer, and each one
       re-reads this.E rather than closing over it. If the call has ended in the
       meantime the caller is gone, so there is nothing left to act on — bail
       instead of dereferencing null. */
    if (this.busy || !this.E) return;
    const E = this.E; this.busy = true; Sfx.select();
    if (m.id !== 'bs') this.onlyBS = false;
    if (m.cost.pat) P.patience = Math.max(1, P.patience - m.cost.pat);
    if (m.cost.ene) P.energy = Math.max(0, P.energy - m.cost.ene);
    const r = m.run(E);
    if (r.stat) { P.stats[r.stat] = (P.stats[r.stat] || 0) + 0.25; }

    /* Reading them, and repeating yourself. Both only apply to a move that is
       actually trying to move the call along — the enders (999) and the
       self-care moves are left exactly as they were. */
    const serves = m.serves || [];
    const match = serves.includes(E.need);
    const uses = E.used[m.id] || 0;
    const worn = E.wear[m.id] || 0;
    E.used[m.id] = uses + 1;
    E.wear[m.id] = worn + 1;
    E.lastMatch = false;
    let note = '';
    if (r.dmg > 0 && r.dmg < 900) {
      /* Say the same thing twice running and they hear it becoming a script.
         Staleness fades between uses (see customerTurn), so the answer is to
         rotate rather than to burn each move once and be left with nothing —
         a boss has 170 frustration and there are only seven basic replies. */
      if (worn) r.dmg *= Math.max(0.34, Math.pow(0.72, worn));
      if (match) {
        r.dmg *= 1.65;
        E.rap = clamp(E.rap + 20 + P.eff.empathy, 0, 100);
        E.matched++; E.lastMatch = true;
        note = ' — that was what they wanted.';
        FX.float(P.x, P.y - 34, '🤝 rapport', '#b48cff');
        /* Somebody who is being understood calms down, and stays calmer for
           the rest of the call than they started it. Never all the way: they
           still rang up about something. */
        E.miss = 0;
        E.agg = Math.max(E.base * .78, E.agg - E.base * .08);
      } else if (serves.length) {
        r.dmg *= 0.65;
        E.rap = Math.max(0, E.rap - 8);
        note = ' — not what they were after.';
        /* And somebody being answered off the point gets louder about it. Two
           turns of grace first, because one misread is a guess and everybody
           gets one. */
        E.miss++;
        if (E.miss >= 2) E.agg = Math.min(E.base * 1.5, E.agg + E.base * .13);
      }
    }
    E.frus -= r.dmg;
    this.line('▸ ' + r.txt + note, 'nar');
    this.log((r.dmg >= 900 ? '[END] ' : r.dmg >= 0 ? '−' + Math.round(r.dmg) + ' frustration · ' : '+' + Math.round(-r.dmg) + ' frustration · ')
      + m.n + (match ? '  ✓ ' + NEEDS[E.need].n : '') + (uses ? '  (heard it ' + uses + '×)' : ''));
    if (r.dmg > 0 && r.dmg < 900) FX.burst(P.x, P.y - 20, '💬', 4);
    this.refresh();
    setTimeout(() => {
      if (r.win) return this.end('win');
      if (r.transfer) return this.end('transfer');
      if (r.fail) return this.end('angered');
      if (E.frus <= 0) return this.phaseOrWin();
      this.customerTurn();
    }, 900);
  },
  customerTurn() {
    const E = this.E; if (!E) return;
    if (!E.boss) E.cpat -= ri(5, 11);
    const hot = E.frus > E.maxFrus * 0.6;
    const say = pick(hot ? E.lines.hot : E.lines.mid);
    let dmg = E.agg * (0.8 + clamp(E.frus / E.maxFrus, 0, 1)) * (1 - Sk.rank('deesc') * 0.13);
    if (E.caller === 'elderly') dmg *= 0.3;
    /* Meeting Immunity applies where meetings happen. */
    if (E.boss === 'nigel') dmg *= (1 - Sk.rank('meeting') * 0.18);
    dmg = Math.max(1, dmg + rnd(-2, 2));
    P.patience = Math.max(0, P.patience - dmg);
    this.line(say, 'say');
    this.log('They: ' + say + '  (−' + Math.round(dmg) + ' patience)');
    this.hit(Math.round(dmg));
    FX.shake(Math.min(6, dmg / 3));
    E.frus += E.boss ? 3 : 1.5;
    /* They move on. Getting it right settles that need and they raise the next
       one; getting it wrong mostly leaves them asking for the same thing again,
       which is the call telling you to read the tell rather than the buttons.
       And once you have missed it twice they stop changing the subject at all:
       a person who is not being heard says the same thing again, in different
       words, until somebody hears it. */
    if (E.lastMatch || (E.miss < 2 && chance(.3))) this.shiftNeed(E);
    else E.tell = pick(TELLS[E.need] || TELLS.heard);
    /* Staleness fades while you are talking about something else. */
    for (const k in E.wear) { E.wear[k] *= 0.62; if (E.wear[k] < 0.2) delete E.wear[k]; }
    this.turn++; this.busy = false;
    this.refresh();
    if (P.patience <= 0) return this.end('broken');
    if (E.cpat <= 0) return this.end('hangup');
    /* Bosses have no queue timer — the fight ends when one of you gives way.
       Only ordinary callers give up on you for taking too long. */
    if (!E.boss && this.turn > TURN_LIMIT) return this.end('hangup');
  },
  /* red flash + floating number on the player's meter when patience is taken */
  hit(n) {
    const bar = $('#cbYou'); if (!bar) return;
    const wrap = bar.closest('.bar-row');
    if (wrap) {
      const f = document.createElement('span');
      f.className = 'cb-dmg'; f.textContent = '−' + n;
      wrap.appendChild(f);
      setTimeout(() => f.remove(), 900);
    }
    const cb = $('#combat');
    if (cb) { cb.classList.remove('struck'); void cb.offsetWidth; cb.classList.add('struck'); }
    if (P.patience > 0 && P.patience <= P.patMax * 0.25) $('#combat').classList.add('critical');
    else $('#combat').classList.remove('critical');
  },
  phaseOrWin() {
    const E = this.E; if (!E) return;
    if (E.boss) {
      const b = BOSSES[E.boss];
      this.bossPhase++;
      if (this.bossPhase < b.phases.length) {
        const ph = b.phases[this.bossPhase];
        E.name = ph.n; E.frus = ph.frus; E.maxFrus = ph.frus; E.agg = ph.agg;
        E.lines = { open: [ph.lines[0]], mid: ph.lines, hot: ph.lines, win: ['...'] };
        /* the breather */
        const heal = Math.round(P.patMax * PHASE_HEAL), gas = Math.round(P.eneMax * PHASE_ENERGY);
        P.patience = clamp(P.patience + heal, 0, P.patMax);
        P.energy = clamp(P.energy + gas, 0, P.eneMax);
        $('#combat').classList.remove('critical');
        this.line(b.breather || '— ' + ph.n + ' —', 'nar');
        this.log('PHASE: ' + ph.n + '  (+' + heal + ' patience, +' + gas + ' energy)');
        Sfx.bad(); FX.shake(10); UI.flash('#ff5f56', .35);
        this.busy = false; this.refresh(); return;
      }
      return this.end('win');
    }
    return this.end('win');
  },
  end(how) {
    /* A call pays out exactly once. E is not cleared until the player dismisses
       the summary, so E alone cannot tell us whether we have already settled up
       — without this flag a second end() would award the XP, money, reputation
       and boss flag all over again. */
    const E = this.E; if (!E || this.over) return;
    this.over = true; this.busy = true;
    Sfx.holdMusic(false);
    count('calls');
    let xp = 0, money = 0, rep = 0, msg = '';
    if (how === 'win') {
      xp = 30 + Math.round(E.maxFrus / 3) + (E.boss ? 180 : 0) + Sk.rank('persuade') * 8;
      money = E.boss ? 12 : 1.1 + Math.random();
      rep = E.boss ? 15 : 4; count('satisfied');
      msg = E.boss ? '' : pick(E.lines.win);
      /* A call won by reading them pays more than a call won by grinding the
         bar down, which is the entire argument of this game. */
      const rap = Math.round(E.rap || 0);
      if (rap >= 40) {
        const bonus = Math.round(rap / 2) + (E.landed ? 40 : 0);
        xp += bonus; rep += E.landed ? 6 : 3;
        UI.toast('🤝', (E.landed ? 'You landed it. ' : 'They came off that call better than they went on. ')
          + '<b>+' + bonus + ' XP</b>', 'gold');
        if (E.landed) { P.stats.empathy += 1; Ach.get('a_landed'); }
      }
      /* Sandra's survey advances here because this is where the two things it
         asks for actually happen: a call resolved well, and then enough of them
         that she will take one off you. Both are one-way and flagged, or a good
         afternoon would walk the tracker off the end of the job. */
      if (Q.active('q_survey')) {
        if (!G.flags.surveyGood) { G.flags.surveyGood = true; Q.step('q_survey'); }
        if (!G.flags.surveyGot && surveyReady()) { G.flags.surveyGot = true; Q.step('q_survey'); }
      }
      if (P.patience > P.patMax * 0.5) Ach.get('a_adult');
      if (this.onlyBS && this.turn > 2) Ach.get('a_bs');
      Sfx.levelup();
    } else if (how === 'transfer') { xp = 12; money = .5; rep = -1; msg = 'The call is somebody else’s now. The relief is immediate and slightly shameful.'; }
    else if (how === 'hangup') { xp = 8; rep = -2; count('angered'); msg = 'They have gone. There is a dial tone, and a note on the account that says “cust d/c”.'; }
    else if (how === 'angered') { xp = 5; rep = -4; count('angered'); msg = 'That went badly. That went so badly it will have a reference number.'; }
    else if (how === 'broken') {
      xp = 5; rep = -2; count('angered');
      msg = 'You put them on hold, take the headset off, and look at the ceiling tiles for a while. Nobody notices. Somebody always notices, and nobody says anything, which is the same thing.';
    }
    /* Only an actual win counts as beating a boss. Being broken, hung up on,
       or transferring the encounter away must not award the flag. */
    if (E.boss && how === 'win') this.bossWin(E);
    else if (E.boss) this.bossLost(E, how);
    Player.xp(xp); if (money) Player.mod({ money }); if (rep) Player.mod({ rep });
    const after = () => {
      $('#combat').classList.remove('on');
      this.E = null; if (G.state === 'combat') G.state = 'play';
      UI.hud();
    };
    if (msg) {
      this.line(msg, 'say');
      $('#cbMoves').innerHTML = '';
      const b = document.createElement('button');
      /* Its own class: the generic .btn primary is a full-width slab sized for
         a settings row. Label and reward are separate elements so the reward
         can drop to its own line rather than wrapping mid-figure. */
      b.className = 'btn primary cb-end'; b.style.gridColumn = '1/-1';
      const reward = '+' + xp + ' XP' + (money ? ' · +£' + money.toFixed(2) : '');
      b.innerHTML = '<span class="ce-t">📞 End call</span><span class="ce-r">' + reward + '</span>';
      b.onclick = () => { after(); this.postBoss(); };
      $('#cbMoves').appendChild(b);
    } else { after(); this.postBoss(); }
  },
  bossWin(E) {
    const key = E.boss, flag = BOSSES[key].win;
    G.flags[flag] = true;
    if (key === 'printer') { Ach.get('a_printer'); Q.complete('q_printer'); count('printer'); }
    if (key === 'review') { Ach.get('a_boss'); Q.complete('q_spreadsheet'); }
    if (key === 'nigel') {
      Ach.get('a_meeting');
      /* Meeting Immunity finally pays out: you learn something from being talked at. */
      const m = Sk.rank('meeting');
      if (m) { Player.xp(m * 25); UI.toast('🧘', 'Meeting Immunity: you took notes you will never read. <b>+' + (m * 25) + ' XP</b>', 'gold'); }
    }
    if (key === 'complaint') {
      Ach.get('a_complaint'); Q.complete('q_complaint');
      Player.mod({ rep: 10 }); Rel.add('alan', 3); count('satisfied');
    }
    if (key === 'queue') {
      Ach.get('a_queue'); Player.mod({ money: 14, rep: 12 });
      G.flags.queueBeaten = true;
      count('calls', 11); count('satisfied', 8);
    }
    if (key === 'allhands') {
      Ach.get('a_allhands');
      const m = Sk.rank('meeting');
      if (m) { Player.xp(m * 30); UI.toast('🧘', 'Meeting Immunity: you asked the question and survived being looked at. <b>+' + (m * 30) + ' XP</b>', 'gold'); }
      Player.mod({ rep: 6 }); P.stats.bullshit += 3; P.stats.chaos += 2;
    }
  },
  /* You can walk away from an encounter and come back to it later. */
  bossLost(E, how) {
    const key = E.boss;
    const msg = {
      printer: 'The printer wins this round. It always wins the first round. It is still there. It will be there tomorrow.',
      nigel: 'The quick word ends when Nigel’s next meeting starts. You are released. Nothing was decided.',
      review: 'The gridlines fade out. The review is not over. Reviews are never over. They are only adjourned.',
      complaint: 'The call ends without ending. Alan takes it from here, and says, off-mic, “that was the hard part and you did it. Go and sit outside for ten minutes.”',
      queue: 'You put the headset down at 17:04 with calls still waiting. They are still waiting now. They will be waiting tomorrow. This is not a failure, it is the actual shape of the job, and nobody ever says so.',
      allhands: 'You slip out during slide 41 and nobody notices, because nobody has looked up from their phone since slide 12.'
    }[key];
    if (msg) setTimeout(() => UI.toast(BOSSES[key].face, msg, 'bad'), 400);
  },
  postBoss() {
    if (G.flags.finalDone && !G.flags.endingShown) { setTimeout(() => Endings.offer(), 600); }
    else if (G.flags.complaintBeaten && !G.flags.complaintAfter) {
      G.flags.complaintAfter = true;
      setTimeout(() => Dialogue.say('🧓', 'ALAN', 'Escalations', [
        'Alan takes his headset off and puts it on the desk and looks at the ceiling for a second.',
        '“Right. Two things. One: that was a good call, and I want you to hear that from somebody whose job it is to know.”',
        '“Two: it was never the thirty-eight pound. You found the eleven days. Everybody else on this floor would have refunded the thirty-eight pound and closed it and it would have come back in a fortnight, angrier.”',
        '“Go and sit on the step for ten minutes. That’s not advice, that’s an instruction from Escalations, and I outrank the queue.”'], null), 500);
    }
    else if (G.flags.queueBeaten && !G.flags.queueAfter) {
      G.flags.queueAfter = true;
      setTimeout(() => Dialogue.say('🧔', 'DAVE', 'Senior Agent · 17 years served', [
        'It is 17:12. The floor is empty. Two screens are still on, saying WELCOME to nobody.',
        'Dave puts his coat on. He does not say anything about the last forty minutes and he never will.',
        '“Right.”',
        '“...You did alright.”',
        'He goes. That is the most anyone has ever said to anyone in this building and you will think about it for a year.'], null), 500);
    }
    else if (G.flags.allhandsBeaten && !G.flags.allhandsAfter) {
      G.flags.allhandsAfter = true;
      setTimeout(() => Dialogue.say('📽️', 'AFTER THE BRIEFING', 'Meeting Room 2 · 11:47', [
        'The room empties in ninety seconds. Somebody has left a lanyard on a chair. Somebody always has.',
        'Karen catches you in the doorway. “That question you asked. That was — yeah. That was a fair question.”',
        '“Don’t ask it again though.”',
        'She is not joking and she is also, slightly, on your side, and both of those are true at once, which is the entire experience of having a team leader.'], null), 500);
    }
    else if (G.flags.printerBeaten && !G.flags.printerAfter) {
      G.flags.printerAfter = true;
      setTimeout(() => Dialogue.say('🖨️', 'THE PRINTER', 'Xerox WorkCentre', [
        'The printer prints the compliance packs. All 501 pages.',
        'It has never printed anything before or since without violence.',
        'Priya appears behind you, holding a mug, saying nothing, nodding slowly.'], null), 500);
    }
  }
};
