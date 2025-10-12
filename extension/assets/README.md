# Gist List Extension Assets

## Icon Files

The extension requires icon files in the following sizes:
- 16x16 pixels (icon16.png)
- 32x32 pixels (icon32.png)  
- 48x48 pixels (icon48.png)
- 128x128 pixels (icon128.png)

### Creating Icon Files

Use the provided `icon.svg` file to generate the required PNG files:

```bash
# Using Inkscape (if installed)
inkscape icon.svg -w 16 -h 16 -o icon16.png
inkscape icon.svg -w 32 -h 32 -o icon32.png
inkscape icon.svg -w 48 -h 48 -o icon48.png
inkscape icon.svg -w 128 -h 128 -o icon128.png

# Using ImageMagick (if installed)
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 32x32 icon32.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png

# Online conversion
# Upload icon.svg to any SVG to PNG converter online
# Generate the required sizes
```

### Icon Design

The icon features:
- Blue gradient background representing AI/technology
- List elements representing listings/inventory
- Sparkle/star element representing AI assistance
- Clean, modern design suitable for browser extensions

### Placeholder Icons

For development/testing, you can use placeholder icons or create simple PNG files with the extension logo/name.
