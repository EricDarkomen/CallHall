'use strict';
import { createHash } from 'node:crypto';

/* A cache-busting tag for a sheet's `?v=` query string — it only has to change
   when the PNG's bytes do, never match any particular upstream tool's output. */
export function shortHash(buf) {
  const digest = createHash('sha256').update(buf).digest();
  return digest.readUIntBE(0, 6).toString(36);
}

export function sha256hex(buf) {
  return createHash('sha256').update(buf).digest('hex');
}
