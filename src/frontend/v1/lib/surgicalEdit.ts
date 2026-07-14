/**
 * surgicalEdit — display-side sentinel-block parsing for the Keystone pages.
 *
 * v2: line-walk grammar that mirrors the AUTHORITATIVE backend parser
 * (quests.py `_parse_keystone_blocks`) instead of keystone-lite's regex.
 * The lite regex is non-greedy (`<<<EDIT f>>>…<<<END>>>` stops at the FIRST
 * `<<<END>>>`), so an EDIT block carrying multiple ops with per-op ENDs —
 * which the backend grammar explicitly allows — leaked ops 2..n into the
 * prose as raw markers. This parser speaks the backend's grammar:
 *
 *   <<<FILE path>>> … <<<END>>>            full write
 *   <<<CREATE path>>> … <<<END>>>          create
 *   <<<EDIT path>>>
 *     <<<REPLACE lines X[-Y]>>> [inline] … [<<<END>>>]
 *     <<<INSERT [after ]line X>>> [inline] … [<<<END>>>]
 *     <<<DELETE lines X[-Y]>>>
 *   <<<END>>>
 *
 * Per-op <<<END>>> is optional; after an END the block continues if another
 * op marker appears within the next few lines (same lookahead window the
 * backend uses). No line beginning with `<<<` ever reaches the prose.
 *
 * Streaming: an unterminated block yields `partial: true` edits (and
 * `inProgressFile` before the first op lands) so the UI can render live
 * progress instead of stripping silently. Apply stays server-side —
 * quests.py is the only applier on this host.
 */

export interface SurgicalEdit {
  type: 'insert' | 'replace' | 'delete' | 'full_replace' | 'create';
  file: string;
  startLine: number;
  endLine?: number;
  content?: string;
  /** Present while the op's closing marker hasn't streamed in yet. */
  partial?: boolean;
}

export interface ParsedEditResponse {
  edits: SurgicalEdit[];
  explanation: string;
  /** An EDIT/FILE/CREATE block has opened but no op/END has arrived yet. */
  inProgressFile?: string;
}

const OPEN_RE = /^<<<(FILE|CREATE|EDIT)\s+([^>]+)>>>\s*(.*)$/;
const OP_RE = /^<<<(REPLACE|INSERT|DELETE)\b/i;
const REPL_RE = /^<<<REPLACE\s+lines?\s+(\d+)(?:-(\d+))?>>>\s*(.*)$/i;
const INS_RE = /^<<<INSERT\s+(?:after\s+)?line\s+(\d+)>>>\s*(.*)$/i;
const DEL_RE = /^<<<DELETE\s+lines?\s+(\d+)(?:-(\d+))?>>>\s*$/i;
const END_RE = /^<<<END>>>\s*$/;
const INLINE_END_RE = /\s*<<<END>>>\s*$/;

export function parseSurgicalEdits(response: string): ParsedEditResponse {
  const edits: SurgicalEdit[] = [];
  const keep: string[] = [];
  let inProgressFile: string | undefined;
  const lines = response.split('\n');
  let i = 0;

  /** Backend lookahead: does another op marker start within the window? */
  const moreOpsAhead = (from: number): boolean => {
    for (let j = from; j < Math.min(from + 4, lines.length); j++) {
      const s = lines[j].trim();
      if (!s) continue;
      if (OP_RE.test(s)) return true;
      if (s.startsWith('<<<')) return false;
      return false; // prose after END = block over
    }
    return false;
  };

  /** Collect op content until a `<<<` line; inline `…<<<END>>>` closes too. */
  const collectContent = (seed: string): { content: string; closed: boolean } => {
    const out: string[] = [];
    if (seed && seed.trim()) {
      if (INLINE_END_RE.test(seed)) {
        out.push(seed.replace(INLINE_END_RE, '').trim());
        return { content: out.join('\n'), closed: true };
      }
      out.push(seed.trim());
    }
    while (i < lines.length) {
      const raw = lines[i];
      const s = raw.trim();
      if (s.startsWith('<<<')) return { content: out.join('\n'), closed: true };
      if (INLINE_END_RE.test(raw) && s !== '') {
        out.push(raw.replace(INLINE_END_RE, ''));
        i++;
        return { content: out.join('\n'), closed: true };
      }
      out.push(raw);
      i++;
    }
    return { content: out.join('\n'), closed: false }; // stream still going
  };

  while (i < lines.length) {
    const stripped = lines[i].trim();
    const open = stripped.match(OPEN_RE);
    if (!open) {
      // Safety net: marker-ish lines never reach the prose.
      if (!stripped.startsWith('<<<')) keep.push(lines[i]);
      i++;
      continue;
    }

    const kind = open[1].toUpperCase();
    const path = open[2].trim();
    const inline = open[3] || '';
    i++;

    if (kind === 'FILE' || kind === 'CREATE') {
      const { content, closed } = collectContent(inline);
      // consume the block's own <<<END>>> if that's what stopped us
      if (i < lines.length && END_RE.test(lines[i].trim())) i++;
      edits.push({
        type: kind === 'FILE' ? 'full_replace' : 'create',
        file: path,
        startLine: 1,
        content: content.trim(),
        ...(closed ? {} : { partial: true }),
      });
      if (!closed) inProgressFile = path;
      continue;
    }

    // ── EDIT block: multiple ops, per-op END optional ──
    let sawOp = false;
    let blockOpen = true;
    while (i < lines.length && blockOpen) {
      const s = lines[i].trim();

      if (END_RE.test(s)) {
        i++;
        if (moreOpsAhead(i)) continue; // that END closed an op, not the block
        blockOpen = false;
        break;
      }
      if (OPEN_RE.test(s)) break; // next block opens — this EDIT is done

      let m: RegExpMatchArray | null;
      if ((m = s.match(REPL_RE))) {
        i++;
        const start = parseInt(m[1], 10);
        const end = m[2] ? parseInt(m[2], 10) : start;
        const { content, closed } = collectContent(m[3] || '');
        edits.push({
          type: 'replace',
          file: path,
          startLine: start,
          endLine: end,
          content,
          ...(closed ? {} : { partial: true }),
        });
        sawOp = true;
      } else if ((m = s.match(INS_RE))) {
        i++;
        const after = parseInt(m[1], 10);
        const { content, closed } = collectContent(m[2] || '');
        edits.push({
          type: 'insert',
          file: path,
          startLine: after + 1,
          content,
          ...(closed ? {} : { partial: true }),
        });
        sawOp = true;
      } else if ((m = s.match(DEL_RE))) {
        i++;
        const start = parseInt(m[1], 10);
        const end = m[2] ? parseInt(m[2], 10) : start;
        edits.push({ type: 'delete', file: path, startLine: start, endLine: end });
        sawOp = true;
      } else {
        // Stray in-block line — the backend skips these too; never prose.
        i++;
      }
    }

    if (!sawOp && i >= lines.length) {
      // `<<<EDIT path>>>` opened right at the stream frontier.
      inProgressFile = path;
    }
  }

  return {
    edits,
    explanation: keep.join('\n').trim(),
    ...(inProgressFile ? { inProgressFile } : {}),
  };
}

/**
 * Defense-in-depth for the prose pane: the parser above already consumes
 * every marker line, but strip any residue (e.g. malformed markers) so raw
 * sentinels can never render.
 */
export function stripPartialSentinels(text: string): string {
  return text
    .split('\n')
    .filter((l) => !l.trim().startsWith('<<<'))
    .join('\n')
    .replace(/<<<END>>>/g, '')
    .replace(/<<<[^>\n]*$/g, '')
    .trim();
}
