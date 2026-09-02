#!/usr/bin/env node
// Check every equation in the notes for portability across GitHub (MathJax 3),
// VS Code (KaTeX) and Typora, plus a Markdown structure lint.
//
//   node scripts/check-math.mjs                 # every notes/*.md
//   node scripts/check-math.mjs notes/part-4-laplace-transform.md
//   node scripts/check-math.mjs --json          # machine-readable output
//   node scripts/check-math.mjs --summary       # rule counts only
//
// Exit status 1 when any E-* issue is found.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { extractMarkdown, lintSnippet, lintDocument } from './lib/extract.mjs';
import { compileKatex, compileMathjax } from './lib/compile.mjs';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

export function defaultFiles(root = ROOT) {
  return ['notes']
    .filter((d) => existsSync(join(root, d)))
    .flatMap((d) => readdirSync(join(root, d)).filter((f) => f.endsWith('.md')).sort().map((f) => join(root, d, f)));
}

/**
 * Check one file. Returns frozen issue list (rule, line, col, msg, file).
 */
export function checkFile(file) {
  const src = readFileSync(file, 'utf8');
  const { snippets, issues, lines } = extractMarkdown(src);
  const fileDir = dirname(file);
  const docIssues = lintDocument(lines, { fileDir, existsSync, resolve });
  const snippetIssues = snippets.flatMap((s) => {
    const structural = lintSnippet(s);
    const katex = compileKatex(s.tex, s.display);
    const mathjax = compileMathjax(s.tex, s.display);
    const at = (rule, msg) => ({ rule, line: s.line, col: s.col, msg: `${msg}  [${s.tex.slice(0, 60).replace(/\n/g, ' ')}${s.tex.length > 60 ? '…' : ''}]` });
    return [
      ...structural,
      ...katex.errors.map((m) => at('E-KATEX', m)),
      ...katex.warnings.map((w) => at(w.fatal ? `E-KATEX-${w.code}` : `W-KATEX-${w.code}`, w.msg)),
      ...mathjax.errors.map((m) => at('E-MATHJAX', m)),
    ];
  });
  const all = [...issues, ...docIssues, ...snippetIssues]
    .map((i) => Object.freeze({ ...i, file }))
    .sort((a, b) => a.line - b.line || a.col - b.col);
  return Object.freeze({ file, issues: Object.freeze(all), snippetCount: snippets.length });
}

function main() {
  const { values, positionals } = parseArgs({
    options: { json: { type: 'boolean' }, summary: { type: 'boolean' } },
    allowPositionals: true,
  });
  const files = positionals.length ? positionals.map((p) => resolve(p)) : defaultFiles();
  const results = files.map(checkFile);
  const allIssues = results.flatMap((r) => r.issues);
  const errors = allIssues.filter((i) => i.rule.startsWith('E-'));

  if (values.json) {
    process.stdout.write(`${JSON.stringify(results.map((r) => ({ ...r, file: relative(ROOT, r.file) })), null, 2)}\n`);
  } else {
    if (!values.summary) {
      allIssues.forEach((i) => {
        process.stdout.write(`${relative(ROOT, i.file)}:${i.line}:${i.col} ${i.rule.padEnd(24)} ${i.msg}\n`);
      });
    }
    const counts = allIssues.reduce((acc, i) => ({ ...acc, [i.rule]: (acc[i.rule] ?? 0) + 1 }), {});
    process.stdout.write('\n== summary ==\n');
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).forEach(([rule, n]) => {
      process.stdout.write(`${rule.padEnd(28)} ${n}\n`);
    });
    results.forEach((r) => {
      const e = r.issues.filter((i) => i.rule.startsWith('E-')).length;
      const w = r.issues.length - e;
      process.stdout.write(`${relative(ROOT, r.file).padEnd(52)} ${String(r.snippetCount).padStart(4)} snippets ${String(e).padStart(4)} errors ${String(w).padStart(4)} warnings\n`);
    });
    process.stdout.write(`total: ${allIssues.length} issues, ${errors.length} errors in ${files.length} files\n`);
  }
  process.exit(errors.length ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main();
}
