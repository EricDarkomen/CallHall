'use strict';
/* ---------------- The character creator ----------------
   Section 2 of the new starter form. Everybody else in the building was
   composited at build time — one row each, layers already flattened — and the
   player is the one person who cannot be, because the player is chosen.

   What makes that affordable is that the choosing happens in layers rather
   than in whole people. tools/build-sprites.mjs packs the same LPC art one
   VARIANT per row across seven `lazy` sheets, and Sprites.compose() stacks the
   chosen rows into a single canvas once, here, when somebody presses Start.
   After that the player is an ordinary sheet and the renderer has no idea any
   of this happened.

   Three things this must never do:

     - Read pixels back. The sheets sit beside index.html and a file:// page
       taints every canvas they are drawn into, so compose() draws and never
       reads. Nothing here may add a getImageData or a toDataURL.
     - Fetch the parts before somebody asks for them. They are 274KB against
       the cast's 206, and most players will take the default and start their
       shift. Sprites.load() skips anything marked `lazy`; this is the only
       thing that brings them in.
     - Block on them arriving. A slow or failed load leaves the player as the
       row the build baked, which is a real character rather than an error. */

const Look = {
  /* The stack the build bakes as `player`, named in the same terms the parts
     sheets use. It is what the creator opens on, so the first thing you see is
     the person the game would have given you anyway. */
  DEFAULT: {
    base: 'base:masc/Honey',
    eyes: 'eyes:Brown',
    hair: 'hair:Short 02 - Parted/Brown',
    beard: null,
    torso: 'torso:masc/Shirt 01 - Longsleeve Shirt/Sky',
    legs: 'legs:masc/Pants 03 - Pants/Navy',
    feet: 'feet:masc/Shoes 01 - Shoes/Black',
  },
  /* Filled from the sheets themselves, so adding a hairstyle is a change to
     the build and to nothing here. */
  groups: [],
  ready: false, failed: false,
  /* The preview's own clock, so it walks on the spot while the game is not
     running. */
  _t: 0, _raf: 0,

  /* Which variants a stack names, skipping the axes left empty. Deliberately
     independent of `groups`: the menus are only filled when the SCREEN is
     opened, and this also runs on the save-load path where it never is —
     which is exactly how a restored character came back composing nothing.
     Order does not matter here because compose() sorts by each sheet's own z. */
  picks(look) {
    const L = look || G.look || this.DEFAULT;
    return Object.keys(L).map(k => L[k]).filter(Boolean);
  },

  /* Put the chosen character on the screen. Safe to call when the parts have
     never been loaded — it simply leaves the baked row alone, which is what
     happens for a save written before any of this existed. */
  apply(look) {
    const L = look || G.look;
    /* Nothing to compose FROM until the parts have decoded. Not an error — the
       player is the baked row until then, and every caller is free to ask. */
    if (!L || !Sprites.partsReady()) return false;
    const picks = this.picks(L);
    if (!picks.length) return false;
    return !!Sprites.compose('player', picks);
  },

  /* Bring the parts in, then rebuild the menus and the preview. Called from
     open(), so nobody pays for them until they ask. */
  load(then) {
    if (this.ready) { if (then) then(true); return; }
    Sprites.loadParts(ok => {
      this.ready = !!ok;
      this.failed = !ok;
      if (then) then(ok);
    });
  },

  /* ---- the screen ---- */

  open() {
    G.state = 'look';
    $('#nameScreen').classList.remove('on');
    $('#lookScreen').classList.add('on');
    /* Somebody who has already made a character and come back keeps it. */
    if (!G.look) G.look = { ...this.DEFAULT };
    /* The MENUS come off the manifest, which is already loaded — a variant's
       id, label and fit are text, and only its pixels are in the PNGs. So the
       screen is complete and usable the instant it opens, showing the row the
       build baked, and the wardrobe arrives behind it. An earlier version put
       the whole screen behind that fetch and stalled 274KB deep on the one step
       between naming yourself and starting work. */
    this.groups = Sprites.partGroups();
    this.fit();
    this.render();
    this.spin();
    this.say(this.ready ? '' : 'Fetching the wardrobe…');
    this.load(ok => {
      /* A failure is not something the player can act on and not fatal: the
         baked row is a perfectly good call-centre employee. */
      this.say(ok ? '' : 'The wardrobe did not arrive — you will be issued the standard lanyard photo.');
      if (ok) this.apply();
    });
  },
  say(msg) {
    const el = $('#lookNote');
    if (el) { el.textContent = msg; el.classList.toggle('on', !!msg); }
  },
  close() {
    $('#lookScreen').classList.remove('on');
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  },

  /* Clothing is cut for one build, so changing build has to drag the wardrobe
     with it: a masculine top on a feminine body is not a look, it is a hole.
     Every axis that locks to a fit is re-pointed at the same garment in the
     other fit where there is one, and at that axis's first option where there
     is not. */
  fit() {
    const base = this.item('base', G.look.base);
    const want = base && base.fit;
    if (!want) return;
    this.groups.forEach(g => {
      /* Never the base: it is the axis the build is chosen ON, and re-pointing
         it at "the same garment in the other fit" is how the first version
         nulled the very thing that had just been picked. */
      if (g.k === 'base') return;
      const cur = this.item(g.k, G.look[g.k]);
      if (!cur || !cur.fit || cur.fit === want) return;
      /* The same garment in the other build, by the half of the id that names
         it rather than the half that names the fit. */
      const tail = String(cur.id).split('/').slice(1).join('/');
      const swap = g.items.find(it => it.fit === want && String(it.id).split('/').slice(1).join('/') === tail)
        || g.items.find(it => it.fit === want);
      G.look[g.k] = swap ? swap.id : null;
    });
  },
  group(k) { return this.groups.find(g => g.k === k) || null; },
  item(k, id) {
    const g = this.group(k);
    return g ? g.items.find(it => it.id === id) || null : null;
  },
  /* What one axis may offer, given the build that is chosen. Clothing is cut
     for one build so it is filtered; the base group is where the build is
     chosen and must always offer all of them, or picking one takes the others
     off the menu. */
  options(g) {
    if (g.k === 'base') return g.items;
    const base = this.item('base', G.look.base);
    const want = base && base.fit;
    return g.items.filter(it => !it.fit || !want || it.fit === want);
  },

  render() {
    const box = $('#lookPick');
    if (!box) return;
    box.innerHTML = this.groups.map(g => {
      const opts = this.options(g);
      const cur = G.look[g.k];
      return '<div class="look-row"><label for="lk-' + esc(g.k) + '">' + esc(g.label) + '</label>'
        + '<select id="lk-' + esc(g.k) + '" data-g="' + esc(g.k) + '">'
        + (g.optional ? '<option value="">None</option>' : '')
        + opts.map(it => '<option value="' + esc(it.id) + '"'
          + (it.id === cur ? ' selected' : '') + '>' + esc(it.label) + '</option>').join('')
        + '</select></div>';
    }).join('');
    box.querySelectorAll('select').forEach(sel => {
      sel.onchange = () => {
        G.look[sel.dataset.g] = sel.value || null;
        /* Changing the build re-points the wardrobe, so the menus themselves
           have to be rebuilt — not just the preview. */
        if (sel.dataset.g === 'base') { this.fit(); this.render(); }
        this.apply();
        Sfx.select();
      };
    });
  },

  /* One of everything, at random, respecting the build's own wardrobe. */
  random() {
    /* Off the manifest, so it works before the pixels land — the preview simply
       catches up when they do. */
    if (!this.groups.length) return;
    const bases = this.group('base');
    if (bases) G.look.base = pick(bases.items).id;
    this.groups.forEach(g => {
      if (g.k === 'base') return;
      const opts = this.options(g);
      if (!opts.length) { G.look[g.k] = null; return; }
      /* An optional axis is sometimes genuinely empty — not everybody has a
         beard, and a creator that always gives you one is not random. */
      G.look[g.k] = g.optional && chance(.45) ? null : pick(opts).id;
    });
    this.render();
    this.apply();
    Sfx.select();
  },

  /* ---- the preview ----
     The real sprite, drawn by the real code, walking on the spot. A still
     picture would hide the one thing worth checking — that every layer is
     present in every frame. */
  spin() {
    const cv = $('#lookView');
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const draw = () => {
      this._raf = requestAnimationFrame(draw);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      }
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      if (!Sprites.has('player')) return;
      this._t += 1 / 60;
      /* Turn on the spot every couple of seconds, so every direction is seen —
         a character creator that only ever shows a back is no use. */
      const dir = [2, 3, 0, 1][Math.floor(this._t / 2) % 4];
      const frame = Sprites.frame('player', true, this._t * 8);
      const box = Sprites.box('player', 0, 0);
      /* A WHOLE-number scale, because this is pixel art and the whole point of
         the screen is to look at the pixels — 2.4x is a character with some
         rows of it twice as tall as the others. */
      const z = Math.max(2, Math.min(4, Math.floor((h - 20) / box.h)));
      c.imageSmoothingEnabled = false;
      c.save();
      c.translate(w / 2, h / 2 + (box.h * z) / 2 - Sprites.FOOT * z);
      c.scale(z, z);
      Sprites.draw(c, 'player', dir, frame, 0, 0);
      c.restore();
    };
    if (this._raf) cancelAnimationFrame(this._raf);
    draw();
  },

  /* Done. The stack is already in G, so it is already in the save. */
  accept() {
    this.close();
    Sfx.select();
    Cut.start();
  },
};
