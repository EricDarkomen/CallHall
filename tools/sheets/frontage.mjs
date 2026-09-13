'use strict';
/* THE SHOPFRONTS. One OpenGameArt submission — "[LPC] Windows & Doors" by
   bluecarrot16 and others — offered as CC-BY-SA 3.0 or GPL 3.0+, and taken
   here as CC-BY-SA 3.0. ShareAlike, so it gets a sheet of its own and sits in
   LICENSE part 3 beside art/sprites/sanitary.png and art/sprites/wood.png. See
   the note above LICENCES_BY_PART in tools/lib/source.mjs.

   WHAT IT REPLACES, and why the third attempt is the one that works.

   The glass in this town's shopfronts has been wrong twice. It was the
   office's `wall.mirror` — thirty-two by twenty-three of landscape pane with a
   diagonal across it, on a two-tile wall, and what it read as was a mirror.
   Then it was `shop.window`, a tall sash cropped out of a castle-window sheet,
   which filled the wall and read as the front of a terraced house, because a
   sash IS the front of a terraced house.

   Neither was a shopfront, and the reason is the same both times: nothing in
   either kit was drawn as one. A parade's glass is WIDE — two tiles across,
   one deep, mullioned, sitting on a stall riser with a painted timber frame
   round it and a lintel over the top. That is a specific object and this
   submission has it, in eleven colourways, which is what a parade is: eleven
   shops that were painted in different decades by different people who each
   thought they were matching the others.

   Four of them here. Not one: a row of identical frames is the sticker problem
   the doors had, and picking the colour off the tile costs nothing. */
const url = 'https://opengameart.org/sites/default/files/lpc-windows-doors-v2.zip';
const sha256 = '5a1c01aacc54fae857451fcd01871e2a8919ff9d84ca0eaccba9210148eef2be';
const page = 'https://opengameart.org/content/lpc-windows-doors';
const assetName = 'LPC Windows & Doors';
/* Off the submission's own CREDITS-windows-doors.txt, which ships inside the
   archive beside the art and names them in this order. */
const artists = [
  'bluecarrot16', 'Lanea Zimmerman (Sharm)', 'Daniel Armstrong (HughSpectrum)',
  'Casper Nilsson', 'Anamaris', 'Krusmira', 'Keith Karnage', 'Guido Bos', 'Talosaurus',
];
/* Read off the submission page by hand, as a FILE source must be; the credits
   file inside the archive says the same. See "Standing of this attribution" in
   LICENSE part 3. */
const licences = ['CC-BY-SA 3.0', 'GPL 3.0+'];
const details = 'Windows and doors drawn for the LPC style in many frame colours. Four ' +
  'two-tile shopfront windows are cropped from it here; no sheet is reproduced intact.';

const entry = 'lpc-windows-doors-v2/windows-doors.png';
const win = (name, rect) => ({
  name, anchor: 'wall',
  source: { url, sha256, page, entry, assetName, artists, licences, details, rect },
});

export default {
  id: 'frontage',
  cell: 32,
  part: 3,
  title: assetName,
  sprites: [
    /* Four colourways off four rows of the same sheet — the same window, the
       same mullions, the same stall riser, painted maroon, cream, ochre and
       slate. R.spriteOf() is not what picks between them: the object does, off
       its own tile, in data/world.js, so a shop's frame does not change colour
       when the camera moves and no two units in a row wear the same paint. */
    win('shop.win.maroon', [16, 26, 64, 44]),
    win('shop.win.cream', [16, 122, 64, 44]),
    win('shop.win.gold', [16, 218, 64, 44]),
    win('shop.win.slate', [16, 314, 64, 44]),
  ],
};
