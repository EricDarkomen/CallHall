'use strict';
/* The faces sheet: LPC Revised's facial expressions.

   Every other sheet here is a person or a thing. This one is neither — it is
   twenty-two pixels by ten of somebody's EYES AND MOUTH, and it is drawn over
   a person who is already on the screen. That is what makes it affordable: an
   expression is a change to about thirty pixels of a face, so shipping it as a
   change rather than as a face is the difference between a 20KB PNG and a
   fourteen-megapixel one.

   Upstream draws each head with twelve expressions in one sheet
   (`Expressions.png`, one column per expression, one row per direction, and a
   strip of labels where the back of the head would be — there is no face on
   the back of a head). The builder takes the DIFFERENCE between a column and
   the Default column, which cancels out everything the two have in common:
   the skull, the ears, the outline. What is left is the expression.

   Two kinds of row come out of that, because there are two kinds of person in
   this game:

     - THE CAST are composited at build time and their hair is already baked
       into `revised.png`. So their patches are MASKED against their own
       pixels: nothing is kept that would land on Marjorie's fringe, and the
       expressions she wears are the ones you can actually see her wear.
     - THE PLAYER is chosen, so their hair is not known here. Their rows are
       one per build-and-skin — the same ids `parts-base` uses — and unmasked.
       A heavy fringe can take a pixel or two of an eyebrow with it. Nobody
       has ever noticed; the alternative is baking a row per haircut.

   The roster below is NOT taken on trust. The build reads `revised.png` and
   checks each person's face against the head and skin claimed for them, and
   refuses to build if somebody else's face fits better — see buildFaces.mjs.
   Adding a colleague to the cast sheet means adding them here too, or they
   simply never blink. */
const repo = 'ElizaWy/LPC';
const commit = 'f07f7f5892e67c932c68f70bb04472f2c64e46bc';

export default {
  id: 'faces',
  kind: 'faces',
  source: { repo, commit, creditsPath: 'Characters/Credits.txt' },

  /* The three heads the kit draws, and what upstream's own Credits.txt calls
     each of them — the name the licence check looks up. */
  heads: {
    fem:  { path: 'Characters/Head/Head 01 - Feminine',  asset: 'Adult Head - Feminine' },
    masc: { path: 'Characters/Head/Head 02 - Masculine', asset: 'Adult Head - Masculine' },
    old:  { path: 'Characters/Head/Head 03 - Elderly',   asset: 'Adult Head - Elderly' },
  },

  /* Any one colour of the eye overlay will do: the mask only needs to know
     WHICH pixels are eyes, and every colour of them covers the same ones. It
     matters because a colleague with green eyes does not match the head sheet
     there, and without this the mask would read "something is in front of the
     eye" and throw the expression's eyelids away. */
  eyes: 'Characters/Head/Head Overlay - Eyes/Blue',

  /* Upstream's twelve columns, in upstream's order — the first is the face
     everybody is already wearing, and the other eleven are measured against
     it. The second name in each pair is what the game calls it. */
  columns: [
    ['Default', null],
    ['Closing', 'closing'], ['Closed', 'closed'],
    ['Look R', 'look-r'], ['Look L', 'look-l'], ['Eyeroll', 'eyeroll'],
    ['Shock', 'shock'], ['Anger', 'anger'], ['Sad', 'sad'],
    ['Happy', 'happy'], ['Blush', 'blush'], ['Shame', 'shame'],
  ],

  /* The window every expression fits inside, in the 64x64 cell upstream draws
     in. Measured, not guessed — and re-measured on every build, which is the
     point: an upstream expression that grew a pixel outside this box would
     stop the build rather than get quietly clipped. */
  box: [21, 25, 22, 10],

  /* How a 64x64 cell became a 38x56 frame when the pinned character sheets
     were cropped, years before this tool existed. Everything here is placed
     relative to it, so it has to be right — buildFaces.mjs proves it is by
     rebuilding a frame of `parts-base` from upstream and comparing. */
  crop: [13, 9],

  /* The one thing this sheet cannot measure for itself and cannot do without:
     proof that `crop` above is the crop the pinned sheets were cut with. The
     builder composites this body and this head, cuts them the declared way,
     and requires the pinned sheet's own pixels back. */
  cropProof: {
    body: 'Characters/Body/Body 01 - Feminine, Thin',
    head: 'fem', skin: 'Porcelain',
    sheet: 'parts-base', id: 'base:fem/Porcelain',
  },

  /* Which upstream animation frame each of the twelve frames in a row IS.
     Same list the pinned sheets were cut from: stand, four of the walk, the
     seated pose, two more of the idle, four of the run. The head moves
     between them, so the builder measures how far and the game carries the
     patch with it. */
  frames: [
    ['Idle', 0],
    ['Walk', 0], ['Walk', 2], ['Walk', 4], ['Walk', 6],
    ['Sitting', 2],
    ['Idle', 1], ['Idle', 2],
    ['Run', 0], ['Run', 2], ['Run', 4], ['Run', 6],
  ],

  /* The creator's own axes, named exactly as parts-base names them, because
     that id is what the game has in its hand when it wants the player's face:
     `base:masc/Honey` is a row here as well as there. */
  bases: {
    prefix: 'base:',
    fits: { fem: 'fem', masc: 'masc' },
    skins: ['Porcelain', 'Ivory', 'Honey', 'Tawny', 'Brown', 'Coffee'],
  },

  /* Who is on `revised.png`, and whose face they are wearing. Checked against
     the pixels on every build. */
  castSheet: 'revised',
  cast: {
    player: ['masc', 'Honey'],
    dave: ['masc', 'Ivory'],
    karen: ['fem', 'Ivory'],
    steve: ['masc', 'Ivory'],
    marjorie: ['fem', 'Ivory'],
    gary: ['masc', 'Tawny'],
    sarah: ['fem', 'Peach'],
    kevin: ['masc', 'Ivory'],
    priya: ['fem', 'Bronze'],
    terry: ['old', 'Ivory'],
    janet: ['fem', 'Ivory'],
    mo: ['masc', 'Brown'],
    colin: ['masc', 'Ivory'],
    ron: ['masc', 'Tan'],
    nigel: ['masc', 'Porcelain'],
    alan: ['old', 'Ivory'],
    sandra: ['fem', 'Ivory'],
    fiona: ['old', 'Porcelain'],
    tomasz: ['masc', 'Ivory'],
    bev: ['fem', 'Honey'],
    marcus: ['masc', 'Brown'],
  },
};
