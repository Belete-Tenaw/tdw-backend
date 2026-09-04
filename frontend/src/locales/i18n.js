import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import am from './am.json';

const storedLanguage = localStorage.getItem('i18nextLng') || 'en';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            am: { translation: am }
        },
        lng: storedLanguage,
        fallbackLng: 'en',
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        },
        interpolation: {
            escapeValue: false
        },
        react: {
            useSuspense: true
        }
    });



i18n.on('languageChanged', (lng) => {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = lng;
    }
    try {
        localStorage.setItem('i18nextLng', lng);
    } catch (e) {
        // ignore localStorage restrictions
    }
});

// Set initial html lang attribute
if (typeof document !== 'undefined') {
    document.documentElement.lang = i18n.language || storedLanguage;
}

export default i18n;

