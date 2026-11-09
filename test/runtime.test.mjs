import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createT, interpolate } from '../src/index.js';

const pl = { Save: 'Zapisz', 'Hello, {name}': 'Witaj, {name}!', Empty: '' };

test('translates, falls back on missing or empty', () => {
  const T = createT({ pl }, 'pl');
  assert.equal(T('Save'), 'Zapisz');
  assert.equal(T('Missing'), 'Missing');
  assert.equal(T('Empty'), 'Empty');
});

test('unknown language returns the original text', () => {
  assert.equal(createT({ pl }, 'de')('Save'), 'Save');
});

test('placeholders work, also in the fallback', () => {
  const T = createT({ pl }, 'pl');
  assert.equal(T('Hello, {name}', { name: 'Anna' }), 'Witaj, Anna!');
  assert.equal(createT({}, 'en')('Hi {n}', { n: 3 }), 'Hi 3');
  assert.equal(interpolate('Hi {x}', {}), 'Hi {x}');
});

test('lang can be a function', () => {
  let lang = 'en';
  const T = createT({ pl }, () => lang);
  assert.equal(T('Save'), 'Save');
  lang = 'pl';
  assert.equal(T('Save'), 'Zapisz');
});

test('the __unused section is never returned as a translation', () => {
  const T = createT({ pl: { __unused: { a: 'b' } } }, 'pl');
  assert.equal(T('__unused'), '__unused');
});
