# najwer23lang

Write plain English in your code, extract every phrase to JSON, translate.

[![npm version](https://img.shields.io/npm/v/najwer23lang.svg?style=for-the-badge)](https://www.npmjs.com/package/najwer23lang)
[![npm downloads](https://img.shields.io/npm/dm/najwer23lang?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/najwer23lang)


**Storybook:** https://najwer23.github.io/najwer23lang  
**Github:** https://github.com/najwer23/najwer23lang  
**NPM:** https://www.npmjs.com/search?q=najwer23lang

```jsx
export const Hero = () => <h1>{T('Hello, I am Mariusz')}</h1>;
```

```bash
npx najwer23lang
```

```json
{ "Hello, I am Mariusz": "" }
```

Fill in the empty values and you're done. **Zero dependencies**, no Babel, no build step, and **translations you wrote are never deleted**.

## Why

Key-based setups usually mean inventing names (`home.hero.title`), jumping between code and JSON, and cleaning up stale keys. With najwer23lang the English text _is_ the key. You write the sentence where it is used, and a small script collects them.

- Zero dependencies (Node 18 or newer; the tests pass on Node 18 and 22)
- Framework-agnostic core and extractor; React bindings included (optional)
- Safe re-runs: translated phrases that are edited or removed move to an `__unused` section instead of vanishing
- `--check` mode for CI: fails on empty translations or stale files
- Warns about `T()` calls with a variable or a `${}` template, which it cannot extract
- Configurable function name (`T`, `t`, `tr`, ...)

## How it compares

najwer23lang is a small, dependency-free tool for small projects. It is not a replacement for mature libraries.

|                              | najwer23lang     | Lingui             | i18next              |
| ---------------------------- | ---------------- | ------------------ | -------------------- |
| English text as key          | yes              | yes                | optional             |
| Extracts phrases to JSON     | yes (regex)      | yes (parser)       | via `i18next-parser` |
| Keeps removed translations   | yes (`__unused`) | yes (obsolete)     | depends on settings  |
| Plurals, rich text with tags | no               | yes                | yes                  |
| Dependencies / build step    | none / none      | CLI + macro plugin | several / none       |

Choose Lingui or i18next for plural-heavy languages, tags inside sentences, or translation platforms. Choose najwer23lang if you want a tiny, readable setup.

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

An empty or missing translation falls back to the key itself. With English phrases as keys, that is the English sentence. With tokens (see [Tokens](#tokens)), you also need an `en.json`, otherwise the raw token is shown.

## Not using React?

The core does not depend on React:

```js
import { createT } from 'najwer23lang';
import pl from './locales/pl.json';

let lang = 'en';
const T = createT({ pl }, () => lang); // or a fixed string: createT({ pl }, 'pl')

T('Welcome back, {name}!', { name: 'Anna' });
```

Re-render your UI yourself when `lang` changes. The extractor scans `.js .jsx .ts .tsx .mjs .cjs` files by default; add other extensions (for example `.vue`) in the config.

## CLI

| Command                               | What it does                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `najwer23lang`                        | Scan the source folder and update the JSON files                                            |
| `najwer23lang --check`                | Write nothing. Exit code `1` if a file is out of date or has empty translations (use in CI) |
| `najwer23lang init`                   | Create `najwer23lang.config.json`                                                           |
| `najwer23lang -c path/to/config.json` | Use a specific config file                                                                  |

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

| Option       | Default                                         | Description                                                |
| ------------ | ----------------------------------------------- | ---------------------------------------------------------- |
| `langs`      | _(required)_                                    | Target languages, one JSON file each (e.g. `["pl", "de"]`) |
| `src`        | `"src"`                                         | Folder to scan                                             |
| `out`        | `"src/locales"`                                 | Where the `<lang>.json` files are written                  |
| `fn`         | `"T"`                                           | Name of the translate function to look for                 |
| `extensions` | `.js .jsx .ts .tsx .mjs .cjs`                   | File types to scan                                         |
| `ignore`     | `node_modules locales dist build coverage .git` | Folder names to skip                                       |
| `unusedKey`  | `"__unused"`                                    | Section where translations of removed phrases are kept     |

## How translations are protected

Each run merges the phrases found in code into the existing JSON:

| Situation                                                                | Result                               |
| ------------------------------------------------------------------------ | ------------------------------------ |
| Phrase still in code                                                     | Translation kept                     |
| New phrase                                                               | Added with an empty value            |
| Translated phrase no longer in code (deleted, or the English was edited) | Moved to `__unused`, not deleted     |
| Phrase comes back later                                                  | Translation restored from `__unused` |
| Untranslated phrase removed from code                                    | Dropped (there was nothing to lose)  |
| JSON file is corrupt                                                     | Run aborts, file is not touched      |

When you edit an English sentence, the old translation shows up in `__unused`. Copy it to the new key, fix it, and delete it from `__unused` whenever you like. The runtime ignores that section.

Still commit your locale files to git. It costs nothing and gives you history.

## Rules for phrases

The extractor reads your source as text, so a few rules apply:

- **Use literal strings.** `T('Save')` works. `T(label)` and ``T(`Hi ${name}`)`` cannot be extracted, and you get a warning.
- **Do not concatenate.** `T('Hi ' + name)` extracts the phrase `Hi ` and gives no warning. Use a placeholder instead.
- **Put variables in placeholders:** `T('Hi, {name}', { name })`.
- **Quotes:** use backticks for text containing `'` or `"`: ``T(`Don't do this`)``.
- **Mixed text and tags:** `Click <b>here</b>` should be split into separate `T()` calls, or kept as one phrase with placeholders. Word order differs between languages, so avoid gluing sentence fragments together.
- **Same word, different meaning** (e.g. the verb "Open" vs the status "Open") shares one translation. Add a distinguishing suffix if needed: `T('Open (status)')`.
- **Trailing spaces count.** `'Total: '` and `'Total:'` are different keys. Prefer `{T('Total:')} {value}`.

## Tokens

If you prefer stable keys for long content, write `T('Project_Description')`, add `"en"` to `langs`, and fill `en.json` yourself:

```json
{ "langs": ["en", "pl"] }
```

The extractor does not care what is inside the string. Pass both files to the provider:

```jsx
import en from './locales/en.json';
import pl from './locales/pl.json';

root.render(
  <I18nProvider catalogs={{ en, pl }} defaultLang="en">
    <App />
  </I18nProvider>,
);
```

A token does not change when you reword the text, so the translation stays attached to it. The cost is that the English text lives in `en.json` instead of next to the JSX. Run `najwer23lang --check` before a release to list empty entries.

## Limitations

- **Regex-based, not a parser.** A commented-out `T("old")` is still extracted, and a local variable named `T` would match. Pick a unique `fn` name if that is a problem.
- **String concatenation is not detected.** See the rules above.
- **No plural rules yet.** For now, use separate phrases or `Intl.PluralRules` in your own code.
- **Content from a database or API** is not in your source, so it cannot be extracted. Translate it at the source and use `T()` only for text that lives in your code.

## Roadmap

- Plural support (`Intl.PluralRules`)
- Parser-based extraction (ignore comments, handle concatenation and other edge cases)

## API

```ts
import { createT, interpolate } from 'najwer23lang';
import { I18nProvider, useT, useI18n } from 'najwer23lang/react';
import { run, extractPhrases, buildCatalog } from 'najwer23lang/extract';
```

| Export                                       | Description                                                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `createT(catalogs, lang)`                    | Returns `T(text, vars?)`. `lang` is a string or a function                                                              |
| `interpolate(text, vars)`                    | Replaces `{name}` placeholders                                                                                          |
| `<I18nProvider catalogs lang? defaultLang?>` | Provides `T` and language state. Pass `lang` to control it yourself                                                     |
| `useT()`                                     | Returns `T`                                                                                                             |
| `useI18n()`                                  | Returns `{ lang, setLang, T }`                                                                                          |
| `run(config, { check? })`                    | Runs the extraction. `config` must be complete: `cwd`, `src`, `out`, `langs`, `fn`, `extensions`, `ignore`, `unusedKey` |

`useT()` is a React hook, so call it inside a component, not at module level. Without a provider, it returns a pass-through function, so components still render English in tests.

## Contributing

```bash
git clone https://github.com/najwer23/najwer23lang
cd najwer23lang
npm test
```

# Let's connect!

**Portfolio:** https://najwer23.github.io  
**Résumé:** https://najwer23.github.io/resume  
**X:** https://twitter.com/najwer23  
**LinkedIn:** https://www.linkedin.com/in/najwer23  
**LeetCode:** https://leetcode.com/najwer23  
**NPM:** https://www.npmjs.com/~najwer23 <br>
**Gitfut:** https://gitfut.com/najwer23  
**Nook:** https://najwer23.github.io/nook  
**Blog** https://najwer23.github.io/#/blog
