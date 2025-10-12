# Test Photo Fixtures

This directory contains test photos for Playwright E2E tests.

## Required Test Photos

To run the photo workflow tests, you need to add the following test images to this directory:

### 1. Clear/Accepted Photos
- `clear-serial-number.jpg` - Clear, well-lit photo of a serial number tag
- `face-paint-detail.jpg` - Clear close-up of face paint or detailed surface
- `original-box.jpg` - Photo of original packaging
- `accessories-complete.jpg` - Photo showing all accessories

### 2. Rejected Photos (Quality Issues)
- `blurry-image.jpg` - Out of focus, blurry photo
- `dark-lighting.jpg` - Underexposed, poorly lit photo
- `wrong-subject.jpg` - Clear photo but of wrong item/detail

## Photo Requirements

### Accepted Photos Should:
- Be well-lit (no dark shadows or overexposure)
- Be in focus (sharp details, not blurry)
- Show the correct subject matter
- Be at least 640x480 resolution
- Be in JPEG or PNG format
- Be under 10MB file size

### Rejected Photos Should:
- Deliberately have quality issues
- Be used to test rejection workflows
- Trigger specific error messages

## Creating Test Photos

### Option 1: Use Real Product Photos
1. Take photos with your phone/camera following the requirements
2. Resize to 1024x768 or smaller
3. Name according to the list above
4. Place in this directory

### Option 2: Use Stock Photos
1. Download from free stock photo sites (Unsplash, Pexels)
2. Edit to create "bad" versions (blur, darken)
3. Name according to the list above
4. Place in this directory

### Option 3: Generate Placeholder Images
For basic testing without real photos:

```bash
# Using ImageMagick (if installed)
convert -size 1024x768 xc:white -pointsize 48 -fill black \
  -draw "text 400,384 'Clear Serial Number'" \
  clear-serial-number.jpg

convert -size 1024x768 xc:white -blur 0x8 -pointsize 48 -fill black \
  -draw "text 400,384 'Blurry Image'" \
  blurry-image.jpg

convert -size 1024x768 xc:gray30 -pointsize 48 -fill gray50 \
  -draw "text 400,384 'Dark Lighting'" \
  dark-lighting.jpg
```

### Option 4: Skip Photo Tests
If you don't have test photos yet, you can:
1. Comment out the photo upload tests in `tests/e2e/photo-workflow.spec.ts`
2. Or add `.skip` to those tests:
   ```typescript
   test.skip('Photo upload test', async ({ page }) => {
     // Test code
   });
   ```

## File Structure

```
tests/fixtures/photos/
├── README.md (this file)
├── clear-serial-number.jpg
├── face-paint-detail.jpg
├── original-box.jpg
├── accessories-complete.jpg
├── blurry-image.jpg
├── dark-lighting.jpg
└── wrong-subject.jpg
```

## Usage in Tests

Tests reference these photos using relative paths:

```typescript
const testPhotoPath = path.join(__dirname, '../fixtures/photos/clear-serial-number.jpg');
await fileChooser.setFiles(testPhotoPath);
```

## Important Notes

- **DO NOT commit real product photos** with identifiable information
- Keep file sizes reasonable (<2MB per image)
- Use generic test content (no personal/sensitive data)
- Update this README if you add new test photo requirements
