'use strict';
/* THE ROOFS, and the end of the forty-tile swatch.

   One OpenGameArt submission — "[LPC] Roofs" by bluecarrot16 and others —
   offered as CC-BY-SA 3.0 or GPL 3.0+, and taken here as CC-BY-SA 3.0.
   ShareAlike, so it gets a sheet of its own and sits in LICENSE part 3 beside
   art/sprites/sanitary.png, art/sprites/wood.png and art/sprites/frontage.png.
   See the note above LICENCES_BY_PART in tools/lib/source.mjs.

   WHAT IT REPLACES. Everything solid outdoors that no floor can see is a roof
   — the middle of a block, and the whole of the town past the edge of the map.
   Up to now R.roofTile() drew that: four courses of baked slate in two
   variants, with a black square on about a quarter of them standing for a vent.
   On one tile it is a decent piece of drawing. On the four hundred tiles in the
   middle of the retail park it is a swatch, and the thing a swatch cannot do is
   the only thing a roof has to: say where one building stops and the next
   starts. A town seen from above is not a texture. It is a hundred roofs of
   different materials butted up against each other, each with its own parapet
   and its own junk on it, and the lines between them are the town.

   WHAT THIS IS. Thirteen tiles per material, which is a corner-matched
   ("wang") set: one field tile, four edges, four outer corners and four inner
   corners. Give it any shape at all on the tile grid and it will draw that
   shape with a coping all the way round it, mitred at the corners and returned
   into the inner ones. R.roofs() in engine/render.js cuts the wall mass into
   plots first and then asks this set for each plot, which is what turns one
   blob of solid into a terrace.

   FIVE MATERIALS, because a parade built in 1962, refelted in 1988 and patched
   last year is not one colour, and neither is the street it is on:

     slate     the default and the commonest, grey-blue with the pink and buff
               flecks a Welsh slate roof actually has
     lead      paler, flatter — the grey of a roof that has been walked on
     felt      near-black with a cream stone coping: the post-war flat roof,
               and the one thing on this map that is honestly of its decade
     pantile   warm brown, the clay pantile of the east coast, which is what
               the old town is roofed in and is why it is in here at all
     oxblood   deep red, one unit in fifteen, because there is always one

   The names in this file are what the roof IS, not what the upstream tileset
   calls it: the recolours in version 2 of the submission moved under their own
   names and "Roof_Flat_Green" is a dark red. What is pinned is the sha256 of
   the download, so if that ever stops being true the build stops rather than
   quietly cropping a green roof into a sheet that promises a red one. */
const url = 'https://opengameart.org/sites/default/files/lpc-roofs-v2_0.zip';
const sha256 = 'e9cbe54785113570c5f8498b87ce7079192f0650d6b0acd64a11169fddd264f0';
const page = 'https://opengameart.org/content/lpc-roofs';
const assetName = 'LPC Roofs';
/* Off the submission's own CREDITS-roofs.txt, which ships inside the archive
   beside the art and names them in this order. */
const artists = [
  'bluecarrot16', 'Lanea Zimmerman (Sharm)', 'Michele Bucelli (Buch)',
  'Casper Nilsson', 'Xenodora', 'keith karnage', 'NaRNeRZz', 'Talon (Talosaurus)',
];
/* Read off the submission page by hand, as a FILE source must be; the credits
   file inside the archive says the same. See "Standing of this attribution" in
   LICENSE part 3. */
const licences = ['CC-BY-SA 3.0', 'GPL 3.0+'];
const details = 'Roofing materials and shapes drawn for the LPC style, in many colourways. ' +
  'Five corner-matched sets of thirteen tiles each are cropped from it here — field, ' +
  'edges and corners — and nothing else; no sheet is reproduced intact.';

const entry = 'lpc-roofs-v2/roofs.png';
const tile = (name, col, row) => ({
  name, anchor: 'flat',
  source: { url, sha256, page, entry, assetName, artists, licences, details, rect: [col * 32, row * 32, 32, 32] },
});

/* ONE MATERIAL, thirteen tiles, given as the column and row of each in the
   upstream sheet. The order is the order R.ROOF_WANG reads them back in and
   the suffixes are what it builds the name out of, so this table and that one
   are the same table written twice — which is on purpose. A crop rect is a
   measurement and belongs where the measurements are; a lookup from a corner
   pattern to a name is a decision and belongs in the renderer. What joins them
   is a name a person can read, which is the only kind of coupling between two
   files that survives somebody editing one of them.

   The four INNER corners are nowhere near the other nine in the upstream
   sheet — bluecarrot16 lays each set out as a 3x3 block with its inner
   corners parked in the spare columns to one side, and in two of the five
   they are parked on a different row again. Hence coordinates rather than an
   offset from the block: there is no arithmetic that gets all five right. */
const set = (mat, at) => [
  tile(`roof.${mat}.mid`, ...at.mid),
  tile(`roof.${mat}.n`, ...at.n),
  tile(`roof.${mat}.s`, ...at.s),
  tile(`roof.${mat}.w`, ...at.w),
  tile(`roof.${mat}.e`, ...at.e),
  tile(`roof.${mat}.nw`, ...at.nw),
  tile(`roof.${mat}.ne`, ...at.ne),
  tile(`roof.${mat}.sw`, ...at.sw),
  tile(`roof.${mat}.se`, ...at.se),
  tile(`roof.${mat}.in.nw`, ...at.inw),
  tile(`roof.${mat}.in.ne`, ...at.ine),
  tile(`roof.${mat}.in.sw`, ...at.isw),
  tile(`roof.${mat}.in.se`, ...at.ise),
];

export default {
  id: 'roofs',
  cell: 32,
  part: 3,
  title: assetName,
  sprites: [
    ...set('slate', {
      mid: [50, 22], n: [50, 21], s: [50, 23], w: [49, 22], e: [51, 22],
      nw: [49, 21], ne: [51, 21], sw: [49, 23], se: [51, 23],
      inw: [47, 21], ine: [54, 21], isw: [48, 21], ise: [53, 21],
    }),
    ...set('lead', {
      mid: [59, 22], n: [59, 21], s: [59, 23], w: [58, 22], e: [60, 22],
      nw: [58, 21], ne: [60, 21], sw: [58, 23], se: [60, 23],
      inw: [56, 21], ine: [63, 21], isw: [57, 21], ise: [62, 21],
    }),
    ...set('felt', {
      mid: [36, 22], n: [36, 21], s: [36, 23], w: [35, 22], e: [37, 22],
      nw: [35, 21], ne: [37, 21], sw: [35, 23], se: [37, 23],
      inw: [41, 25], ine: [31, 25], isw: [41, 24], ise: [31, 24],
    }),
    ...set('pantile', {
      mid: [27, 16], n: [27, 15], s: [27, 17], w: [26, 16], e: [28, 16],
      nw: [26, 15], ne: [28, 15], sw: [26, 17], se: [28, 17],
      inw: [25, 18], ine: [28, 18], isw: [26, 18], ise: [27, 18],
    }),
    ...set('oxblood', {
      mid: [22, 16], n: [22, 15], s: [22, 17], w: [21, 16], e: [23, 16],
      nw: [21, 15], ne: [23, 15], sw: [21, 17], se: [23, 17],
      inw: [20, 18], ine: [23, 18], isw: [21, 18], ise: [22, 18],
    }),
  ],
};
