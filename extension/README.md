# Gist List - AI-Powered Reseller Assistant Chrome Extension

Gist List is a powerful Chrome extension that automates posting listings to multiple reselling platforms simultaneously. Designed to work with AI-processed data from your phone app, it streamlines the reselling process across 7 major marketplaces.

## 🌟 Features

- **Multi-Platform Posting**: Automatically post to Craigslist, Reverb, Poshmark, eBay, Nextdoor, Mercari, and Facebook Marketplace
- **AI Data Integration**: Seamlessly sync listings from your phone app with AI-processed photos and descriptions
- **Smart Form Filling**: Intelligent form detection and filling for each platform's unique requirements
- **Progress Tracking**: Real-time progress monitoring with cancellation support
- **Error Handling**: Comprehensive error detection with recovery suggestions
- **Category Mapping**: Automatic category translation between platforms
- **Image Management**: Bulk image upload with format optimization
- **Data Validation**: Thorough data validation before posting

## 🚀 Quick Start

### Prerequisites

- Google Chrome browser (version 88+)
- Active accounts on the platforms you want to use
- Gist List phone app (for data synchronization)

### Installation

1. **Download the Extension**
   ```bash
   git clone https://github.com/your-repo/gist-list-extension.git
   cd gist-list-extension
   ```

2. **Generate Icon Files** (if needed)
   ```bash
   # Using Inkscape
   inkscape assets/icon.svg -w 16 -h 16 -o assets/icon16.png
   inkscape assets/icon.svg -w 32 -h 32 -o assets/icon32.png
   inkscape assets/icon.svg -w 48 -h 48 -o assets/icon48.png
   inkscape assets/icon.svg -w 128 -h 128 -o assets/icon128.png
   ```

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `gist-list-extension` folder
   - The extension icon should appear in your browser toolbar

## 📱 Phone App Integration

### Data Format

The extension accepts JSON data in the following format:

```json
{
  "version": "1.0",
  "listings": [
    {
      "id": "unique_id",
      "title": "Product Title",
      "description": "Detailed description",
      "price": 99.99,
      "category": "electronics",
      "condition": "excellent",
      "brand": "Apple",
      "images": ["url1", "url2"],
      "location": "San Francisco, CA"
    }
  ]
}
```

### Sync Methods

1. **File Import** (Primary Method)
   - Export JSON file from phone app
   - Click "Import Listings" in extension
   - Select your JSON file

2. **Future Methods** (Coming Soon)
   - QR Code scanning
   - Cloud storage integration (Google Drive, Dropbox)
   - Direct URL sharing

## 🎯 How to Use

### Step 1: Import Your Listings

1. Open the extension by clicking the Gist List icon
2. Click "Import Listings" button
3. Select your JSON file from the phone app
4. Wait for validation and import confirmation

### Step 2: Select Platforms

1. Review your imported listings
2. Check the platforms where you want to post
3. Ensure you're logged into each selected platform
4. The extension will show login status for each platform

### Step 3: Post Listings

1. Select which listings to post (or click "Select All")
2. Choose your target platforms
3. Click "Post to Selected Platforms"
4. Monitor progress in real-time
5. Review results and handle any errors

### Step 4: Platform Management

The extension will automatically:
- Navigate to each platform's posting page
- Fill in all required information
- Upload images
- Handle platform-specific requirements
- Submit the listings
- Provide success/error feedback

## 🏪 Supported Platforms

### Craigslist
- **Login Required**: No (for most areas)
- **Categories**: Supports all major categories
- **Images**: Up to 8 images
- **Special Features**: Location-based posting

### eBay  
- **Login Required**: Yes
- **Categories**: Complex category hierarchy
- **Images**: Up to 12 images
- **Special Features**: Buy It Now format, shipping options

### Facebook Marketplace
- **Login Required**: Yes
- **Categories**: Major marketplace categories
- **Images**: Up to 10 images
- **Special Features**: Location-based, pickup/delivery options

### Poshmark
- **Login Required**: Yes
- **Categories**: Fashion-focused categories
- **Images**: Up to 16 images
- **Special Features**: Size, brand, and condition requirements

### Reverb
- **Login Required**: Yes
- **Categories**: Music equipment focused
- **Images**: Up to 20 images
- **Special Features**: Brand, model, and year fields

### Mercari
- **Login Required**: Yes
- **Categories**: General marketplace
- **Images**: Up to 12 images
- **Special Features**: Condition ratings, shipping included

### Nextdoor
- **Login Required**: Yes
- **Categories**: Neighborhood-focused categories
- **Images**: Up to 10 images
- **Special Features**: Local community selling

## ⚙️ Configuration

### Platform Settings

Each platform can be individually enabled/disabled and configured:

- **Auto-retry failed posts**: 3 attempts by default
- **Delay between posts**: 2-5 seconds to avoid rate limiting
- **Category mapping**: Automatic translation between platform categories
- **Image optimization**: Automatic resizing and format conversion

### Data Validation

The extension validates:
- Required fields (title, description, price)
- Price formats and ranges
- Image URL accessibility
- Character limits per platform
- Category compatibility

## 🔧 Troubleshooting

### Common Issues

#### "Platform login required"
- **Solution**: Open the platform in a new tab and log in
- **Note**: Keep the login tab open during posting

#### "Image upload failed"
- **Cause**: Invalid image URLs or unsupported formats
- **Solution**: Ensure images are accessible and in JPG/PNG format

#### "Category not found"
- **Cause**: Category mapping failed
- **Solution**: Check category names or use generic categories

#### "Rate limiting detected"
- **Cause**: Posting too quickly
- **Solution**: Increase delay between posts in settings

#### "Form submission failed"
- **Cause**: Platform UI changes or network issues
- **Solution**: Try again or report the issue

### Getting Help

1. **Error Dialog**: Click "Get Help" on any error message
2. **Check Platform Status**: Verify the platform is accessible
3. **Review Data Format**: Ensure your JSON follows the specification
4. **Contact Support**: Use the built-in support contact feature

## 🛡️ Privacy & Security

### Data Handling

- **Local Storage**: All data is stored locally in Chrome
- **No Cloud Storage**: Extension doesn't transmit data to external servers
- **Platform Authentication**: Uses your existing platform logins
- **Secure Communication**: All platform interactions use HTTPS

### Permissions

The extension requires:
- **Storage**: To save your listings and settings
- **ActiveTab**: To interact with platform websites
- **Host Permissions**: To access the 7 supported platforms
- **Scripting**: To automate form filling

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/your-repo/gist-list-extension.git
cd gist-list-extension
# Load unpacked extension in Chrome developer mode
```

### File Structure

```
gist-list-extension/
├── manifest.json           # Extension configuration
├── popup/                  # Extension popup UI
│   ├── popup.html
│   ├── popup.js
│   ├── popup.css
│   ├── user-feedback.js
│   └── feedback-styles.css
├── background/             # Background service worker
│   ├── background.js
│   └── data-sync.js
├── content-scripts/        # Platform automation
│   ├── base-content-script.js
│   ├── craigslist.js
│   ├── ebay.js
│   ├── facebook.js
│   ├── mercari.js
│   ├── nextdoor.js
│   ├── poshmark.js
│   └── reverb.js
├── assets/                 # Icons and images
├── docs/                   # Documentation
└── README.md
```

## 📚 Documentation

- [Data Format Specification](docs/data-format.md)
- [Installation Guide](docs/installation-guide.md)
- [Usage Tutorial](docs/usage-tutorial.md)
- [Platform-Specific Notes](docs/platform-notes.md)
- [API Documentation](docs/api-docs.md)
- [Troubleshooting Guide](docs/troubleshooting.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Email**: support@gistlist.app
- **Documentation**: [docs.gistlist.app](https://docs.gistlist.app)
- **Issues**: [GitHub Issues](https://github.com/your-repo/gist-list-extension/issues)
- **Community**: [Discord Server](https://discord.gg/gistlist)

## 🚀 Roadmap

### Version 1.1 (Coming Soon)
- [ ] QR Code data synchronization
- [ ] Cloud storage integration (Google Drive, Dropbox)
- [ ] Bulk editing capabilities
- [ ] Custom templates

### Version 1.2 (Future)
- [ ] Additional platforms (Depop, Vinted, etc.)
- [ ] Advanced scheduling
- [ ] Analytics and reporting
- [ ] Team collaboration features

---

**Made with ❤️ for resellers everywhere**
