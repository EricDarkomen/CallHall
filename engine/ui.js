'use strict';
/* ---------------- FX: juice ---------------- */
const FX = {
  parts: [], floats: [], shakeAmt: 0, motion: true,
  shake(n) { if (this.motion) this.shakeAmt = Math.min(18, this.shakeAmt + n); },
  burst(wx, wy, emoji, n = 8, colour) {
    if (!this.motion) return;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283), s = rnd(40, 150);
      this.parts.push({ x: wx, y: wy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: rnd(.5, 1.1), t: 0, e: emoji, c: colour, sz: rnd(10, 20) });
    }
  },
  float(wx, wy, text, colour = '#fff') {
    this.floats.push({ x: wx + rnd(-8, 8), y: wy, text, c: colour, t: 0, life: 1.3 });
  },
  update(dt) {
    this.shakeAmt *= Math.pow(0.02, dt);
    if (this.shakeAmt < 0.2) this.shakeAmt = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt;
      if (p.t > p.life) this.parts.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i]; f.t += dt; f.y -= 34 * dt;
      if (f.t > f.life) this.floats.splice(i, 1);
    }
  }
};

/* ---------------- UI helpers ---------------- */
const UI = {
  /* Notifications go into a fixed-height scrollback. Nothing is removed on a
     timer any more — the box scrolls to the newest entry and then fades itself
     out once the noise stops, so the backlog is there to scroll through but is
     never sitting on the game. */
  _toastIdle: null, _toastHold: false, _toastSpan: 4600,
  toast(e, msg, cls = '') {
    const box = $('#toasts');
    const d = document.createElement('div');
    d.className = 'toast ' + cls;
    d.innerHTML = '<span class="e">' + e + '</span><span>' + msg + '</span>';
    for (const old of box.children) old.classList.add('seen');
    box.appendChild(d);
    if (cls === 'gold') Sfx.notify(); else if (cls === 'bad') Sfx.bad(); else Sfx.blip();
    /* A day's worth of notifications is a lot of DOM for a scrollback nobody
       reads past the last handful of. */
    while (box.children.length > 30) box.firstChild.remove();
    this.toastWake();
    box.scrollTop = box.scrollHeight;
  },
  /* Show the box and restart the fade-out countdown. Held open while the player
     is actually reading it — see the pointer handlers in bind(). A tap on the
     peek chip asks for longer, because somebody who went looking for the box is
     reading it, not glancing at it. */
  toastWake(ms = 4600) {
    const box = $('#toasts');
    box.classList.remove('idle');
    $('#notify').classList.remove('peeking');
    /* Remembered so that letting go of the box — a cursor moving off it, a
       finger lifting — resumes the countdown the player asked for rather than
       quietly cutting a hand-opened box back to a drive-by four seconds. */
    this._toastSpan = ms;
    clearTimeout(this._toastIdle);
    if (this._toastHold) return;
    this._toastIdle = setTimeout(() => { box.classList.add('idle'); this.toastPeek(); }, ms);
  },
  /* Put the chip up in place of the faded box, unless there is nothing behind it
     to go back to. It carries the newest emoji and the size of the backlog, so
     it reads as "there are eleven of these back here" rather than as a button
     that has appeared for no reason. */
  toastPeek() {
    const box = $('#toasts'), last = box.lastElementChild;
    if (!last) return;
    const n = box.children.length;
    $('#pkFace').textContent = (last.querySelector('.e') || {}).textContent || '💬';
    $('#pkCount').textContent = n > 1 ? String(n) : '';
    $('#toastPeek').setAttribute('aria-label',
      n > 1 ? 'Show notifications · ' + n + ' in the log' : 'Show notifications');
    $('#notify').classList.add('peeking');
  },
  float(text, colour) { FX.float(P.x, P.y - 24, text, colour); },
  objective(t) { G.objective = t; $('#hObj').textContent = t; },
  zone(name) {
    const el = $('#zoneName'); el.textContent = name;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  flash(c = '#fff', a = .5) {
    const f = $('#flash'); f.style.background = c; f.style.opacity = a;
    setTimeout(() => f.style.opacity = 0, 90);
  },
  /* The HUD is refreshed every frame, so each field is written only when its
     value has actually changed — otherwise this is ~14 layout-invalidating DOM
     writes per frame for text that changes a few times a minute. */
  _last: {},
  set(id, prop, val) {
    const k = id + prop;
    if (this._last[k] === val) return;
    this._last[k] = val;
    const el = $(id); if (!el) return;
    if (prop === 'w') {
      el.style.width = val;
      if (el.parentElement) el.parentElement.setAttribute('aria-valuenow', String(Math.round(parseFloat(val))));
    } else el.textContent = val;
  },
  hud() {
    this.set('#hName', 't', P.name.toUpperCase());
    this.set('#hFace', 't', P.face);
    this.set('#hRank', 't', 'Lv.' + P.level + ' · ' + RANKS[P.rank].n);
    this.set('#bPat', 'w', clamp(P.patience / P.patMax * 100, 0, 100).toFixed(1) + '%');
    this.set('#vPat', 't', String(Math.round(P.patience)));
    this.set('#mPat', 't', '/' + Math.round(P.patMax));
    this.set('#bEne', 'w', clamp(P.energy / P.eneMax * 100, 0, 100).toFixed(1) + '%');
    this.set('#vEne', 't', String(Math.round(P.energy)));
    this.set('#mEne', 't', '/' + Math.round(P.eneMax));
    this.set('#bXp', 'w', clamp(P.xpv / P.xpNext * 100, 0, 100).toFixed(1) + '%');
    this.set('#vXp', 't', String(P.xpv));
    this.set('#mXp', 't', '/' + P.xpNext);
    this.set('#hMoney', 't', P.money.toFixed(2));
    this.set('#hCalls', 't', String(G.totals.calls));
    this.set('#hDay', 't', 'DAY ' + G.day + ' · ' + (DAYS[(G.day - 1) % 7] || 'Monday').toUpperCase());
    const clock = clockStr(G.minutes);
    if (this._last.clock !== clock) {
      this._last.clock = clock;
      const el = $('#hClock');
      if (el && el.firstChild) el.firstChild.textContent = clock;
    }
    const q = Phones.waiting();
    if (this._last.q !== q) {
      this._last.q = q;
      $('#hQueue').hidden = q === 0;
      /* Shorter on a phone: the queue shares one bar with the clock, the money
         and three meters, and "calls" is the word the amber dot beside it is
         already saying. */
      if (q) $('#hQueueT').textContent = TOUCH ? q + ' waiting'
        : q === 1 ? '1 call waiting' : q + ' calls waiting';
    }
    /* the bars turn red when you are nearly out of yourself */
    const low = P.patience <= P.patMax * 0.25;
    if (this._last.low !== low) { this._last.low = low; $('#hudTL').classList.toggle('low', low); }
    /* How much of the shift is behind you, as the hairline along the bottom of
       the phone bar. The clock says 14:20; this says "nearly there". */
    const shift = (clamp((G.minutes - DAY_START) / (DAY_END - DAY_START), 0, 1) * 100).toFixed(1) + '%';
    if (this._last.shift !== shift) {
      this._last.shift = shift;
      const b = $('#shiftBarI'); if (b) b.style.width = shift;
    }
    Track.sync();
  },
  /* forces the next hud() to rewrite everything — used after a load */
  hudDirty() { this._last = {}; this.hud(); }
};
