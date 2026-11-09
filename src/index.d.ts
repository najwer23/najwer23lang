export type Catalog = Record<string, string | Record<string, string>>;
export type Catalogs = Record<string, Catalog>;
export type Vars = Record<string, string | number>;
export type TFunction = (text: string, vars?: Vars) => string;

export function interpolate(message: string, vars?: Vars): string;
export function createT(catalogs: Catalogs, lang: string | (() => string)): TFunction;
