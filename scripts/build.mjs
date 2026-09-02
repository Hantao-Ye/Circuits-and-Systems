#!/usr/bin/env node
// build.mjs — render the Markdown notes to standalone HTML (and PDF).
//
// Usage:
//   node scripts/build.mjs --html                 # every notes/*.md -> build/html/ + the combined overview
//   node scripts/build.mjs --html --pdf           # ...and print each page to pdf/<name>.pdf via Chromium
//   node scripts/build.mjs --pdf notes/part-1-sinusoids-and-phasors.md   # restrict to given files
//   node scripts/build.mjs --html --out dist/site # change the HTML output directory (default build/html)
//
// Each HTML file is self-contained: GitHub markdown CSS, KaTeX CSS + woff2 fonts and every
// image are inlined as data URIs. A table of contents (h2/h3) is inserted after the first H1
// (a Typora `[TOC]` paragraph, if present, is replaced by it).
//
// KaTeX parse errors do not abort the run: they are reported as `file: message`, the offending
// expression is rendered as a red `.katex-error` span, and the process exits non-zero at the end.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import MarkdownIt from 'markdown-it';
import anchorPlugin from 'markdown-it-anchor';
import katexModule from '@vscode/markdown-it-katex';
import katex from 'katex';
import { buildStylesheet, wrapDocument } from './lib/html-template.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIRS = ['notes'];
const CHROMIUM = process.env.CHROMIUM ?? '/usr/bin/chromium-browser';
const MIME_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
// The plugin is CommonJS with `exports.default`; Node hands us the whole exports object.
const katexPlugin = katexModule.default ?? katexModule;

// ---------------------------------------------------------------- CLI
function parseCli(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      html: { type: 'boolean', default: false },
      pdf: { type: 'boolean', default: false },
      out: { type: 'string', default: 'build/html' },
    },
    allowPositionals: true,
  });
  if (!values.html && !values.pdf) {
    throw new Error('nothing to do: pass --html and/or --pdf');
  }
  return { html: values.html, pdf: values.pdf, outDir: path.resolve(ROOT, values.out), files: positionals };
}

/** Resolve the source list: explicit positionals, or every notes/*.md except README. */
function collectSources(positionals) {
  if (positionals.length > 0) {
    return positionals.map((p) => {
      const abs = path.resolve(process.cwd(), p);
      const rel = path.relative(ROOT, abs);
      if (!existsSync(abs)) throw new Error(`source file not found: ${p}`);
      if (rel.startsWith('..') || !SOURCE_DIRS.includes(rel.split(path.sep)[0]) || !rel.endsWith('.md')) {
        throw new Error(`source must be a .md file under ${SOURCE_DIRS.join('/ or ')}/: ${p}`);
      }
      return abs;
    });
  }
  return SOURCE_DIRS.flatMap((dir) =>
    readdirSync(path.join(ROOT, dir))
      .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
      .sort()
      .map((f) => path.join(ROOT, dir, f)),
  );
}

// ---------------------------------------------------------------- Markdown rendering
/** Wrap KaTeX so parse errors are recorded (via `onError`) instead of thrown or console.logged. */
function makeSafeKatex(onError) {
  return {
    renderToString(latex, options) {
      try {
        return katex.renderToString(latex, options);
      } catch (err) {
        onError(`${err.message} — in: ${latex.trim().slice(0, 80).replace(/\s+/g, ' ')}`);
        const esc = escapeHtml(latex);
        return `<span class="katex-error" title="${esc}">${esc}</span>`;
      }
    },
  };
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function createMarkdownIt(onError) {
  return new MarkdownIt({ html: true, linkify: false, typographer: false })
    .use(katexPlugin, {
      enableBareBlocks: true,
      enableFencedBlocks: true,
      throwOnError: true, // makes KaTeX throw so makeSafeKatex can report the error
      strict: 'warn',
      output: 'html',
      katex: makeSafeKatex(onError),
    })
    .use(anchorPlugin, { permalink: false });
}

/** Plain text of an inline token (math kept as its TeX source) — used for <title>. */
function plainText(inlineToken) {
  return (inlineToken?.children ?? [])
    .filter((t) => t.type === 'text' || t.type === 'code_inline' || t.type === 'math_inline')
    .map((t) => t.content)
    .join('')
    .trim();
}

/** Nested <ul class="toc"> for h2/h3 headings; heading text keeps its KaTeX rendering. */
function buildToc(md, tokens, env) {
  const headings = tokens.flatMap((t, i) =>
    t.type === 'heading_open' && (t.tag === 'h2' || t.tag === 'h3')
      ? [{ level: t.tag === 'h2' ? 2 : 3, id: t.attrGet('id'), html: md.renderer.renderInline(tokens[i + 1].children, md.options, env) }]
      : [],
  );
  if (headings.length === 0) return '';
  // Group each h2 with the h3s that follow it (leading h3s get an implicit parent).
  const groups = headings.reduce((acc, h) => {
    if (h.level === 2 || acc.length === 0) return [...acc, { parent: h.level === 2 ? h : null, children: h.level === 3 ? [h] : [] }];
    const last = acc[acc.length - 1];
    return [...acc.slice(0, -1), { ...last, children: [...last.children, h] }];
  }, []);
  const li = (h) => `<li><a href="#${h.id}">${h.html}</a>`;
  const items = groups.map(({ parent, children }) => {
    const sub = children.length ? `\n<ul>\n${children.map((c) => `${li(c)}</li>`).join('\n')}\n</ul>\n` : '';
    return parent ? `${li(parent)}${sub}</li>` : `<li>${sub}</li>`;
  });
  return `<ul class="toc">\n${items.join('\n')}\n</ul>\n`;
}

/** Render one Markdown source; returns { html, title, errors }. */
function renderMarkdown({ source, baseDir, fallbackTitle, css }) {
  const errors = [];
  const md = createMarkdownIt((msg) => errors.push(msg));
  const env = {};
  const parsed = md.parse(source, env);

  // Drop a Typora `[TOC]` paragraph (paragraph_open, inline "[TOC]", paragraph_close).
  const tocIdx = parsed.findIndex((t, i) => t.type === 'paragraph_open' && parsed[i + 1]?.content.trim() === '[TOC]');
  const tokens = tocIdx === -1 ? parsed : [...parsed.slice(0, tocIdx), ...parsed.slice(tocIdx + 3)];

  const h1Open = tokens.findIndex((t) => t.type === 'heading_open' && t.tag === 'h1');
  const title = h1Open === -1 ? fallbackTitle : plainText(tokens[h1Open + 1]);
  const splitAt = h1Open === -1 ? 0 : h1Open + 3; // after heading_close
  const body =
    md.renderer.render(tokens.slice(0, splitAt), md.options, env) +
    buildToc(md, tokens, env) +
    md.renderer.render(tokens.slice(splitAt), md.options, env);

  const html = wrapDocument({ title, body: inlineImages(body, baseDir), css });
  return { html, title, errors };
}

/** Replace every <img src="relative/path"> (markdown or raw HTML) with a base64 data URI. */
function inlineImages(html, baseDir) {
  return html.replace(/(<img\b[^>]*?\bsrc\s*=\s*)"([^"]+)"/gi, (_m, prefix, src) => {
    if (/^(data:|https?:)/i.test(src)) return `${prefix}"${src}"`;
    const imgPath = path.resolve(baseDir, src);
    const mime = MIME_TYPES[path.extname(imgPath).toLowerCase()];
    if (!mime) throw new Error(`${path.relative(ROOT, baseDir)}: unsupported image type "${src}"`);
    if (!existsSync(imgPath)) throw new Error(`${path.relative(ROOT, baseDir)}: image not found "${src}" (${imgPath})`);
    return `${prefix}"data:${mime};base64,${readFileSync(imgPath).toString('base64')}"`;
  });
}

/**
 * Concatenate the parts into one "Overview" document: every heading drops one level
 * so each part's H1 becomes an H2 under a single H1. Pure: text in, text out.
 */
export function combineSources(parts, title = 'Overview') {
  const demoted = parts.map((text) =>
    text
      .split('\n')
      .map((line) => (/^#{1,5} /.test(line) ? `#${line}` : line))
      .join('\n')
      .trim(),
  );
  return `# ${title}\n\n${demoted.join('\n\n')}\n`;
}

// ---------------------------------------------------------------- PDF
function printPdf(htmlPath, pdfPath, headerFlag = '--no-pdf-header-footer') {
  const args = [
    '--headless', '--disable-gpu', `--user-data-dir=${path.join(os.tmpdir(), 'cas-chromium-profile')}`,
    headerFlag, '--virtual-time-budget=5000', `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`,
  ];
  const result = spawnSync(CHROMIUM, args, { encoding: 'utf8', timeout: 120_000 });
  if (result.error) throw new Error(`failed to launch ${CHROMIUM}: ${result.error.message}`);
  if (result.status !== 0 || !existsSync(pdfPath)) {
    // Older Chromium spells the header/footer switch differently; retry once with the legacy flag.
    if (headerFlag === '--no-pdf-header-footer' && /no-pdf-header-footer/.test(result.stderr)) {
      return printPdf(htmlPath, pdfPath, '--print-to-pdf-no-header');
    }
    throw new Error(`chromium exited with status ${result.status} for ${htmlPath}\n${result.stderr.trim()}`);
  }
  return statSync(pdfPath).size;
}

// ---------------------------------------------------------------- main
const fmtBytes = (n) => (n >= 1 << 20 ? `${(n / (1 << 20)).toFixed(1)} MB` : `${(n / 1024).toFixed(1)} KB`);

function buildDocument({ source, baseDir, name, label, outSubdir }, { outDir, pdf }, css) {
  const started = performance.now();
  const htmlPath = path.join(outDir, outSubdir, `${name}.html`);
  const { html, errors } = renderMarkdown({ source, baseDir, fallbackTitle: name, css });
  mkdirSync(path.dirname(htmlPath), { recursive: true });
  writeFileSync(htmlPath, html);

  const pdfPath = path.join(ROOT, 'pdf', `${name}.pdf`);
  const pdfBytes = pdf ? (mkdirSync(path.dirname(pdfPath), { recursive: true }), printPdf(htmlPath, pdfPath)) : null;

  const secs = ((performance.now() - started) / 1000).toFixed(1);
  const pdfInfo = pdfBytes === null ? '' : `  pdf ${fmtBytes(pdfBytes)}`;
  console.log(`${label.padEnd(46)}  ->  html ${fmtBytes(Buffer.byteLength(html))}${pdfInfo}  ${secs}s`);
  return errors.map((e) => `${label}: ${e}`);
}

function buildOne(sourcePath, opts, css) {
  const rel = path.relative(ROOT, sourcePath);
  return buildDocument({
    source: readFileSync(sourcePath, 'utf8'),
    baseDir: path.dirname(sourcePath),
    name: path.basename(sourcePath, '.md'),
    label: rel,
    outSubdir: path.dirname(rel),
  }, opts, css);
}

function main() {
  const opts = parseCli(process.argv.slice(2));
  const sources = collectSources(opts.files);
  if (sources.length === 0) throw new Error('no markdown sources found');
  const css = buildStylesheet();
  const errors = sources.flatMap((src) => buildOne(src, opts, css));
  // With no explicit file list, also emit the combined overview the README links to.
  if (opts.files.length === 0) {
    errors.push(...buildDocument({
      source: combineSources(sources.map((f) => readFileSync(f, 'utf8'))),
      baseDir: path.join(ROOT, SOURCE_DIRS[0]),
      name: 'overview',
      label: 'overview (all parts)',
      outSubdir: SOURCE_DIRS[0],
    }, opts, css));
  }
  if (errors.length > 0) {
    console.error(`\n${errors.length} KaTeX error(s):`);
    errors.forEach((e) => console.error(`  ${e}`));
    process.exitCode = 1;
  }
}

// Only run when invoked directly; importing this module (e.g. from the tests) must be side-effect free.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(`build failed: ${err.message}`);
    process.exit(1);
  }
}
