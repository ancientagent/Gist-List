# Usage Tutorial - Gist List Chrome Extension

This comprehensive tutorial will guide you through using the Gist List Chrome Extension to automate posting listings across multiple reselling platforms.

## Getting Started

### Prerequisites Checklist

Before you begin, ensure you have:
- ✅ Extension installed and visible in Chrome toolbar
- ✅ Platform accounts created and logged in
- ✅ Listings data ready (JSON file from mobile app or sample data)
- ✅ Product images uploaded and accessible online

### Opening the Extension

1. **Locate the Extension Icon**
   - Look for the Gist List icon in your Chrome toolbar
   - If not visible, click the puzzle piece icon and pin Gist List

2. **Open the Extension Popup**
   - Click the Gist List icon
   - The main interface should appear in a popup window

## Part 1: Importing Listings

### Method 1: Import from Phone App (Recommended)

The primary way to use Gist List is with data from the mobile app:

1. **Export from Mobile App**
   - Open the Gist List mobile app
   - Navigate to your listings
   - Tap "Export" or "Share to Chrome Extension"
   - Choose "Export as JSON" option
   - Save the file to your device

2. **Import to Extension**
   - Click "Import Listings" in the extension popup
   - Select the JSON file you exported
   - Wait for the import process to complete
   - Review the imported listings

### Method 2: Use Sample Data (For Testing)

To test the extension without the mobile app:

1. **Generate Sample Data**
   - Click "Import Listings" 
   - Navigate to the extension folder
   - Select `docs/sample-listings.json`
   - Click "Open"

2. **Alternative: Generate Sample Data**
   - Open Chrome Developer Tools (F12)
   - Go to Console tab
   - Type: `chrome.runtime.sendMessage({action: 'generateSampleData'})`
   - Press Enter

### Method 3: Create Custom JSON File

For advanced users, create your own JSON file:

```json
{
  "version": "1.0",
  "listings": [
    {
      "id": "my-listing-001",
      "title": "Vintage Leather Jacket - Size Medium",
      "description": "Classic brown leather jacket in excellent condition. Genuine leather with soft lining. Perfect for fall and winter wear.",
      "price": 89.99,
      "category": "clothing",
      "condition": "excellent",
      "brand": "Wilson Leather",
      "size": "M",
      "color": "brown",
      "images": [
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800"
      ],
      "location": "San Francisco, CA"
    }
  ]
}
```

### Understanding Import Results

After importing, you'll see:
- **Import Summary**: Number of listings successfully imported
- **Validation Errors**: Any listings that couldn't be imported
- **Data Preview**: Your listings displayed in the interface

## Part 2: Reviewing and Managing Listings

### Listings Overview

The main interface shows:
- **Listing Count**: Total number of available listings
- **Listing Cards**: Preview of each listing with key details
- **Selection Checkboxes**: Choose which listings to post

### Editing Listings (Limited)

While the extension doesn't provide full editing capabilities, you can:
- **Select/Deselect**: Choose which listings to post
- **Review Details**: Click on listings to see full information
- **Remove**: Delete listings you don't want to post

### Best Practices for Listing Review

1. **Check Images**: Ensure all image URLs are accessible
2. **Verify Prices**: Confirm pricing is appropriate for each platform
3. **Review Categories**: Make sure categories will map correctly
4. **Validate Descriptions**: Ensure descriptions meet platform requirements

## Part 3: Platform Selection and Configuration

### Understanding Platform Status

Each platform shows a status indicator:
- 🟢 **Ready**: Logged in and ready to post
- 🔴 **Login Needed**: Must log in to the platform first
- 🟡 **Busy**: Currently processing posts

### Platform-Specific Preparation

#### eBay
- **Login Required**: Yes, must be logged into eBay
- **Seller Account**: Must have seller privileges enabled
- **Payment Method**: Payment method on file for seller fees

#### Facebook Marketplace  
- **Login Required**: Yes, Facebook account
- **Location**: Profile must have valid location set
- **Verification**: Account should be verified (phone number)

#### Poshmark
- **Login Required**: Yes, Poshmark account
- **Seller Setup**: Complete seller profile setup
- **Fashion Focus**: Best for clothing and accessories

#### Reverb
- **Login Required**: Yes, Reverb account
- **Seller Profile**: Complete musician/seller profile
- **Music Gear**: Specialized for musical instruments

#### Mercari
- **Login Required**: Yes, Mercari account  
- **Profile Complete**: Full seller profile required
- **Mobile-First**: Platform optimized for mobile

#### Nextdoor
- **Login Required**: Yes, verified Nextdoor account
- **Neighborhood**: Must be verified in your neighborhood
- **Local Focus**: For local community sales

#### Craigslist
- **Login**: Usually not required
- **Location**: Posts to your local Craigslist area
- **Verification**: Some areas require phone verification

### Preparing Platforms for Posting

1. **Log Into All Platforms**
   - Open new tabs for each platform you plan to use
   - Log in and verify your accounts are active
   - Complete any required seller setup steps

2. **Check Platform Status**
   - Return to the extension popup
   - Verify all desired platforms show "Ready" status
   - If "Login needed", complete authentication

3. **Select Your Platforms**
   - Check the boxes for platforms you want to use
   - Consider platform suitability for your items
   - Start with 2-3 platforms for your first attempt

## Part 4: Posting Process

### Starting Your First Post

1. **Select Listings**
   - Check boxes for listings you want to post
   - Or click "Select All" for all listings
   - Review your selection count

2. **Choose Platforms**
   - Select 2-3 platforms for your first attempt
   - Avoid selecting all platforms initially
   - Prioritize platforms where you have experience

3. **Initiate Posting**
   - Click "Post to Selected Platforms"
   - Confirm your selections in any dialog
   - The posting process will begin automatically

### Understanding the Posting Process

The extension performs these steps for each listing on each platform:

1. **Navigation**: Opens the platform's posting page
2. **Form Detection**: Locates all required form fields
3. **Data Entry**: Fills in title, description, price, etc.
4. **Category Selection**: Maps and selects appropriate categories
5. **Image Upload**: Uploads all provided images
6. **Validation**: Checks for any errors or missing fields
7. **Submission**: Submits the completed listing
8. **Confirmation**: Waits for success confirmation

### Monitoring Progress

During posting, you can:
- **View Progress Bar**: See overall completion percentage
- **Read Status Updates**: Current activity for each listing
- **Cancel if Needed**: Stop the process if issues arise
- **See Time Estimates**: Estimated completion time

### Handling Platform Variations

Different platforms may require:
- **Additional Fields**: Size, color, brand for fashion items
- **Different Categories**: Each platform has unique category structures
- **Specific Formats**: Different image requirements or text limits
- **Manual Steps**: Some platforms may need manual verification

## Part 5: Results and Follow-Up

### Understanding Results

After posting completes, you'll see:
- **Success Count**: How many listings posted successfully  
- **Failure Count**: How many failed and why
- **Platform Breakdown**: Success rate per platform
- **Direct Links**: Links to your posted listings

### Handling Successful Posts

For successfully posted listings:
1. **Verify Listings**: Click provided links to check listings
2. **Note URLs**: Save listing URLs for future reference
3. **Monitor Performance**: Check views, likes, messages
4. **Update Inventory**: Mark items as listed in your records

### Dealing with Failed Posts

Common failure reasons and solutions:

#### "Login Required"
- **Problem**: Not logged into the platform
- **Solution**: Log in and retry the specific listing

#### "Category Not Found"  
- **Problem**: Category mapping failed
- **Solution**: Manually post with correct category

#### "Image Upload Failed"
- **Problem**: Images not accessible or wrong format
- **Solution**: Check image URLs and formats

#### "Missing Required Field"
- **Problem**: Platform needs additional information
- **Solution**: Add missing data and retry

#### "Rate Limited"
- **Problem**: Posted too many items too quickly
- **Solution**: Wait and retry later

### Post-Posting Best Practices

1. **Verify All Listings**
   - Visit each posted listing to ensure accuracy
   - Check that images loaded correctly
   - Verify pricing and descriptions

2. **Respond to Inquiries**
   - Monitor each platform for messages
   - Respond promptly to buyer questions
   - Keep inventory status updated

3. **Track Performance**
   - Note which platforms generate most interest
   - Track time to sale on different platforms
   - Adjust pricing based on platform response

## Advanced Features

### Batch Operations

For managing multiple listings:
- **Select All**: Quick selection of all listings
- **Platform Templates**: Save platform combinations for reuse
- **Category Mapping**: Custom category assignments

### Error Recovery

When posts fail:
- **Automatic Retry**: Extension will retry failed posts
- **Manual Retry**: Retry specific listings manually
- **Error Analysis**: Detailed error information provided

### Data Management

- **Export Results**: Save posting results for records
- **Clear Data**: Remove old listings from extension
- **Backup Settings**: Save platform configurations

## Tips for Success

### Preparation Tips
1. **Quality Images**: Use high-resolution, well-lit photos
2. **Detailed Descriptions**: Include all relevant details
3. **Competitive Pricing**: Research prices on each platform
4. **Accurate Categories**: Choose the most specific category available

### Platform-Specific Tips

#### Craigslist
- Include location in title for local appeal
- Use simple, clear language
- Price competitively for quick sale

#### eBay
- Use eBay-specific keywords for searchability  
- Consider Buy It Now vs. auction format
- Factor in eBay fees when pricing

#### Facebook Marketplace
- Emphasize local pickup availability
- Use community-friendly language
- Respond quickly to messages

#### Poshmark
- Use fashion-specific terms and hashtags
- Highlight brand names prominently
- Price higher to allow for offers

### Efficiency Tips
1. **Start Small**: Begin with 2-3 platforms
2. **Test First**: Try with one listing before batch posting
3. **Monitor Progress**: Don't start large batches unsupervised
4. **Learn Patterns**: Note which platforms work best for your items

## Troubleshooting During Use

### Common Issues

#### Extension Becomes Unresponsive
- Close and reopen the popup
- Refresh the browser if necessary
- Check for browser updates

#### Platforms Not Detected as Ready
- Ensure you're logged in to all platforms
- Clear cookies and log in again
- Try logging in from incognito mode first

#### Images Not Uploading
- Verify image URLs are publicly accessible
- Check image formats (JPG, PNG preferred)
- Ensure images are not too large

## Getting Help

If you encounter issues:

1. **Built-in Help**: Click "Get Help" on any error message
2. **Error Logs**: Extension logs errors for troubleshooting
3. **Community Support**: Check GitHub issues and discussions
4. **Direct Support**: Email support@gistlist.app with specific questions

## Next Steps

After mastering the basics:
1. **Explore Advanced Features**: Custom category mapping, templates
2. **Optimize Workflow**: Develop efficient posting routines  
3. **Monitor Analytics**: Track which platforms perform best
4. **Provide Feedback**: Help improve the extension with suggestions

---

**Congratulations!** 🎉 

You now know how to effectively use Gist List to automate your reselling across multiple platforms. Start with small batches, learn the patterns, and scale up as you become more comfortable with the process.
