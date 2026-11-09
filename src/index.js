/** Replace {name} placeholders with values. Unknown placeholders are left as-is. */
export function interpolate(message, vars) {
  if (!vars) return message;
  return message.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
  );
}

/**
 * Create a translate function.
 *
 *   const T = createT({ pl }, 'pl');
 *   T('Hello, {name}', { name: 'Anna' })
 *
 * `lang` can be a string or a function returning the current language.
 * A missing or empty translation falls back to the original text.
 */
export function createT(catalogs, lang) {
  const getLang = typeof lang === 'function' ? lang : () => lang;
  return function T(text, vars) {
    const entry = catalogs?.[getLang()]?.[text];
    const message = typeof entry === 'string' && entry ? entry : text;
    return interpolate(message, vars);
  };
}
