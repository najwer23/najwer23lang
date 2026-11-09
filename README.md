# najwer23lang

Write plain English in your code, extract every phrase to JSON, translate.

```jsx
<h1>{T('Hello, I am Mariusz')}</h1>
```

```bash
npx najwer23lang
```

```json
{ "Hello, I am Mariusz": "" }
```

Fill in the empty values and you're done. **Zero dependencies**, no Babel, no build step, and **it never deletes a translation**.

## Why

Key-based i18n libraries make you invent names (`home.hero.title`), jump between code and JSON, and clean up stale keys. With najwer23lang the English text *is* the key. You write the sentence where it is used, and a small script collects them.

- Zero dependencies (just Node 18+)
- Works with any framework; React bindings included (optional)
- Safe re-runs: edited or removed phrases move to an `__unused` section instead of vanishing
- `--check` mode for CI: fails on empty translations or stale files
- Warns about `T()` calls it cannot read (variables, `${}` templates) instead of skipping them silently
- Configurable function name (`T`, `t`, `tr`, ...)

## Install

```bash
npm install najwer23lang
```

## Quick start

**1. Create the config**

```bash
npx najwer23lang init
```

This writes `najwer23lang.config.json`:

```json
{
  "src": "src",
  "out": "src/locales",
  "langs": ["pl"],
  "fn": "T"
}
```

**2. Use `T()` in your code**

```jsx
import { useT } from 'najwer23lang/react';

function Header({ name }) {
  const T = useT();
  return (
    <header>
      <h1>{T('Welcome back, {name}!', { name })}</h1>
      <button>{T('Save')}</button>
      <p>{T(`Don't worry, it's saved automatically.`)}</p>
    </header>
  );
}
```

**3. Extract**

```bash
npx najwer23lang
```

```
3 phrase(s) in 1 file(s)
  pl  3 untranslated src/locales/pl.json
```

**4. Translate** `src/locales/pl.json`:

```json
{
  "Don't worry, it's saved automatically.": "Spokojnie, zapisuje się automatycznie.",
  "Save": "Zapisz",
  "Welcome back, {name}!": "Witaj ponownie, {name}!"
}
```

**5. Wire it up once**

```jsx
import { I18nProvider } from 'najwer23lang/react';
import pl from './locales/pl.json';

const catalogs = { pl };

root.render(
  <I18nProvider catalogs={catalogs} defaultLang="en">
    <App />
  </I18nProvider>,
);
```

Switch language anywhere:

```jsx
import { useI18n } from 'najwer23lang/react';

function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  return <button onClick={() => setLang(lang === 'en' ? 'pl' : 'en')}>{lang}</button>;
}
```

Untranslated or empty entries fall back to the original English text, so a half-translated app never shows blanks.

## Not using React?

The core is framework-agnostic:

```js
import { createT } from 'najwer23lang';
import pl from './locales/pl.json';

let lang = 'en';
const T = createT({ pl }, () => lang); // or a fixed string: createT({ pl }, 'pl')

T('Welcome back, {name}!', { name: 'Anna' });
```

Re-render your UI yourself when `lang` changes.

## CLI

| Command | What it does |
| --- | --- |
| `najwer23lang` | Scan the source folder and update the JSON files |
| `najwer23lang --check` | Write nothing. Exit code `1` if a file is out of date or has empty translations (use in CI) |
| `najwer23lang init` | Create `najwer23lang.config.json` |
| `najwer23lang -c path/to/config.json` | Use a specific config file |

Handy scripts:

```json
{
  "scripts": {
    "i18n": "najwer23lang",
    "i18n:check": "najwer23lang --check"
  }
}
```

## Configuration

Put these in `najwer23lang.config.json`, or under a `"najwer23lang"` key in `package.json`.

| Option | Default | Description |
| --- | --- | --- |
| `langs` | *(required)* | Target languages, one JSON file each (e.g. `["pl", "de"]`) |
| `src` | `"src"` | Folder to scan |
| `out` | `"src/locales"` | Where the `<lang>.json` files are written |
| `fn` | `"T"` | Name of the translate function to look for |
| `extensions` | `.js .jsx .ts .tsx .mjs .cjs` | File types to scan |
| `ignore` | `node_modules locales dist build coverage .git` | Folder names to skip |
| `unusedKey` | `"__unused"` | Section where translations of removed phrases are kept |

## How translations are protected

Each run merges the phrases found in code into the existing JSON:

| Situation | Result |
| --- | --- |
| Phrase still in code | Translation kept |
| New phrase | Added with an empty value |
| Translated phrase no longer in code (deleted, or the English was edited) | Moved to `__unused`, not deleted |
| Phrase comes back later | Translation restored from `__unused` |
| Untranslated phrase removed from code | Dropped (there was nothing to lose) |
| JSON file is corrupt | Run aborts, file is not touched |

When you edit an English sentence, the old translation shows up in `__unused`. Copy it to the new key, fix it, and delete it from `__unused` whenever you like. The runtime ignores that section.

Still commit your locale files to git. It costs nothing and gives you history.

## Rules for phrases

The extractor reads your source as text, so a few rules apply:

- **Use literal strings.** `T('Save')` works. `T(label)` and ``T(`Hi ${name}`)`` cannot be extracted (you get a warning).
- **Put variables in placeholders:** `T('Hi, {name}', { name })`.
- **Quotes:** use backticks for text containing `'` or `"`: ``T(`Don't do this`)``.
- **Mixed text and tags:** `Click <b>here</b>` should be split into separate `T()` calls, or kept as one phrase with placeholders. Word order differs between languages, so avoid gluing sentence fragments together.
- **Same word, different meaning** (e.g. the verb "Open" vs the status "Open") shares one translation. Add a distinguishing suffix if needed: `T('Open (status)')`.
- **Trailing spaces count.** `'Total: '` and `'Total:'` are different keys. Prefer `{T('Total:')} {value}`.

Tokens work too. If you prefer stable keys for long content, write `T('Project_Description')` and fill `en.json` yourself (add `"en"` to `langs`, and pass `{ en, pl }` to the provider). The extractor does not care what is inside the string.

## Limitations

- **Regex-based, not a parser.** A commented-out `T("old")` is still extracted, and a local variable named `T` would match. Pick a unique `fn` name if that is a problem.
- **No plural rules yet.** For now, use separate phrases or `Intl.PluralRules` in your own code.
- **Content from a database or API** is not in your source, so it cannot be extracted. Translate it at the source and use `T()` only for text that lives in your code.

## API

```ts
import { createT, interpolate } from 'najwer23lang';
import { I18nProvider, useT, useI18n } from 'najwer23lang/react';
import { run, extractPhrases, buildCatalog } from 'najwer23lang/extract';
```

| Export | Description |
| --- | --- |
| `createT(catalogs, lang)` | Returns `T(text, vars?)`. `lang` is a string or a function |
| `interpolate(text, vars)` | Replaces `{name}` placeholders |
| `<I18nProvider catalogs lang? defaultLang?>` | Provides `T` and language state. Pass `lang` to control it yourself |
| `useT()` | Returns `T` |
| `useI18n()` | Returns `{ lang, setLang, T }` |
| `run(config, { check? })` | Programmatic version of the CLI |

Without a provider, `useT()` returns a pass-through function, so components still render English in tests.

## Contributing

```bash
git clone https://github.com/najwer23/najwer23lang
cd najwer23lang
npm test
```

Issues and pull requests are welcome.

## License

MIT
