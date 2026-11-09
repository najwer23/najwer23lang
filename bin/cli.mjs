#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, CONFIG_FILE } from '../src/config.mjs';
import { run } from '../src/extract.mjs';

const HELP = `najwer23lang — extract T("...") phrases into translation JSON files

Usage:
  najwer23lang [extract]        scan the source folder and update the JSON files
  najwer23lang --check          change nothing; exit 1 if files are out of date or have empty translations
  najwer23lang init             create ${CONFIG_FILE}

Options:
  -c, --config <file>        use a specific config file
  -h, --help                 show this help
  -v, --version              show version
`;

const args = process.argv.slice(2);
const flag = (...names) => args.some((a) => names.includes(a));
const value = (...names) => {
  const i = args.findIndex((a) => names.includes(a));
  return i >= 0 ? args[i + 1] : undefined;
};

const c = process.stdout.isTTY
  ? { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', off: '\x1b[0m' }
  : { red: '', green: '', yellow: '', dim: '', off: '' };

try {
  if (flag('-h', '--help')) {
    console.log(HELP);
  } else if (flag('-v', '--version')) {
    const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    console.log(pkg.version);
  } else if (args[0] === 'init') {
    init();
  } else {
    extract();
  }
} catch (err) {
  console.error(`${c.red}error${c.off} ${err.message}`);
  process.exit(2);
}

function init() {
  const file = path.join(process.cwd(), CONFIG_FILE);
  if (fs.existsSync(file)) throw new Error(`${CONFIG_FILE} already exists.`);
  const config = { src: 'src', out: 'src/locales', langs: ['pl'], fn: 'T' };
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
  console.log(`Created ${CONFIG_FILE}. Edit "langs", then run: npx najwer23lang`);
}

function extract() {
  const check = flag('--check');
  const config = loadConfig(process.cwd(), value('-c', '--config'));
  const result = run(config, { check });

  for (const w of result.warnings) console.warn(`${c.yellow}warn${c.off}  ${w}`);

  console.log(`${result.phrases} phrase(s) in ${result.files} file(s)`);
  for (const l of result.langs) {
    const parts = [];
    parts.push(l.untranslated.length ? `${c.red}${l.untranslated.length} untranslated${c.off}` : `${c.green}complete${c.off}`);
    if (l.unusedCount) parts.push(`${l.unusedCount} unused kept in ${config.unusedKey}`);
    if (check && l.changed) parts.push(`${c.yellow}out of date${c.off}`);
    console.log(`  ${l.lang}  ${parts.join(', ')} ${c.dim}${path.relative(process.cwd(), l.file)}${c.off}`);
  }

  if (check && !result.ok) {
    console.error(`${c.red}check failed${c.off} run "najwer23lang" and fill in the empty translations`);
    process.exit(1);
  }
}
