import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractPhrases, buildCatalog, run, unescapeString } from '../src/extract.mjs';
import { DEFAULTS } from '../src/config.mjs';

function project(files) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'plainlate-'));
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(cwd, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return { ...DEFAULTS, cwd, langs: ['pl'] };
}

test('finds double, single and backtick strings', () => {
  const cfg = project({
    'src/App.jsx': `
      <h1>{T("Hello")}</h1>
      <p>{T('World')}</p>
      <b>{T(\`Don't do "this"\`)}</b>
    `,
  });
  const { phrases } = extractPhrases(cfg);
  assert.deepEqual([...phrases].sort(), ['Don\'t do "this"', 'Hello', 'World']);
});

test('ignores look-alikes: obj.T(, split(, format(', () => {
  const cfg = project({
    'src/a.js': `obj.T("no"); x.split("no"); format("no"); const y = T("yes");`,
  });
  assert.deepEqual([...extractPhrases(cfg).phrases], ['yes']);
});

test('warns about non-literal calls and templates with ${}', () => {
  const cfg = project({ 'src/a.js': 'T(name); T(`Hi ${name}`); T("ok");' });
  const { phrases, warnings } = extractPhrases(cfg);
  assert.deepEqual([...phrases], ['ok']);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /2 T\(\) call/);
});

test('custom function name is supported and escaped', () => {
  const cfg = { ...project({ 'src/a.js': 't("lower"); T("upper"); $t("dollar");' }), fn: '$t' };
  assert.deepEqual([...extractPhrases(cfg).phrases], ['dollar']);
});

test('skips node_modules and the output folder', () => {
  const cfg = project({
    'src/a.js': 'T("keep")',
    'src/node_modules/x.js': 'T("skip")',
    'src/locales/leftover.js': 'T("skip too")',
  });
  assert.deepEqual([...extractPhrases(cfg).phrases], ['keep']);
});

test('unescapeString handles common escapes', () => {
  assert.equal(unescapeString('a\\nb\\tc\\\'d'), "a\nb\tc'd");
  assert.equal(unescapeString('z\\u0105'), 'zą');
});

test('buildCatalog keeps translations and adds empty entries', () => {
  const { catalog, untranslated } = buildCatalog({ Save: 'Zapisz' }, new Set(['Save', 'Cancel']));
  assert.deepEqual(catalog, { Cancel: '', Save: 'Zapisz' });
  assert.deepEqual(untranslated, ['Cancel']);
});

test('buildCatalog never deletes: removed phrases move to __unused and come back', () => {
  const first = buildCatalog({ Old: 'Stare', Save: 'Zapisz' }, new Set(['Save']));
  assert.deepEqual(first.catalog.__unused, { Old: 'Stare' });
  assert.equal(first.unusedCount, 1);

  const back = buildCatalog(first.catalog, new Set(['Save', 'Old']));
  assert.equal(back.catalog.Old, 'Stare');
  assert.equal(back.catalog.__unused, undefined);
});

test('buildCatalog drops untranslated removed phrases (nothing to lose)', () => {
  const { catalog } = buildCatalog({ Gone: '', Save: 'Zapisz' }, new Set(['Save']));
  assert.deepEqual(catalog, { Save: 'Zapisz' });
});

test('run writes files and is idempotent; --check detects drift', () => {
  const cfg = project({ 'src/a.js': 'T("One"); T("Two");' });
  const first = run(cfg);
  assert.equal(first.phrases, 2);
  assert.equal(first.ok, false); // empty translations

  const file = path.join(cfg.cwd, 'src/locales/pl.json');
  fs.writeFileSync(file, JSON.stringify({ One: 'Jeden', Two: 'Dwa' }, null, 2) + '\n');

  assert.equal(run(cfg, { check: true }).ok, true);

  fs.appendFileSync(path.join(cfg.cwd, 'src/a.js'), 'T("Three");');
  const drift = run(cfg, { check: true });
  assert.equal(drift.ok, false);
  assert.equal(fs.readFileSync(file, 'utf8').includes('Three'), false); // check wrote nothing
});

test('run refuses to overwrite a corrupt JSON file', () => {
  const cfg = project({ 'src/a.js': 'T("One")', 'src/locales/pl.json': '{ broken' });
  assert.throws(() => run(cfg), /Could not parse/);
  assert.equal(fs.readFileSync(path.join(cfg.cwd, 'src/locales/pl.json'), 'utf8'), '{ broken');
});
