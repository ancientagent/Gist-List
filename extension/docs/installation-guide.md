# Installation Guide - Gist List Chrome Extension

This guide will walk you through installing and setting up the Gist List Chrome Extension step by step.

## Prerequisites

Before installing the extension, ensure you have:

- **Google Chrome**: Version 88 or higher
- **Developer Mode Access**: Ability to enable Chrome's developer mode
- **Platform Accounts**: Active accounts on platforms you plan to use (eBay, Facebook, Poshmark, etc.)
- **Gist List Mobile App**: For generating listing data (optional for testing)

## Installation Methods

### Method 1: Load Unpacked Extension (Recommended for Development)

This method is for loading the extension directly from source code.

#### Step 1: Download Extension Files

**Option A: Clone from Git Repository**
```bash
git clone https://github.com/your-repo/gist-list-extension.git
cd gist-list-extension
```

**Option B: Download ZIP File**
1. Download the extension ZIP file from the release page
2. Extract to a folder (e.g., `C:\gist-list-extension` or `~/gist-list-extension`)

#### Step 2: Prepare Icon Files

The extension requires icon files in PNG format. Generate them from the provided SVG:

**Using Inkscape (Recommended):**
```bash
inkscape assets/icon.svg -w 16 -h 16 -o assets/icon16.png
inkscape assets/icon.svg -w 32 -h 32 -o assets/icon32.png
inkscape assets/icon.svg -w 48 -h 48 -o assets/icon48.png
inkscape assets/icon.svg -w 128 -h 128 -o assets/icon128.png
```

**Using Online Converter:**
1. Go to any SVG to PNG converter (e.g., convertio.co, cloudconvert.com)
2. Upload `assets/icon.svg`
3. Generate PNG files in sizes: 16x16, 32x32, 48x48, 128x128
4. Save them as `icon16.png`, `icon32.png`, etc. in the `assets/` folder

**Using ImageMagick:**
```bash
convert assets/icon.svg -resize 16x16 assets/icon16.png
convert assets/icon.svg -resize 32x32 assets/icon32.png
convert assets/icon.svg -resize 48x48 assets/icon48.png
convert assets/icon.svg -resize 128x128 assets/icon128.png
```

#### Step 3: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Type `chrome://extensions/` in the address bar
   - Or go to Chrome Menu > More Tools > Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner
   - Additional buttons will appear

3. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Navigate to your `gist-list-extension` folder
   - Select the folder and click "Select Folder" (Windows) or "Open" (Mac/Linux)

4. **Verify Installation**
   - The extension should appear in your extensions list
   - Look for the Gist List icon in your browser toolbar
   - If you don't see it, click the puzzle piece icon and pin it

#### Step 4: Test Installation

1. Click the Gist List extension icon
2. The popup should open showing the main interface
3. Try clicking "Generate Sample Data" to test functionality

### Method 2: Chrome Web Store (Future Release)

*This method will be available when the extension is published to the Chrome Web Store.*

1. Visit the Chrome Web Store page for Gist List
2. Click "Add to Chrome"
3. Confirm the installation
4. The extension will be automatically installed and enabled

## Post-Installation Setup

### 1. Configure Platform Accounts

Before using the extension, ensure you're logged into the platforms you want to use:

#### Required Login Platforms:
- **eBay**: Go to [ebay.com](https://ebay.com) and sign in
- **Facebook**: Go to [facebook.com](https://facebook.com) and sign in  
- **Poshmark**: Go to [poshmark.com](https://poshmark.com) and sign in
- **Reverb**: Go to [reverb.com](https://reverb.com) and sign in
- **Mercari**: Go to [mercari.com](https://mercari.com) and sign in
- **Nextdoor**: Go to [nextdoor.com](https://nextdoor.com) and sign in

#### Optional Login:
- **Craigslist**: Most areas don't require login, but some do

### 2. Test Data Import

Test the extension with sample data:

1. Open the extension popup
2. Click "Import Listings"
3. Select the provided `docs/sample-listings.json` file
4. Verify that listings appear in the interface

### 3. Verify Platform Detection

1. Open tabs for each platform you plan to use
2. Open the extension popup
3. Check that platforms show "Ready" status
4. If showing "Login needed", ensure you're properly logged in

## Troubleshooting Installation

### Extension Not Loading

**Problem**: Extension doesn't appear after loading
**Solutions**:
- Ensure you selected the correct folder (should contain `manifest.json`)
- Check that all required files are present
- Refresh the extensions page and try again
- Check Chrome's developer console for error messages

### Icon Files Missing

**Problem**: Extension loads but shows broken icons
**Solutions**:
- Generate PNG icons from the SVG file (see Step 2 above)
- Ensure icon files are in the `assets/` folder with correct names
- Verify icon file sizes match requirements (16x16, 32x32, 48x48, 128x128)

### Permission Errors

**Problem**: Extension can't access certain websites
**Solutions**:
- Reload the extension after installation
- Check that the manifest.json contains all required host permissions
- Clear browser cache and reload

### Platform Login Issues

**Problem**: Platforms show "Login needed" even when logged in
**Solutions**:
- Clear browser cookies and log in again
- Disable ad blockers that might interfere with login detection
- Try logging in from an incognito window first, then regular window

## Updating the Extension

When updating to a new version:

1. **Download New Version**
   - Get the latest files from the repository
   - Or download the new release ZIP

2. **Update Files**
   - Replace existing files with new ones
   - Keep your existing data files if instructed

3. **Reload Extension**
   - Go to `chrome://extensions/`
   - Click the refresh button on the Gist List extension
   - Or disable and re-enable the extension

4. **Test Functionality**
   - Open the extension popup
   - Verify all features work correctly
   - Check that your data is still intact

## Uninstalling the Extension

To remove the extension:

1. **Via Extensions Page**
   - Go to `chrome://extensions/`
   - Find Gist List extension
   - Click "Remove"
   - Confirm removal

2. **Data Cleanup** (Optional)
   - Extension data is automatically removed
   - Local files remain in your download folder
   - Delete the extension folder if no longer needed

## Security Considerations

### Extension Permissions

The extension requires these permissions:
- **Storage**: Save listings and settings locally
- **ActiveTab**: Interact with currently active tab
- **Host Permissions**: Access the 7 supported platforms
- **Scripting**: Automate form filling on platforms

### Data Privacy

- All data is stored locally in your browser
- No data is sent to external servers
- Platform interactions use your existing login sessions
- You can review all source code since it's open source

### Safe Usage Tips

- Only install from trusted sources
- Review permissions before installation
- Keep the extension updated
- Log out of platforms when not using the extension
- Use on trusted networks only

## Getting Help

If you encounter issues during installation:

1. **Check System Requirements**
   - Ensure Chrome is up to date
   - Verify you have developer mode access

2. **Review Error Messages**
   - Check Chrome's console for detailed errors
   - Note any specific error codes or messages

3. **Contact Support**
   - Email: support@gistlist.app
   - Include your Chrome version and OS
   - Describe the specific step where installation failed

4. **Community Resources**
   - GitHub Issues: Report bugs and get help
   - Documentation: Check for updated installation guides
   - FAQ: Common installation problems and solutions

## Next Steps

After successful installation:

1. **Read the Usage Tutorial**: Learn how to import and post listings
2. **Review Platform Notes**: Understand platform-specific requirements  
3. **Test with Sample Data**: Practice with provided sample listings
4. **Set Up Phone App**: Configure data synchronization with mobile app

---

**Installation Complete!** 🎉 

You're now ready to start using Gist List to automate your reselling across multiple platforms.
