export interface Config {
  cwd: string;
  src: string;
  out: string;
  langs: string[];
  fn: string;
  extensions: string[];
  ignore: string[];
  unusedKey: string;
}

export interface LangResult {
  lang: string;
  file: string;
  untranslated: string[];
  unusedCount: number;
  changed: boolean;
}

export interface RunResult {
  phrases: number;
  files: number;
  warnings: string[];
  langs: LangResult[];
  ok: boolean;
}

export function extractPhrases(config: Config): { phrases: Set<string>; warnings: string[]; files: number };
export function buildCatalog(
  old: Record<string, unknown>,
  found: Set<string>,
  unusedKey?: string,
): { catalog: Record<string, unknown>; untranslated: string[]; unusedCount: number };
export function run(config: Config, options?: { check?: boolean }): RunResult;
export function unescapeString(s: string): string;
