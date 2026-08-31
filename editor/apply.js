'use strict';
/* ---------------- Saving edits back to the game ----------------
   For as long as this editor has existed the export was the deliverable: you
   copied a block of source and pasted it into data/ yourself. That is still
   true of everything with CODE in it, and always will be — this tool captures a
   do(), a run() and a procedural furnish() as source and must never pretend it
   could write them. But it was ALSO true of the eight documents that are pure
   data, and there it was a chore rather than a principle: ten Export tabs, ten
   copies, ten pastes, in the right files, with nothing checking you had not
   missed one. The bench list exists precisely because that is easy to get wrong.

   So this is the other half of the bench. It takes what the ten documents have
   that the files do not, turns each into the whole-table source the Export tab
   was already producing, and puts it in the file the table lives in.

   Three rules make that safe enough to be a button:

     WHOLE TABLES, NEVER FRAGMENTS. Every write replaces one complete top-level
     `const NAME = …;` declaration with a freshly emitted one. There is no
     patching of individual entries, so a rename, an addition and a deletion are
     all the same operation, and a half-applied write is not a state that
     exists.

     IT PARSES OR IT DOES NOT LAND. Every spliced file is parsed before anything
     is written, and one failure abandons the whole run. A tool that corrupts
     data/levels.js in a way you find out about three edits later is worse than
     one that refuses.

     WHAT IT CANNOT WRITE, IT SAYS. A procedural furnish(), a manifest that is
     build output, the script tags a new minigame needs — each is reported by
     name with the reason, and the Export tab it belongs to is still there. The
     one thing this must never do is quietly write a worse version of something
     it did not understand. */

const Sync = {
  V: 1,

  /* ---- which declaration each document owns ----
     The four that key their subjects by kind carry one table per kind, so the
     key's prefix is what says which. Read off the same tables the export panes
     offer rather than a list written out again here: a second list is how one
     of them ends up naming a table that has been renamed. */
  DECL: {
    prog: { item: 'ITEMS', shop: 'SHOP', skill: 'SKILLS', ach: 'ACHS' },
    calls: { caller: 'CALLERS', move: 'MOVES', tell: 'TELLS', boss: 'BOSSES' },
    office: { event: 'EVENTS', ending: 'ENDINGS', mail: 'MAIL_SCRIPT', chat: 'CHAT_SCRIPT', cut: 'CUT' },
  },

  /* ---- the plan ----
     One pass over Mode.changes(), which is the same list the bench shows and
     the same list the autosave keeps — so what this offers to write can never
     disagree with what the page says is unexported.

     Returns writes (a file, a declaration and its new source) and manual (what
     this cannot do, said in words). A document with several changed kinds
     contributes one write per kind, and two documents sharing a file
     contribute two writes to it: they are different declarations, so they do
     not collide. */
  plan() {
    const rows = Mode.changes();
    const writes = [], manual = [], seen = {};
    const add = (file, decl, code, why, entries) => {
      const k = file + '|' + decl;
      if (seen[k]) return;
      seen[k] = 1;
      writes.push({ file: file, decl: decl, code: code, why: why, entries: entries || null });
    };
    const kinds = mode => {
      const out = {};
      rows.filter(r => r.mode === mode).forEach(r => {
        const key = String(r.key);
        out[key.indexOf(':') > 0 ? key.split(':')[0] : key] = 1;
      });
      return Object.keys(out);
    };
    const touched = mode => rows.some(r => r.mode === mode);

    try {
      if (touched('jobs')) add('data/items.js', 'QUESTS', Emit.questTable(), 'the jobs');
      if (touched('zones')) add('data/world.js', 'ZONES', Emit.zoneTable(), 'the room types');
      if (touched('things')) add('data/world.js', 'FURN', Emit.furnTable(), 'how kinds are furnished');
      if (touched('talk')) add('data/npcs.js', 'NPCS', Emit.talkTable(), 'the people and what they say');
      kinds('prog').forEach(k => this.DECL.prog[k]
        && add('data/items.js', this.DECL.prog[k], Emit.progTable(k), 'the rewards'));
      kinds('calls').forEach(k => this.DECL.calls[k]
        && add('data/callers.js', this.DECL.calls[k], Emit.callTable(k), 'the calls'));
      kinds('office').forEach(k => this.DECL.office[k]
        && add('data/office.js', this.DECL.office[k], Emit.officeTable(k), 'the day'));
      if (touched('games')) this.games(rows, add, manual);
      if (touched('levels')) this.levels(rows, add, manual);
    } catch (e) {
      manual.push({ label: 'Something would not emit', file: '',
        why: 'The export for one of these threw: ' + (e && e.message ? e.message : e)
          + '. Nothing has been written.' });
      return { writes: [], manual: manual, blocked: true };
    }

    /* The manifest is build output — tools/build-sprites.mjs rewrites it — so
       an entry pasted in survives exactly until the next build. A sheet that is
       staying belongs in that script's inputs, which is a deliberate act and
       not one a button should take on somebody's behalf. */
    if (touched('art')) {
      manual.push({ label: 'The imported sheet', file: 'art/sprites/manifest.js',
        why: 'the manifest is build output. Its Export tab has the entry, the credit and the '
          + 'PNG; a sheet that is staying goes into tools/build-sprites.mjs.' });
    }
    return { writes: writes, manual: manual, blocked: false };
  },

  /* A minigame is a whole FILE, which is the one case where writing is easier
     than pasting rather than harder. What it cannot do is wire one up: the
     script tag in two pages, the typeof guard in catalogue() and the act that
     opens it are four places outside the file, and three of them are code. */
  games(rows, add, manual) {
    const ids = {};
    rows.filter(r => r.mode === 'games').forEach(r => { ids[String(r.key)] = r.how; });
    add('data/items.js', 'CABINETS', Emit.cabinetTable(), 'where the games are played');
    /* The open game's edits live on the document, not on the bench, and
       `load()` below would walk straight over them. Same reason
       Emit.talkTable() stashes first. */
    Games.stash();
    const was = Games.id;
    Object.keys(ids).forEach(id => {
      if (ids[id] === 'gone') {
        manual.push({ label: Games.label ? Games.label(id) : id, file: 'minigames/' + id + '.js',
          why: 'deleting a game is a file to remove and four places that name it to unwire. '
            + 'The Arcade Export tab lists them.' });
        return;
      }
      if (!Games.load(id)) return;
      Games.resume();
      add('minigames/' + id + '.js', null, Emit.gameFile(), 'the ' + id + ' minigame');
      if (ids[id] === 'new') {
        manual.push({ label: Games.label ? Games.label(id) : id, file: 'index.html · editor.html',
          why: 'a new game needs its script tag on both pages and a typeof guard in '
            + 'Arcade.catalogue(), or it is a file nothing loads. The Export tab has the wiring.' });
      }
    });
    if (was && Games.load(was)) Games.resume();
  },

  /* A level is the one document that cannot be committed back into its own
     catalogue in the general case: `office` builds thirty-two desks in two
     loops and explains itself in twenty comments, and a flat furnish() would
     replace all of that with one line per object. That is the call
     Emit.flatIsSafe() already makes for the Export tab, and it is the same call
     here — a flat level round-trips and is written, a procedural one is named
     with its change list left where it is. */
  levels(rows, add, manual) {
    const ids = {};
    rows.filter(r => r.mode === 'levels').forEach(r => { ids[String(r.key)] = r.how; });
    const entries = [];
    Doc.stash();
    const was = Doc.id;
    Object.keys(ids).forEach(id => {
      if (ids[id] === 'gone') {
        manual.push({ label: (LEVELS[id] || {}).name || id, file: 'data/levels.js',
          why: 'a deleted level is an entry to take out by hand, and anything linking to it '
            + 'has to lose the link in the same edit.' });
        return;
      }
      if (!Doc.load(id)) return;
      Doc.resume(); Doc.rebuild();
      if (!Emit.flatIsSafe() || Emit.usesSharedDefs()) {
        manual.push({ label: Doc.name || id, file: 'data/levels.js',
          why: Emit.flatIsSafe()
            ? 'its floor plan is shared with data/world.js, so the entry is not the whole story. '
              + 'Its Export tab has the geometry and the plan separately.'
            : 'it builds its furniture with loops and explains itself in comments. Writing a flat '
              + 'furnish() would replace all of that with one line per object — the Export tab’s '
              + 'change list is what to edit from.' });
        return;
      }
      entries.push({ id: id, code: Emit.levelEntry() });
    });
    if (was && Doc.load(was)) { Doc.resume(); Doc.rebuild(); }
    /* An entry write is a splice INSIDE a declaration rather than a replacement
       of it, so it carries its entries and no body of its own. LEVELS is the
       one table in the game where that is the right shape: the others are
       emitted whole because they can be. */
    if (entries.length) add('data/levels.js', 'LEVELS', null, 'the levels', entries);
  },

  /* ---- splicing ----
     A top-level declaration in these files is always `const NAME = ` at the
     start of a line, and always ends at the bracket that matches the one it
     opens with. Both halves of that are checked rather than assumed: a file
     that does not look like that is left alone and said so. */
  splice(src, decl, code) {
    const re = new RegExp('^const ' + decl + ' = ', 'm');
    const m = re.exec(src);
    if (!m) return null;
    const at = m.index + m[0].length;
    if (src[at] !== '{' && src[at] !== '[') return null;
    const close = this.end(src, at);
    if (close < 0) return null;
    /* The `;` and the newline after it belong to the declaration, and the
       emitters already write both. */
    let tail = close;
    while (tail < src.length && (src[tail] === ';' || src[tail] === ' ')) tail++;
    if (src[tail] === '\n') tail++;
    return src.slice(0, m.index) + code + src.slice(tail);
  },

  /* Replace one KEY inside a declaration, which is what a level entry is.
     Same scan, one level in. */
  spliceKey(src, decl, key, code) {
    const re = new RegExp('^const ' + decl + ' = ', 'm');
    const m = re.exec(src);
    if (!m) return null;
    const at = m.index + m[0].length;
    if (src[at] !== '{') return null;
    const close = this.end(src, at);
    if (close < 0) return null;
    const body = src.slice(at, close);
    /* The key as the file could have written it: bare, or quoted either way. */
    const k = '(?:' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "|'" + key + "'|\"" + key + '")';
    const km = new RegExp('^([ \\t]*)' + k + ':\\s*\\{', 'm').exec(body);
    if (!km) {
      /* Not in the file at all — a level invented here. It goes in at the end,
         before the closing brace. */
      const ins = at + body.length - 1;
      return src.slice(0, ins) + code + src.slice(ins);
    }
    const kAt = body.indexOf('{', km.index + km[0].length - 1);
    const kEnd = this.end(body, kAt);
    if (kEnd < 0) return null;
    let tail = kEnd;
    while (tail < body.length && (body[tail] === ',' || body[tail] === ' ')) tail++;
    if (body[tail] === '\n') tail++;
    return src.slice(0, at + km.index) + code + src.slice(at + tail);
  },

  /* Where the bracket opened at `i` closes. Comments first, then strings —
     every backtick in these files is inside a comment, and a `{` inside either
     is not structure. There are no regex literals in data/, which is the one
     thing this scan could not tell from a division; the parse check below is
     what stops that being a silent corruption if one ever arrives. */
  end(src, i) {
    const open = src[i], close = open === '{' ? '}' : ']';
    let depth = 0;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (c === '/' && n === '/') { j = src.indexOf('\n', j); if (j < 0) return -1; continue; }
      if (c === '/' && n === '*') { j = src.indexOf('*/', j + 2); if (j < 0) return -1; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { j = this.strEnd(src, j); if (j < 0) return -1; continue; }
      if (c === open) depth++;
      else if (c === close && !--depth) return j + 1;
    }
    return -1;
  },
  strEnd(src, i) {
    const q = src[i];
    for (let j = i + 1; j < src.length; j++) {
      const c = src[j];
      if (c === '\\') { j++; continue; }
      if (c === q) return j;
      if (q !== '`' && c === '\n') return -1;
    }
    return -1;
  },

  /* It parses or it does not land. `new Function` compiles without running, so
     this is a syntax check and nothing else — these files declare their tables
     at the top level and name the engine only from inside functions, so there
     is nothing here that could execute anyway. A host that forbids compiling
     at all is not a syntax error and must not read as one. */
  parses(src) {
    try { new Function(src); return true; } catch (e) {
      if (e instanceof SyntaxError) return false;
      return true;
    }
  },

  /* ---- doing it ----
     Two ways, and which one you get depends on where this page is being served
     from rather than on a setting. A directory handle is the real thing: one
     grant, then the files are written where they live. It needs a secure
     context, so `python3 -m http.server` has it and a file:// page never will
     — and that is the same split `Store.works()` already documents for the
     bench, for the same underlying reason. */
  can() { return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'; },

  dir: null,

  go() {
    const plan = this.plan();
    if (plan.blocked) { Side.say(plan.manual[0].why); return; }
    if (!plan.writes.length && !plan.manual.length) {
      Side.say('Nothing to save — the files already have all of it.');
      return;
    }
    if (!plan.writes.length) { this.report(plan); return; }
    if (this.can()) this.direct(plan);
    else this.bundle(plan);
  },

  /* The one-grant path. The folder is asked for once per page and kept, so a
     second save is a single press. */
  direct(plan) {
    const pick = this.dir
      ? Promise.resolve(this.dir)
      : window.showDirectoryPicker({ mode: 'readwrite', id: 'callhall' })
        .then(d => this.check(d).then(ok => {
          if (!ok) throw new Error('wrong folder');
          this.dir = d;
          return d;
        }));

    pick.then(dir => this.write(dir, plan)).catch(err => {
      if (err && err.name === 'AbortError') { Side.say('Save cancelled.'); return; }
      if (err && err.message === 'wrong folder') {
        Side.say('That folder is not the game — it has no index.html and no data/ in it.');
        return;
      }
      Side.say('Could not write there. ' + this.why());
    });
  },

  /* A folder with no index.html and no data/ in it is somebody's home
     directory, and writing eight files into it is not a mistake worth being
     able to make. */
  check(dir) {
    return dir.getFileHandle('index.html').then(() => dir.getDirectoryHandle('data'))
      .then(() => true, () => false);
  },

  file(dir, path, create) {
    const parts = path.split('/');
    let at = Promise.resolve(dir);
    parts.slice(0, -1).forEach(p => {
      at = at.then(d => d.getDirectoryHandle(p, { create: !!create }));
    });
    return at.then(d => d.getFileHandle(parts[parts.length - 1], { create: !!create }));
  },

  /* Every file is read, spliced and parsed before ANY of them is written.
     Half a save is the one outcome worth engineering against: the tables in
     these files name each other, and a data/items.js from after your edits
     beside a data/npcs.js from before them is a game that boots and is subtly
     wrong. */
  write(dir, plan) {
    /* Keyed by path and carried forward, because SEVERAL WRITES CAN LAND IN ONE
       FILE — jobs and rewards both live in data/items.js, and so do the
       cabinets. Each one has to start from what the one before it produced
       rather than from the copy on disk, or the last to be staged is the only
       one that survives. */
    const staged = {};
    const order = [];
    let chain = Promise.resolve();
    plan.writes.forEach(w => {
      chain = chain.then(() => {
        if (order.indexOf(w.file) < 0) order.push(w.file);
        if (w.decl === null) { staged[w.file] = { text: w.code, made: true }; return; }
        const have = staged[w.file]
          ? Promise.resolve(staged[w.file].text)
          : this.file(dir, w.file).then(h => h.getFile()).then(f => f.text());
        return have.then(src => {
          const out = w.entries
            ? w.entries.reduce((s, e) => {
              const next = this.spliceKey(s, w.decl, e.id, e.code);
              if (next === null) throw new Error('no ' + w.decl + '.' + e.id + ' in ' + w.file);
              return next;
            }, src)
            : this.splice(src, w.decl, w.code);
          if (out === null) throw new Error('no ' + w.decl + ' in ' + w.file);
          if (!this.parses(out)) throw new Error(w.file + ' would not parse after writing ' + w.decl);
          staged[w.file] = { text: out, made: staged[w.file] && staged[w.file].made };
        });
      });
    });

    return chain.then(() => {
      const files = order;
      let put = Promise.resolve();
      files.forEach(p => {
        put = put.then(() => this.file(dir, p, staged[p].made)
          .then(h => h.createWritable())
          .then(w => w.write(staged[p].text).then(() => w.close())));
      });
      return put.then(() => {
        /* The files now have it, so the page must stop saying they do not.
           Every bench is empty, every base is the version just written, and
           the list of what the files hold is taken again — a subject invented
           here is on file now, and one deleted here is gone from it. */
        Mode.docs().forEach(({ doc }) => { if (doc.settle) doc.settle(); });
        Mode.noteWhatIsOnFile();
        Bank.save();
        Side.refresh();
        this.report(plan, files);
      });
    }).catch(err => {
      Side.say('Nothing was written — ' + (err && err.message ? err.message : 'the write failed') + '.');
    });
  },

  /* Everywhere else: the same plan as a file, and a script that applies it.
     Firefox and Safari have no directory picker, and a file:// page has no
     secure context to be given one in — so this is not a lesser path for
     unusual setups, it is the path for two of the three browsers. */
  bundle(plan) {
    const text = JSON.stringify({
      v: this.V, at: new Date().toISOString(),
      writes: plan.writes.map(w => ({ file: w.file, decl: w.decl, code: w.code, entries: w.entries || null })),
      manual: plan.manual,
    }, null, 1);
    Side.download('editor-changes.json', text);
    Side.say('Saved editor-changes.json. Run: node tools/apply-editor-changes.mjs <file>');
    this.report(plan);
  },

  /* What happened, and what is still yours to do. The manual list is the point
     of this: a save that quietly did eight of nine things is how you find out
     in a fortnight that the arcade has no script tag. */
  report(plan, files) {
    const L = [];
    if (files && files.length) L.push('<h4>Written</h4><ul class="list">'
      + files.map(f => '<li><code>' + esc(f) + '</code></li>').join('') + '</ul>');
    else if (plan.writes.length) L.push('<h4>' + plan.writes.length + ' to apply</h4><ul class="list">'
      + plan.writes.map(w => '<li><code>' + esc(w.file) + '</code>'
        + '<em>' + esc(w.decl || 'the whole file') + ' · ' + esc(w.why) + '</em></li>').join('') + '</ul>');
    if (plan.manual.length) L.push('<h4>Still yours to do</h4><ul class="list">'
      + plan.manual.map(m => '<li><b>' + esc(m.label) + '</b>'
        + '<em>' + (m.file ? '<code>' + esc(m.file) + '</code> — ' : '') + esc(m.why) + '</em></li>').join('')
      + '</ul>');
    if (!L.length) return;
    Ask.tell('Saved to the game', L.join(''));
  },

  why() {
    return 'A page opened off disk cannot be given a folder to write to. '
      + 'Serve it — python3 -m http.server — or use the change file and the apply script.';
  },
};
