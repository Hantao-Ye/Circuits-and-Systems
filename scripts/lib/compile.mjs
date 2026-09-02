// Compile a TeX snippet with KaTeX (VS Code / Typora) and MathJax 3 (GitHub),
// returning collected errors instead of throwing.

import { createRequire } from 'node:module';
import katex from 'katex';

const require = createRequire(import.meta.url);

// KaTeX strict-mode codes that correspond to real portability breaks.
const FATAL_KATEX_WARNINGS = new Set(['newLineInDisplayMode', 'unicodeTextInMathMode']);

/**
 * @returns {{errors: string[], warnings: {code:string, msg:string, fatal:boolean}[]}}
 */
export function compileKatex(tex, display) {
  const warnings = [];
  const errors = [];
  try {
    katex.renderToString(tex, {
      displayMode: display,
      throwOnError: true,
      trust: false,
      strict: (code, msg) => {
        warnings.push(Object.freeze({ code, msg, fatal: FATAL_KATEX_WARNINGS.has(code) }));
        return 'ignore';
      },
    });
  } catch (err) {
    errors.push(`KaTeX: ${err.message}`);
  }
  return Object.freeze({ errors: Object.freeze(errors), warnings: Object.freeze(warnings) });
}

let mathjaxState = null;

function mathjaxSetup() {
  if (mathjaxState) return mathjaxState;
  const { mathjax } = require('mathjax-full/js/mathjax.js');
  const { TeX } = require('mathjax-full/js/input/tex.js');
  const { SVG } = require('mathjax-full/js/output/svg.js');
  const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
  const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
  require('mathjax-full/js/input/tex/ams/AmsConfiguration.js');
  require('mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js');
  require('mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js');
  require('mathjax-full/js/input/tex/textmacros/TextMacrosConfiguration.js');

  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const errors = [];
  const tex = new TeX({
    packages: ['base', 'ams', 'newcommand', 'boldsymbol', 'textmacros'],
    formatError: (jax, err) => {
      errors.push(err.message);
      return jax.formatError(err);
    },
  });
  const doc = mathjax.document('', { InputJax: tex, OutputJax: new SVG({ fontCache: 'none' }) });
  mathjaxState = { doc, adaptor, errors };
  return mathjaxState;
}

/**
 * @returns {{errors: string[]}}
 */
export function compileMathjax(tex, display) {
  const state = mathjaxSetup();
  const before = state.errors.length;
  let html = '';
  try {
    const node = state.doc.convert(tex, { display });
    html = state.adaptor.outerHTML(node);
  } catch (err) {
    state.errors.push(err.message);
  }
  const fresh = state.errors.slice(before).map((m) => `MathJax: ${m}`);
  const merror = html.includes('data-mjx-error') && fresh.length === 0 ? ['MathJax: rendered an error node'] : [];
  return Object.freeze({ errors: Object.freeze([...fresh, ...merror]) });
}
