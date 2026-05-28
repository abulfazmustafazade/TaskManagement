import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { az } from './az';
import { en } from './en';
import type { Translations } from './az';

const translations = { az, en } as const;
export type Lang = keyof typeof translations;

const I18nCtx = createContext<{
  t: Translations;
  lang: Lang;
  setLang: (l: Lang) => void;
}>({ t: az, lang: 'az', setLang: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('ntx-lang') as Lang;
    return saved === 'en' ? 'en' : 'az';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('ntx-lang', l);
    document.documentElement.lang = l === 'az' ? 'az' : 'en';
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'az' ? 'az' : 'en';
  }, [lang]);

  const t = translations[lang];

  return (
    <I18nCtx.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  return useContext(I18nCtx);
}
