# MCP Lite i18n (Internationalization)

This directory contains the internationalization system for MCP Lite web interface.

## File Structure

```
i18n/
├── README.md          # This documentation
├── config.js          # i18n configuration (language list, formats, etc.)
├── i18n.js            # Core i18n system implementation
├── en.json            # English translations
├── zh-TW.json         # Traditional Chinese (Taiwan) translations
└── ja.json            # Japanese translations (example)
```

## Adding a New Language

To add support for a new language, follow these steps:

### 1. Create Language File

Create a new JSON file named `{languageCode}.json` (e.g., `fr.json` for French):

```json
{
  "header": {
    "title": "MCP Lite",
    "status": "Connecté"
  },
  "sidebar": {
    "tools": {
      "title": "🔧 Outils Disponibles",
      "count": "outils"
    },
    "commands": {
      "title": "⚡ Commandes Rapides",
      "help": "Aide",
      "tools": "Outils",
      "clear": "Effacer",
      "status": "Statut"
    }
  },
  // ... rest of translations
}
```

### 2. Update i18n System

In `i18n.js`, add the new language to the `availableLanguages` object:

```javascript
this.availableLanguages = {
    'en': 'English',
    'zh-TW': '繁體中文',
    'ja': '日本語',
    'fr': 'Français'  // Add your new language
};
```

### 3. Update Language Settings

In each language JSON file, update the `settings.languageOptions` section:

```json
"settings": {
  "language": "Language", // or "Langue" for French
  "languageOptions": {
    "en": "English",
    "zh-tw": "繁體中文",
    "ja": "日本語",
    "fr": "Français"  // Add your new language
  }
}
```

### 4. Test Your Translation

1. Start the web server: `npm run dev:web`
2. Open http://localhost:3000
3. Your new language should appear in the language switcher
4. Test all UI elements and commands to ensure proper translation

## Translation Guidelines

### Key Naming Convention

Use nested keys with dot notation:
- `header.title` - Page title
- `sidebar.tools.title` - Tools section title
- `chat.input.placeholder` - Input placeholder text
- `commands.help.title` - Help command response title

### Consistency Rules

1. **Maintain Key Structure**: All language files must have the same key structure
2. **Preserve Formatting**: Keep HTML tags, emojis, and special characters
3. **Cultural Adaptation**: Adapt content to local culture, not just literal translation
4. **Technical Terms**: Keep technical terms like "MCP" untranslated

### Special Cases

- **Tool Count**: Use appropriate plural forms (e.g., "tools" vs "個工具")
- **Commands**: Keep slash commands (`/help`, `/tools`) untranslated
- **Error Messages**: Provide clear, actionable error messages
- **Emojis**: Keep emojis as they are universally understood

## Supported Languages

Currently supported languages:

| Code  | Language             | Status |
|-------|---------------------|---------|
| en    | English             | ✅ Complete |
| zh-TW | Traditional Chinese | ✅ Complete |
| ja    | Japanese            | 🔄 Example |

## Configuration Options

The i18n system supports:

- **Default Language**: Set in `i18n.js` (currently Traditional Chinese)
- **Fallback Language**: Used when translations are missing (currently English)
- **Language Detection**: Automatic detection based on browser settings
- **Persistent Storage**: User language preference saved in localStorage
- **Dynamic Loading**: Language files loaded on demand

## Best Practices

1. **Test Thoroughly**: Test all features in your new language
2. **Cultural Context**: Consider local conventions and preferences
3. **Length Consideration**: Account for text expansion/contraction in different languages
4. **Accessibility**: Ensure screen reader compatibility
5. **Performance**: Keep translation files reasonably sized

## Troubleshooting

**Language not appearing in switcher:**
- Check that the language code is added to `availableLanguages` in `i18n.js`
- Verify the JSON file syntax is valid

**Missing translations showing as keys:**
- Ensure all required keys exist in your language file
- Check for typos in key names
- Verify the fallback language (English) has the complete key set

**Language not loading:**
- Check browser console for network errors
- Verify the JSON file is accessible at `/i18n/{langCode}.json`
- Ensure the web server is serving static files from the `public` directory