'use strict';
/* ---------------- Input ---------------- */
const Keys = { up: 0, down: 0, left: 0, right: 0 };
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };

function bindInput() {
  addEventListener('keydown', e => {
    Sfx.init();
    /* Dialogue owns the keyboard while it is open — including the movement keys,
       which double as choice navigation. It must therefore be tested first. */
    if (Dialogue.on) {
      if (/^Digit[1-9]$/.test(e.code)) { e.preventDefault(); Dialogue.choose(+e.code.slice(5) - 1); return; }
      if (Dialogue.avail && Dialogue.avail.length) {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); Dialogue.move(-1); return; }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); Dialogue.move(1); return; }
        if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); Dialogue.choose(Dialogue.sel); return; }
      }
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); Dialogue.advance(); return; }
      if (e.code === 'Escape') { e.preventDefault(); Dialogue.close(); return; }
      return;
    }
    /* A minigame owns the keyboard outright while it is open — including the
       movement keys, which several of them use — so it is tested before the
       KEYMAP, for the same reason Dialogue is tested before everything. Escape
       is the arcade's own; it never reaches the settings panel from here. */
    if (Arcade.on) { e.preventDefault(); Arcade.key({ code: e.code, down: true }); return; }
    if (KEYMAP[e.code]) { Keys[KEYMAP[e.code]] = 1; e.preventDefault(); return; }
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (G.state === 'title') { Boot.newGame(); return; }
      if (G.state === 'name') { Boot.acceptName(); return; }
      /* The creator takes Enter/Space as "that will do" — the same as every
         other screen between the title and the shift. Without it a keyboard
         player reaches section 2 of the form and the game stops dead, which is
         exactly what it did to the desktop suite. The selects handle their own
         keys; this only fires when focus is not in one. */
      if (G.state === 'look') { Boot.goFullscreen(); Look.accept(); return; }
      if (G.state === 'cut') { Cut.press(); return; }
      if (G.state === 'report') { Report.next(); return; }
      if (G.state === 'play') { Interact.go(); return; }
      return;
    }
    if (G.state === 'combat') {
      if (/^Digit[1-9]$/.test(e.code)) { const b = $('#cbMoves').children[+e.code.slice(5) - 1]; if (b && !b.disabled) b.click(); }
      return;
    }
    if (e.code === 'F5') { e.preventDefault(); Save.write(); return; }
    if (e.code === 'F9') { e.preventDefault(); if (Save.has()) { Save.read(); Panels.close(); } else Sfx.deny(); return; }
    if (e.code === 'Escape') {
      /* Esc is "get me out of this", and during the opening the thing to get
         out of is the opening. The button is the discoverable one; this is the
         one somebody who has seen it eleven times will actually press. */
      if (G.state === 'cut' && Cut.on) { Cut.skip(); return; }
      if (Panels.on) Panels.close(); else if (G.state === 'play') Panels.open('settings');
      return;
    }
    if (G.state !== 'play' && !Panels.on) return;
    if (e.code === 'KeyE') { if (!Panels.on) Interact.go(); return; }
    const map = { KeyI: 'inventory', KeyJ: 'quests', KeyK: 'skills', KeyC: 'chat', KeyM: 'email', KeyP: 'stats', KeyL: 'ach' };
    if (map[e.code]) { if (Panels.on && Panels.tab === map[e.code]) Panels.close(); else Panels.open(map[e.code]); }
  });
  /* Keep Tab inside whichever modal is open, rather than letting focus escape
     into the buttons of the frozen world behind it. */
  addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const modal = Panels.on ? $('#panel')
      : Arcade.on ? $('#arcade')
      : Combat.E ? $('#combat')
      : G.state === 'report' ? $('#report')
      : G.state === 'ending' ? $('#ending')
      : Dialogue.on ? $('#dialogue') : null;
    if (!modal) return;
    const f = Array.from(modal.querySelectorAll('button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'))
      .filter(el => el.offsetWidth || el.offsetHeight);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, true);

  addEventListener('keyup', e => {
    /* The release matters here in a way it does not elsewhere: a game asking
       a.held() gets a key that is never let go of otherwise. */
    if (Arcade.on) { Arcade.key({ code: e.code, down: false }); return; }
    if (KEYMAP[e.code]) Keys[KEYMAP[e.code]] = 0;
  });
  addEventListener('blur', () => { Keys.up = Keys.down = Keys.left = Keys.right = 0; Stick.release(); });

  /* Leaving the tab should not cost you the shift: stop the clock, drop the
     held keys, and hush the hold music until you come back. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      Game.paused = true;
      Keys.up = Keys.down = Keys.left = Keys.right = 0;
      Stick.release();
      Sfx.holdMusic(false);
      if (Sfx.ctx && Sfx.ctx.state === 'running') Sfx.ctx.suspend().catch(() => {});
    } else {
      Game.paused = false;
      Game.last = performance.now();   /* don't fast-forward the world on return */
      if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume().catch(() => {});
      if (Combat.E && Sfx.music) Sfx.holdMusic(true);
    }
  });

  $('#keyhints').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    Panels.open(b.dataset.panel === 'settings' ? 'settings' : b.dataset.panel);
  });
  $('#pnClose').onclick = () => Panels.close();
  $('#panel').addEventListener('click', e => { if (e.target.id === 'panel') Panels.close(); });
  $('#repNext').onclick = () => Report.next();
  $('#endAgain').onclick = () => { localStorage.removeItem(SAVE_KEY); location.reload(); };
  $('#endTitle').onclick = () => location.reload();
  $('#dialogue').addEventListener('click', e => { if (!e.target.closest('.choice')) Dialogue.advance(); });

  /* The notification box fades itself out after a few seconds. Hold it open for
     as long as somebody is reading or scrolling it, on either input. */
  const toasts = $('#toasts');
  const holdToasts = on => { UI._toastHold = on; UI.toastWake(UI._toastSpan); };
  toasts.addEventListener('pointerenter', () => holdToasts(true));
  toasts.addEventListener('pointerleave', () => holdToasts(false));
  toasts.addEventListener('scroll', () => UI.toastWake(), { passive: true });
  toasts.addEventListener('touchstart', () => holdToasts(true), { passive: true });
  toasts.addEventListener('touchend', () => holdToasts(false), { passive: true });
  toasts.addEventListener('touchcancel', () => holdToasts(false), { passive: true });
  /* And the way back in once it has gone. `pointerdown` rather than `click` so a
     thumb gets the box immediately instead of after the 300ms a tap takes to be
     ruled out as the start of a double-tap. */
  $('#toastPeek').addEventListener('pointerdown', e => {
    e.preventDefault(); Sfx.init(); Sfx.blip();
    UI.toastWake(9000);
    toasts.scrollTop = toasts.scrollHeight;
  });

  /* touch */
  if (TOUCH) {
    $('#touch').classList.add('on');
    const hint = document.querySelector('.cut-hint');
    if (hint) hint.textContent = 'Tap to continue';
    /* No Esc key on a phone, and the header it sits in has three lines' worth
       of title to fit into one. */
    $('#pnClose').textContent = 'Close';

    /* touch-action only covers a gesture that STARTS on the element declaring
       it, and a thumb landing just outside the stick zone was panning the whole
       fixed layout — which reads as the UI vanishing. Killed at the document,
       decided once per touch because the answer cannot change mid-drag. Do not
       replace this with touch-action:none on body: the effective value is the
       intersection up the ancestor chain, which kills the panel sheet and the
       tab strip. Exemption is "has a scrollable ancestor", not a selector list
       that would rot the first time somebody adds one. */
    const scrollableUnder = el => {
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(n.nodeName)) return true;
        const s = getComputedStyle(n);
        if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) return true;
        if (/(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
      }
      return false;
    };
    let dragMayScroll = false;
    addEventListener('touchstart', e => { dragMayScroll = scrollableUnder(e.target); }, { passive: true });
    addEventListener('touchmove', e => {
      /* Two fingers is a pinch, and there is nothing here worth zooming. */
      if (e.touches.length > 1 || !dragMayScroll) { if (e.cancelable) e.preventDefault(); }
    }, { passive: false });

    /* pointerdown, not touchstart/click: one set of listeners covers touch,
       mouse and pen, and a pointer released off the edge of a button still
       reports the release. */
    document.querySelectorAll('.dpad button').forEach(b => {
      const d = b.dataset.dir;
      b.addEventListener('pointerdown', e => {
        e.preventDefault(); Sfx.init(); Keys[d] = 1;
        /* Keep receiving the move/up for this finger wherever it wanders. */
        if (b.setPointerCapture) { try { b.setPointerCapture(e.pointerId); } catch (_) { /* stale pointer */ } }
      });
      const off = e => { e.preventDefault(); Keys[d] = 0; };
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('click', e => e.preventDefault());
    });
    /* A tap you can feel. Short enough not to be a buzz — it is confirmation
       that the button took, on a control with no travel and no click. Absent on
       iOS and on most desktops, hence the guard. */
    const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) { /* ignore */ } };
    const act = e => {
      e.preventDefault(); Sfx.init(); buzz(9);
      if (Dialogue.on) {
        /* on touch, tapping E takes the highlighted choice when there is one */
        if (Dialogue.avail && Dialogue.avail.length && !Dialogue.typing) Dialogue.choose(Dialogue.sel);
        else Dialogue.advance();
      } else if (G.state === 'play') Interact.go();
    };
    /* `pointerdown`, not `click`: a tap is not ruled out as the start of a
       double-tap for 300ms, and the E button is pressed more than anything
       else in the game. The click handler only exists to swallow the ghost. */
    $('#touchE').addEventListener('pointerdown', act);
    $('#touchE').addEventListener('click', e => e.preventDefault());
    const menu = e => {
      e.preventDefault(); Sfx.init(); buzz(9);
      if (Panels.on) Panels.close(); else if (G.state === 'play') Panels.open('quests');
    };
    $('#touchMenu').addEventListener('pointerdown', menu);
    $('#touchMenu').addEventListener('click', e => e.preventDefault());

    /* Last, and guarded. The stick is the newest and least essential of these:
       if it throws on some browser this file has never met, that must cost you
       the stick and not E, ☰ and the d-pad along with it — which is what
       happens when it is wired first and takes the rest of the block down. */
    try { Stick.init(); } catch (err) {
      console.warn('thumbstick unavailable, falling back to the d-pad', err);
      Hand.pad = 'dpad'; Hand.apply();
    }
  }
}

/* ---------------- Movement ---------------- */
function movePlayer(dt) {
  /* Anything that takes the world away — a conversation, a panel, a call —
     also takes the controls off the screen, so a stick still being held is a
     stick whose finger has nothing under it. Let go of it here rather than in
     each of the four things that can open. */
  if (G.state !== 'play') { P.moving = false; if (Stick.id !== null) Stick.release(); return; }
  let dx = (Keys.right - Keys.left), dy = (Keys.down - Keys.up);
  if (dx && dy) { dx *= .707; dy *= .707; }
  /* The stick wins while it is held. Its vector is already a unit direction
     scaled by how hard it is pushed, so the speed below needs no special case:
     a nudge walks, a full push is the keyboard's own pace. */
  if (Stick.on) { dx = Stick.x; dy = Stick.y; }
  const tired = P.energy < 25 ? .72 : 1;
  const sp = TILE * 3.45 * tired * dt;
  P.moving = !!(dx || dy);
  /* Run is chosen by the size of the movement vector, not a button, so the
     animation cannot disagree with the pace. An arrow key is a whole unit, so
     the desktop always runs — which it always has. */
  P.fast = P.moving && Math.hypot(dx, dy) > 0.86;
  if (P.moving) {
    P.dir = Sprites.dirOf(dx, dy);
    P.bob += dt * 9;
    if (!P._stepT || (P._stepT -= dt) <= 0) { P._stepT = .34; if (Sfx.on) Sfx.step(); }
  }
  const r = TILE * .3;
  const free = (nx, ny) => {
    /* The box is shallower at the top than at the bottom: you stand *in* the
       tile you are on, and your head may overlap the one above. */
    const head = r * .46;
    const pts = [[nx - r, ny - r + head], [nx + r, ny - r + head], [nx - r, ny + r], [nx + r, ny + r]];
    if (pts.some(([px, py]) => World.isSolid(Math.floor(px / TILE), Math.floor(py / TILE)))) return false;
    /* If somebody has ended up standing on you, you can still walk out of them —
       a move is only blocked when it would not increase the separation. */
    return !NPCM.list.some(n => {
      const d = Math.hypot(n.x - nx, n.y - ny);
      return d < TILE * .5 && d <= Math.hypot(n.x - P.x, n.y - P.y);
    });
  };
  /* The walk cycle is advanced by ground covered rather than by a clock, so
     the feet keep up with the floor at any speed and nobody scurries. A
     colleague ambling at a third of your pace was running the same cycle you
     do. 2.6 frames to the tile is about a step and a half, which is a walk. */
  const was = { x: P.x, y: P.y };
  if (dx && free(P.x + dx * sp, P.y)) P.x += dx * sp;
  if (dy && free(P.x, P.y + dy * sp)) P.y += dy * sp;
  P.step = (P.step || 0) + Math.hypot(P.x - was.x, P.y - was.y) / TILE * 2.6;
  P.x = clamp(P.x, 20, MAPW * TILE - 20); P.y = clamp(P.y, 20, MAPH * TILE - 20);

  const z = World.zoneAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
  if (z && z !== G.lastZone) {
    G.lastZone = z; UI.zone(ZONES[z].name);
    if (!G.discovered[z]) {
      G.discovered[z] = true; Player.xp(15);
      if (Object.keys(ZONES).every(k => G.discovered[k])) Ach.get('a_allthree');
    }
    if (z === 'main' && !G.flags.tut2) { G.flags.tut2 = true; UI.objective('Find your workstation (🖥️) and say hello to somebody.'); }
  }
}
