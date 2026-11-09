import { createContext, createElement, useContext, useMemo, useState } from 'react';
import { createT } from './index.js';

const passthrough = createT({}, 'en');
const I18nContext = createContext({ lang: 'en', setLang: () => {}, T: passthrough });

/**
 * <I18nProvider catalogs={{ pl }} defaultLang="en">
 *
 * Uncontrolled: omit `lang`, change language with setLang() from useI18n().
 * Controlled:   pass `lang` yourself (e.g. from a router or your own state).
 */
export function I18nProvider({ catalogs, lang: controlled, defaultLang = 'en', children }) {
  const [inner, setInner] = useState(defaultLang);
  const lang = controlled ?? inner;
  const value = useMemo(() => ({ lang, setLang: setInner, T: createT(catalogs, lang) }), [catalogs, lang]);
  return createElement(I18nContext.Provider, { value }, children);
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).T;
