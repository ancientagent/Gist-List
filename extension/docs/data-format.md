# Gist List Data Format Specification

## Overview
This document describes the data format used for synchronizing listings between the phone app and the Chrome extension.

## File Format
- **Format**: JSON
- **Encoding**: UTF-8
- **File Extension**: `.json`
- **MIME Type**: `application/json`

## Data Structure

### Root Object
```json
{
  "version": "1.0",
  "exportedAt": 1703875200000,
  "exportedBy": "gist-list-mobile-app",
  "listings": [...]
}
```

### Listing Object
Each listing must contain the following structure:

#### Required Fields
```json
{
  "id": "unique_listing_identifier",
  "title": "Product Title (max 100 characters)",
  "description": "Product description (max 2000 characters)",
  "price": 99.99
}
```

#### Optional Fields
```json
{
  "category": "electronics",
  "condition": "excellent",
  "brand": "Apple",
  "model": "iPhone 13",
  "size": "M",
  "color": "black",
  "year": 2023,
  "location": "San Francisco, CA",
  "shippingCost": 5.99,
  "images": ["url1", "url2", ...],
  "createdAt": 1703875200000,
  "updatedAt": 1703875200000
}
```

## Field Specifications

### Required Fields

| Field | Type | Max Length | Description |
|-------|------|------------|-------------|
| `id` | string | 50 | Unique identifier for the listing |
| `title` | string | 100 | Product title/name |
| `description` | string | 2000 | Detailed product description |
| `price` | number | - | Price in USD (positive number) |

### Optional Fields

| Field | Type | Max Length | Description | Valid Values |
|-------|------|------------|-------------|--------------|
| `category` | string | 50 | Product category | Any string |
| `condition` | string | 20 | Item condition | `new`, `like new`, `excellent`, `good`, `fair`, `poor`, `used` |
| `brand` | string | 50 | Brand name | Any string |
| `model` | string | 50 | Model name/number | Any string |
| `size` | string | 20 | Size (clothing, shoes, etc.) | Any string |
| `color` | string | 30 | Primary color | Any string |
| `year` | number | - | Year manufactured | 1900 - current year + 1 |
| `location` | string | 100 | Geographic location | Any string |
| `shippingCost` | number | - | Shipping cost in USD | Non-negative number |
| `images` | array | - | Array of image URLs | Max 20 URLs |
| `createdAt` | number | - | Creation timestamp | Unix timestamp (milliseconds) |
| `updatedAt` | number | - | Last update timestamp | Unix timestamp (milliseconds) |

## Image Requirements

- **Supported formats**: JPG, JPEG, PNG, WebP
- **Maximum images per listing**: 20
- **URL format**: Must be valid HTTP/HTTPS URLs
- **Recommended resolution**: 800x600 minimum, 1920x1920 maximum

## Category Mappings

The extension maps categories to platform-specific categories. Common categories include:

- `electronics`
- `clothing`
- `furniture`
- `automotive`
- `books`
- `music`
- `sports`
- `toys`
- `home`
- `beauty`
- `jewelry`
- `art`
- `collectibles`
- `general`

## Sample Data

### Complete Example
```json
{
  "version": "1.0",
  "exportedAt": 1703875200000,
  "exportedBy": "gist-list-mobile-app",
  "listings": [
    {
      "id": "listing_001",
      "title": "Vintage Leather Jacket",
      "description": "Genuine leather jacket in excellent condition. Size Medium. Perfect for fall and winter weather. No tears or scratches.",
      "price": 89.99,
      "category": "clothing",
      "condition": "excellent",
      "brand": "Wilson Leather",
      "size": "M",
      "color": "brown",
      "location": "San Francisco, CA",
      "shippingCost": 12.99,
      "images": [
        "https://pimg.bucklecontent.com/images/products/10400110OW389/BR/f/930efb1b437159666f51d058b0b6b74fv3?quality=0.8&width=845",
        "https://images.pexels.com/photos/11861125/pexels-photo-11861125.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500",
        "https://media.istockphoto.com/id/468491140/photo/close-up-of-black-leather-jacket-details.jpg?s=612x612&w=0&k=20&c=QXxiMm4jNRKjF7fz0nWoJTkrU23r0DVC5txCPL6zAE8="
      ],
      "createdAt": 1703875200000,
      "updatedAt": 1703875200000
    },
    {
      "id": "listing_002",
      "title": "iPhone 13 Pro Max 128GB",
      "description": "Unlocked iPhone 13 Pro Max in Space Gray. 128GB storage. Includes original box, charger, and unused EarPods. Battery health 98%.",
      "price": 799.00,
      "category": "electronics",
      "condition": "like new",
      "brand": "Apple",
      "model": "iPhone 13 Pro Max",
      "color": "space gray",
      "year": 2021,
      "location": "Los Angeles, CA",
      "images": [
        "https://i.ytimg.com/vi/1f8DjYyi9Lg/sddefault.jpg",
        "https://i.ytimg.com/vi/4o0mRxtTwds/maxresdefault.jpg"
      ],
      "createdAt": 1703875100000,
      "updatedAt": 1703875200000
    }
  ]
}
```

### Minimal Example
```json
{
  "version": "1.0",
  "listings": [
    {
      "id": "simple_001",
      "title": "Coffee Mug",
      "description": "Nice ceramic coffee mug, barely used.",
      "price": 5.99
    }
  ]
}
```

## Synchronization Methods

### 1. File Import
- Export JSON file from phone app
- Import file through extension interface
- Most reliable method

### 2. QR Code (Future)
- Generate QR code containing listing data
- Scan QR code with extension
- Good for small datasets

### 3. Cloud Storage (Future)
- Google Drive integration
- Dropbox integration
- Automatic synchronization

### 4. Share URL (Future)
- Generate temporary shareable URLs
- Access through extension
- Good for one-time transfers

## Error Handling

### Common Validation Errors
- **Missing required fields**: Title, description, or price is empty
- **Invalid price**: Negative numbers or non-numeric values
- **Invalid images**: Malformed URLs or unsupported formats
- **Data too large**: Exceeds maximum limits

### Error Response Format
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "listingId": "listing_001",
      "field": "price",
      "message": "Price must be a positive number"
    }
  ]
}
```

## Platform-Specific Considerations

### Craigslist
- No login required
- Category mapping important
- Location fields useful
- Image limits vary by area

### eBay
- Requires eBay account
- Complex category hierarchy
- Brand and model fields important
- Condition field required

### Facebook Marketplace
- Requires Facebook account
- Location-based selling
- Category selection required
- Image quality important

### Poshmark (Fashion)
- Brand field critical
- Size and color required for clothing
- Condition field important
- Multiple images recommended

### Reverb (Music Gear)
- Brand and model critical
- Year field useful
- Condition affects pricing
- Technical descriptions valued

### Mercari
- Brand field useful
- Condition affects visibility
- Competitive pricing important
- Clear images essential

### Nextdoor
- Location-based community selling
- Pickup preferred over shipping
- Local categories
- Community trust important

## Best Practices

### For Phone App Developers
1. Always include required fields
2. Validate data before export
3. Optimize images for web
4. Use consistent category names
5. Include creation timestamps

### For Users
1. Review listings before importing
2. Ensure image URLs are accessible
3. Keep descriptions concise but detailed
4. Use appropriate categories
5. Set competitive prices

## Version History

- **v1.0**: Initial format specification
- Future versions will maintain backward compatibility

## Support

For questions about the data format or integration issues, please refer to the extension documentation or contact support.
