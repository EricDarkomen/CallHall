'use strict';
/* Talks to upstream: fetches a file from a repo pinned at a commit, and reads
   that project's OWN Credits.txt to find out what licence it currently offers
   an asset under. Nothing here is cached to disk on purpose — the whole point
   of checking on every build is that upstream's licence data might have
   changed since the last one. */

const RAW = (repo, commit, path) =>
  `https://raw.githubusercontent.com/${repo}/${commit}/` +
  path.split('/').map(encodeURIComponent).join('/');

export async function fetchBytes(repo, commit, path) {
  const url = RAW(repo, commit, path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function fetchText(repo, commit, path) {
  return (await fetchBytes(repo, commit, path)).toString('utf8');
}

/* Only these two carry no ShareAlike term, which is the one thing that would
   make using them cost more than attribution — see README's "Licence"
   section. Never widen this without re-reading why it's narrow. */
const ALLOWED_LICENCES = ['OGA-BY 3.0', 'CC0'];

/* Credits.txt is prose, not data: blocks separated by a blank line, each
   headed by the asset's display name, then `KEY: value` fields — SOURCE and
   the odd all-caps field may repeat or run on to further indented lines
   (DETAILS, mostly). Lenient on purpose: this format was written for humans
   and drifts asset to asset (see e.g. "Structure/Walls/Credits.txt"). */
export function parseCreditsBlock(text, assetName) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const lines = block.split('\n');
    const name = lines[0].trim();
    if (name !== assetName) continue;
    const fields = {};
    let cur = null;
    for (const raw of lines.slice(1)) {
      const line = raw.trim();
      if (!line || /^-+$/.test(line)) continue;
      const m = line.match(/^(ARTIST\(S\)|SOURCE|LICENSE|DETAILS)\s*:\s*(.*)$/);
      if (m) {
        cur = m[1];
        if (cur === 'SOURCE') (fields.SOURCE ||= []).push(m[2].trim());
        else fields[cur] = m[2] ? m[2].trim() : '';
      } else if (cur === 'SOURCE') {
        fields.SOURCE.push(line.replace(/^SOURCE:\s*/, ''));
      } else if (cur) {
        fields[cur] = fields[cur] ? fields[cur] + ' ' + line : line;
      }
    }
    return {
      name,
      artists: (fields['ARTIST(S)'] || '').split(',').map(s => s.trim()).filter(Boolean),
      sources: fields.SOURCE || [],
      licences: (fields.LICENSE || '').split(',').map(s => s.trim()).filter(Boolean),
      details: (fields.DETAILS || '').trim(),
    };
  }
  throw new Error(`no entry named "${assetName}" in that Credits.txt`);
}

/* Throws rather than returning false: a licence that stopped qualifying is not
   a sprite to skip quietly, it's a reason to stop the whole build — see
   README's "re-checks that against upstream's own licence data on every
   build and refuses to produce a sheet if it stops being true." */
export function verifyLicence(entry) {
  const ok = entry.licences.find(l => ALLOWED_LICENCES.some(a => l.startsWith(a)));
  if (!ok) {
    throw new Error(
      `refusing to build: "${entry.name}" no longer offers OGA-BY 3.0 or CC0 ` +
      `(upstream currently lists: ${entry.licences.join(', ') || '(nothing)'})`
    );
  }
  return ok;
}
