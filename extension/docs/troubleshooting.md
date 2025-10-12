# Troubleshooting Guide - Gist List Chrome Extension

This guide helps you resolve common issues when using the Gist List Chrome Extension.

## Quick Fixes

### 🔧 First Things to Try

Before diving into specific solutions, try these quick fixes:

1. **Refresh the Extension**: Go to `chrome://extensions/` and click the refresh button
2. **Close and Reopen**: Close the extension popup and reopen it
3. **Check Internet**: Ensure you have a stable internet connection
4. **Update Chrome**: Make sure you're running the latest Chrome version
5. **Clear Cache**: Clear browser cache and cookies for problem platforms

## Installation Issues

### Extension Won't Load

**Symptoms**: Extension doesn't appear after "Load unpacked"

**Causes & Solutions**:

```
❌ Wrong folder selected
✅ Select the folder containing manifest.json

❌ Missing manifest.json file  
✅ Ensure manifest.json is in the root directory

❌ Invalid manifest format
✅ Check manifest.json for syntax errors

❌ Missing required files
✅ Verify all referenced files exist
```

**Steps to Fix**:
1. Verify folder structure matches documentation
2. Check Chrome console for specific error messages
3. Ensure all icon files are present in assets/ folder
4. Validate manifest.json using online JSON validators

### Icons Not Displaying

**Symptoms**: Extension loads but shows broken or missing icons

**Solution**:
```bash
# Generate PNG icons from SVG
inkscape assets/icon.svg -w 16 -h 16 -o assets/icon16.png
inkscape assets/icon.svg -w 32 -h 32 -o assets/icon32.png  
inkscape assets/icon.svg -w 48 -h 48 -o assets/icon48.png
inkscape assets/icon.svg -w 128 -h 128 -o assets/icon128.png
```

**Alternative**: Use online SVG to PNG converters to create required icon sizes

### Permission Errors

**Symptoms**: "This extension may not have permission to access this site"

**Solutions**:
1. **Reload Extension**: Click refresh on extensions page
2. **Grant Permissions**: Click on extension and allow all permissions
3. **Manual Permission**: Right-click extension → "This can read and change site data" → "On all sites"

## Data Import Issues

### File Import Fails

**Symptoms**: "Error importing data: Invalid format" message

**Common Causes**:

```json
❌ Invalid JSON syntax
{
  "title": "Missing comma here"
  "price": 10.99
}

✅ Valid JSON syntax  
{
  "title": "Correct format",
  "price": 10.99
}
```

**Validation Steps**:
1. **Check JSON Format**: Use jsonlint.com to validate your JSON
2. **Required Fields**: Ensure each listing has title, description, and price
3. **Data Types**: Verify price is a number, not a string
4. **Character Encoding**: Save file as UTF-8 encoding

### Sample Data Not Loading

**Symptoms**: Sample data generation fails or shows errors

**Solutions**:
1. **Developer Console**: 
   ```javascript
   chrome.runtime.sendMessage({action: 'generateSampleData'}, console.log)
   ```
2. **Manual Import**: Use the provided `docs/sample-listings.json` file
3. **Clear Storage**: Clear extension storage and try again

### Data Validation Errors

**Error Messages and Fixes**:

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing required field: title" | Listing lacks title | Add title to each listing |
| "Invalid price format" | Price is text or negative | Use positive numbers only |
| "Image URL not accessible" | Image links broken | Verify image URLs work in browser |
| "Description too long" | Text exceeds platform limits | Shorten description under 2000 chars |

## Platform Login Issues

### Platform Shows "Login Needed"

**Symptoms**: Platform status shows red "Login needed" indicator

**Step-by-Step Fix**:
1. **Open New Tab**: Navigate to the platform's website
2. **Clear Cookies**: Clear cookies for that specific site
3. **Fresh Login**: Log in from scratch
4. **Stay Logged In**: Don't log out after successful login
5. **Refresh Extension**: Close and reopen extension popup

### Platform Detection Problems

**Symptoms**: Platform doesn't recognize you're logged in

**Advanced Solutions**:
1. **Incognito Test**: Try logging in from incognito mode first
2. **Disable Extensions**: Temporarily disable other extensions
3. **Browser Profile**: Try a different Chrome profile
4. **Clear All Data**: Clear all browsing data for the platform

### Multi-Platform Login Issues

**Managing Multiple Platform Logins**:
```
📱 Best Practice: Keep all platform tabs open during posting

🔄 Login Order: 
   1. eBay (most complex authentication)
   2. Facebook (social login)  
   3. Poshmark (fashion platform)
   4. Other platforms
   5. Craigslist (usually no login needed)
```

## Posting Process Issues

### Posts Fail to Submit

**Error**: "Form submission failed"

**Diagnosis Steps**:
1. **Check Platform Status**: Visit platform manually to ensure it's working
2. **Verify Login**: Confirm you can manually create a listing
3. **Platform Changes**: Check if platform updated their interface
4. **Network Issues**: Test with different network connection

**Platform-Specific Issues**:

#### eBay Posting Fails
```
Common Issues:
- Seller limits reached
- Payment method required
- Category restrictions
- Item policy violations

Solutions:
- Check eBay Seller Dashboard
- Verify seller good standing
- Review eBay policies for your items
```

#### Facebook Marketplace Issues
```
Common Issues:  
- Location not set in profile
- Account not verified
- Community guidelines violation
- Restricted item category

Solutions:
- Complete Facebook profile setup
- Verify phone number
- Review community standards
- Try different categories
```

### Image Upload Problems

**Symptoms**: "Image upload failed" for multiple listings

**Common Causes & Fixes**:

| Problem | Cause | Solution |
|---------|-------|----------|
| Images not uploading | URLs not accessible | Test URLs in browser |
| "Invalid format" error | Wrong file format | Use JPG, PNG only |
| "File too large" error | Images over size limit | Resize images under 5MB |
| Upload timeout | Slow internet | Use smaller images or faster connection |

**Image Requirements by Platform**:
- **eBay**: Up to 12 images, max 7MB each
- **Facebook**: Up to 10 images, JPG/PNG preferred
- **Poshmark**: Up to 16 images, square format preferred
- **Reverb**: Up to 20 images, high resolution recommended

### Rate Limiting Issues

**Symptoms**: "Too many requests" or posting suddenly stops

**Solutions**:
1. **Increase Delays**: Add longer delays between posts
2. **Reduce Batch Size**: Post fewer items at once
3. **Time Distribution**: Spread posting across different times
4. **Platform Limits**: Research each platform's posting limits

**Recommended Limits**:
```
Platform Daily Limits (Estimated):
- Craigslist: 1-2 posts per category
- eBay: 50-100 items (varies by seller level)
- Facebook: 10-20 items 
- Poshmark: 5-10 items per hour
- Others: 5-20 items per day
```

## Performance Issues

### Extension Runs Slowly

**Symptoms**: Long delays, unresponsive interface

**Performance Optimization**:
1. **Close Unused Tabs**: Reduce browser memory usage
2. **Restart Chrome**: Clear memory leaks
3. **Reduce Concurrent Posts**: Post to fewer platforms simultaneously
4. **Check System Resources**: Ensure adequate RAM available

### Browser Crashes During Posting

**Emergency Steps**:
1. **Save Progress**: Extension auto-saves progress
2. **Restart Browser**: Force close and restart Chrome
3. **Check Results**: Verify which listings posted successfully
4. **Resume Posting**: Continue with failed listings only

## Error Messages Reference

### Common Error Codes

#### Import Errors
```
GLE001: Invalid JSON format
- Check JSON syntax with validator
- Ensure proper quotes and commas

GLE002: Missing required fields  
- Add title, description, price to all listings
- Check data format specification

GLE003: Data validation failed
- Review field formats and lengths
- Verify image URLs are accessible
```

#### Platform Errors
```
PLE001: Login required
- Log into platform in new tab
- Clear cookies and login again

PLE002: Form submission failed
- Platform may have updated interface
- Try manual posting to test platform

PLE003: Rate limit exceeded
- Reduce posting frequency
- Wait before retrying
```

#### Network Errors
```
NLE001: Connection timeout
- Check internet connection  
- Try again later

NLE002: Server not responding
- Platform may be down
- Check platform status page
```

## Advanced Troubleshooting

### Debug Mode

**Enable Debug Logging**:
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Type: `localStorage.setItem('gistDebug', 'true')`
4. Reload extension

**View Debug Logs**:
1. Check Console tab for detailed logs
2. Look for specific error messages
3. Note timing and sequence of events

### Extension Storage Issues

**Clear Extension Data**:
```javascript
// In Chrome DevTools Console:
chrome.storage.local.clear(() => {
    console.log('Extension data cleared');
});
```

**Export Data Before Clearing**:
```javascript  
chrome.storage.local.get(null, (data) => {
    console.log('Extension data:', JSON.stringify(data, null, 2));
    // Copy output to save your data
});
```

### Platform-Specific Debugging

#### Check Content Script Injection
```javascript
// In platform tab console:
if (window.craigslistScript) {
    console.log('Craigslist script loaded');
} else {
    console.log('Content script not loaded');
}
```

#### Test Form Detection
```javascript
// Check if forms are detected correctly:
console.log('Title field:', document.querySelector('input[name*="title"]'));
console.log('Price field:', document.querySelector('input[name*="price"]'));
```

## Getting Help

### Self-Help Resources

1. **Extension Console**: Check for error messages
2. **Browser Console**: Look for detailed technical errors  
3. **Network Tab**: Monitor failed requests
4. **Platform Status**: Check if platforms are operational

### Documentation Links

- **Data Format**: Check `docs/data-format.md`
- **Installation**: Review `docs/installation-guide.md`
- **Usage Guide**: Reference `docs/usage-tutorial.md`
- **API Docs**: For developers integrating with extension

### Contacting Support

**Before Contacting Support, Gather**:
- Chrome version (`chrome://version/`)
- Extension version (from extensions page)
- Specific error messages (screenshot)
- Steps to reproduce the problem
- Which platforms are affected

**Support Channels**:
- **Email**: support@gistlist.app
- **GitHub Issues**: Report bugs with full details
- **Community Forum**: Ask questions and share solutions

### Bug Reports

**Effective Bug Report Template**:
```
## Bug Description
Brief description of the issue

## Steps to Reproduce  
1. Step one
2. Step two  
3. Step three

## Expected Behavior
What should have happened

## Actual Behavior
What actually happened

## Environment
- Chrome Version: 
- Extension Version:
- Operating System:
- Affected Platforms:

## Screenshots/Logs
Attach relevant screenshots or console logs
```

## Prevention Tips

### Regular Maintenance
1. **Update Chrome**: Keep browser updated
2. **Clear Cache**: Weekly cache clearing
3. **Monitor Platforms**: Watch for platform changes
4. **Test Periodically**: Regular functionality checks

### Best Practices
1. **Start Small**: Test with few listings first
2. **Stay Logged In**: Keep platform sessions active
3. **Monitor Progress**: Don't leave large batches unattended
4. **Backup Data**: Save important listings externally

### Red Flags to Watch For
- ⚠️ Unusual error patterns across multiple platforms
- ⚠️ Sudden changes in platform behavior
- ⚠️ Consistent login failures
- ⚠️ Performance degradation over time

---

## Still Need Help?

If this guide doesn't solve your issue:

1. **Search GitHub Issues**: Others may have encountered similar problems
2. **Check for Updates**: Ensure you have the latest extension version
3. **Contact Support**: Provide detailed information about your issue
4. **Community Discussion**: Join our Discord for real-time help

Remember: Most issues can be resolved with basic troubleshooting steps. When in doubt, try the "turn it off and on again" approach with the extension! 🔄
