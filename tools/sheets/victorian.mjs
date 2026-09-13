'use strict';
/* THE OLD TOWN'S STREET FURNITURE, and the first part-4 sheet.

   Everything in here is one OpenGameArt submission — "[LPC] Victorian Town
   Decorations", compiled by bluecarrot16 out of a long list of LPC
   contributions and offered under CC-BY-SA 4.0 and nothing else. Not 3.0 as
   well, the way [LPC] Wooden Furniture is: four point zero, on its own, take
   it or leave it.

   Which is why LICENSE has a part 4 now. The alternative was to leave this
   art alone, and that would not have been caution — it would have been
   refusing a licence this project already accepts an earlier version of, over
   a version number. What part 4 costs is one more section of LICENSE saying
   honestly which files are on which terms, and one more PNG that nothing else
   is packed into. See the note above LICENCES_BY_PART in tools/lib/source.mjs
   for why 4.0 could not simply be added to part 3's list: ShareAlike versions
   are not interchangeable, and a section that claimed to cover both would be
   wrong about one of them.

   What it is FOR: the half of this town that is four hundred years older than
   the other half. The map south of the railway is a walled mediaeval centre
   with a minster, a quay and a pannier market in it, and up to now it has been
   furnished out of the same modern kit as the retail park — the same wheelie
   bins, the same aluminium benches, the same everything. These are the things
   a town like that actually has standing on it, and three of the four are
   things Britain genuinely still has standing on it two centuries later, which
   is the whole joke of the place. */
const url = 'https://opengameart.org/sites/default/files/lpc-victorian-decoration.zip';
const sha256 = 'f2fdffe9137b0a1128591634769ba6f6625220fea0eae5ac82fd7391d310e8cf';
const page = 'https://opengameart.org/content/lpc-victorian-town-decorations';
const assetName = 'LPC Victorian Town Decorations';
/* Off the submission's own CREDITS-decorations-victorian.txt, which ships
   inside the archive beside the art and names them in this order. */
const artists = [
  'bluecarrot16', 'Casper Nilsson', 'Lanea Zimmerman (Sharm)', 'William Thompson',
  'mold', 'AntumDeluge', 'Curt', 'Daniel Eddeland (daneeklu)', 'caeles',
  'George Bailey', 'Jetrel', 'Yar', 'Guido Bos', 'Ivan Voirol (Silver IV)',
  'Stephen Challener (Redshrike)', 'the Open Surge team', 'Arthur Carvalho',
  'Guilherme Vieira (n2liquid)', 'NaRNeRZz', 'Diarandor',
  'Armando Montero (ArMM1998)', 'Tuomo Untinen (Reemax)', 'Buch',
];
/* One licence, read off the submission page by hand as a FILE source must be.
   The page offers CC-BY-SA 4.0 and nothing else; so does the credits file in
   the archive. See "Standing of this attribution" in LICENSE part 4. */
const licences = ['CC-BY-SA 4.0'];
const details = 'Victorian-era town decoration for the LPC style: garden, market and street ' +
  'tilesets. Four objects are cropped from the market and street sheets here; no sheet is ' +
  'reproduced intact.';

const from = (entry, rect) => ({ url, sha256, page, entry, assetName, artists, licences, details, rect });
const M = 'lpc-victorian-decoration/victorian-market.png';
const S = 'lpc-victorian-decoration/victorian-streets.png';

export default {
  id: 'victorian',
  cell: 32,
  part: 4,
  title: assetName,
  sprites: [
    {
      /* A PAINTED IRON BENCH — red slats, dark green ends, forty-four pixels
         long. The other bench this game has is in art/sprites/wood.png and it
         is a dark stained settle: right in a churchyard and on Priorygate,
         wrong on a railway platform and outside a chain bakery. Two benches,
         split where the town splits, which is the one place in this map the
         boundary between the two halves is worth spending a sprite on.

         Narrower than the wooden one and not spliced, because at forty-four it
         already sits inside a tile and a bit rather than across three. */
      name: 'obj.bench.iron',
      anchor: 'floor',
      source: from(M, [122, 432, 44, 27]),
    },
    {
      /* A PILLAR BOX. Hexagonal, fluted, on a stone plinth, and there is one
         standing on the corner of Priorygate that has been emptied at the same
         time every weekday since before anybody working in the office was
         born. This is the single most British object in the kit and the town
         did not have one. */
      name: 'obj.postbox',
      anchor: 'floor',
      source: from(M, [102, 274, 19, 45]),
    },
    {
      /* A CAST-IRON LITTER BIN, the fluted municipal sort that is bolted down
         and is emptied by lifting the liner out of the top. The old town has
         been putting its rubbish in wheelie bins on a mediaeval street, which
         is what actually happens and is also the thing every conservation-area
         committee in the country has a standing complaint about. Now it has
         both, and the committee has a point. */
      name: 'obj.bin.iron',
      anchor: 'floor',
      source: from(M, [66, 274, 28, 45]),
    },
    {
      /* A PUBLIC CLOCK ON A CAST-IRON POST, two tiles tall, with a hood over
         the dial and a fluted column under it. The thing a market town puts up
         to commemorate something, and the thing everybody then uses to arrange
         to meet. Goes at the market end of Priorygate, where the act about it
         can say what it commemorates. */
      name: 'obj.streetclock',
      anchor: 'floor',
      source: from(S, [231, 192, 18, 64]),
    },
  ],
};
