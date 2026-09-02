// Shared Markdown/math extractor used by check-math.mjs and check-github.mjs.
//
// It implements the rules GitHub's renderer applies (verified against
// `gh api /markdown` with mode=gfm on 2026-09-01):
//   - a display block is a paragraph whose first line is exactly `$$` at column 0,
//     closed by a line that is exactly `$$`;
//   - inline math is `$...$` on one line, the opening `$` hugging a non-space
//     character, the closing `$` preceded by a non-space and not followed by a digit;
//   - `$$...$$` on one line inside a paragraph is inline-block display math;
//   - the CommonMark escape pass runs BEFORE MathJax, so a backslash followed by
//     ASCII punctuation inside math is destroyed (`\{` -> `{`, `\\[2ex]` -> `\[2ex]`).
//
// Everything here is pure: input text in, arrays of frozen records out.

const FENCE_RE = /^(`{3,}|~{3,})/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const HTML_BLOCK_RE = /^<\/?(div|p|table|details|summary|figure|img|br)\b/i;
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s+/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** @typedef {{tex:string, display:boolean, kind:'block'|'inline'|'inline-block', line:number, col:number, endLine:number, inTable:boolean}} Snippet */
/** @typedef {{rule:string, line:number, col:number, msg:string}} Issue */

const issue = (rule, line, col, msg) => Object.freeze({ rule, line, col, msg });

/**
 * Split a Markdown source into math snippets and structural issues.
 * Line numbers are 1-based, columns are 1-based.
 * @param {string} src
 * @returns {{snippets: readonly Snippet[], issues: readonly Issue[], lines: readonly string[]}}
 */
export function extractMarkdown(src) {
  const lines = src.split('\n');
  const snippets = [];
  const issues = [];

  let inFence = null;
  let block = null; // { startLine, body: string[] , indented, prevBlank }
  let lastNonBlank = -1; // index of the last non-blank line seen outside blocks
  let lastNonBlankWasHtml = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const lineNo = i + 1;

    if (inFence) {
      if (raw.trim().startsWith(inFence)) inFence = null;
      continue;
    }
    if (block) {
      if (raw.trim() === '$$') {
        const tex = block.body.join('\n');
        snippets.push(Object.freeze({
          tex, display: true, kind: 'block', line: block.startLine + 1, col: 1,
          endLine: lineNo, inTable: false,
        }));
        const next = lines[i + 1];
        if (next !== undefined && next.trim() !== '') {
          issues.push(issue('E-BLOCK-NOBLANK', lineNo, 1, 'closing $$ must be followed by a blank line'));
        }
        block = null;
        continue;
      }
      block.body.push(raw);
      continue;
    }

    const fence = raw.match(FENCE_RE);
    if (fence) { inFence = fence[1]; continue; }

    const trimmed = raw.trim();
    const isBlank = trimmed === '';
    const prevBlank = i === 0 || lines[i - 1].trim() === '';

    if (trimmed === '$$') {
      if (raw !== '$$') {
        issues.push(issue('E-BLOCK-INDENT', lineNo, 1, 'display math $$ must start at column 0 (not inside a list item or blockquote)'));
      }
      if (!prevBlank) {
        const why = lastNonBlankWasHtml ? 'an HTML block' : 'text';
        issues.push(issue('E-BLOCK-NOBLANK', lineNo, 1, `opening $$ must be preceded by a blank line (currently follows ${why})`));
      }
      block = { startLine: lineNo, body: [] };
      continue;
    }
    if (/^\s*>\s*\$\$/.test(raw)) {
      issues.push(issue('E-BLOCK-IN-QUOTE', lineNo, 1, 'display math inside a blockquote is not rendered by GitHub'));
    }

    if (!isBlank) {
      lastNonBlank = i;
      lastNonBlankWasHtml = HTML_BLOCK_RE.test(trimmed);
    }

    const inTable = TABLE_ROW_RE.test(raw) && !TABLE_SEP_RE.test(raw);
    scanInline(raw, lineNo, inTable, snippets, issues);
  }
  if (block) {
    issues.push(issue('E-BLOCK-UNCLOSED', block.startLine, 1, 'display math block is never closed'));
  }
  void lastNonBlank;
  return { snippets: Object.freeze(snippets), issues: Object.freeze(issues), lines: Object.freeze(lines) };
}

/**
 * Scan one non-block line for `$...$` and `$$...$$`, skipping inline code.
 */
function scanInline(raw, lineNo, inTable, snippets, issues) {
  let i = 0;
  let inCode = false;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '`') { inCode = !inCode; i += 1; continue; }
    if (inCode || ch !== '$') { i += 1; continue; }
    if (raw[i - 1] === '\\') { i += 1; continue; } // escaped \$ in prose

    if (raw[i + 1] === '$') {
      const close = raw.indexOf('$$', i + 2);
      if (close === -1) {
        issues.push(issue('E-DOLLAR-UNBALANCED', lineNo, i + 1, 'unclosed $$ on a text line'));
        return;
      }
      const tex = raw.slice(i + 2, close);
      issues.push(issue('E-INLINE-DOUBLE', lineNo, i + 1, 'single-line $$...$$ on a text line: use a $$ block on its own lines or $...$'));
      snippets.push(Object.freeze({ tex, display: true, kind: 'inline-block', line: lineNo, col: i + 1, endLine: lineNo, inTable }));
      i = close + 2;
      continue;
    }

    const close = findInlineClose(raw, i + 1);
    if (close === -1) {
      issues.push(issue('E-DOLLAR-UNBALANCED', lineNo, i + 1, 'unbalanced $ on this line (inline math cannot span lines)'));
      return;
    }
    const tex = raw.slice(i + 1, close);
    if (/^\s/.test(tex) || /\s$/.test(tex)) {
      issues.push(issue('E-INLINE-SPACE', lineNo, i + 1, 'inline math must hug its delimiters: `$x$`, not `$ x $`'));
    }
    if (/[0-9]/.test(raw[close + 1] ?? '')) {
      issues.push(issue('E-INLINE-DIGIT', lineNo, close + 1, 'closing $ followed by a digit is not recognised as math by GitHub'));
    }
    snippets.push(Object.freeze({ tex, display: false, kind: 'inline', line: lineNo, col: i + 1, endLine: lineNo, inTable }));
    i = close + 1;
  }
}

function findInlineClose(raw, from) {
  for (let j = from; j < raw.length; j += 1) {
    if (raw[j] === '$' && raw[j - 1] !== '\\') return j;
  }
  return -1;
}

const ENV_OPEN_RE = /\\begin\{([a-zA-Z*]+)\}/g;

/**
 * Lint the TeX of one snippet for constructs that break on GitHub / KaTeX / MathJax.
 * @param {Snippet} s
 * @returns {readonly Issue[]}
 */
export function lintSnippet(s) {
  const out = [];
  const { tex } = s;
  const texLines = tex.split('\n');
  const at = (k) => s.kind === 'block' ? s.line + k : s.line;

  // Backslash + ASCII punctuation is eaten by GitHub's Markdown escape pass.
  const suggestions = {
    '{': '\\lbrace', '}': '\\rbrace', '|': '\\lvert ... \\rvert (or \\mid / \\vert)', ';': '\\quad',
    ',': '\\thinspace', '!': '\\negthinspace', ':': '\\medspace', '_': '\\_ is not needed inside math',
    '#': '\\#', '%': '\\%', '&': '\\&', '$': '\\$', '[': '\\lbrack', ']': '\\rbrack', '(': '(', ')': ')',
  };
  texLines.forEach((tl, k) => {
    const re = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g;
    let m;
    while ((m = re.exec(tl)) !== null) {
      if (m[1] === '\\') {
        // `\\` is a line break: fine only when nothing but whitespace follows on this line.
        const rest = tl.slice(m.index + 2);
        if (rest.trim() !== '') {
          out.push(issue('E-LINEBREAK-MIDLINE', at(k), m.index + 1,
            `\\\\ must end its line (GitHub turns "\\\\${rest.slice(0, 6)}" into "\\${rest.slice(0, 6)}"); drop \\[Nex] and start a new line`));
        }
        re.lastIndex = m.index + 2;
        continue;
      }
      const sug = suggestions[m[1]] ?? 'an alphabetic macro';
      out.push(issue('E-BS-PUNCT', at(k), m.index + 1,
        `"\\${m[1]}" inside math is destroyed by GitHub's Markdown escape pass; use ${sug}`));
    }
    // In INLINE math GitHub HTML-escapes < and > and then escapes the ampersand again,
    // so the element text arrives as the literal "&lt;" (verified via `gh api /markdown`,
    // 2026-09-02: `$s>0$` -> `$s&amp;gt;0$`). Inside a $$ block the escape happens once
    // and the DOM decodes it back to ">", so display math may keep bare < and >.
    const ltgt = s.kind === 'block' ? null : tl.match(/[<>]/);
    if (ltgt) {
      out.push(issue('E-LT-GT', at(k), tl.indexOf(ltgt[0]) + 1,
        `bare "${ltgt[0]}" in inline math reaches GitHub as the literal "&${ltgt[0] === '<' ? 'lt' : 'gt'};"; use ${ltgt[0] === '<' ? '\\lt' : '\\gt'}`));
    }
    // `*` inside inline math is consumed by the Markdown emphasis pass before the math
    // is extracted, which silently italicises the row and drops one delimiter.
    if (s.kind !== 'block' && tl.includes('*')) {
      out.push(issue('E-MATH-ASTERISK', at(k), tl.indexOf('*') + 1,
        '"*" inside inline math is eaten by the Markdown emphasis pass; use \\ast'));
    }
    if (/[^\x00-\x7f]/.test(tl)) {
      const ch = tl.match(/[^\x00-\x7f]/)[0];
      out.push(issue('E-NONASCII-MATH', at(k), tl.indexOf(ch) + 1, `non-ASCII character "${ch}" (U+${ch.codePointAt(0).toString(16).toUpperCase()}) inside math`));
    }
    if (/\\pod\b/.test(tl)) {
      out.push(issue('E-POD', at(k), tl.indexOf('\\pod') + 1, '\\pod is the amsmath "(mod ...)" macro, not parentheses'));
    }
  });

  // Environment structure.
  const opens = [...tex.matchAll(ENV_OPEN_RE)].map((m) => m[1]);
  // Two environments joined by a relation (`\\end{cases}\\Longrightarrow\\begin{cases}`)
  // render correctly; only back-to-back environments stack into one ragged column.
  if (s.kind === 'block' && /\\end\{[a-zA-Z*]+\}\s*\\begin\{/.test(tex)) {
    out.push(issue('E-ENV-CHAIN', s.line, 1, 'two environments back to back in one $$ block; split into separate blocks or join them with a relation'));
  }
  // GitHub does not treat `$...\begin{env}...$` as math at all: the whole run stays
  // literal text (verified for cases/matrix/array). \substack{a \cr b} is the portable
  // way to stack rows inside inline math or a table cell.
  if (s.kind !== 'block' && /\\begin\{/.test(tex)) {
    out.push(issue('E-ENV-INLINE', s.line, s.col,
      'a \\begin{...} environment in inline math is not recognised as math by GitHub; use \\substack{a \\cr b} or a $$ block'));
  }
  const bareBreak = hasTopLevelLineBreak(tex);
  if (bareBreak.found) {
    out.push(issue('E-TOPLEVEL-LINEBREAK', at(bareBreak.lineIndex), bareBreak.col,
      'line break \\\\ outside any environment; wrap the lines in \\begin{gathered} or \\begin{aligned}'));
  }
  if (/\\\\\s*(?:\\end\{|$)/.test(tex.trim()) || /\\\\\s*\n?\s*\\end\{/.test(tex)) {
    out.push(issue('E-TRAILING-LINEBREAK', s.endLine ?? s.line, 1, 'trailing \\\\ before \\end or the closing $$ renders an empty row'));
  }
  if (/\\tag\b/.test(tex)) {
    if (s.kind !== 'block') {
      out.push(issue('E-TAG-PLACE', s.line, s.col, '\\tag only works in a display $$ block'));
    } else {
      const tagCount = (tex.match(/\\tag\b/g) || []).length;
      const trailing = /\\tag\{[^}]*\}\s*$/.test(tex.trim());
      const inside = /\\tag\{[^}]*\}[\s\S]*\\end\{/.test(tex);
      if (tagCount > 1 || !trailing || inside) {
        out.push(issue('E-TAG-PLACE', s.line, 1, '\\tag must appear exactly once, after \\end{aligned}, right before the closing $$'));
      }
    }
  }
  if (opens.includes('split')) {
    out.push(issue('W-SPLIT-ENV', s.line, 1, 'prefer \\begin{aligned} over \\begin{split} for portability'));
  }
  if (s.inTable && /(^|[^\\])\|/.test(tex)) {
    out.push(issue('E-TABLE-PIPE', s.line, s.col, 'bare | inside math in a table cell splits the cell; use \\lvert ... \\rvert or \\mid'));
  }
  return Object.freeze(out);
}

function countTopLevelEnvs(tex) {
  let depth = 0;
  let top = 0;
  const re = /\\(begin|end)\{[a-zA-Z*]+\}/g;
  let m;
  while ((m = re.exec(tex)) !== null) {
    if (m[1] === 'begin') { if (depth === 0) top += 1; depth += 1; } else depth = Math.max(0, depth - 1);
  }
  return top;
}

function hasTopLevelLineBreak(tex) {
  const texLines = tex.split('\n');
  let depth = 0;
  for (let k = 0; k < texLines.length; k += 1) {
    const tl = texLines[k];
    const re = /\\(begin|end)\{[a-zA-Z*]+\}|\\\\/g;
    let m;
    while ((m = re.exec(tl)) !== null) {
      if (m[0] === '\\\\') {
        if (depth === 0) return { found: true, lineIndex: k, col: m.index + 1 };
      } else if (m[1] === 'begin') depth += 1;
      else depth = Math.max(0, depth - 1);
    }
  }
  return { found: false };
}

/**
 * Document-level lint (headings, [TOC], images, tables, whitespace).
 * @param {readonly string[]} lines
 * @param {{fileDir:string, existsSync:(p:string)=>boolean, resolve:(...p:string[])=>string}} fsLike
 * @returns {readonly Issue[]}
 */
export function lintDocument(lines, fsLike) {
  const out = [];
  let firstHeadingSeen = false;
  let lastLevel = 0;
  let inFence = null;
  let inBlock = false;
  let tableHeaderCells = null;

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const trimmed = raw.trim();
    const fence = raw.match(FENCE_RE);
    if (inFence) { if (trimmed.startsWith(inFence)) inFence = null; return; }
    if (fence) { inFence = fence[1]; return; }
    if (trimmed === '$$') { inBlock = !inBlock; return; }
    if (inBlock) return;

    if (/\t/.test(raw)) out.push(issue('W-TABS', lineNo, raw.indexOf('\t') + 1, 'tab character'));
    if (/[ \t]+$/.test(raw)) out.push(issue('W-TRAILING-WS', lineNo, raw.search(/[ \t]+$/) + 1, 'trailing whitespace'));
    if (/^\s*\[TOC\]\s*$/i.test(raw)) out.push(issue('E-TOC', lineNo, 1, '[TOC] is Typora-only and renders literally on GitHub'));
    if (/[―]/.test(raw)) out.push(issue('W-DASH', lineNo, raw.indexOf('―') + 1, 'U+2015 horizontal bar; use an em dash'));

    const h = raw.match(HEADING_RE);
    if (h) {
      const level = h[1].length;
      if (!firstHeadingSeen) {
        firstHeadingSeen = true;
        if (level !== 1) out.push(issue('E-HEADING-FIRST', lineNo, 1, 'first heading must be an H1'));
      } else if (level === 1) {
        out.push(issue('E-HEADING-MULTI-H1', lineNo, 1, 'only one H1 per file'));
      } else if (level > lastLevel + 1) {
        out.push(issue('E-HEADING-JUMP', lineNo, 1, `heading level jumps from H${lastLevel} to H${level}`));
      }
      if (/\$/.test(h[2])) out.push(issue('W-HEADING-MATH', lineNo, 1, 'math inside a heading breaks anchors and the TOC'));
      lastLevel = level;
    }

    // Images: markdown and <img>.
    const imgRefs = [...raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g), ...raw.matchAll(/<img\b[^>]*\bsrc\s*=\s*"?([^"\s>]+)"?/gi)];
    imgRefs.forEach((m) => {
      const p = m[1];
      if (/^https?:/.test(p)) return;
      if (!fsLike.existsSync(fsLike.resolve(fsLike.fileDir, p))) {
        out.push(issue('E-IMG-MISSING', lineNo, m.index + 1, `image not found: ${p}`));
      }
    });
    if (/<img\b[^>]*\b(height|width)\s*=\s*"?\d+px/i.test(raw)) {
      out.push(issue('W-IMG-PX', lineNo, 1, 'height/width attributes take a bare number, not "200px"'));
    }
    if (/<(div|img)\b[^>]*=\s*[^"'\s>]/i.test(raw) && /<(div|img)\b/.test(raw) && /\b\w+\s*=\s*[^"'\s]/.test(raw.replace(/"[^"]*"/g, ''))) {
      out.push(issue('W-HTML-UNQUOTED', lineNo, 1, 'HTML attribute value should be quoted'));
    }

    // Indented code: 4+ spaces after a blank line, outside lists.
    if (/^ {4,}\S/.test(raw) && i > 0 && lines[i - 1].trim() === '' && !LIST_ITEM_RE.test(raw)) {
      const prevIsList = lines.slice(0, i).reverse().find((l) => l.trim() !== '');
      if (!(prevIsList && LIST_ITEM_RE.test(prevIsList))) {
        out.push(issue('W-INDENTED-CODE', lineNo, 1, 'line indented 4+ spaces after a blank line becomes a code block'));
      }
    }

    // Tables: ragged rows.
    if (TABLE_ROW_RE.test(raw)) {
      const cells = splitTableRow(raw);
      if (TABLE_SEP_RE.test(raw)) {
        tableHeaderCells = cells.length;
      } else if (tableHeaderCells !== null && lines[i - 1] && TABLE_ROW_RE.test(lines[i - 1])) {
        if (cells.length !== tableHeaderCells) {
          out.push(issue('E-TABLE-RAGGED', lineNo, 1, `table row has ${cells.length} cells, header has ${tableHeaderCells}`));
        }
      }
    } else {
      tableHeaderCells = null;
    }
  });
  return Object.freeze(out);
}

function splitTableRow(raw) {
  const inner = raw.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split(/(?<!\\)\|/);
}
