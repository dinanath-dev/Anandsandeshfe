import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  translations
} from './translations.js';

const STORAGE_KEY = 'appLang';

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;
  } catch {
    // localStorage may be unavailable in some embeds; fall through to default.
  }
  return DEFAULT_LANGUAGE;
}

function lookup(dictionary, path) {
  if (!path) return undefined;
  const parts = path.split('.');
  let node = dictionary;
  for (const key of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[key];
  }
  return node;
}

function interpolate(template, params) {
  if (typeof template !== 'string' || !params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
  );
}

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => key
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => readStoredLanguage());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore persistence failures
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((next) => {
    if (!SUPPORTED_LANGUAGES.includes(next)) return;
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key, params) => {
      const primary = lookup(translations[language], key);
      if (primary !== undefined) return interpolate(primary, params);
      const fallback = lookup(translations[DEFAULT_LANGUAGE], key);
      if (fallback !== undefined) return interpolate(fallback, params);
      return key;
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  return useContext(LanguageContext);
}
