import type { ReactNode } from 'react';
import type { Catalogs, TFunction } from './index';

export interface I18nProviderProps {
  catalogs: Catalogs;
  lang?: string;
  defaultLang?: string;
  children?: ReactNode;
}

export function I18nProvider(props: I18nProviderProps): JSX.Element;
export function useI18n(): { lang: string; setLang: (lang: string) => void; T: TFunction };
export function useT(): TFunction;
