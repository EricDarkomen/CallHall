'use strict';
/* THE WOODEN FURNITURE, and the first MANAGED sheet in this project that is
   not part 2.

   Everything in here is one OpenGameArt submission — "[LPC] Wooden Furniture"
   by bluecarrot16 and others — offered as CC-BY-SA 4.0, CC-BY-SA 3.0 or
   GPL 3.0 at the licensee's option. This project takes CC-BY-SA 3.0, which is
   the licence LICENSE part 3 already accounts for and the one
   LICENCES_BY_PART in tools/lib/source.mjs already allows: see the note above
   that table for why a ShareAlike sheet has to be a sheet of its OWN, and
   LICENSE part 3 for why GPL 3.0 is the worse of the two offers here.

   So: art/sprites/wood.png, its own file, packed with nothing else in it, and
   the build refuses to mix it with the OGA-BY sheets rather than trusting
   anybody to remember. art/sprites/sanitary.png has been exactly this since
   long before there was a second one; the only new thing is that this one is
   BUILT rather than pinned, so the crops below can be re-derived instead of
   being pixels somebody once pasted.

   What it is FOR: two things the town has been drawing as emoji since the
   beginning, and which there was no kit for until now.

     THE BENCHES. Fifteen of them — on the green, along Priorygate, outside
     the gate, on the platform, on the quay, in the gardens, on Weirbank Road.
     Every one has an act written for it about sitting down on it, and every
     one of them was a chair emoji, which is a different piece of furniture in
     a different room.

     THE CLOCKS. Four: the meeting room, the lobby, the market, the minster.
     A mantel clock emoji at nineteen pixels is an orange smudge with a white
     dot in it.

   Both come off the LAYERS archive rather than the flattened sheet, and that
   is not a preference. furniture-v1.5.png is drawn ON a room — brick wall,
   floorboards, skirting — so every crop off it would arrive with somebody
   else's wall behind it. layers.zip is the same art with the background gone
   and the wood tones separated, which is the form this can actually take a
   rectangle out of. The tone is chosen by WHICH LAYER is read: dark_wood.png
   below, because a bench that has stood on a green through three winters is
   not blonde. */
const url = 'https://opengameart.org/sites/default/files/layers.zip';
const sha256 = '4c604c50a869ae957471ef17a1d84518c40c8222e222ec3bd2ad71861dec66ec';
const page = 'https://opengameart.org/content/lpc-wooden-furniture';
const assetName = 'LPC Wooden Furniture';
const artists = [
  'bluecarrot16', 'Baŝto', 'Lanea Zimmerman (Sharm)', 'William Thompson',
  'Tuomo Untinen (Reemax)', 'Janna/Lilius/Jannax',
];
/* Read off the submission page by hand, as a FILE source must be — there is no
   Credits.txt at the other end to re-parse. The page offers three; this takes
   the middle one. See "Standing of this attribution" in LICENSE part 3. */
const licences = ['CC-BY-SA 3.0', 'CC-BY-SA 4.0', 'GPL 3.0'];
const details = 'Wooden furniture drawn for the LPC style, shipped both flattened and as ' +
  'separable wood-tone layers. Two pieces are cropped from the dark-wood layer here — a ' +
  'slatted bench and a cased wall clock — and neither sheet is reproduced intact.';

export default {
  id: 'wood',
  cell: 32,
  part: 3,
  title: assetName,
  sprites: [
    {
      /* A BENCH. Slatted back, a rail under the seat, a post at each end.

         SPLICED, and the splice is the whole reason this entry has `layers` in
         it rather than one rect. The bench upstream is ninety pixels long —
         nearly three tiles — and a bench that overhangs its own tile by thirty
         pixels at each end lands on whatever is beside it: a bin, a tree, the
         kerb, the next bench along. Sixty-four is two tiles, which is what a
         bench on a pavement actually is.

         So it is taken in two halves, thirty-two pixels each, and the
         twenty-six pixels in the middle are simply dropped. That is only
         allowed because of what the middle IS: rows 805-830 of dark_wood.png
         run solid and unbroken from x=99 to x=188, so the seat and the back are
         horizontal bands with nothing in them to line up. The grain ticks and
         the end posts are all within the outer thirty-two of each end, which is
         why the cut is there and not somewhere tidier. Checked by eye at 10x
         before and after the join. */
      name: 'obj.bench',
      anchor: 'floor',
      source: {
        url, sha256, page, assetName, artists, licences, details,
        entry: 'layers/dark_wood.png',
        size: [64, 29],
        layers: [
          { rect: [99, 803, 32, 29], at: [0, 0] },
          { rect: [157, 803, 32, 29], at: [32, 0] },
        ],
      },
    },
    {
      /* A WALL CLOCK: a dark case with a crown to it and a white dial reading
         about twenty past four, for ever.

         Two layers because the clock is drawn in two: dark_wood.png carries the
         case and a hole where the dial goes, and non_wood.png carries the dial
         and the hands. Same rectangle in both, stacked at the same place — the
         layers are registered to each other upstream, so the only thing this
         has to get right is that they are read in the order they are painted.

         The hands do not move and nothing here pretends otherwise. The game
         already tells the time in the corner of the screen and in every act
         that mentions it; a clock on the wall is a thing in a room, and the
         one in the market has been wrong since before any of this. */
      name: 'wall.clock',
      anchor: 'wall',
      source: {
        url, sha256, page, assetName, artists, licences, details,
        size: [17, 25],
        layers: [
          { entry: 'layers/dark_wood.png', rect: [135, 677, 17, 25], at: [0, 0] },
          { entry: 'layers/non_wood.png', rect: [135, 677, 17, 25], at: [0, 0] },
        ],
      },
    },
  ],
};
