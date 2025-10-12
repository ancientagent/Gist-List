// Mercari Content Script for Gist List Extension

class MercariContentScript extends BaseContentScript {
    constructor() {
        super('mercari');
        this.postingUrls = ['/sell', '/list-item', '/create-listing'];
        this.categoryMappings = this.getCategoryMappings();
        this.brandMappings = this.getBrandMappings();
        this.isReady = true;
        this.log('Mercari content script initialized');
    }

    async checkLoginStatus() {
        // Check for user profile indicators
        const loginIndicators = [
            '[data-testid*="user-menu"]',
            '.user-avatar',
            '.profile-icon',
            'button[aria-label*="Profile"]',
            '[data-cy*="user"]'
        ];

        for (const selector of loginIndicators) {
            if (document.querySelector(selector)) {
                return true;
            }
        }

        // Check for login button as negative indicator
        const loginButton = document.querySelector('[data-testid*="login"], .login-button, button[aria-label*="Log in"]');
        return !loginButton;
    }

    isOnPostingPage() {
        const url = this.getCurrentUrl();
        return this.postingUrls.some(postingUrl => url.includes(postingUrl)) ||
               url.includes('create-listing') ||
               document.querySelector('.sell-form, [data-testid*="sell-form"]') !== null;
    }

    async navigateToPostingPage() {
        if (this.isOnPostingPage()) return;

        // Look for sell button
        const sellButtons = [
            'a[href*="/sell"]',
            'button[data-testid*="sell"]',
            '.sell-button',
            '[aria-label*="Sell"]'
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
        this.navigateToUrl('https://www.mercari.com/sell/');
        await this.waitForPageLoad();
    }

    async fillTitle(title) {
        const selectors = [
            'input[data-testid*="item-name"]',
            'input[name*="title"]',
            'input[placeholder*="item name" i]',
            '#item-name',
            '.item-title input'
        ];

        // Mercari has character limits for titles
        const truncatedTitle = this.sanitizeText(title).substring(0, 100);

        for (const selector of selectors) {
            try {
                await this.fillInputField(selector, truncatedTitle);
                this.log(`Filled title: ${truncatedTitle}`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find title field on Mercari');
    }

    async fillDescription(description) {
        const selectors = [
            'textarea[data-testid*="description"]',
            'textarea[name*="description"]',
            'textarea[placeholder*="description" i]',
            '#item-description',
            '.description-input textarea'
        ];

        // Mercari has character limits for descriptions
        const truncatedDescription = description.substring(0, 1000);

        for (const selector of selectors) {
            try {
                await this.fillInputField(selector, truncatedDescription);
                this.log(`Filled description (${truncatedDescription.length} chars)`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find description field on Mercari');
    }

    async fillPrice(price) {
        const selectors = [
            'input[data-testid*="price"]',
            'input[name*="price"]',
            'input[placeholder*="price" i]',
            '#price',
            '.price-input input'
        ];

        // Mercari has minimum price requirements
        const minPrice = 3; // Mercari minimum is $3
        const formattedPrice = Math.max(minPrice, this.formatPrice(price));

        for (const selector of selectors) {
            try {
                await this.fillInputField(selector, formattedPrice.toString());
                this.log(`Filled price: $${formattedPrice}`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find price field on Mercari');
    }

    async selectCategory(category) {
        try {
            // Mercari has a hierarchical category selection
            await this.selectMainCategory(category);
            await this.delay(1000);
            await this.selectSubCategory(category);
        } catch (error) {
            this.log(`Category selection failed: ${error.message}`);
            throw error;
        }
    }

    async selectMainCategory(category) {
        const selectors = [
            'select[data-testid*="category"]',
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

        // Try category buttons
        const categoryButtons = document.querySelectorAll('[data-testid*="category-option"], .category-button');
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
            // Wait for subcategory options to load
            await this.delay(1000);
            
            const subCategorySelectors = [
                'select[data-testid*="subcategory"]',
                'select[name*="subcategory"]',
                '#subcategory-select'
            ];

            const subCategory = this.getSubCategory(category);

            for (const selector of subCategorySelectors) {
                try {
                    await this.selectDropdownOption(selector, subCategory);
                    this.log(`Selected sub-category: ${subCategory}`);
                    
                    // Check for third-level category
                    await this.delay(500);
                    await this.selectThirdCategory(category);
                    return;
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            this.log(`Sub-category selection failed: ${error.message}`);
        }
    }

    async selectThirdCategory(category) {
        try {
            const thirdCategorySelectors = [
                'select[data-testid*="third-category"]',
                'select[name*="third_category"]'
            ];

            const thirdCategory = this.getThirdCategory(category);

            for (const selector of thirdCategorySelectors) {
                try {
                    await this.selectDropdownOption(selector, thirdCategory);
                    this.log(`Selected third-level category: ${thirdCategory}`);
                    return;
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            this.log(`Third-level category selection failed: ${error.message}`);
        }
    }

    async fillCondition(condition) {
        const selectors = [
            'select[data-testid*="condition"]',
            'select[name*="condition"]',
            '#condition-select'
        ];

        const conditionMap = {
            'new': 'New, unused',
            'like new': 'Like new',
            'excellent': 'Good',
            'good': 'Good',
            'fair': 'Fair',
            'poor': 'Poor',
            'used': 'Good' // Default used to good
        };

        const mappedCondition = conditionMap[condition.toLowerCase()] || 'Good';

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
                'input[type="file"][data-testid*="photo"]',
                'input[type="file"][accept*="image"]',
                '.photo-upload input[type="file"]',
                '[data-cy*="photo-upload"] input[type="file"]'
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
                    '[data-testid*="add-photo"]',
                    '.add-photos-button',
                    '.photo-upload-area',
                    'button[aria-label*="Add photo"]'
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

            // Mercari allows up to 12 photos
            const maxImages = 12;
            const imagesToUpload = images.slice(0, maxImages);

            // Upload images one by one (Mercari prefers individual uploads)
            for (let i = 0; i < imagesToUpload.length; i++) {
                try {
                    await this.uploadImageFile(fileInput, imagesToUpload[i]);
                    await this.delay(3000); // Wait for processing
                    this.log(`Uploaded image ${i + 1}/${imagesToUpload.length}`);

                    // Look for next file input or add more button
                    if (i < imagesToUpload.length - 1) {
                        const addMoreBtn = document.querySelector('[data-testid*="add-photo"], .add-more-photos');
                        if (addMoreBtn) {
                            addMoreBtn.click();
                            await this.delay(1000);
                            fileInput = document.querySelector('input[type="file"]:not([disabled])');
                        }
                    }
                } catch (error) {
                    this.log(`Failed to upload image ${i + 1}: ${error.message}`);
                }
            }

        } catch (error) {
            this.log(`Image upload failed: ${error.message}`);
        }
    }

    async fillPlatformSpecificFields(listing) {
        // Fill brand if provided
        if (listing.brand) {
            await this.selectBrand(listing.brand);
        }

        // Set size if applicable
        if (listing.size && this.isSizedCategory(listing.category)) {
            await this.selectSize(listing.size);
        }

        // Set shipping options (Mercari handles shipping)
        await this.setShippingOptions(listing);

        // Set color if provided
        if (listing.color) {
            await this.selectColor(listing.color);
        }
    }

    async selectBrand(brand) {
        try {
            const brandSelectors = [
                'input[data-testid*="brand"]',
                'input[name*="brand"]',
                '#brand-input'
            ];

            for (const selector of brandSelectors) {
                try {
                    // Type brand name for auto-complete
                    await this.fillInputField(selector, brand, 'type');
                    await this.delay(1000);

                    // Look for suggestions dropdown
                    const suggestions = document.querySelectorAll('[data-testid*="brand-suggestion"], .suggestion-item');
                    
                    for (const suggestion of suggestions) {
                        if (suggestion.textContent.toLowerCase().includes(brand.toLowerCase())) {
                            suggestion.click();
                            this.log(`Selected brand: ${brand}`);
                            return;
                        }
                    }

                    // If no suggestion, keep typed value
                    this.log(`Brand typed: ${brand}`);
                    return;

                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            this.log(`Brand selection failed: ${error.message}`);
        }
    }

    async selectSize(size) {
        try {
            const sizeSelectors = [
                'select[data-testid*="size"]',
                'select[name*="size"]',
                '#size-select'
            ];

            const normalizedSize = this.normalizeSize(size);

            for (const selector of sizeSelectors) {
                try {
                    await this.selectDropdownOption(selector, normalizedSize);
                    this.log(`Selected size: ${normalizedSize}`);
                    return;
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            this.log(`Size selection failed: ${error.message}`);
        }
    }

    async selectColor(color) {
        try {
            const colorSelectors = [
                'select[data-testid*="color"]',
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
        } catch (error) {
            this.log(`Color selection failed: ${error.message}`);
        }
    }

    async setShippingOptions(listing) {
        try {
            // Mercari typically handles shipping automatically
            // Just ensure shipping is enabled
            const shippingCheckbox = document.querySelector('input[data-testid*="shipping"], input[name*="shipping"]');
            if (shippingCheckbox) {
                shippingCheckbox.checked = true;
                shippingCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                this.log('Enabled shipping');
            }
        } catch (error) {
            this.log(`Shipping setup failed: ${error.message}`);
        }
    }

    async submitForm() {
        try {
            const submitSelectors = [
                'button[data-testid*="list"]',
                'button[data-testid*="submit"]',
                'button[type="submit"]',
                '.list-button',
                'button[aria-label*="List"]'
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
                    btn.textContent.toLowerCase().includes('submit') ||
                    btn.textContent.toLowerCase().includes('post')
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
            const success = currentUrl.includes('/item/') || 
                          currentUrl !== window.location.href ||
                          document.querySelector('[data-testid*="success"], .success-message') ||
                          document.body.textContent.toLowerCase().includes('listed');

            if (success) {
                this.log('Posting appears successful');
                return {
                    success: true,
                    message: 'Posted successfully to Mercari',
                    url: currentUrl
                };
            } else {
                // Check for errors
                const errorElements = document.querySelectorAll('[data-testid*="error"], .error-message, .field-error');
                if (errorElements.length > 0) {
                    const errorMessage = errorElements[0].textContent.trim();
                    throw new Error(`Mercari error: ${errorMessage}`);
                }

                return {
                    success: true,
                    message: 'Posted to Mercari (status unclear)',
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
        if (!category) return 'Electronics';
        
        const normalized = category.toLowerCase();
        return this.categoryMappings[normalized] || 'Electronics';
    }

    getCategoryMappings() {
        return {
            'electronics': 'Electronics',
            'women': 'Women',
            'womens': 'Women',
            'men': 'Men',
            'mens': 'Men',
            'kids': 'Kids',
            'home': 'Home',
            'beauty': 'Beauty',
            'entertainment': 'Entertainment',
            'handmade': 'Handmade',
            'vintage': 'Vintage & Collectibles',
            'sporting': 'Sporting Goods',
            'automotive': 'Automotive',
            'other': 'Other',
            'clothing': 'Women',
            'clothes': 'Women',
            'fashion': 'Women',
            'shoes': 'Women',
            'bags': 'Women',
            'jewelry': 'Women',
            'accessories': 'Women',
            'toys': 'Kids',
            'games': 'Entertainment',
            'books': 'Entertainment',
            'music': 'Entertainment',
            'movies': 'Entertainment',
            'collectibles': 'Vintage & Collectibles',
            'antiques': 'Vintage & Collectibles',
            'art': 'Handmade',
            'crafts': 'Handmade',
            'tools': 'Other',
            'appliances': 'Home',
            'furniture': 'Home',
            'decor': 'Home'
        };
    }

    getSubCategory(category) {
        const subCategories = {
            'phone': 'Cell Phones',
            'laptop': 'Computers',
            'tablet': 'Tablets',
            'camera': 'Cameras',
            'headphones': 'Audio',
            'dress': 'Dresses',
            'shirt': 'Tops',
            'pants': 'Bottoms',
            'shoes': 'Shoes',
            'bag': 'Bags',
            'jewelry': 'Jewelry',
            'watch': 'Watches',
            'makeup': 'Makeup',
            'skincare': 'Skincare',
            'book': 'Books',
            'game': 'Video Games',
            'toy': 'Toys'
        };

        return subCategories[category.toLowerCase()] || 'Other';
    }

    getThirdCategory(category) {
        // Third-level categories are very specific to Mercari
        return 'Other';
    }

    isSizedCategory(category) {
        const sizedCategories = ['clothing', 'clothes', 'shoes', 'women', 'men', 'kids'];
        return sizedCategories.some(cat => category && category.toLowerCase().includes(cat));
    }

    normalizeSize(size) {
        const sizeMap = {
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

        return sizeMap[size.toLowerCase()] || size;
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
            'navy': 'Navy',
            'beige': 'Beige'
        };

        return colorMap[color.toLowerCase()] || color;
    }

    getBrandMappings() {
        return {
            'nike': 'Nike',
            'adidas': 'adidas',
            'apple': 'Apple',
            'samsung': 'Samsung',
            'sony': 'Sony',
            'nintendo': 'Nintendo',
            'lululemon': 'lululemon',
            'coach': 'Coach',
            'michael kors': 'Michael Kors',
            'kate spade': 'Kate Spade'
        };
    }
}

// Initialize the content script
const mercariScript = new MercariContentScript();