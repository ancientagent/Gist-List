// eBay Content Script for Gist List Extension

class EbayContentScript extends BaseContentScript {
    constructor() {
        super('ebay');
        this.postingUrls = ['/sell/create', '/sl/sell', '/sell'];
        this.categoryMappings = this.getCategoryMappings();
        this.isReady = true;
        this.log('eBay content script initialized');
    }

    async checkLoginStatus() {
        // Check for user account indicators
        const loginIndicators = [
            '#gh-ug',
            '.gh-ua',
            '[data-test-id*="user-menu"]',
            '.user-info',
            '#user-id'
        ];

        for (const selector of loginIndicators) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim() !== 'Sign in') {
                return true;
            }
        }

        // Check for sign in link as negative indicator
        const signInButton = document.querySelector('a[href*="signin"], .signin');
        return !signInButton;
    }

    isOnPostingPage() {
        const url = this.getCurrentUrl();
        return this.postingUrls.some(postingUrl => url.includes(postingUrl)) ||
               url.includes('sell.ebay') ||
               document.querySelector('#CreateListing, .create-listing') !== null;
    }

    async navigateToPostingPage() {
        if (this.isOnPostingPage()) return;

        // Look for sell link in header
        const sellLinks = [
            'a[href*="/sell/create"]',
            'a[href*="/sell"]',
            '#sell-link',
            '.sell-link'
        ];

        for (const selector of sellLinks) {
            try {
                const link = document.querySelector(selector);
                if (link && link.textContent.toLowerCase().includes('sell')) {
                    link.click();
                    await this.waitForPageLoad();
                    return;
                }
            } catch (error) {
                continue;
            }
        }

        // Navigate directly
        this.navigateToUrl('https://www.ebay.com/sell/create');
        await this.waitForPageLoad();
    }

    async fillTitle(title) {
        const selectors = [
            '#x-ebay-listing-title-field',
            'input[name="title"]',
            'input[data-testid*="title"]',
            '#title-field',
            '.title-input input'
        ];

        // eBay has character limits for titles (80 chars)
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
        
        throw new Error('Could not find title field on eBay');
    }

    async fillDescription(description) {
        const selectors = [
            '#x-ebay-listing-description-field',
            'textarea[name="description"]',
            '#description-field',
            '.description-input textarea',
            'iframe[title*="description"]' // Rich text editor iframe
        ];

        for (const selector of selectors) {
            try {
                const element = await this.waitForElement(selector, 3000);
                
                if (element.tagName.toLowerCase() === 'iframe') {
                    // Handle iframe editor
                    const iframeDoc = element.contentDocument || element.contentWindow.document;
                    const body = iframeDoc.querySelector('body, [contenteditable="true"]');
                    if (body) {
                        body.innerHTML = description.replace(/\n/g, '<br>');
                        body.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } else {
                    await this.fillInputField(selector, description);
                }
                
                this.log(`Filled description (${description.length} chars)`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find description field on eBay');
    }

    async fillPrice(price) {
        const selectors = [
            '#x-price-textbox',
            'input[name="price"]',
            'input[data-testid*="price"]',
            '#price-field',
            '.price-input input'
        ];

        const formattedPrice = this.formatPrice(price);

        for (const selector of selectors) {
            try {
                await this.fillInputField(selector, formattedPrice);
                this.log(`Filled price: $${formattedPrice}`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find price field on eBay');
    }

    async selectCategory(category) {
        try {
            // eBay has a complex category selection process
            await this.openCategorySelector();
            await this.delay(1000);
            await this.selectCategoryFromTree(category);
        } catch (error) {
            this.log(`Category selection failed: ${error.message}`);
            throw error;
        }
    }

    async openCategorySelector() {
        const categorySelectors = [
            '#categorySelector',
            '.category-selector',
            '#x-category-btn',
            'button[data-testid*="category"]'
        ];

        for (const selector of categorySelectors) {
            try {
                await this.clickElement(selector);
                await this.delay(1000);
                this.log('Opened category selector');
                return;
            } catch (error) {
                continue;
            }
        }

        throw new Error('Could not open category selector');
    }

    async selectCategoryFromTree(category) {
        const mappedCategory = this.mapCategory(category);
        
        // First level category selection
        const categoryElements = document.querySelectorAll('.category-link, .cat-link, [data-testid*="category"]');
        
        for (const element of categoryElements) {
            if (element.textContent.toLowerCase().includes(mappedCategory.toLowerCase())) {
                element.click();
                await this.delay(1000);
                this.log(`Selected category: ${mappedCategory}`);
                
                // Look for subcategory if available
                await this.selectSubCategoryFromTree(category);
                return;
            }
        }

        // If exact match not found, try similar categories
        const similarCategories = this.getSimilarCategories(mappedCategory);
        for (const similarCategory of similarCategories) {
            for (const element of categoryElements) {
                if (element.textContent.toLowerCase().includes(similarCategory.toLowerCase())) {
                    element.click();
                    await this.delay(1000);
                    this.log(`Selected similar category: ${similarCategory}`);
                    return;
                }
            }
        }

        throw new Error(`Category ${mappedCategory} not found in eBay category tree`);
    }

    async selectSubCategoryFromTree(category) {
        try {
            // Wait for subcategory options to load
            await this.delay(1000);
            
            const subCategoryElements = document.querySelectorAll('.subcategory-link, .subcat-link');
            const subcategory = this.getSubCategory(category);
            
            for (const element of subCategoryElements) {
                if (element.textContent.toLowerCase().includes(subcategory.toLowerCase())) {
                    element.click();
                    await this.delay(500);
                    this.log(`Selected subcategory: ${subcategory}`);
                    return;
                }
            }
        } catch (error) {
            this.log(`Subcategory selection failed: ${error.message}`);
        }
    }

    async fillCondition(condition) {
        const selectors = [
            '#x-condition-select',
            'select[name="condition"]',
            'select[data-testid*="condition"]',
            '#condition-dropdown'
        ];

        const conditionMap = {
            'new': 'New',
            'new with box': 'New with box',
            'new without box': 'New without box',
            'new with tags': 'New with tags',
            'new without tags': 'New without tags',
            'used': 'Used',
            'excellent': 'Used',
            'good': 'Used',
            'fair': 'Used',
            'poor': 'For parts or not working',
            'refurbished': 'Seller refurbished'
        };

        const mappedCondition = conditionMap[condition.toLowerCase()] || 'Used';

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
                '#x-photo-upload',
                'input[type="file"][accept*="image"]',
                '.photo-upload input[type="file"]',
                '#file-input'
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
                    '.photo-upload-area',
                    '#add-photos-btn'
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

            // eBay allows up to 12 photos for most listings
            const maxImages = 12;
            const imagesToUpload = images.slice(0, maxImages);

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
                    // Wait longer for eBay's image processing
                    await this.delay(3000 * dataTransfer.files.length);
                    this.log(`Uploaded ${dataTransfer.files.length} images`);
                }
            } else {
                // Individual upload
                for (let i = 0; i < imagesToUpload.length; i++) {
                    try {
                        await this.uploadImageFile(fileInput, imagesToUpload[i]);
                        await this.delay(4000); // eBay needs more time for processing
                        this.log(`Uploaded image ${i + 1}/${imagesToUpload.length}`);

                        // Look for next file input or add photo button
                        if (i < imagesToUpload.length - 1) {
                            const addMoreBtn = document.querySelector('.add-more-photos, #add-photo-btn');
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
            }

        } catch (error) {
            this.log(`Image upload failed: ${error.message}`);
        }
    }

    async fillPlatformSpecificFields(listing) {
        // Set listing format (Auction vs Buy It Now)
        await this.setListingFormat(listing);

        // Fill brand if provided
        if (listing.brand) {
            await this.fillBrand(listing.brand);
        }

        // Set shipping options
        await this.setShippingOptions(listing);

        // Set return policy
        await this.setReturnPolicy();
    }

    async setListingFormat(listing) {
        try {
            // Default to Buy It Now for consistent pricing
            const buyItNowRadio = document.querySelector('input[value="FixedPriceItem"], input[name="format"][value="buy-it-now"]');
            if (buyItNowRadio) {
                buyItNowRadio.checked = true;
                buyItNowRadio.dispatchEvent(new Event('change', { bubbles: true }));
                this.log('Set listing format to Buy It Now');
            }
        } catch (error) {
            this.log(`Listing format setup failed: ${error.message}`);
        }
    }

    async fillBrand(brand) {
        try {
            const brandSelectors = [
                'input[name="brand"]',
                '#brand-field',
                'input[data-testid*="brand"]'
            ];

            for (const selector of brandSelectors) {
                try {
                    await this.fillInputField(selector, brand);
                    this.log(`Filled brand: ${brand}`);
                    return;
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            this.log(`Brand filling failed: ${error.message}`);
        }
    }

    async setShippingOptions(listing) {
        try {
            // Set shipping cost
            const shippingCost = listing.shippingCost || '0.00';
            const shippingSelectors = [
                '#shipping-cost',
                'input[name="shipping_cost"]',
                'input[data-testid*="shipping"]'
            ];

            for (const selector of shippingSelectors) {
                try {
                    await this.fillInputField(selector, shippingCost);
                    this.log(`Set shipping cost: $${shippingCost}`);
                    break;
                } catch (error) {
                    continue;
                }
            }

            // Enable calculated shipping if free shipping not set
            if (parseFloat(shippingCost) === 0) {
                const freeShippingCheckbox = document.querySelector('input[name="free_shipping"], #free-shipping');
                if (freeShippingCheckbox) {
                    freeShippingCheckbox.checked = true;
                    freeShippingCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                    this.log('Enabled free shipping');
                }
            }

        } catch (error) {
            this.log(`Shipping setup failed: ${error.message}`);
        }
    }

    async setReturnPolicy() {
        try {
            // Set a standard return policy
            const returnPolicySelectors = [
                'select[name="return_policy"]',
                '#return-policy-select'
            ];

            for (const selector of returnPolicySelectors) {
                try {
                    await this.selectDropdownOption(selector, '30 days');
                    this.log('Set return policy to 30 days');
                    break;
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            this.log(`Return policy setup failed: ${error.message}`);
        }
    }

    async submitForm() {
        try {
            const submitSelectors = [
                '#x-submit-btn',
                'button[type="submit"]',
                '#list-item-btn',
                '.list-item-button',
                'button[data-testid*="submit"]'
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
                    btn.textContent.toLowerCase().includes('list item') ||
                    btn.textContent.toLowerCase().includes('submit') ||
                    btn.textContent.toLowerCase().includes('create listing')
                );
            }

            if (!submitButton || submitButton.disabled) {
                throw new Error('Submit button not found or disabled');
            }

            submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.delay(1000);
            
            submitButton.click();
            this.log('Clicked submit button');

            // Wait for processing (eBay can take longer)
            await this.delay(8000);

            // Check for success
            const currentUrl = this.getCurrentUrl();
            const success = currentUrl.includes('/sell/success') || 
                          currentUrl.includes('/itm/') ||
                          document.querySelector('.success-message, .listing-success') ||
                          document.body.textContent.toLowerCase().includes('congratulations');

            if (success) {
                this.log('Posting appears successful');
                
                // Try to extract listing URL
                const listingUrl = this.extractListingUrl();
                
                return {
                    success: true,
                    message: 'Posted successfully to eBay',
                    url: listingUrl || currentUrl
                };
            } else {
                // Check for errors
                const errorElements = document.querySelectorAll('.error-message, .field-error, [data-testid*="error"]');
                if (errorElements.length > 0) {
                    const errorMessage = errorElements[0].textContent.trim();
                    throw new Error(`eBay error: ${errorMessage}`);
                }

                return {
                    success: true,
                    message: 'Posted to eBay (status unclear)',
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

    extractListingUrl() {
        // Try to find listing URL in success page
        const listingLinks = document.querySelectorAll('a[href*="/itm/"]');
        if (listingLinks.length > 0) {
            return listingLinks[0].href;
        }

        // Check for listing ID in page content
        const listingIdMatch = document.body.textContent.match(/Item number:?\s*(\d+)/i);
        if (listingIdMatch) {
            return `https://www.ebay.com/itm/${listingIdMatch[1]}`;
        }

        return null;
    }

    mapCategory(category) {
        if (!category) return 'Business & Industrial';
        
        const normalized = category.toLowerCase();
        return this.categoryMappings[normalized] || 'Business & Industrial';
    }

    getCategoryMappings() {
        return {
            'electronics': 'Consumer Electronics',
            'computers': 'Computers/Tablets & Networking',
            'phones': 'Cell Phones & Accessories',
            'clothing': 'Clothing, Shoes & Accessories',
            'fashion': 'Clothing, Shoes & Accessories',
            'shoes': 'Clothing, Shoes & Accessories',
            'jewelry': 'Jewelry & Watches',
            'watches': 'Jewelry & Watches',
            'books': 'Books',
            'music': 'Music',
            'movies': 'Movies & TV',
            'games': 'Toys & Hobbies',
            'toys': 'Toys & Hobbies',
            'sports': 'Sporting Goods',
            'automotive': 'eBay Motors',
            'car': 'eBay Motors',
            'auto': 'eBay Motors',
            'home': 'Home & Garden',
            'garden': 'Home & Garden',
            'tools': 'Business & Industrial',
            'art': 'Art',
            'antiques': 'Antiques',
            'collectibles': 'Collectibles',
            'crafts': 'Crafts',
            'beauty': 'Health & Beauty',
            'health': 'Health & Beauty'
        };
    }

    getSubCategory(category) {
        const subCategories = {
            'laptop': 'Laptops & Netbooks',
            'phone': 'Cell Phones & Smartphones',
            'tablet': 'iPads, Tablets & eBook Readers',
            'camera': 'Cameras & Photo',
            'tv': 'TV, Video & Home Audio',
            'furniture': 'Furniture',
            'appliances': 'Major Appliances'
        };

        return subCategories[category.toLowerCase()] || '';
    }

    getSimilarCategories(category) {
        const similarMap = {
            'electronics': ['Consumer Electronics', 'Computers', 'Cell Phones'],
            'clothing': ['Fashion', 'Apparel', 'Shoes'],
            'home': ['Home & Garden', 'Furniture', 'Decor'],
            'automotive': ['Motors', 'Car', 'Vehicle'],
            'books': ['Media', 'Literature', 'Educational']
        };

        return similarMap[category.toLowerCase()] || [];
    }
}

// Initialize the content script
const ebayScript = new EbayContentScript();