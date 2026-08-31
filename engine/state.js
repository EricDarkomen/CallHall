'use strict';
/* ---------------- Global state ---------------- */
const P = {
  name: 'Trainee', face: '🧑‍💻',
  level: 1, xpv: 0, xpNext: 100, rank: 0,
  patience: 100, patMax: 100, energy: 100, eneMax: 100,
  money: 0, rep: 0,
  stats: { empathy: 2, knowledge: 2, patience: 2, bullshit: 1, chaos: 1 },
  skills: {}, skillPoints: 1,
  inventory: [], equipment: { headset: null, trinket: null, mug: null },
  /* `dir` is a SPRITE ROW, not a word. It was 'down' — left over from the emoji
     days, when nothing read it — and a sprite sheet indexes with it: row 2 is
     facing the camera. As a string `(dir * frames + frame)` is NaN, drawImage
     with a NaN source rectangle draws nothing at all and throws nothing at all,
     so the player was invisible from the moment the shift started until the
     first step moved them, because movePlayer sets a real number. */
  x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, dir: 2, moving: false, bob: 0,
  buffs: []
};

const G = {
  day: 1, minutes: DAY_START, state: 'title',
  flags: {}, quests: {}, achievements: {}, rel: {},
  todayStats: {},
  totals: { calls: 0, coffee: 0, toiletMin: 0, printer: 0, angered: 0, satisfied: 0, transfers: 0, bullshit: 0 },
  chat: [], mail: [], unread: 0, unreadMail: 0,
  eventCooldown: 6, activeEvent: null, discovered: {}, endings: [],
  /* The job tracker: which job is being followed, which are folded to their
     titles, and whether the box itself is folded away. In G so that a save
     brings them back exactly as they were left. */
  track: null, tkShut: {}, tkFold: false, tkTitles: false,
  /* The arcade's high scores, which games have been cleared, and how many
     rounds have been played. Plain data, so {...G} in Save.write carries it
     without knowing what a minigame is — and resetRun clears it, or a new
     starter arrives with somebody else's best score already on the board. */
  arcade: { best: {}, won: {}, played: 0 },
  /* Which variant the player picked on each axis of the character creator, or
     null on an axis they left empty. Plain data, so {...G} in Save.write
     carries it and a returning shift is the same person; null means they never
     made one and the row the build baked stands. */
  look: null
};

const RANKS = [
  { n: 'Trainee', e: '🧑‍🎓', lv: 1 },
  { n: 'Agent', e: '📞', lv: 3 },
  { n: 'Senior Agent', e: '⭐', lv: 6 },
  { n: 'Team Leader', e: '🧑‍💼', lv: 9 },
  { n: 'Subject Matter Expert', e: '🧠', lv: 12 },
  { n: 'Management', e: '👔', lv: 15 },
  { n: 'Regional Operations Director', e: '👑', lv: 18 }
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday (overtime)', 'Sunday (why)'];

function clockStr(m) {
  const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60);
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

/* A single place that clears every scrap of run state. Adding a new field to G
   without adding it here is how save games start haunting new ones. */
function freshTotals() {
  return { calls: 0, coffee: 0, toiletMin: 0, printer: 0, angered: 0, satisfied: 0, transfers: 0, bullshit: 0 };
}
/* Bump a counter in both the lifetime tally and today's, so the end-of-shift
   report and the lifetime profile can never drift apart. */
function count(key, n = 1) {
  G.totals[key] = (G.totals[key] || 0) + n;
  G.todayStats[key] = (G.todayStats[key] || 0) + n;
}
function resetRun() {
  G.day = 1; G.minutes = DAY_START; G.state = 'play';
  G.totals = freshTotals();
  G.todayStats = {}; G.flags = {}; G.quests = {}; G.achievements = {}; G.rel = {};
  G.chat = []; G.mail = []; G.chatSent = {}; G.mailSent = {};
  G.unread = 0; G.unreadMail = 0;
  G.eventCooldown = 6; G.activeEvent = null;
  G.discovered = {}; G.endings = []; G.lastZone = null; G.objective = '';
  G.track = null; G.tkShut = {}; G.tkFold = false; G.tkTitles = false;
  G.arcade = { best: {}, won: {}, played: 0 };
  /* Not the face: a new shift is a new starter, and Look.open() puts the
     default back before anybody sees it. Cleared here so the previous
     character cannot haunt one that was never made. */
  G.look = null;
  Sprites.uncompose('player');
  /* Which level, and what each level remembers. Both have to go, or a new
     shift starts in the basement with yesterday's coffee already taken. */
  G.level = 'office'; G.levelState = {};
  Phones.clearAll();
  /* Rebuild every level from scratch and stand on the fourth floor. This also
     puts the player back at the spawn point, which is why it comes before the
     roster: NPCM.spawn() asks which level it is populating. */
  Levels.start('office', 'start');
  NPCM.spawn();
}

/* Canvas font stacks. These must be literal CSS font shorthand — canvas does
   not resolve var() and silently keeps the previously set font if it can't parse. */
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","EmojiOne Color",sans-serif';
const NAME_FONT = '600 11px ui-monospace,"Cascadia Mono",Consolas,"DejaVu Sans Mono",monospace';
const BUBBLE_FONT = '12px "Trebuchet MS","Segoe UI",Tahoma,sans-serif';
const FLOAT_FONT = '700 15px "Trebuchet MS","Segoe UI",Tahoma,sans-serif';

/* roundRect polyfill for older browsers */
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r); this.closePath(); return this;
  };
}
