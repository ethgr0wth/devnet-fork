/**
 * surgicalEdit — display-side sentinel-block parsing, Keystone-Lite parity.
 *
 * Verbatim port of keystone-lite's `surgical-edit.ts` parse layer. The
 * backend (quests.py `_parse_keystone_blocks`) is the AUTHORITATIVE parser
 * and the only place edits are APPLIED; this module exists so the chat
 * never renders raw `<<<FILE/EDIT/CREATE>>>` markers — blocks become the
 * Surgical Edits card and the prose renders clean, exactly like lite's
 * ChatPanel.renderMessageContent.
 *
 * The apply helpers are intentionally NOT ported: on the web host the env
 * workspace is server-side and quests.py already applied the edits.
 */

export interface SurgicalEdit {
  type: 'insert' | 'replace' | 'delete' | 'full_replace' | 'create';
  file: string;
  startLine: number;
  endLine?: number;
  content?: string;
}

export interface ParsedEditResponse {
  edits: SurgicalEdit[];
  explanation: string;
}

export function parseSurgicalEdits(response: string): ParsedEditResponse {
  const edits: SurgicalEdit[] = [];
  let explanation = response;

  const fileBlockRegex = /<<<FILE\s+([^>]+)>>>([\s\S]*?)<<<END>>>/g;
  let fileMatch;

  while ((fileMatch = fileBlockRegex.exec(response)) !== null) {
    const [fullMatch, filename, fileContent] = fileMatch;
    explanation = explanation.replace(fullMatch, '').trim();

    edits.push({
      type: 'full_replace',
      file: filename.trim(),
      startLine: 1,
      content: fileContent.trim(),
    });
  }

  // Handle top-level CREATE blocks: <<<CREATE path/to/file.md>>>...<<<END>>>
  const createBlockRegex = /<<<CREATE\s+([^>]+)>>>([\s\S]*?)<<<END>>>/g;
  let createMatch;

  while ((createMatch = createBlockRegex.exec(response)) !== null) {
    const [fullMatch, filepath, fileContent] = createMatch;
    explanation = explanation.replace(fullMatch, '').trim();

    edits.push({
      type: 'create',
      file: filepath.trim(),
      startLine: 1,
      content: fileContent.trim(),
    });
  }

  const editBlockRegex = /<<<EDIT\s+([^>]+)>>>([\s\S]*?)<<<END>>>/g;
  let match;

  while ((match = editBlockRegex.exec(response)) !== null) {
    const [fullMatch, filename, editContent] = match;
    explanation = explanation.replace(fullMatch, '').trim();

    const lines = editContent.trim().split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith('<<<DELETE')) {
        const rangeMatch = line.match(/<<<DELETE\s+lines?\s+(\d+)(?:-(\d+))?>>>/i);
        if (rangeMatch) {
          const startLine = parseInt(rangeMatch[1], 10);
          const endLine = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : startLine;
          edits.push({
            type: 'delete',
            file: filename.trim(),
            startLine,
            endLine,
          });
        }
        i++;
      } else if (line.startsWith('<<<INSERT')) {
        const insertMatch = line.match(/<<<INSERT\s+(?:after\s+)?line\s+(\d+)>>>/i);
        if (insertMatch) {
          const afterLine = parseInt(insertMatch[1], 10);
          const contentLines: string[] = [];
          i++;
          while (i < lines.length && !lines[i].startsWith('<<<')) {
            contentLines.push(lines[i]);
            i++;
          }
          edits.push({
            type: 'insert',
            file: filename.trim(),
            startLine: afterLine + 1,
            content: contentLines.join('\n'),
          });
        } else {
          i++;
        }
      } else if (line.startsWith('<<<REPLACE')) {
        const replaceMatch = line.match(/<<<REPLACE\s+lines?\s+(\d+)(?:-(\d+))?>>>/i);
        if (replaceMatch) {
          const startLine = parseInt(replaceMatch[1], 10);
          const endLine = replaceMatch[2] ? parseInt(replaceMatch[2], 10) : startLine;
          const contentLines: string[] = [];
          i++;
          while (i < lines.length && !lines[i].startsWith('<<<')) {
            contentLines.push(lines[i]);
            i++;
          }
          edits.push({
            type: 'replace',
            file: filename.trim(),
            startLine,
            endLine,
            content: contentLines.join('\n'),
          });
        } else {
          i++;
        }
      } else if (line.startsWith('<<<CREATE')) {
        const contentLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('<<<')) {
          contentLines.push(lines[i]);
          i++;
        }
        edits.push({
          type: 'create',
          file: filename.trim(),
          startLine: 1,
          content: contentLines.join('\n'),
        });
      } else {
        i++;
      }
    }
  }

  return { edits, explanation };
}

/**
 * Streaming polish: a block whose <<<END>>> hasn't arrived yet must never
 * render raw (QuestsWorkspace applies the same strip before display).
 */
export function stripPartialSentinels(text: string): string {
  return text
    .replace(/<<<(FILE|EDIT|CREATE)\s+[^>]*>>>[\s\S]*$/g, '')
    .replace(/<<<(FILE|EDIT|CREATE)[^>]*$/g, '')
    .replace(/<<<END>>>/g, '')
    .replace(/<<<[^>]*$/g, '')
    .trim();
}
