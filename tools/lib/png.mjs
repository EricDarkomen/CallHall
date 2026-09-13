'use strict';
/* Thin wrapper over pngjs: decode, make a blank canvas, blit a rect from one
   decoded PNG into another, encode. Nothing here knows what a "sheet" or a
   "sprite" is — that's build-sprites.mjs's job. */
import { PNG } from 'pngjs';

export function decodePng(buf) {
  return PNG.sync.read(buf);
}

export function encodePng(png) {
  return PNG.sync.write(png);
}

export function blankCanvas(width, height) {
  const png = new PNG({ width, height });
  png.data.fill(0);
  return png;
}

/* Copies an (sw x sh) rect at (sx,sy) in `src` to (dx,dy) in `dst`. Both are
   decoded pngjs images (RGBA, one byte per channel, row-major). */
/* SOURCE-OVER, not a straight copy, and the difference only shows up where two
   layers of one sprite overlap — which is exactly where a copy is wrong.

   A layered source stacks crops to assemble something the kit ships in pieces:
   a sign is a pole and a face, a cased clock is the case on one layer and the
   dial on another. Those crops are rectangles, and a rectangle drawn round a
   sign face is mostly transparent. Copying it wrote that transparency over the
   pole it was meant to sit on and rubbed out everything under it, which is how
   the first clock built here arrived as a dial hanging in mid-air with no case
   behind it.

   Fully transparent source pixels therefore leave what is underneath alone,
   and partial ones blend into it properly rather than replacing it — the edge
   of a crop is antialiased and a hard swap there is a halo. The common case is
   unchanged: onto an empty canvas, or with an opaque pixel, this is still the
   copy it always was. */
export function blit(dst, src, sx, sy, sw, sh, dx, dy) {
  for (let y = 0; y < sh; y++) {
    const srcRow = (sy + y) * src.width;
    const dstRow = (dy + y) * dst.width;
    for (let x = 0; x < sw; x++) {
      const si = (srcRow + sx + x) * 4;
      const di = (dstRow + dx + x) * 4;
      const sa = src.data[si + 3];
      if (!sa) continue;                       /* nothing there to draw */
      const da = dst.data[di + 3];
      if (sa === 255 || !da) {                 /* opaque, or onto bare canvas */
        dst.data[di] = src.data[si];
        dst.data[di + 1] = src.data[si + 1];
        dst.data[di + 2] = src.data[si + 2];
        dst.data[di + 3] = sa;
        continue;
      }
      /* Both are partly transparent: the real thing, in eight-bit terms. */
      const s = sa / 255, d = (da / 255) * (1 - s), a = s + d;
      for (let c = 0; c < 3; c++) {
        dst.data[di + c] = Math.round((src.data[si + c] * s + dst.data[di + c] * d) / a);
      }
      dst.data[di + 3] = Math.round(a * 255);
    }
  }
}
