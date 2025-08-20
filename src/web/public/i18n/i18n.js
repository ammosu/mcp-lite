// MCP Lite Internationalization System
class I18n {
    constructor() {
        this.currentLang = 'zh-TW'; // Default to Traditional Chinese
        this.translations = {};
        this.fallbackLang = 'en';
        
        // Available languages - will be populated from translation files
        this.availableLanguages = {
            'en': 'English',
            'zh-TW': '繁體中文',
            'ja': '日本語'
        };
    }
    
    // Load translation files
    async loadTranslations() {
        try {
            // Load saved language from localStorage
            const savedLang = localStorage.getItem('mcp-lite-lang');
            if (savedLang && this.availableLanguages[savedLang]) {
                this.currentLang = savedLang;
            }
            
            // Load translation files for current and fallback languages
            const promises = [];
            const langsToLoad = [this.currentLang];
            
            if (this.currentLang !== this.fallbackLang) {
                langsToLoad.push(this.fallbackLang);
            }
            
            for (const lang of langsToLoad) {
                promises.push(
                    fetch(`/i18n/${lang}.json`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Failed to load ${lang} translations`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            this.translations[lang] = data;
                        })
                );
            }
            
            await Promise.all(promises);
            console.log(`Loaded translations for: ${Object.keys(this.translations).join(', ')}`);
            
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to built-in minimal translations
            this.loadFallbackTranslations();
        }
    }
    
    // Fallback translations in case files fail to load
    loadFallbackTranslations() {
        this.translations = {
            'en': {
                'header': { 'title': 'MCP Lite', 'status': 'Connected' },
                'chat': { 'send': 'Send', 'loading': 'Thinking...' },
                'settings': { 'language': 'Language' }
            },
            'zh-TW': {
                'header': { 'title': 'MCP Lite', 'status': '已連線' },
                'chat': { 'send': '傳送', 'loading': '思考中...' },
                'settings': { 'language': '語言' }
            }
        };
    }
    
    // Get translated text with nested key support (e.g., 'header.title')
    t(key, ...args) {
        let translation = this.getNestedTranslation(this.translations[this.currentLang], key);
        
        // Fallback to default language if translation not found
        if (!translation && this.currentLang !== this.fallbackLang) {
            translation = this.getNestedTranslation(this.translations[this.fallbackLang], key);
        }
        
        // Final fallback to key itself
        if (!translation) {
            console.warn(`Translation not found for key: ${key}`);
            translation = key;
        }
        
        // Simple parameter replacement
        if (args.length > 0) {
            return translation.replace(/\\{(\\d+)\\}/g, (match, index) => args[index] || match);
        }
        
        return translation;
    }
    
    // Helper function to get nested translation
    getNestedTranslation(obj, key) {
        return key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
    }
    
    // Set language and save to localStorage
    async setLanguage(lang) {
        if (!this.availableLanguages[lang]) {
            console.warn(`Language ${lang} is not supported`);
            return;
        }
        
        // Load new language if not already loaded
        if (!this.translations[lang]) {
            try {
                const response = await fetch(`/i18n/${lang}.json`);
                if (response.ok) {
                    this.translations[lang] = await response.json();
                }
            } catch (error) {
                console.error(`Failed to load ${lang} translations:`, error);
                return;
            }
        }
        
        this.currentLang = lang;
        localStorage.setItem('mcp-lite-lang', lang);
        document.documentElement.lang = lang;
        this.updatePageText();
        
        // Update language switcher to reflect new language
        this.updateLanguageSwitcher();
    }
    
    // Get available languages
    getAvailableLanguages() {
        return this.availableLanguages;
    }
    
    // Initialize i18n system
    async init() {
        await this.loadTranslations();
        document.documentElement.lang = this.currentLang;
        
        // Wait a bit for DOM to be ready, then update UI
        setTimeout(() => {
            this.updatePageText();
            this.addLanguageSwitcher();
        }, 200);
    }
    
    // Update all text elements on the page
    updatePageText() {
        // Update elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });
        
        // Update placeholder texts
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });
    }
    
    // Update existing language switcher
    updateLanguageSwitcher() {
        const existingSwitcher = document.querySelector('.language-switcher');
        if (existingSwitcher) {
            // Update the language label
            const langLabel = existingSwitcher.querySelector('h4');
            if (langLabel) {
                langLabel.textContent = this.t('settings.language');
            }
            
            // Update active button states
            const buttons = existingSwitcher.querySelectorAll('.lang-btn');
            buttons.forEach(btn => {
                const lang = btn.getAttribute('data-lang');
                if (lang === this.currentLang) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }
    
    // Add language switcher to sidebar
    addLanguageSwitcher() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && !document.querySelector('.language-switcher')) {
            const langSwitcher = document.createElement('div');
            langSwitcher.className = 'language-switcher';
            
            // Get language options from current translation or fallback to availableLanguages
            let languageOptions = {};
            
            // Try to get language options from current translations
            if (this.translations[this.currentLang] && 
                this.translations[this.currentLang].settings && 
                this.translations[this.currentLang].settings.languageOptions) {
                languageOptions = this.translations[this.currentLang].settings.languageOptions;
            } else if (this.translations[this.fallbackLang] && 
                      this.translations[this.fallbackLang].settings && 
                      this.translations[this.fallbackLang].settings.languageOptions) {
                languageOptions = this.translations[this.fallbackLang].settings.languageOptions;
            } else {
                languageOptions = this.availableLanguages;
            }
            
            // Generate language buttons
            const langButtons = Object.entries(languageOptions)
                .filter(([code]) => this.availableLanguages[code]) // Only show languages we actually support
                .map(([code, name]) => 
                    `<button class="btn-small lang-btn ${this.currentLang === code ? 'active' : ''}" 
                            data-lang="${code}" 
                            title="${name}">${name}</button>`
                ).join('');
            
            langSwitcher.innerHTML = `
                <h4 data-i18n="settings.language">${this.t('settings.language')}</h4>
                <div class="lang-options">
                    ${langButtons}
                </div>
            `;
            
            sidebar.appendChild(langSwitcher);
            
            // Add event listeners for language buttons
            langSwitcher.querySelectorAll('.lang-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const lang = btn.getAttribute('data-lang');
                    await this.setLanguage(lang);
                    
                    // Update active state
                    langSwitcher.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        }
    }
}

// Create global i18n instance
window.i18n = new I18n();