# Font Update - Iosevka Nerd Font Mono

## Changes Made

✅ Downloaded Iosevka Term Nerd Font Mono from official Nerd Fonts repository
✅ Extracted and included only Mono variants (Regular, Light, Medium, Bold)
✅ Removed all non-Mono, Italic, and Oblique variants to save space
✅ Created local font CSS file (`public/css/fonts.css`)
✅ Updated main stylesheet to use local fonts
✅ Removed all Google Fonts references

## Font Files Included

Located in `public/fonts/`:

- IosevkaTermNerdFontMono-Regular.ttf (400 weight)
- IosevkaTermNerdFontMono-Light.ttf (300 weight)
- IosevkaTermNerdFontMono-Medium.ttf (500 weight)
- IosevkaTermNerdFontMono-Bold.ttf (700 weight)

Extra weights available but not loaded by default:
- IosevkaTermNerdFontMono-Thin.ttf
- IosevkaTermNerdFontMono-ExtraLight.ttf
- IosevkaTermNerdFontMono-SemiBold.ttf
- IosevkaTermNerdFontMono-ExtraBold.ttf
- IosevkaTermNerdFontMono-Heavy.ttf

## Font Stack

```css
font-family: 'Iosevka Nerd Font Mono', 'Iosevka', 'Courier New', monospace;
```

The font stack includes fallbacks for systems without the font installed.

## File Sizes

Total font files: ~9 files kept (~4MB total)
- Regular: ~1.3MB
- Light: ~1.2MB
- Medium: ~1.3MB
- Bold: ~1.4MB

## No External Dependencies

✅ All fonts are self-hosted
✅ No Google Fonts CDN
✅ No external font services
✅ Fully offline-capable

## License

Iosevka is licensed under the SIL Open Font License 1.1
Nerd Fonts are licensed under MIT License

