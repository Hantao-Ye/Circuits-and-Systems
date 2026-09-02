import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractMarkdown, lintSnippet, lintDocument } from './lib/extract.mjs';
import { combineSources } from './build.mjs';
import { compileKatex, compileMathjax } from './lib/compile.mjs';

const rules = (issues) => issues.map((i) => i.rule);
const lintAll = (md) => {
  const { snippets, issues } = extractMarkdown(md);
  return [...issues, ...snippets.flatMap(lintSnippet)];
};
const fsOk = { fileDir: '/x', existsSync: (p) => p.endsWith('ok.png'), resolve: (...p) => p.join('/') };

test('good document produces no issues', () => {
  const md = [
    '# Chapter 1: Signals', '', 'Inline $x(t)=e^{t}$ and $a_1$.', '',
    '$$', '\\begin{aligned}', 'x &= y\\\\', 'z &= w', '\\end{aligned}\\tag{1}', '$$', '',
    '$$', '\\begin{gathered}', 'a=1\\\\', 'b=2', '\\end{gathered}', '$$', '',
    '| Signal | Transform |', '| :--: | :--: |', '| $x(at)$ | $\\frac{1}{\\lvert a\\rvert}X(\\frac{s}{a})$ |', '',
    '<div align="center"><img src="../assets/ok.png" alt="fig" height="200"></div>', '',
    '## 1.1 Next', '', 'Done.', '',
  ].join('\n');
  const { snippets, issues, lines } = extractMarkdown(md);
  assert.equal(snippets.length, 6);
  assert.deepEqual(issues, []);
  assert.deepEqual(snippets.flatMap(lintSnippet), []);
  assert.deepEqual(lintDocument(lines, fsOk), []);
  snippets.forEach((s) => {
    assert.deepEqual(compileKatex(s.tex, s.display).errors, []);
    assert.deepEqual(compileMathjax(s.tex, s.display).errors, []);
  });
});

test('display block extraction keeps line numbers and body', () => {
  const { snippets } = extractMarkdown('a\n\n$$\nx=1\n$$\n');
  assert.equal(snippets[0].line, 4);
  assert.equal(snippets[0].tex, 'x=1');
  assert.equal(snippets[0].kind, 'block');
});

const cases = [
  ['E-BS-PUNCT', 'Inline $\\{x\\}$'],
  ['E-BS-PUNCT', '$a\\;b$'],
  ['E-BS-PUNCT', '| a | $\\|x\\|$ |\n| :-: | :-: |\n| b | c |'],
  ['E-LINEBREAK-MIDLINE', '$$\n\\begin{aligned}\na&=b\\\\[2ex]\nc&=d\n\\end{aligned}\n$$'],
  ['E-TOPLEVEL-LINEBREAK', '$$\na=b\\\\\nc=d\n$$'],
  ['E-TRAILING-LINEBREAK', '$$\n\\begin{aligned}\na&=b\\\\\n\\end{aligned}\n$$'],
  ['E-ENV-CHAIN', '$$\n\\begin{aligned}\na&=b\n\\end{aligned}\n\\begin{aligned}\nc&=d\n\\end{aligned}\n$$'],
  ['E-TAG-PLACE', '$x\\tag{1}$'],
  ['E-TAG-PLACE', '$$\n\\begin{aligned}\na&=b\\tag{1}\n\\end{aligned}\n$$'],
  ['E-POD', '$\\pod{z-z_r}$'],
  ['E-NONASCII-MATH', '$\\phi(\\omega）$'],
  ['E-INLINE-SPACE', 'see $ x $ here'],
  ['E-INLINE-DIGIT', 'costs $x$5 now'],
  ['E-INLINE-DOUBLE', '- Addition: $$z[n]=x[n]+y[n]$$'],
  ['E-DOLLAR-UNBALANCED', 'lonely $x here'],
  ['E-BLOCK-INDENT', '- item\n\n  $$\n  x=1\n  $$\n'],
  ['E-BLOCK-NOBLANK', 'text\n$$\nx=1\n$$\n'],
  ['E-BLOCK-NOBLANK', '$$\nx=1\n$$\ntext\n'],
  ['E-BLOCK-IN-QUOTE', '> $$\n> x\n> $$'],
  ['E-BLOCK-UNCLOSED', '$$\nx=1\n'],
  ['E-TABLE-PIPE', '| a | b |\n| :-: | :-: |\n| $|x|$ | c |'],
  ['W-SPLIT-ENV', '$$\n\\begin{split}\na&=b\\\\\nc&=d\n\\end{split}\n$$'],
];
for (const [rule, md] of cases) {
  test(`${rule} is reported for ${JSON.stringify(md).slice(0, 50)}`, () => {
    assert.ok(rules(lintAll(md)).includes(rule), `expected ${rule}, got ${rules(lintAll(md))}`);
  });
}

test('valid line breaks inside aligned are not flagged', () => {
  const md = '$$\n\\begin{aligned}\na&=b\\\\\nc&=d\n\\end{aligned}\n$$';
  assert.deepEqual(lintAll(md), []);
});

test('a piecewise table cell needs \\substack, not cases with \\cr', () => {
  const bad = '| a | b |\n| :-: | :-: |\n| $\\begin{cases}1\\\\0\\end{cases}$ | c |';
  assert.ok(rules(lintAll(bad)).includes('E-LINEBREAK-MIDLINE'));
  // \cr survives the escape pass, but GitHub still refuses to treat the cell as math
  const withCr = '| a | b |\n| :-: | :-: |\n| $\\begin{cases}1\\cr 0\\end{cases}$ | c |';
  assert.deepEqual(rules(lintAll(withCr)), ['E-ENV-INLINE']);
  const good = '| a | b |\n| :-: | :-: |\n| $\\substack{1\\cr 0}$ | c |';
  assert.deepEqual(lintAll(good), []);
  assert.deepEqual(compileKatex('\\substack{1\\cr 0}', false).errors, []);
  assert.deepEqual(compileMathjax('\\substack{1\\cr 0}', false).errors, []);
});

test('inline code is skipped', () => {
  assert.deepEqual(lintAll('use `$HOME` and `a $ b`'), []);
});

const docCases = [
  ['E-TOC', '# T\n\n[TOC]\n'],
  ['E-HEADING-FIRST', '## T\n'],
  ['E-HEADING-MULTI-H1', '# A\n\n# B\n'],
  ['E-HEADING-JUMP', '# A\n\n### C\n'],
  ['E-IMG-MISSING', '# A\n\n![x](../assets/missing.png)\n'],
  ['E-IMG-MISSING', '# A\n\n<div align="center"><img src="../assets/missing.png"></div>\n'],
  ['E-TABLE-RAGGED', '# A\n\n| a | b | c |\n| :-: | :-: | :-: |\n| 1 | 2 |\n'],
  ['W-IMG-PX', '# A\n\n<img height="200px" src="../assets/ok.png">\n'],
  ['W-HTML-UNQUOTED', '# A\n\n<div align = center><img src = "../assets/ok.png"></div>\n'],
  ['W-INDENTED-CODE', '# A\n\ntext\n\n        E.g. noise\n'],
  ['W-HEADING-MATH', '# A\n\n## $H(s)$ Poles\n'],
  ['W-TRAILING-WS', '# A\n\ntext   \n'],
  ['W-TABS', '# A\n\n\ttext\n'],
  ['W-DASH', '# A\n\nleft ― right\n'],
];
for (const [rule, md] of docCases) {
  test(`${rule} is reported by lintDocument`, () => {
    const got = rules(lintDocument(md.split('\n'), fsOk));
    assert.ok(got.includes(rule), `expected ${rule}, got ${got}`);
  });
}

test('compilers reject unknown macros', () => {
  assert.ok(compileKatex('\\foo', false).errors.length > 0);
  assert.ok(compileMathjax('\\foo', false).errors.length > 0);
});

test('KaTeX top-level newline in display mode is a fatal warning', () => {
  const r = compileKatex('a\\\\b', true);
  assert.ok(r.warnings.some((w) => w.code === 'newLineInDisplayMode' && w.fatal));
});

// GitHub renderer behaviour below was verified with `gh api /markdown` (mode=gfm) on 2026-09-02.

test('E-LT-GT fires on inline math only; $$ blocks keep bare < and >', () => {
  assert.ok(rules(lintAll('energy $0<E<\\infty$')).includes('E-LT-GT'));
  assert.ok(rules(lintAll('roc $s>0$')).includes('E-LT-GT'));
  assert.ok(rules(lintAll('| a | b |\n| :-: | :-: |\n| $s>0$ | c |')).includes('E-LT-GT'));
  // inline: `$s>0$` reaches the page as `$s&gt;0$`; display: the DOM decodes it back to `>`
  assert.deepEqual(lintAll('$$\n\\begin{cases}\na\\qquad V>0\\\\\nb\\qquad V<0\n\\end{cases}\n$$'), []);
  assert.deepEqual(lintAll('energy $0\\lt E\\lt\\infty$'), []);
  assert.deepEqual(compileKatex('0\\lt E\\lt\\infty', false).errors, []);
  assert.deepEqual(compileMathjax('0\\lt E\\lt\\infty', false).errors, []);
});

test('E-ENV-INLINE: \\begin{...} in inline math is not math on GitHub', () => {
  assert.ok(rules(lintAll('x $\\begin{cases}1\\cr 0\\end{cases}$ y')).includes('E-ENV-INLINE'));
  assert.ok(rules(lintAll('| a | b |\n| :-: | :-: |\n| $\\begin{matrix}1\\cr2\\end{matrix}$ | c |')).includes('E-ENV-INLINE'));
  // \substack is the portable stand-in and renders in both engines
  const sub = '\\substack{1\\quad t\\lt T\\cr 0\\quad t\\gt T}';
  assert.deepEqual(lintAll(`x $${sub}$ y`), []);
  assert.deepEqual(compileKatex(sub, false).errors, []);
  assert.deepEqual(compileMathjax(sub, false).errors, []);
  // a $$ block may use environments freely
  assert.deepEqual(lintAll('$$\n\\begin{cases}\n1\n\\end{cases}\n$$'), []);
});

test('E-MATH-ASTERISK: * in inline math is eaten by the emphasis pass', () => {
  assert.ok(rules(lintAll('conjugate $X^*(s^*)$ here')).includes('E-MATH-ASTERISK'));
  assert.ok(rules(lintAll('convolution $x(t)*y(t)$ here')).includes('E-MATH-ASTERISK'));
  assert.deepEqual(lintAll('conjugate $X^\\ast(s^\\ast)$ here'), []);
  assert.deepEqual(compileKatex('X^\\ast(s^\\ast)', false).errors, []);
  assert.deepEqual(compileMathjax('x(t)\\ast y(t)', false).errors, []);
});

test('E-ENV-CHAIN only fires for back-to-back environments', () => {
  const adjacent = '$$\n\\begin{aligned}\na&=b\n\\end{aligned}\n\\begin{aligned}\nc&=d\n\\end{aligned}\n$$';
  const joined = '$$\n\\begin{cases}\na\n\\end{cases}\\Longrightarrow\n\\begin{cases}\nb\n\\end{cases}\n$$';
  assert.ok(rules(lintAll(adjacent)).includes('E-ENV-CHAIN'));
  assert.deepEqual(lintAll(joined), []);
});

test('combineSources demotes every heading under one H1', () => {
  const combined = combineSources(['# Part I\n\n## 1-1 A\n\ntext\n', '# Part II\n\n## 2-1 B\n'], 'Overview');
  assert.equal(combined.split('\n')[0], '# Overview');
  assert.deepEqual(combined.match(/^#{1,6} .*$/gm), ['# Overview', '## Part I', '### 1-1 A', '## Part II', '### 2-1 B']);
  assert.equal((combined.match(/^# /gm) || []).length, 1);
});

test('combineSources leaves body text and $$ blocks untouched', () => {
  const body = '# Part I\n\n$$\nx=1\n$$\n\n#hashtag not a heading\n';
  assert.ok(combineSources([body]).includes('$$\nx=1\n$$'));
  assert.ok(combineSources([body]).includes('#hashtag not a heading'));
});
