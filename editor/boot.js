'use strict';
/* ---------------- Starting the editor ----------------
   Deliberately NOT Boot.init(). That one starts a shift: it spawns twenty
   colleagues, binds the game's input, loads a save and starts the clock. The
   editor wants the same renderer and the same builder with none of that, so it
   takes the four lines it does need and leaves the rest of the engine sitting
   there unused — which is why engine/boot.js is the one script editor.html does
   not load at all.

   The office is still fully present as DATA (NPCS, ACTS, the lot); it is only
   the simulation that is not running. That is what makes the preview honest and
   the page cheap. */

const Ed = {
  /* A tool that fails to start is a black rectangle, and a black rectangle is
     indistinguishable from a page that never loaded — which is exactly the
     report you cannot act on. Anything thrown on the way up is put ON the page,
     with the message, because the one place somebody debugging this will look is
     the screen in front of them. */
  init() {
    try { this.boot(); }
    catch (e) {
      console.error(e);
      this.died(e);
    }
  },
  died(e) {
    const box = document.createElement('div');
    box.id = 'edDead';
    box.innerHTML = '<h2>The editor did not start.</h2>'
      + '<p>' + esc((e && e.message) || String(e)) + '</p>'
      + '<pre>' + esc(((e && e.stack) || '').split('\n').slice(0, 6).join('\n')) + '</pre>'
      + '<p class="hint">The game itself is unaffected — this page is a tool and '
      + 'nothing the game loads comes from it.</p>';
    document.body.appendChild(box);
  },
  boot() {
    /* Ids onto the catalogue entries, exactly as the game does — Doc and the
       link checks both read def.id. */
    Levels.init();
    /* The art. Both are <img> loads that resolve whenever they resolve; the
       renderer falls back to emoji until they do, and so does the game. */
    Sprites.load(); Tiles.load();

    Ask.init();
    View.init();

    /* Whichever level the URL asks for, so a bookmark is a level. */
    const want = new URLSearchParams(location.search).get('level');
    this.open(LEVELS[want] ? want : Levels.ids()[0], true);

    Tools.init();
    Side.init();          /* also collects the palette, which is what kindList reads */
    this.kindList();
    requestAnimationFrame(View.loop);
  },

  /* Load a level into the doc and point the camera at it. `first` suppresses
     the unsaved-changes question, because on the way in there are none. */
  open(id, first) {
    if (!first && Doc.changed()) {
      /* The select has already moved to the level being asked for, so put it
         back while the question is open — otherwise the toolbar claims you are
         somewhere you are not. */
      $('#edLevel').value = Doc.id;
      Ask.confirm('Leave ' + Doc.name + '?',
        'It has changes that exist only in this tab — there is no autosave, and nothing has '
        + 'been exported. Opening another level loses them.', 'Discard and leave')
        .then(yes => { if (yes) this.load(id); });
      return;
    }
    this.load(id, first);
  },
  load(id, first) {
    if (!Doc.load(id)) return;
    Doc.rebuild();

    /* Stand the player on the level's first arrival point. Two reasons, and
       neither is decoration: the wall fade is computed from P.y, so a player
       parked at the origin fades every wall on the map, and seeing where a
       shift actually begins is half of judging whether a level works. */
    const e = Doc.entries.start || Object.values(Doc.entries)[0] || [1.5, 1.5];
    P.x = e[0] * TILE; P.y = e[1] * TILE;
    /* Nobody is at work in the editor. NPCM.list is presence, and an empty list
       is the whole of "this level has no one standing on it". */
    NPCM.list = [];

    Sel.kind = null; Sel.i = -1; Sel.name = null;
    View.fit();

    /* A bookmark is a level. Wrapped because this is the one line that depends
       on where the page is being served from: a sandboxed frame refuses
       replaceState outright, and the editor works perfectly well without a
       shareable URL. */
    try {
      const url = new URL(location.href);
      url.searchParams.set('level', id);
      history.replaceState(null, '', url);
    } catch (_) { /* no addressable URL here; carry on */ }

    if ($('#edLevel')) $('#edLevel').value = id;
    if (!first) Side.refresh();
  },

  /* A blank level, added to the catalogue in memory only. Nothing here writes
     to data/levels.js — the export is the deliverable, exactly as it is for the
     levels that already exist, and the tab is the only place this exists until
     you paste it. The Level tab says so.
     One room inset by a tile, because a room that reaches the edge of the map
     has no wall to draw on that side and the whole thing reads as unenclosed. */
  newLevel() {
    Ask.form('A new level', [
      { k: 'id', label: 'id', value: '', hint: 'how the catalogue keys it, e.g. carPark' },
      { k: 'name', label: 'name', value: '', hint: 'what the game calls it on screen' },
      { k: 'w', label: 'width', value: 24 },
      { k: 'h', label: 'height', value: 18 },
      { k: 'indoors', label: 'indoors', value: 'yes', options: ['yes', 'no'] },
    ], 'Create').then(v => {
      if (!v || !v.id) return;
      const id = v.id.replace(/[^\w$]/g, '');
      if (!id || /^\d/.test(id)) { Side.say('An id has to be a usable property name.'); return; }
      if (LEVELS[id]) { Side.say('There is already a level called ' + id + '.'); return; }
      const w = clamp(parseInt(v.w, 10) || 24, 6, 200);
      const h = clamp(parseInt(v.h, 10) || 18, 6, 200);
      LEVELS[id] = {
        id: id, name: v.name || id, w: w, h: h,
        indoors: v.indoors !== 'no',
        rooms: [{ z: 'main', r: [1, 1, w - 2, h - 2] }],
        doors: [], counters: [],
        entries: { start: [1.5, 1.5] },
        links: [],
        furnish() { /* nothing in it yet */ }
      };
      Side.levelOptions();
      this.load(id);
      Side.show('level');
      Side.say('Created ' + id + '. It lives in this tab only — export it when it is ready.');
    });
  },

  revert() {
    if (!Doc.changed()) { Side.say('Nothing to revert.'); return; }
    Ask.confirm('Revert ' + Doc.name + '?',
      'Every change since you opened it goes, including anything undo would have brought back.',
      'Throw them away').then(yes => {
      if (!yes) return;
      Doc.load(Doc.id);
      Doc.rebuild();
      Sel.kind = null;
      Side.say('Reverted.');
      Side.refresh();
    });
  },

  /* Every `kind` the game uses, for the inspector's autocomplete. FURN is the
     authority on which ones are furnished specially; the rest are kinds that
     exist only as a label on an object, and both are legitimate. */
  kindList() {
    const kinds = new Set(Object.keys(FURN));
    Palette.items.forEach(it => kinds.add(it.kind));
    const dl = document.createElement('datalist');
    dl.id = 'edKinds';
    dl.innerHTML = Array.from(kinds).sort().map(k => '<option value="' + esc(k) + '">').join('');
    document.body.appendChild(dl);
  }
};

/* A tab you are about to lose work in should say so. The doc lives in memory
   and nowhere else — there is no autosave, on purpose: the output of this tool
   is source you paste, not a file it owns. */
window.addEventListener('beforeunload', e => {
  if (!Doc.changed()) return;
  e.preventDefault();
  e.returnValue = '';
});

/* Not just the listener. These scripts are inline in the body, so ordinarily the
   event is still to come — but a host that injects this page rather than serving
   it can have finished parsing before any of it runs, and then the listener is
   registered for an event that has already happened and nothing ever starts. */
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => Ed.init());
else Ed.init();
