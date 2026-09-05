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
export function blit(dst, src, sx, sy, sw, sh, dx, dy) {
  for (let y = 0; y < sh; y++) {
    const srcRow = (sy + y) * src.width;
    const dstRow = (dy + y) * dst.width;
    for (let x = 0; x < sw; x++) {
      const si = (srcRow + sx + x) * 4;
      const di = (dstRow + dx + x) * 4;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
}
