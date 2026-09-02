// html-template.mjs — CSS bundling and page template for scripts/build.mjs.
//
// Everything is inlined so each generated HTML file is fully self-contained:
//   * github-markdown-light.css verbatim
//   * katex.min.css with every KaTeX font replaced by a base64 woff2 data URI
//     (the woff/ttf fallbacks in each `src` list are dropped)
//   * a small layout / print stylesheet

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const EXTRA_CSS = `
.markdown-body { box-sizing: border-box; max-width: 980px; margin: 0 auto; padding: 32px; }
.toc { padding-left: 1.4em; margin: 0 0 1.5em; }
.toc ul { padding-left: 1.4em; margin: 0; }
.toc li { margin: 0.15em 0; }
.markdown-body img { max-width: 100%; }
.katex-display { overflow-x: auto; overflow-y: hidden; }
.katex-error { color: #b00020; }
@page { size: A4; margin: 18mm 15mm; }
@media print {
  .markdown-body { max-width: none; padding: 0; }
  .katex-display, table, pre, img { break-inside: avoid; }
  h1, h2, h3, h4 { break-after: avoid; }
}
`;

// Match one full KaTeX font `src` list: the woff2 entry plus its woff/ttf siblings.
const FONT_SRC_RE =
  /url\(fonts\/(KaTeX_[\w-]+)\.woff2\) format\("woff2"\)(?:,url\(fonts\/\1\.(?:woff|ttf)\) format\("[^"]+"\))*/g;

/** Return katex.min.css with all fonts inlined as base64 woff2 data URIs. */
function inlineKatexCss() {
  const cssPath = require.resolve('katex/dist/katex.min.css');
  const fontsDir = path.join(path.dirname(cssPath), 'fonts');
  const css = readFileSync(cssPath, 'utf8');
  const inlined = css.replace(FONT_SRC_RE, (_match, fontName) => {
    const fontPath = path.join(fontsDir, `${fontName}.woff2`);
    const data = readFileSync(fontPath).toString('base64');
    return `url(data:font/woff2;base64,${data}) format("woff2")`;
  });
  if (/url\(fonts\//.test(inlined)) {
    throw new Error(`katex.min.css still references external fonts after inlining (${cssPath})`);
  }
  return inlined;
}

/** Build the complete <style> payload once; callers reuse it for every page. */
export function buildStylesheet() {
  const github = readFileSync(require.resolve('github-markdown-css/github-markdown-light.css'), 'utf8');
  return [github, inlineKatexCss(), EXTRA_CSS].join('\n');
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

/** Wrap a rendered article body in a standalone HTML document. */
export function wrapDocument({ title, body, css }) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${css}</style>`,
    '</head>',
    '<body>',
    `<article class="markdown-body">\n${body}\n</article>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
