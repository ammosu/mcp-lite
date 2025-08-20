// i18n Configuration for MCP Lite
// This file defines available languages and their display names

export const I18N_CONFIG = {
    // Default language (Traditional Chinese for Taiwan)
    defaultLang: 'zh-TW',
    
    // Fallback language when translations are missing
    fallbackLang: 'en',
    
    // Available languages
    // To add a new language:
    // 1. Create a new JSON file in /i18n/{langCode}.json
    // 2. Add the language code and display name here
    // 3. The i18n system will automatically load the new language
    availableLanguages: {
        'zh-TW': '繁體中文',
        'en': 'English',
        'ja': '日本語'  // Example: Japanese support
    },
    
    // Language detection preferences
    // If user's browser language matches these patterns, 
    // the corresponding language will be selected by default
    languageDetection: {
        'zh-TW': ['zh-TW', 'zh-Hant', 'zh-HK', 'zh-MO'],
        'zh-CN': ['zh-CN', 'zh-Hans', 'zh-SG'],
        'en': ['en', 'en-US', 'en-GB', 'en-AU', 'en-CA'],
        'ja': ['ja', 'ja-JP']
    },
    
    // RTL (Right-to-Left) languages
    rtlLanguages: [],
    
    // Date/time formatting preferences by language
    dateTimeFormats: {
        'zh-TW': {
            locale: 'zh-TW',
            options: { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }
        },
        'en': {
            locale: 'en-US',
            options: {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }
        },
        'ja': {
            locale: 'ja-JP',
            options: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }
        }
    },
    
    // Number formatting preferences by language
    numberFormats: {
        'zh-TW': { locale: 'zh-TW' },
        'en': { locale: 'en-US' },
        'ja': { locale: 'ja-JP' }
    }
};