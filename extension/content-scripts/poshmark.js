// Poshmark Content Script for Gist List Extension

class PoshmarkContentScript extends BaseContentScript {
    constructor() {
        super('poshmark');
        this.postingUrls = ['/create-listing', '/sell', '/list'];
        this.categoryMappings = this.getCategoryMappings();
        this.sizeMappings = this.getSizeMappings();
        this.brandMappings = this.getBrandMappings();
        this.isReady = true;
        this.log('Poshmark content script initialized');
    }

    async checkLoginStatus() {
        // Check for user profile indicators
        const loginIndicators = [
            '.user-image',
            '.profile-pic',
            '[data-test-id*="user"]',
            '.header-profile',
            'a[href*="/closet/"]'
        ];

        for (const selector of loginIndicators) {
            if (document.querySelector(selector)) {
                return true;
            }
        }

        // Check for sign in button as negative indicator
        const signInButton = document.querySelector('.sign-in, .login, [data-test-id*="sign-in"]');
        return !signInButton;
    }

    isOnPostingPage() {
        const url = this.getCurrentUrl();
        return this.postingUrls.some(postingUrl => url.includes(postingUrl)) ||
               document.querySelector('.create-listing, [data-test-id*="create-listing"]') !== null;
    }

    async navigateToPostingPage() {
        if (this.isOnPostingPage()) return;

        // Look for sell/create listing button
        const sellButtons = [
            'a[href*="/create-listing"]',
            'button[data-test-id*="sell"]',
            '.sell-button',
            'a[href*="/sell"]'
        ];

        for (const selector of sellButtons) {
            try {
                const button = document.querySelector(selector);
                if (button) {
                    button.click();
                    await this.waitForPageLoad();
                    return;
                }
            } catch (error) {
                continue;
            }
        }

        // Navigate directly
        this.navigateToUrl('https://poshmark.com/create-listing');
        await this.waitForPageLoad();
    }

    async fillTitle(title) {
        const selectors = [
            'input[data-test-id*="title"]',
            'input[name*="title"]',
            '#listing-title',
            '.title-input input',
            'input[placeholder*="title" i]'
        ];

        // Poshmark has character limits for titles
        const truncatedTitle = this.sanitizeText(title).substring(0, 80);

        for (const selector of selectors) {
            try {
                await this.fillInputField(selector, truncatedTitle);
                this.log(`Filled title: ${truncatedTitle}`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find title field on Poshmark');
    }

    async fillDescription(description) {
        const selectors = [
            'textarea[data-test-id*="description"]',
            'textarea[name*="description"]',
            '#description',
            '.description-input textarea',
            'textarea[placeholder*="description" i]'
        ];

        for (const selector of selectors) {
            try {
                await this.fillInputField(selector, description);
                this.log(`Filled description (${description.length} chars)`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find description field on Poshmark');
    }

    async fillPrice(price) {
        const selectors = [
            'input[data-test-id*="price"]',
            'input[name*="price"]',
            '#price',
            '.price-input input',
            'input[placeholder*="price" i]'
        ];

        const formattedPrice = Math.max(3, this.formatPrice(price)); // Poshmark minimum $3

        for (const selector of selectors) {
            try {
                await this.fillInputField(selector, formattedPrice.toString());
                this.log(`Filled price: $${formattedPrice}`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find price field on Poshmark');
    }

    async selectCategory(category) {
        try {
            // Poshmark has a multi-step category selection
            await this.selectMainCategory(category);
            await this.delay(1000);
            await this.selectSubCategory(category);
            await this.delay(1000);
            await this.selectSize(category);
        } catch (error) {
            this.log(`Category selection failed: ${error.message}`);
            throw error;
        }
    }

    async selectMainCategory(category) {
        const selectors = [
            'select[data-test-id*="category"]',
            'select[name*="category"]',
            '#category-select',
            '.category-dropdown select'
        ];

        const mappedCategory = this.mapCategory(category);

        for (const selector of selectors) {
            try {
                await this.selectDropdownOption(selector, mappedCategory);
                this.log(`Selected main category: ${mappedCategory}`);
                return;
            } catch (error) {
                continue;
            }
        }

        // Try clicking category buttons instead of dropdown
        const categoryButtons = document.querySelectorAll('.category-option, [data-test-id*="category-option"]');
        for (const button of categoryButtons) {
            if (button.textContent.toLowerCase().includes(mappedCategory.toLowerCase())) {
                button.click();
                await this.delay(500);
                this.log(`Selected category button: ${mappedCategory}`);
                return;
            }
        }

        throw new Error('Main category selection failed');
    }

    async selectSubCategory(category) {
        try {
            const subCategorySelectors = [
                'select[data-test-id*="subcategory"]',
                'select[name*="subcategory"]',
                '#subcategory-select'
            ];

            const subCategory = this.getSubCategory(category);

            for (const selector of subCategorySelectors) {
                try {
                    await this.selectDropdownOption(selector, subCategory);
                    this.log(`Selected sub-category: ${subCategory}`);
                    return;
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            this.log(`Sub-category selection failed: ${error.message}`);
        }
    }

    async selectSize(category) {
        try {
            if (!this.isSizedCategory(category)) {
                this.log('Category does not require size selection');
                return;
            }

            const sizeSelectors = [
                'select[data-test-id*="size"]',
                'select[name*="size"]',
                '#size-select'
            ];

            // Default to medium/one size for listings without specific size
            const defaultSize = this.getDefaultSize(category);

            for (const selector of sizeSelectors) {
                try {
                    await this.selectDropdownOption(selector, defaultSize);
                    this.log(`Selected size: ${defaultSize}`);
                    return;
                } catch (error) {
                    continue;
                }
            }

            // Try size buttons
            const sizeButtons = document.querySelectorAll('.size-option, [data-test-id*="size-option"]');
            for (const button of sizeButtons) {
                if (button.textContent.toLowerCase().includes(defaultSize.toLowerCase())) {
                    button.click();
                    this.log(`Selected size button: ${defaultSize}`);
                    return;
                }
            }

        } catch (error) {
            this.log(`Size selection failed: ${error.message}`);
        }
    }

    async fillCondition(condition) {
        const selectors = [
            'select[data-test-id*="condition"]',
            'select[name*="condition"]',
            '#condition-select'
        ];

        const conditionMap = {
            'new': 'NWT',
            'new with tags': 'NWT',
            'like new': 'NWOT',
            'excellent': 'EUC',
            'good': 'GUC',
            'fair': 'Fair',
            'poor': 'Poor',
            'used': 'GUC' // Default used to Good Used Condition
        };

        const mappedCondition = conditionMap[condition.toLowerCase()] || 'GUC';

        for (const selector of selectors) {
            try {
                await this.selectDropdownOption(selector, mappedCondition);
                this.log(`Set condition: ${mappedCondition}`);
                return;
            } catch (error) {
                continue;
            }
        }

        this.log('Condition field not found');
    }

    async uploadImages(images) {
        try {
            const fileInputSelectors = [
                'input[type="file"][data-test-id*="photo"]',
                'input[type="file"][accept*="image"]',
                '.photo-upload input[type="file"]',
                '[data-test-id*="upload"] input[type="file"]'
            ];

            let fileInput = null;
            for (const selector of fileInputSelectors) {
                try {
                    fileInput = await this.waitForElement(selector, 3000);
                    break;
                } catch (error) {
                    continue;
                }
            }

            if (!fileInput) {
                // Try clicking upload area
                const uploadAreas = [
                    '.add-photos',
                    '[data-test-id*="add-photo"]',
                    '.photo-upload-area'
                ];

                for (const selector of uploadAreas) {
                    try {
                        await this.clickElement(selector);
                        await this.delay(1000);
                        fileInput = document.querySelector('input[type="file"][accept*="image"]');
                        if (fileInput) break;
                    } catch (error) {
                        continue;
                    }
                }
            }

            if (!fileInput) {
                this.log('Image upload field not found');
                return;
            }

            // Poshmark allows up to 16 photos
            const maxImages = 16;
            const imagesToUpload = images.slice(0, maxImages);

            // Upload images one by one or as batch
            if (fileInput.multiple) {
                // Batch upload
                const dataTransfer = new DataTransfer();
                
                for (const imageUrl of imagesToUpload) {
                    try {
                        const response = await fetch(imageUrl);
                        const blob = await response.blob();
                        const fileName = imageUrl.split('/').pop() || `image_${Date.now()}.jpg`;
                        const file = new File([blob], fileName, { type: blob.type });
                        dataTransfer.items.add(file);
                    } catch (error) {
                        this.log(`Failed to process image: ${imageUrl}`);
                    }
                }

                if (dataTransfer.files.length > 0) {
                    fileInput.files = dataTransfer.files;
                    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    await this.delay(2000 * dataTransfer.files.length);
                    this.log(`Uploaded ${dataTransfer.files.length} images`);
                }
            } else {
                // Individual upload
                for (let i = 0; i < imagesToUpload.length; i++) {
                    try {
                        await this.uploadImageFile(fileInput, imagesToUpload[i]);
                        await this.delay(3000); // Wait for processing
                        this.log(`Uploaded image ${i + 1}/${imagesToUpload.length}`);

                        // Look for next file input
                        if (i < imagesToUpload.length - 1) {
                            const nextInput = document.querySelector('input[type="file"]:not([disabled])');
                            if (nextInput) fileInput = nextInput;
                        }
                    } catch (error) {
                        this.log(`Failed to upload image ${i + 1}: ${error.message}`);
                    }
                }
            }

        } catch (error) {
            this.log(`Image upload failed: ${error.message}`);
        }
    }

    async fillPlatformSpecificFields(listing) {
        // Fill brand
        if (listing.brand) {
            await this.selectBrand(listing.brand);
        }

        // Fill color
        if (listing.color) {
            await this.selectColor(listing.color);
        }

        // Set shipping discount (Poshmark feature)
        await this.setShippingDiscount();
    }

    async selectBrand(brand) {
        try {
            const brandSelectors = [
                'input[data-test-id*="brand"]',
                'input[name*="brand"]',
                '#brand-input',
                '.brand-input input'
            ];

            // Poshmark has auto-complete for brands
            for (const selector of brandSelectors) {
                try {
                    const input = await this.waitForElement(selector, 3000);
                    
                    // Type brand name
                    await this.fillInputField(selector, brand, 'type');
                    await this.delay(1000);

                    // Look for auto-complete suggestions
                    const suggestions = document.querySelectorAll('.suggestion, [data-test-id*="suggestion"], .brand-option');
                    
                    for (const suggestion of suggestions) {
                        if (suggestion.textContent.toLowerCase().includes(brand.toLowerCase())) {
                            suggestion.click();
                            this.log(`Selected brand: ${brand}`);
                            return;
                        }
                    }

                    // If no suggestion found, keep the typed value
                    this.log(`Brand typed: ${brand} (no auto-complete match)`);
                    return;

                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            this.log(`Brand selection failed: ${error.message}`);
        }
    }

    async selectColor(color) {
        try {
            const colorSelectors = [
                'select[data-test-id*="color"]',
                'select[name*="color"]',
                '#color-select'
            ];

            const normalizedColor = this.normalizeColor(color);

            for (const selector of colorSelectors) {
                try {
                    await this.selectDropdownOption(selector, normalizedColor);
                    this.log(`Selected color: ${normalizedColor}`);
                    return;
                } catch (error) {
                    continue;
                }
            }

            // Try color buttons
            const colorButtons = document.querySelectorAll('.color-option, [data-test-id*="color"]');
            for (const button of colorButtons) {
                if (button.getAttribute('data-color') === normalizedColor ||
                    button.textContent.toLowerCase().includes(normalizedColor.toLowerCase())) {
                    button.click();
                    this.log(`Selected color button: ${normalizedColor}`);
                    return;
                }
            }

        } catch (error) {
            this.log(`Color selection failed: ${error.message}`);
        }
    }

    async setShippingDiscount() {
        try {
            // Enable shipping discount if available
            const shippingDiscountCheckbox = document.querySelector('input[data-test-id*="shipping-discount"], input[name*="shipping_discount"]');
            if (shippingDiscountCheckbox) {
                shippingDiscountCheckbox.checked = true;
                shippingDiscountCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                this.log('Enabled shipping discount');
            }
        } catch (error) {
            this.log(`Shipping discount setup failed: ${error.message}`);
        }
    }

    async submitForm() {
        try {
            const submitSelectors = [
                'button[data-test-id*="list"]',
                'button[data-test-id*="submit"]',
                'button[type="submit"]',
                '.list-button',
                'button[class*="submit"]'
            ];

            let submitButton = null;
            for (const selector of submitSelectors) {
                try {
                    submitButton = await this.waitForElement(selector, 3000);
                    if (submitButton && !submitButton.disabled) break;
                } catch (error) {
                    continue;
                }
            }

            if (!submitButton) {
                submitButton = Array.from(document.querySelectorAll('button')).find(btn =>
                    btn.textContent.toLowerCase().includes('list') ||
                    btn.textContent.toLowerCase().includes('submit')
                );
            }

            if (!submitButton || submitButton.disabled) {
                throw new Error('Submit button not found or disabled');
            }

            submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.delay(1000);
            
            submitButton.click();
            this.log('Clicked submit button');

            // Wait for processing
            await this.delay(5000);

            // Check for success
            const currentUrl = this.getCurrentUrl();
            const success = currentUrl.includes('/closet/') || 
                          document.querySelector('.success, [data-test-id*="success"]') ||
                          document.body.textContent.toLowerCase().includes('listed');

            if (success) {
                this.log('Posting appears successful');
                return {
                    success: true,
                    message: 'Posted successfully to Poshmark',
                    url: currentUrl
                };
            } else {
                const errorElements = document.querySelectorAll('.error, [data-test-id*="error"]');
                if (errorElements.length > 0) {
                    const errorMessage = errorElements[0].textContent.trim();
                    throw new Error(`Poshmark error: ${errorMessage}`);
                }

                return {
                    success: true,
                    message: 'Posted to Poshmark (status unclear)',
                    url: currentUrl
                };
            }

        } catch (error) {
            this.error('Submit failed', error);
            return {
                success: false,
                message: error.message,
                url: this.getCurrentUrl()
            };
        }
    }

    mapCategory(category) {
        if (!category) return 'Women';
        
        const normalized = category.toLowerCase();
        return this.categoryMappings[normalized] || 'Women';
    }

    getCategoryMappings() {
        return {
            'women': 'Women',
            'womens': 'Women',
            'men': 'Men',
            'mens': 'Men',
            'kids': 'Kids',
            'children': 'Kids',
            'home': 'Home',
            'pets': 'Pets',
            'clothing': 'Women',
            'clothes': 'Women',
            'fashion': 'Women',
            'accessories': 'Women',
            'jewelry': 'Women',
            'shoes': 'Women',
            'bags': 'Women',
            'makeup': 'Women',
            'beauty': 'Women'
        };
    }

    getSubCategory(category) {
        const subCategories = {
            'dress': 'Dresses',
            'shirt': 'Tops',
            'blouse': 'Tops',
            'pants': 'Pants',
            'jeans': 'Jeans',
            'shoes': 'Shoes',
            'sneakers': 'Sneakers',
            'boots': 'Boots',
            'jacket': 'Jackets & Coats',
            'coat': 'Jackets & Coats',
            'bag': 'Bags',
            'purse': 'Bags',
            'jewelry': 'Jewelry'
        };

        return subCategories[category.toLowerCase()] || 'Other';
    }

    isSizedCategory(category) {
        const sizedCategories = ['clothing', 'clothes', 'dress', 'shirt', 'pants', 'shoes'];
        return sizedCategories.some(cat => category.toLowerCase().includes(cat));
    }

    getDefaultSize(category) {
        if (category.toLowerCase().includes('shoe')) {
            return '8';
        }
        return 'M';
    }

    normalizeColor(color) {
        const colorMap = {
            'red': 'Red',
            'blue': 'Blue',
            'green': 'Green',
            'black': 'Black',
            'white': 'White',
            'gray': 'Gray',
            'grey': 'Gray',
            'pink': 'Pink',
            'purple': 'Purple',
            'yellow': 'Yellow',
            'orange': 'Orange',
            'brown': 'Brown',
            'tan': 'Tan',
            'beige': 'Cream',
            'navy': 'Blue'
        };

        return colorMap[color.toLowerCase()] || 'Multi';
    }

    getSizeMappings() {
        return {
            'xs': 'XS',
            'extra small': 'XS',
            's': 'S',
            'small': 'S',
            'm': 'M',
            'medium': 'M',
            'l': 'L',
            'large': 'L',
            'xl': 'XL',
            'extra large': 'XL',
            'xxl': 'XXL',
            '2xl': 'XXL'
        };
    }

    getBrandMappings() {
        return {
            // Add common brand mappings if needed
            'nike': 'Nike',
            'adidas': 'Adidas',
            'zara': 'Zara',
            'h&m': 'H&M'
        };
    }
}

// Initialize the content script
const poshmarkScript = new PoshmarkContentScript();