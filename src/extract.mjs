import fs from 'node:fs';
import path from 'node:path';

// A string literal: "...", '...' or `...` (templates without ${...}).
const STRING = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\$]|\\.)*)`/.source;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildPatterns(fn) {
  const name = escapeRe(fn);
  return {
    // T("..."), T('...'), T(`...`)  — but not obj.T( or split(
    literal: new RegExp(String.raw`(?<![\w$.])${name}\(\s*(?:${STRING})`, 'g'),
    // any call to T(, used to warn about calls we could not read
    call: new RegExp(String.raw`(?<![\w$.])${name}\(`, 'g'),
  };
}

export function unescapeString(s) {
  return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, c) => {
    if (c.length > 1) return String.fromCharCode(parseInt(c.slice(1), 16));
    if (c === 'n') return '\n';
    if (c === 't') return '\t';
    if (c === 'r') return '\r';
    return c;
  });
}

function* walk(dir, config, outDir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (config.ignore.includes(entry.name) || path.resolve(full) === outDir) continue;
      yield* walk(full, config, outDir);
    } else if (config.extensions.includes(path.extname(entry.name))) {
      yield full;
    }
  }
}

/** Scan source files and collect every literal phrase passed to fn(). */
export function extractPhrases(config) {
  const srcDir = path.resolve(config.cwd, config.src);
  const outDir = path.resolve(config.cwd, config.out);
  const { literal, call } = buildPatterns(config.fn);

  const phrases = new Set();
  const warnings = [];
  let files = 0;

  for (const file of walk(srcDir, config, outDir)) {
    files++;
    const code = fs.readFileSync(file, 'utf8');
    const matches = [...code.matchAll(literal)];
    for (const m of matches) {
      const text = unescapeString(m[1] ?? m[2] ?? m[3]);
      if (text.trim()) phrases.add(text);
    }
    const total = [...code.matchAll(call)].length;
    if (total > matches.length) {
      warnings.push(
        `${path.relative(config.cwd, file)}: ${total - matches.length} ${config.fn}() call(s) not extracted ` +
          `(non-literal argument or template with \${})`,
      );
    }
  }
  return { phrases, warnings, files };
}

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

/**
 * Merge found phrases into an existing catalog without ever losing a translation:
 *  - existing translation is kept
 *  - a translation that sits in the unused section is restored if the phrase returns
 *  - translated phrases that vanished from the code move to the unused section
 */
export function buildCatalog(old, found, unusedKey = '__unused') {
  const prevUnused = isObject(old[unusedKey]) ? old[unusedKey] : {};
  const catalog = {};

  for (const key of [...found].sort()) {
    const current = typeof old[key] === 'string' ? old[key] : '';
    catalog[key] = current || prevUnused[key] || '';
  }

  const unused = {};
  for (const source of [prevUnused, old]) {
    for (const [key, value] of Object.entries(source)) {
      if (key === unusedKey || found.has(key)) continue;
      if (typeof value === 'string' && value) unused[key] = value;
    }
  }
  const unusedSorted = Object.fromEntries(Object.entries(unused).sort(([a], [b]) => (a < b ? -1 : 1)));
  if (Object.keys(unusedSorted).length) catalog[unusedKey] = unusedSorted;

  const untranslated = [...found].filter((k) => !catalog[k]);
  return { catalog, untranslated, unusedCount: Object.keys(unusedSorted).length };
}

/** Full extract run: scan, merge, write (or just compare with { check: true }). */
export function run(config, { check = false } = {}) {
  const { phrases, warnings, files } = extractPhrases(config);
  const outDir = path.resolve(config.cwd, config.out);
  if (!check) fs.mkdirSync(outDir, { recursive: true });

  const langs = [];
  for (const lang of config.langs) {
    const file = path.join(outDir, `${lang}.json`);
    let oldText = '';
    let old = {};
    if (fs.existsSync(file)) {
      oldText = fs.readFileSync(file, 'utf8');
      try {
        old = JSON.parse(oldText);
      } catch (err) {
        throw new Error(`Could not parse ${file}: ${err.message}\nFix or delete it, nothing was overwritten.`);
      }
    }
    const { catalog, untranslated, unusedCount } = buildCatalog(old, phrases, config.unusedKey);
    const text = JSON.stringify(catalog, null, 2) + '\n';
    const changed = text !== oldText;
    if (!check && changed) fs.writeFileSync(file, text);
    langs.push({ lang, file, untranslated, unusedCount, changed });
  }

  const ok = langs.every((l) => l.untranslated.length === 0 && !(check && l.changed));
  return { phrases: phrases.size, files, warnings, langs, ok };
}
