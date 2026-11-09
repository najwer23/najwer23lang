import fs from 'node:fs';
import path from 'node:path';

export const CONFIG_FILE = 'najwer23lang.config.json';

export const DEFAULTS = {
  src: 'src',
  out: 'src/locales',
  langs: [],
  fn: 'T',
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
  ignore: ['node_modules', 'locales', 'dist', 'build', 'coverage', '.git'],
  unusedKey: '__unused',
};

/**
 * Load config from (in order): an explicit path, najwer23lang.config.json,
 * or the "najwer23lang" key in package.json. Missing values fall back to DEFAULTS.
 */
export function loadConfig(cwd = process.cwd(), explicitPath) {
  let user = {};
  let source = 'defaults';

  const explicit = explicitPath && path.resolve(cwd, explicitPath);
  const rcPath = path.join(cwd, CONFIG_FILE);
  const pkgPath = path.join(cwd, 'package.json');

  if (explicit) {
    if (!fs.existsSync(explicit)) throw new Error(`Config file not found: ${explicit}`);
    user = readJson(explicit);
    source = explicit;
  } else if (fs.existsSync(rcPath)) {
    user = readJson(rcPath);
    source = rcPath;
  } else if (fs.existsSync(pkgPath)) {
    const pkg = readJson(pkgPath);
    if (pkg.najwer23lang) {
      user = pkg.najwer23lang;
      source = `${pkgPath} ("najwer23lang" key)`;
    }
  }

  const config = { ...DEFAULTS, ...user, cwd };
  validate(config, source);
  return config;
}

function validate(c, source) {
  if (!Array.isArray(c.langs) || c.langs.length === 0) {
    throw new Error(
      `No target languages configured (source: ${source}).\n` +
        `Add e.g. { "langs": ["pl", "de"] } to ${CONFIG_FILE}, or run "najwer23lang init".`,
    );
  }
  if (!c.langs.every((l) => typeof l === 'string' && /^[A-Za-z0-9_-]+$/.test(l))) {
    throw new Error('"langs" must be an array of language codes such as "pl" or "pt-BR".');
  }
  if (typeof c.fn !== 'string' || !/^[A-Za-z_$][\w$]*$/.test(c.fn)) {
    throw new Error('"fn" must be a valid JavaScript identifier, e.g. "T" or "t".');
  }
  if (!fs.existsSync(path.resolve(c.cwd, c.src))) {
    throw new Error(`Source folder not found: ${path.resolve(c.cwd, c.src)}`);
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Could not parse ${file}: ${err.message}`);
  }
}
