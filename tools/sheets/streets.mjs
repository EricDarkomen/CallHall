'use strict';
/* THE MODERN STREET. Everything in here is one OpenGameArt submission —
   "LPC Modern Streets" by Faufilage, CC0 — and it is the first sheet in this
   project built from a FILE source rather than a repo: a page with one archive
   attached to it, pinned by the checksum of that archive rather than by a
   commit, with the licence read off the page by hand because there is no
   Credits.txt at the other end to re-read. See tools/lib/buildSheet.mjs.

   CC0, so it sits in part 2 alongside the OGA-BY art with no ShareAlike term
   to keep apart from anything — see LICENCES_BY_PART in tools/lib/source.mjs.

   What it is FOR: the town's ground. The road and the pavement were both
   ElizaWy tiles doing an impression of a modern street — a mediaeval flagstone
   for the footway and a recoloured patch of grit for the carriageway, both
   chosen because they were the closest thing in a kit that has no roads in it.
   These are the real article, drawn for exactly this, and the difference is
   most of what anybody sees out there.

   The one rule this file inherits: never take a ground cell off a contact
   sheet without laying it out four by four and looking at the seam. Both
   surfaces below were measured for wrap error and then tiled and looked at.
   The cracked-road cells lost on that test and are not here — their crack
   repeats on a 32px pitch, which is a landmark, and a landmark every metre of
   a road that runs the width of the map is worse than a road with no cracks
   in it at all. */
const url = 'https://opengameart.org/sites/default/files/lpc_modern_streets.zip';
const sha256 = 'd3107d2ef9370626459a303ffe409a933b85333f214ceab335458d51174cb901';
const page = 'https://opengameart.org/content/lpc-modern-streets';
const assetName = 'LPC Modern Streets';
const artists = ['Faufilage'];
const licences = ['CC0'];
const details = 'Tilesets and street furniture drawn for the LPC style: sidewalks, road, ' +
  'rain gutters, drains and manholes, sign poles and signs, traffic lights and cones, ' +
  'bins, wheels and chain-link fencing. Cropped and packed here; no sheet is reproduced intact.';

/* Every sprite names the same archive and the same page; only the path inside
   it and the crop change. */
const from = (entry, rect) => ({ url, sha256, page, entry, assetName, artists, licences, details, rect });

export default {
  id: 'streets',
  cell: 32,
  title: assetName,
  sprites: [
    {
      /* THE CARRIAGEWAY. One flat, poured, seamless square of asphalt — wrap
         error of zero, measured, which is what a surface covering half the map
         has to have. It carries no texture of its own and that is the point:
         every marking on it is painted by R.roadPaint(), the wet sheen and the
         puddles are laid on by R.wetGround(), and the grain the old grit tile
         supplied was a grain that repeated. */
      name: 'terrain.road',
      anchor: 'flat',
      source: from('terrains/base_road_tile.png', [0, 0, 32, 32]),
    },
    {
      /* THE FOOTWAY. Paving slabs with a rounded corner to them, from the
         plain-fill block in the middle of an autotile sheet whose edges and
         corners this game has no use for — World.surf knows where a surface
         stops and R.kerbs() draws the boundary, so the tiles never need to
         know they are at one.

         Four candidates were tiled four by four and looked at. The ones with a
         single arc or a crack in them repeat as a LANDMARK — the same mark
         every 32 pixels down a pavement that runs the length of the map, which
         is the thing the note at the top of this file is about. This one is
         four small slabs to the tile: what repeats is a grid of joints, and a
         grid of joints is what paving is. */
      name: 'terrain.slab',
      anchor: 'flat',
      source: from('terrains/sidewalk_terrain.png', [224, 192, 32, 32]),
    },
    {
      /* A cone, with the band on it. Six of them on the sheet and this is the
         one that reads as a cone at 21 pixels rather than as an orange smudge:
         the banded ones have a light line across the middle, which is the only
         thing separating a cone from a traffic bollard at this size. */
      name: 'obj.cone',
      anchor: 'floor',
      source: from('decor/traffic_cones.png', [37, 37, 21, 24]),
    },
    {
      /* The cover, not the hole. The sheet ships an open manhole beside it and
         the open one is a hazard — this game's pavements are walked by people
         with no idea it is there, and there is no falling down anything in it. */
      name: 'obj.manhole',
      anchor: 'flat',
      source: from('terrains/manhole_and_cover.png', [64, 0, 32, 32]),
    },
  ],
};
