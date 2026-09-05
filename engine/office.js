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

/* ---------------- Phone ringing ---------------- */
const ABANDON_AFTER = 42;   /* seconds a caller will hold before giving up */
const Phones = {
  ringing: [],
  tick(dt) {
    if (G.flags.phonesDown || G.state !== 'play') return;
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
         are outside — and keeps counting towards being abandoned, which is the
         cost of being outside — but a desk phone on the fourth floor cannot be
         heard from the car park, and without this it was heard from anywhere
         whose map happened to put those tile coordinates on screen. */
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
