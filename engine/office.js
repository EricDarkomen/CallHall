'use strict';
/* ---------------- Office chat + email ---------------- */
const Chat = {
  push(ch, who, face, msg) {
    G.chat.push({ ch, who, face, msg, t: G.minutes });
    G.unread++; UI.toast('💬', '<b>' + ch + '</b> · ' + who + ': ' + esc(msg).slice(0, 46) + (msg.length > 46 ? '…' : ''));
  },
  tick() {
    CHAT_SCRIPT.forEach((c, i) => {
      if (!G.chatSent) G.chatSent = {};
      if (!G.chatSent[i] && G.minutes >= c.t) { G.chatSent[i] = true; this.push(c.c, c.who, c.f, c.m); }
    });
  }
};
const Mail = {
  push(from, s, b) { G.mail.push({ from, s, b, t: G.minutes }); G.unreadMail++; UI.toast('📧', 'New email: <b>' + esc(s) + '</b>'); },
  tick() {
    MAIL_SCRIPT.forEach((m, i) => {
      if (!G.mailSent) G.mailSent = {};
      if (!G.mailSent[i] && G.minutes >= m.t) { G.mailSent[i] = true; this.push(m.from, m.s, m.b); }
    });
  }
};

/* ---------------- Phone ringing ----------------
   WHOSE QUEUE IT IS. Two questions, and for a year they were the same one:
   the shift was running, therefore the phones were yours, because every level
   in the game was a floor of this office and there was nowhere else you could
   possibly be. That stopped being true the day there was an island out there.

   A queue is a place as much as it is an hour. It is yours while the clock says
   so AND while you are somewhere it can reach you — which is the building, all
   four floors of it, including the one under the archive. Off the premises the
   floor covers it: nineteen other people are wearing headsets and the rota does
   not have your name against the whole of it. So nothing new rings, nothing
   counts towards being abandoned, and the phones that were ringing as you left
   are COVERED rather than lost. Walking out is not free — it is still a shift
   you are not doing — but it costs you the calls you would have taken, not
   reputation for the ones somebody else did.

   Which leaves the cost exactly where it belongs: in the building, with the
   phone ringing eight feet away and you deciding to look at something else. */
const ABANDON_AFTER = 42;   /* seconds a caller will hold before giving up */
const Phones = {
  ringing: [],
  /* The queue is live: the clock is in the shift and you are on the premises.
     Everything that pressures the player about phones asks this and nothing
     else. See Levels.onSite(). */
  live() { return Sky.working() && Levels.onSite(); },
  tick(dt) {
    if (G.flags.phonesDown || G.state !== 'play') return;
    /* NOT YOUR QUEUE, and the two ways that can be true end differently.
       AT FIVE the queue closes. It is the one promise this building keeps, and
       until the clock ran past seventeen hundred there was no way to keep it —
       the day simply ended. A phone still ringing at 02:00 is not atmosphere,
       it is a shift nobody clocked out of. Nothing is holding, so nothing is
       handed over: the phones simply stop.
       OFF THE PREMISES, mid-shift, whoever is holding is still holding — and
       somebody on the floor picks them up. That is cover(), and it is the whole
       of the difference. */
    if (!this.live()) {
      if (this.ringing.length) { if (Sky.working()) this.cover(); else this.clearAll(); }
      return;
    }
    this.timer = (this.timer || 0) - dt;
    if (this.timer <= 0) {
      this.timer = rnd(7, 16);
      if (this.ringing.length < 3) this.ringRandom();
    }
    for (let i = this.ringing.length - 1; i >= 0; i--) {
      const p = this.ringing[i];
      p.ringT = (p.ringT || 0) + dt;
      p.waited = (p.waited || 0) + dt;
      /* Only audible on the level the phone is on. It keeps ringing while you
         are elsewhere in the building — in the lobby, upstairs, down the ladder
         — and keeps counting towards being abandoned, which is the cost of
         being anywhere but at the desk while the queue is yours. But a desk
         phone on the fourth floor cannot be heard from the stairwell, and
         without this it was heard from anywhere whose map happened to put those
         tile coordinates on screen. Beyond the front doors it does not ring at
         all any more: see cover() and the note at the top of this section. */
      if (p.ringT > 1.6) { p.ringT = 0; if (p.lvl === World.level && Cam.visible(p.x, p.y)) Sfx.ring(); }
      /* A phone that rings forever is scenery. Let callers give up, so that
         ignoring the queue is a choice with a cost rather than a free option. */
      if (p.waited > ABANDON_AFTER) {
        p.ringing = false; p.waited = 0;
        this.ringing.splice(i, 1);
        count('abandoned');
        Player.mod({ rep: -1 });
        UI.toast('📵', pick([
          'A phone stops ringing on its own. Somebody has given up. The queue does not record who.',
          'Abandoned call. Somewhere a person decides to try again tomorrow, or not.',
          'One of the phones goes quiet. That counts against the floor, not against you, officially.'
        ]), 'bad');
      }
    }
  },
  waiting() { return this.ringing.length; },
  /* SOMEBODY ELSE TAKES THEM. Called the moment the shift is still running and
     you are no longer in the building: the phones stop, the queue empties, and
     nobody is charged for it. Counted, because it is a real number about a day
     — how many calls the floor took that were nominally yours — and because the
     shift figures should be able to say so out loud rather than quietly showing
     a smaller tally than a day spent at the desk.

     Not a toast per phone. It is one line, said once, for however many were
     ringing as the door shut behind you. */
  cover() {
    const n = this.ringing.length;
    this.clearAll();
    count('covered', n);
    UI.toast('📞', n === 1
      ? 'A phone was ringing as you left. Somebody on the floor has taken it. That is what a floor is.'
      : n + ' phones were ringing as you left. The floor has them. Nobody is keeping a list, officially.');
  },
  ringRandom(hot) {
    const phones = World.objects.filter(o => o.kind === 'phone' && !o.ringing);
    if (!phones.length) return;
    const p = pick(phones);
    p.ringing = true; p.hot = !!hot; p.ringT = 0; p.waited = 0; p.lvl = World.level; this.ringing.push(p);
  },
  answer(p) {
    p.ringing = false; p.waited = 0; this.ringing = this.ringing.filter(x => x !== p);
    Combat.startCall(p.hot);
  },
  clearAll() { this.ringing.forEach(p => { p.ringing = false; p.waited = 0; }); this.ringing = []; }
};

/* ---------------- The Manager appears ---------------- */
const Nigel = {
  appear() {
    const n = NPCM.get('nigel'); if (!n) return;
    /* Behind you and slightly to one side, on a tile somebody can actually
       stand on: the old arithmetic put him wherever it landed, which on a floor
       that is one third desks meant he regularly appeared inside one. */
    const [nx, ny] = NPCM.standNear(P.x + rnd(-30, 30), P.y + TILE * 2.2);
    n.x = nx; n.y = ny;
    n.target = null; n.stunTimer = 6; n.stuck = 0; n.post = null;
    Sfx.tone(120, .12, 'square', .3); Sfx.tone(120, .12, 'square', .3, .3); Sfx.tone(120, .12, 'square', .3, .6);
    FX.float(n.x, n.y - 50, '👞 👞 👞', '#ff5f56');
    setTimeout(() => {
      if (G.state === 'play') {
        Dialogue.open(n, { text: ['Everything alright?'], choices: [
          { t: 'Yes.', to: null, do() { Player.xp(5); } },
          { t: 'I was just about to look at the printer.', to: null, do() { P.stats.bullshit += 1; UI.float('+1 Bullshit', '#ffb347'); } },
          { t: '(Say nothing. Maintain eye contact.)', to: null, do() { P.stats.chaos += 2; Rel.add('nigel', -1); UI.float('+2 Chaos', '#b48cff'); } }
        ] });
        if (G.flags.wasWorking) Ach.get('a_working');
      }
    }, 700);
  }
};

/* ---------------- Random events ---------------- */
const EventSys = {
  tick() {
    if (G.state !== 'play') return;
    /* THESE ARE THINGS THAT HAPPEN ON THE FLOOR. The printer, the fire alarm
       that is always a test, the pizza, the two people with lanyards walking
       slowly — every one of them is an event you are told about because you are
       standing in the room it happened in. Announced to somebody halfway up the
       coast road they are not atmosphere, they are a phone buzzing about a
       building you have left. They wait: the cooldown is not spent out here, so
       walking back in does not set off four of them at once. */
    if (!Levels.onSite()) return;
    if (G.minutes < 570) return;
    G.eventCooldown -= 1;
    if (G.eventCooldown > 0) return;
    G.eventCooldown = ri(38, 70);
    const ev = pick(EVENTS);
    G.activeEvent = ev;
    UI.toast(ev.e, '<b>' + ev.t + '</b> — ' + ev.d, 'bad');
    try { ev.go(); } catch (e) { }
    G.todayStats.events = (G.todayStats.events || 0) + 1;
  }
};
