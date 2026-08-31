'use strict';
/* ---------------- Interaction ---------------- */
const Interact = {
  target: null, kind: null, _label: null,
  scan() {
    if (G.state !== 'play') {
      if (this.target || this._label) { this.target = null; this.kind = null; this._label = null; $('#prompt').classList.remove('on'); }
      return;
    }
    const REACH = TILE * 1.05;
    let bestObj = null, od = REACH;
    /* Objects sit on integer tiles and the reach is about one tile, so only the
       3×3 neighbourhood can ever match — no need to measure all 230 of them. */
    const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
    /* A thing on a table beats the table, as a person beats their chair: same
       tile means the same distance to the pixel, and the tie went to whichever
       was pushed first — the table. You were offered the formica. */
    const dist = o => Math.hypot((o.x + .5) * TILE - P.x, (o.y + .5) * TILE - P.y)
      - (o.onTable ? 1 : 0);
    for (let ty = pty - 1; ty <= pty + 1; ty++) {
      for (let tx = ptx - 1; tx <= ptx + 1; tx++) {
        const here = World.at(tx, ty);
        for (let i = 0; i < here.length; i++) {
          const d = dist(here[i]);
          if (d < od) { od = d; bestObj = here[i]; }
        }
      }
    }
    let bestNpc = null, nd = REACH;
    for (const n of NPCM.list) {
      const d = Math.hypot(n.x - P.x, n.y - P.y);
      if (d < nd) { nd = d; bestNpc = n; }
    }
    /* A person beats the furniture they are sitting in. Colleagues stand on the
       chair tile at their desk, so on raw distance the chair — measured from the
       tile centre, and found first — would win the tie and you would offer to
       sit on Dave. A person only loses to something you are clearly closer to. */
    const PERSON_BIAS = TILE * .36;
    let best = null, kind = null;
    if (bestNpc && (!bestObj || nd <= od + PERSON_BIAS)) { best = bestNpc; kind = 'npc'; }
    else if (bestObj) { best = bestObj; kind = 'obj'; }
    this.target = best; this.kind = kind;
    const label = !best ? null
      : kind === 'npc' ? 'Talk to ' + best.name
      : best.ringing ? 'ANSWER — ' + best.name
      : (best.kind === 'chair' || best.use === 'playerDesk') ? 'Use ' + best.name
      : 'Inspect ' + best.name;
    if (label === this._label) return;      /* only touch the DOM when it changes */
    this._label = label;
    const el = $('#prompt');
    if (label) {
      el.innerHTML = '<span class="kbd">E</span> &nbsp;' + esc(label);
      el.classList.add('on');
      el.classList.toggle('urgent', !!(best && best.ringing));
    } else el.classList.remove('on');
  },
  go() {
    if (G.state !== 'play' || !this.target) return;
    if (this.kind === 'npc') { Sfx.select(); Dialogue.openNPC(this.target); return; }
    const o = this.target;
    if (o.ringing) { Sfx.select(); Phones.answer(o); return; }
    const fn = Acts[o.use] || Acts.generic;
    Sfx.blip();
    try { fn(o); } catch (e) { console.warn(e); Acts.generic(o); }
  }
};

/* ---------------- Shop ---------------- */
/* SHOP, the stock list, is in data/items.js. */
const Shop = {
  open(id) {
    this.id = id;
    Panels.open('shop');
  },
  render() {
    const s = SHOP[this.id || 'vending'];
    let h = '<div class="h2">' + s.title + ' — £' + P.money.toFixed(2) + ' in your pocket</div><p class="empty" style="text-align:left;padding:0 0 12px">' + s.note + '</p><div class="grid">';
    s.stock.forEach(k => {
      const it = ITEMS[k];
      h += '<button class="item" data-buy="' + k + '"><div class="ih"><span class="ie">' + it.e + '</span><span class="it">' + esc(it.n) + '</span><span class="rar ' + it.r + '">£' + it.v.toFixed(2) + '</span></div><div class="idesc">' + esc(it.d) + '</div>' + (it.eff ? '<div class="ieff">' + Object.keys(it.eff).map(x => '+' + it.eff[x] + ' ' + x).join(' · ') + '</div>' : '') + '</button>';
    });
    return h + '</div>';
  },
  buy(k) {
    const it = ITEMS[k];
    if (P.money < it.v) { Sfx.deny(); UI.toast('💷', 'Not enough. Work a shift like everyone else.'); return; }
    Player.mod({ money: -it.v }); Item.give(k); Sfx.cash(); Panels.render();
    /* Buying the biscuits with your own money is the whole of the accord. */
    if (k === 'biscuits' && Q.active('q_biscuit')) {
      Q.step('q_biscuit');
      UI.objective('Put the biscuits in the tin. Tell nobody.');
      UI.toast('🍪', 'A box of the good ones. Four pounds of your own money. Nobody asked you to and nobody will know.', 'gold');
    }
  }
};

/* ---------------- Panels / UIManager ---------------- */
const TABS = [
  { id: 'quests', n: 'Jobs', e: '🗂️' }, { id: 'inventory', n: 'Inventory', e: '🎒' }, { id: 'skills', n: 'Skills', e: '📈' },
  { id: 'chat', n: 'Chat', e: '💬' }, { id: 'email', n: 'Email', e: '✉️' }, { id: 'ach', n: 'Achievements', e: '🏆' },
  { id: 'stats', n: 'Profile', e: '🪪' }, { id: 'settings', n: 'Menu', e: '⚙️' }
];
const Panels = {
  tab: 'quests', on: false,
  open(tab) {
    if (tab === 'shop') { this.tab = 'shop'; } else this.tab = tab || this.tab;
    const first = !this.on;
    if (first) this._returnFocus = document.activeElement;
    this.on = true; G.state = 'panel';
    $('#panel').classList.add('on');
    if (this.tab === 'chat') G.unread = 0;
    if (this.tab === 'email') G.unreadMail = 0;
    this.tabs(); this.render(); Sfx.blip();
    /* move focus into the dialog so the keyboard and screen readers follow it */
    if (first) setTimeout(() => { const t = $('#pnTabs .tab.on') || $('#pnClose'); if (t) t.focus(); }, 20);
  },
  close() {
    if (!this.on) return;
    this.on = false; $('#panel').classList.remove('on');
    if (G.state === 'panel') G.state = 'play';
    const r = this._returnFocus; this._returnFocus = null;
    if (r && r.focus && document.contains(r)) { try { r.focus(); } catch (e) {} }
  },
  tabs() {
    const box = $('#pnTabs'); box.innerHTML = '';
    TABS.forEach(t => {
      const b = document.createElement('button');
      b.className = 'tab' + (this.tab === t.id ? ' on' : '');
      b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(this.tab === t.id));
      let n = 0;
      if (t.id === 'chat') n = G.unread;
      if (t.id === 'email') n = G.unreadMail;
      if (t.id === 'skills') n = P.skillPoints;
      b.title = t.n + (n ? ' (' + n + ')' : '');
      b.innerHTML = '<span class="tab-i" aria-hidden="true">' + t.e + '</span><span class="tab-t">' + esc(t.n) + '</span>'
        + (n ? '<span class="tab-n">' + n + '</span>' : '');
      b.onclick = () => { this.tab = t.id; if (t.id === 'chat') G.unread = 0; if (t.id === 'email') G.unreadMail = 0; this.tabs(); this.render(); Sfx.blip(); };
      box.appendChild(b);
    });
    /* On a phone the tabs are one sideways-scrolling row, and this function
       rebuilds it from scratch on every switch — which resets that scroll. Put
       the selected tab back where the player can see it. Harmless on a desktop,
       where the row wraps and nothing is ever out of view. */
    const cur = box.querySelector('.tab.on');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
  },
  render() {
    if (!this.on) return;
    const b = $('#pnBody');
    /* The portal's own name is the least useful thing in a header that has one
       line on a phone, and the dialog is labelled with it anyway. */
    $('#pnTitle').textContent = (TOUCH ? '' : 'Employee self-service portal · ')
      + P.name + ' · ' + RANKS[P.rank].n;
    b.innerHTML = this['r_' + this.tab] ? this['r_' + this.tab]() : '';
    b.querySelectorAll('[data-item]').forEach(el => el.onclick = () => Item.use(el.dataset.item));
    b.querySelectorAll('[data-uneq]').forEach(el => el.onclick = () => Item.equip(el.dataset.uneq));
    b.querySelectorAll('[data-skill]').forEach(el => el.onclick = () => Sk.buy(el.dataset.branch, el.dataset.skill));
    b.querySelectorAll('[data-buy]').forEach(el => el.onclick = () => Shop.buy(el.dataset.buy));
    b.querySelectorAll('[data-act]').forEach(el => el.onclick = () => Menu[el.dataset.act]());
  },
  r_shop() { return Shop.render(); },
  r_quests() {
    const list = Q.list();
    if (!list.length) return '<p class="empty">No jobs yet. Talk to people. They are full of jobs.</p>';
    let h = '<div class="h2">Open</div>';
    const open = list.filter(q => !q.done), done = list.filter(q => q.done);
    h += open.length ? open.map(q => this.quest(q)).join('') : '<p class="empty">Nothing open. Suspicious.</p>';
    if (done.length) h += '<div class="h2">Closed</div>' + done.map(q => this.quest(q)).join('');
    return h;
  },
  quest(q) {
    return '<div class="quest' + (q.done ? ' done' : '') + '"><span class="giver">from ' + esc(q.giver) + '</span><h4>' + esc(q.n) + '</h4>' +
      q.steps.map((s, i) => '<div class="step" style="opacity:' + (i <= q.step || q.done ? 1 : .35) + '">' + esc(s) + (i < q.step || q.done ? ' ✔' : '') + '</div>').join('') +
      '<div class="rw">Reward: ' + q.rw.xp + ' XP' + (q.rw.money ? ' · £' + q.rw.money : '') + (q.rw.item ? ' · ' + ITEMS[q.rw.item].e + ' ' + ITEMS[q.rw.item].n : '') + '</div></div>';
  },
  r_inventory() {
    let h = '<div class="h2">Equipped</div><div class="grid">';
    let any = false;
    for (const slot in P.equipment) {
      const id = P.equipment[slot]; if (!id) continue; any = true;
      const it = ITEMS[id];
      h += '<button class="item" data-uneq="' + id + '"><div class="ih"><span class="ie">' + it.e + '</span><span class="it">' + esc(it.n) + '</span><span class="rar ' + it.r + '">' + slot + '</span></div><div class="ieff">' + Object.keys(it.eff || {}).map(k => '+' + it.eff[k] + ' ' + k).join(' · ') + '</div><div class="idesc">Click to unequip</div></button>';
    }
    if (!any) h += '<p class="empty">Nothing equipped.</p>';
    h += '</div><div class="h2">Carried (' + P.inventory.length + ')</div>';
    if (!P.inventory.length) return h + '<p class="empty">Your pockets contain lint and a receipt.</p>';
    const counts = {};
    P.inventory.forEach(i => counts[i] = (counts[i] || 0) + 1);
    h += '<div class="grid">';
    Object.keys(counts).forEach(id => {
      const it = ITEMS[id];
      h += '<button class="item" data-item="' + id + '"><div class="ih"><span class="ie">' + it.e + '</span><span class="it">' + esc(it.n) + (counts[id] > 1 ? ' ×' + counts[id] : '') + '</span><span class="rar ' + it.r + '">' + it.r + '</span></div><div class="idesc">' + esc(it.d) + '</div>' +
        (it.eff ? '<div class="ieff">' + Object.keys(it.eff).map(k => '+' + it.eff[k] + ' ' + k).join(' · ') + '</div>' : '') +
        '<div class="ieff" style="color:var(--dim)">' + (it.slot ? 'Click to equip' : it.use ? 'Click to use' : it.quest ? 'Quest item' : 'Click to examine') + '</div></button>';
    });
    return h + '</div>';
  },
  r_skills() {
    let h = '<div class="h2">Skill points available: ' + P.skillPoints + '</div><div class="tree">';
    for (const bk in SKILLS) {
      const br = SKILLS[bk];
      h += '<div class="branch"><h4 style="color:' + br.colour + '">' + br.name + '</h4>';
      for (const sk in br.list) {
        const d = br.list[sk], r = Sk.rank(sk);
        h += '<div class="skill' + (r >= d.max ? ' maxed' : '') + '" data-skill="' + sk + '" data-branch="' + bk + '"><div style="flex:1"><div class="sn">' + esc(d.n) + '</div><div class="idesc" style="margin:2px 0 0">' + esc(d.d) + '</div></div><span class="pips">' + '●'.repeat(r) + '○'.repeat(d.max - r) + '</span></div>';
      }
      h += '</div>';
    }
    return h + '</div>';
  },
  r_chat() {
    if (!G.chat.length) return '<p class="empty">Quiet. Somebody will say something about a yoghurt shortly.</p>';
    let h = '', last = null;
    G.chat.slice(-60).forEach(m => {
      if (m.ch !== last) { h += '<div class="chat-ch">' + m.ch + '</div>'; last = m.ch; }
      h += '<div class="chat-msg"><span class="cf">' + m.face + '</span><div><div class="cn">' + esc(m.who) + ' <span style="color:var(--dim)">' + clockStr(m.t) + '</span></div><div class="ct">' + esc(m.msg) + '</div></div></div>';
    });
    return h;
  },
  r_email() {
    if (!G.mail.length) return '<p class="empty">Inbox zero. Enjoy it. It lasts four minutes.</p>';
    return G.mail.slice().reverse().map(m => '<div class="mail"><div class="from">' + esc(m.from) + ' · ' + clockStr(m.t) + '</div><div class="subj">' + esc(m.s) + '</div><div class="body">' + esc(m.b) + '</div></div>').join('');
  },
  r_ach() {
    const got = Ach.count();
    return '<div class="h2">' + got + ' / ' + Object.keys(ACHS).length + ' unlocked</div>' +
      Object.keys(ACHS).map(k => {
        const a = ACHS[k], has = G.achievements[k];
        return '<div class="ach' + (has ? ' got' : '') + '" style="margin-bottom:8px"><span class="ae">' + a.e + '</span><div><div class="at">' + esc(has ? a.n : '???') + '</div><div class="ad">' + esc(a.d) + '</div></div></div>';
      }).join('');
  },
  r_stats() {
    const s = P.eff || P.stats;
    const notes = { empathy: 'How well you handle a human.', knowledge: 'How well you handle a system.', patience: 'How long you can survive being spoken to.', bullshit: 'Ability to produce convincing corporate language.', chaos: 'Willingness to make a terrible decision at speed.' };
    let h = '<div class="h2">Hidden customer service statistics</div><div class="stat-grid">';
    ['empathy', 'knowledge', 'patience', 'bullshit', 'chaos'].forEach(k => {
      h += '<div class="stat-box"><div class="sk">' + k + '</div><div class="sv">' + (s[k] || 0).toFixed(1) + '</div><div class="sn">' + notes[k] + '</div></div>';
    });
    h += '</div><div class="h2">Today</div><div class="stat-grid">';
    const t = G.totals;
    [['📞 Calls handled', t.calls], ['😊 Resolved', t.satisfied], ['😡 Angered', t.angered],
     ['🙈 Sent to Dave', t.transfers], ['☕ Coffees', t.coffee], ['🚽 Toilet minutes', t.toiletMin],
     ['🖨️ Printer incidents', t.printer], ['💼 Phrases deployed', t.bullshit], ['⭐ Reputation', Math.round(P.rep)]].forEach(([k, v]) => {
      h += '<div class="stat-box"><div class="sk">' + k + '</div><div class="sv">' + v + '</div></div>';
    });
    h += '</div><div class="h2">Colleagues</div><div class="stat-grid">';
    NPCS.forEach(n => {
      if (G.rel[n.id] === undefined) return;
      h += '<div class="stat-box"><div class="sk">' + n.face + ' ' + esc(n.name) + '</div><div class="sn">' + Rel.label(G.rel[n.id]) + '</div></div>';
    });
    return h + '</div>';
  },
  r_settings() {
    const t = (on) => on ? 'On' : 'Off';
    return '<div class="h2">Shift management</div>' +
      '<div class="setting"><div class="sl">Save shift<div class="sd">Writes to this browser only. Like everything else here, it is not backed up.</div></div><button class="btn small" data-act="save">💾 Save</button></div>' +
      '<div class="setting"><div class="sl">Load shift<div class="sd">Restore your last save.</div></div><button class="btn small" data-act="load">↻ Load</button></div>' +
      '<div class="setting"><div class="sl">New game<div class="sd">Erases everything. Starts you back in the lobby with a lanyard.</div></div><button class="btn small" data-act="newgame">🗑️ New game</button></div>' +
      '<div class="h2">Audio</div>' +
      '<div class="setting"><div class="sl">Sound effects</div><button class="btn small" data-act="sound" aria-pressed="' + !!Sfx.on + '">' + t(Sfx.on) + '</button></div>' +
      '<div class="setting"><div class="sl">Hold music<div class="sd">Plays during calls. It is meant to be like that.</div></div><button class="btn small" data-act="music" aria-pressed="' + !!Sfx.music + '">' + t(Sfx.music) + '</button></div>' +
      '<div class="setting"><div class="sl">Volume</div><button class="btn small" data-act="vol">' + Math.round(Sfx.volume * 100) + '%</button></div>' +
      '<div class="h2">Display &amp; accessibility</div>' +
      '<div class="setting"><div class="sl">Animation<div class="sd">Bobbing, blinking, ringing.</div></div><button class="btn small" data-act="anim" aria-pressed="' + !!R.animate + '">' + t(R.animate) + '</button></div>' +
      '<div class="setting"><div class="sl">Reduced motion<div class="sd">Disables screen shake and particles. Follows your system setting by default.</div></div><button class="btn small" data-act="motion" aria-pressed="' + !FX.motion + '">' + t(!FX.motion) + '</button></div>' +
      '<div class="setting"><div class="sl">Emoji size</div><button class="btn small" data-act="emoji">' + Math.round(R.emojiScale * 100) + '%</button></div>' +
      '<div class="setting"><div class="sl">Text speed<div class="sd">How fast dialogue types itself out.</div></div><button class="btn small" data-act="speed">' + (Dialogue.speed >= 999 ? 'Instant' : Dialogue.speed >= 140 ? 'Fast' : Dialogue.speed >= 60 ? 'Normal' : 'Slow') + '</button></div>' +
      '<div class="h2">Controls</div>' +
      (TOUCH
        ? '<div class="setting"><div class="sl">Movement control<div class="sd">The stick appears wherever you put your thumb down in the bottom ' + Hand.padSide() + ', and steers by how far you push it. The pad is four buttons in a fixed cross.</div></div>' +
          '<button class="btn small" data-act="padstyle">' + (Hand.pad === 'dpad' ? '✚ D-pad' : '🕹️ Stick') + '</button></div>' +
          '<div class="setting"><div class="sl">Left-handed layout<div class="sd">Mirrors the on-screen controls: ' + Hand.padName() + ' on the right, <span class="kbd">E</span> and <span class="kbd">☰</span> on the left.</div></div>' +
          '<button class="btn small" data-act="southpaw" aria-pressed="' + !!Hand.left + '">' + t(Hand.left) + '</button></div>' +
          '<div class="setting"><div class="sl">Fullscreen<div class="sd">Reclaims the third of the phone the browser keeps for itself. Not offered by every browser.</div></div>' +
          '<button class="btn small" data-act="fullscreen">' + (document.fullscreenElement || document.webkitFullscreenElement ? 'Exit' : 'Enter') + '</button></div>'
        : '') +
      '<p class="idesc" style="font-size:13px;font-style:normal;line-height:1.7">' +
      (TOUCH
        ? (Hand.pad === 'dpad' ? 'Pad' : 'Stick') + ', bottom ' + Hand.padSide() + ' — move &nbsp; <span class="kbd">E</span> — interact<br>' +
          'Tap the conversation box — advance dialogue &nbsp; tap a reply — choose it<br>' +
          'Tap a move — call actions &nbsp; <span class="kbd">☰</span> — jobs, inventory, skills, chat, email, profile, achievements<br>' +
          'The shift saves itself, and <span class="kbd">☰</span> · Menu has Save and Load.'
        : '<span class="kbd">W A S D</span> / arrows — move &nbsp; <span class="kbd">E</span> — interact &nbsp; <span class="kbd">Space</span> — advance dialogue<br>' +
          '<span class="kbd">↑ ↓</span> then <span class="kbd">Enter</span>, or <span class="kbd">1–9</span> — dialogue choices &nbsp; <span class="kbd">1–9</span> — call actions<br>' +
          '<span class="kbd">J</span> jobs &nbsp; <span class="kbd">I</span> inventory &nbsp; <span class="kbd">K</span> skills &nbsp; <span class="kbd">C</span> chat &nbsp; <span class="kbd">M</span> email &nbsp; <span class="kbd">P</span> profile &nbsp; <span class="kbd">L</span> achievements<br>' +
          '<span class="kbd">Esc</span> menu &nbsp; <span class="kbd">F5</span> quick save &nbsp; <span class="kbd">F9</span> quick load') + '</p>';
  }
};
