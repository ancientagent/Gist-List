// Nextdoor Content Script for Gist List Extension

class NextdoorContentScript extends BaseContentScript {
    constructor() {
        super('nextdoor');
        this.postingUrls = ['/for_sale_and_free', '/post', '/sell'];
        this.categoryMappings = this.getCategoryMappings();
        this.isReady = true;
        this.log('Nextdoor content script initialized');
    }

    async checkLoginStatus() {
        // Check for user profile indicators
        const loginIndicators = [
            '.profile-photo',
            '.user-avatar',
            '[data-testid*="profile"]',
            '.navbar-profile',
            'img[alt*="profile"]'
        ];

        for (const selector of loginIndicators) {
            if (document.querySelector(selector)) {
                return true;
            }
        }

        // Check for login/signup buttons as negative indicators
        const loginButton = document.querySelector('[data-testid*="sign-in"], .login-button, .sign-up');
        return !loginButton;
    }

    isOnPostingPage() {
        const url = this.getCurrentUrl();
        return this.postingUrls.some(postingUrl => url.includes(postingUrl)) ||
               url.includes('create-post') ||
               document.querySelector('.create-post, [data-testid*="create-post"]') !== null;
    }

    async navigateToPostingPage() {
        if (this.isOnPostingPage()) return;

        // Look for "For Sale & Free" link or post button
        const sellLinks = [
            'a[href*="for_sale_and_free"]',
            'a[href*="/sell"]',
            '.for-sale-link',
            '[data-testid*="for-sale"]'
        ];

        for (const selector of sellLinks) {
            try {
                const link = document.querySelector(selector);
                if (link) {
                    link.click();
                    await this.waitForPageLoad();
                    
                    // Look for create post button after navigation
                    await this.delay(2000);
                    const createPostBtn = document.querySelector('.create-post-btn, [data-testid*="create-post"], button[class*="post"]');
                    if (createPostBtn) {
                        createPostBtn.click();
                        await this.delay(2000);
                    }
                    
                    return;
                }
            } catch (error) {
                continue;
            }
        }

        // Try direct navigation to for sale section
        this.navigateToUrl(`${window.location.origin}/for_sale_and_free/`);
        await this.waitForPageLoad();
        await this.delay(2000);
        
        // Click create post after navigation
        const createPostBtn = document.querySelector('.create-post-btn, [data-testid*="create-post"]');
        if (createPostBtn) {
            createPostBtn.click();
            await this.delay(2000);
        }
    }

    async fillTitle(title) {
        const selectors = [
            'input[name*="title"]',
            'input[placeholder*="title" i]',
            '[data-testid*="title"] input',
            '#post-title',
            '.title-input input',
            'input[aria-label*="title" i]'
        ];

        for (const selector of selectors) {
            try {
                await this.fillInputField(selector, this.sanitizeText(title));
                this.log(`Filled title: ${title}`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find title field on Nextdoor');
    }

    async fillDescription(description) {
        const selectors = [
            'textarea[name*="description"]',
            'textarea[placeholder*="description" i]',
            '[data-testid*="description"] textarea',
            '#post-description',
            '.description-input textarea',
            'textarea[aria-label*="description" i]',
            '[contenteditable="true"]' // Rich text editor
        ];

        for (const selector of selectors) {
            try {
                const element = await this.waitForElement(selector, 3000);
                
                if (element.contentEditable === 'true') {
                    // Handle rich text editor
                    element.innerHTML = description.replace(/\n/g, '<br>');
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    await this.fillInputField(selector, description);
                }
                
                this.log(`Filled description (${description.length} chars)`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find description field on Nextdoor');
    }

    async fillPrice(price) {
        const selectors = [
            'input[name*="price"]',
            'input[placeholder*="price" i]',
            '[data-testid*="price"] input',
            '#price',
            '.price-input input',
            'input[aria-label*="price" i]'
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
        
        // Price might be optional for some categories
        this.log('Price field not found (might be optional for free items)');
    }

    async selectCategory(category) {
        try {
            // First, ensure we're posting in For Sale section
            await this.selectForSaleCategory();
            
            // Then select specific category
            const selectors = [
                'select[name*="category"]',
                '[data-testid*="category"] select',
                '#category-select',
                '.category-dropdown select'
            ];

            const mappedCategory = this.mapCategory(category);

            for (const selector of selectors) {
                try {
                    await this.selectDropdownOption(selector, mappedCategory);
                    this.log(`Selected category: ${mappedCategory}`);
                    return;
                } catch (error) {
                    continue;
                }
            }

            // Try category buttons/pills
            const categoryButtons = document.querySelectorAll('.category-option, [data-testid*="category-option"], button[class*="category"]');
            for (const button of categoryButtons) {
                if (button.textContent.toLowerCase().includes(mappedCategory.toLowerCase())) {
                    button.click();
                    await this.delay(500);
                    this.log(`Selected category button: ${mappedCategory}`);
                    return;
                }
            }

            this.log(`Category selection completed with fallback: ${mappedCategory}`);
            
        } catch (error) {
            this.log(`Category selection failed: ${error.message}`);
        }
    }

    async selectForSaleCategory() {
        try {
            // Look for "For Sale" or "Sell" category in main post type selection
            const postTypeButtons = document.querySelectorAll('button[class*="post-type"], [data-testid*="post-type"], .post-category');
            
            for (const button of postTypeButtons) {
                const buttonText = button.textContent.toLowerCase();
                if (buttonText.includes('for sale') || 
                    buttonText.includes('sell') || 
                    buttonText.includes('marketplace')) {
                    button.click();
                    await this.delay(1000);
                    this.log('Selected "For Sale" post type');
                    return;
                }
            }
        } catch (error) {
            this.log(`For Sale category selection failed: ${error.message}`);
        }
    }

    async fillCondition(condition) {
        const selectors = [
            'select[name*="condition"]',
            '[data-testid*="condition"] select',
            '#condition-select'
        ];

        const conditionMap = {
            'new': 'New',
            'like new': 'Like New',
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
                'input[type="file"][accept*="image"]',
                '[data-testid*="photo"] input[type="file"]',
                '.photo-upload input[type="file"]',
                '#image-upload',
                'input[name*="image"]'
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
                // Try clicking upload area or add photo button
                const uploadTriggers = [
                    '.add-photo',
                    '.photo-upload-area',
                    '[data-testid*="add-photo"]',
                    'button[class*="photo"]',
                    '.upload-photos'
                ];

                for (const selector of uploadTriggers) {
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

            // Nextdoor typically allows multiple images
            const maxImages = 10; // Nextdoor typical limit
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
                    await this.delay(2000 * dataTransfer.files.length);
                    this.log(`Uploaded ${dataTransfer.files.length} images`);
                }
            } else {
                // Individual upload
                for (let i = 0; i < imagesToUpload.length; i++) {
                    try {
                        await this.uploadImageFile(fileInput, imagesToUpload[i]);
                        await this.delay(2000);
                        this.log(`Uploaded image ${i + 1}/${imagesToUpload.length}`);

                        // Look for next file input or add more button
                        if (i < imagesToUpload.length - 1) {
                            const addMoreBtn = document.querySelector('.add-more-photos, [data-testid*="add-more"]');
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
        // Set pickup/delivery preferences
        await this.setDeliveryOptions(listing);
        
        // Add location if not automatically detected
        if (listing.location) {
            await this.setLocation(listing.location);
        }

        // Set availability
        await this.setAvailability();
    }

    async setDeliveryOptions(listing) {
        try {
            // Nextdoor typically offers pickup options for local sales
            const deliveryOptions = [
                'input[name*="pickup"]',
                'input[value*="pickup"]',
                '[data-testid*="pickup"] input[type="checkbox"]'
            ];

            for (const selector of deliveryOptions) {
                try {
                    const checkbox = document.querySelector(selector);
                    if (checkbox) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                        this.log('Enabled pickup option');
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            // Enable delivery if shipping cost is provided
            if (listing.shippingCost && parseFloat(listing.shippingCost) > 0) {
                const deliveryCheckbox = document.querySelector('input[name*="delivery"], input[value*="delivery"]');
                if (deliveryCheckbox) {
                    deliveryCheckbox.checked = true;
                    deliveryCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                    this.log('Enabled delivery option');
                }
            }

        } catch (error) {
            this.log(`Delivery options setup failed: ${error.message}`);
        }
    }

    async setLocation(location) {
        try {
            const locationSelectors = [
                'input[name*="location"]',
                'input[placeholder*="location" i]',
                '[data-testid*="location"] input'
            ];

            for (const selector of locationSelectors) {
                try {
                    await this.fillInputField(selector, location);
                    this.log(`Set location: ${location}`);
                    return;
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            this.log(`Location setup failed: ${error.message}`);
        }
    }

    async setAvailability() {
        try {
            // Set item as available
            const availabilityCheckbox = document.querySelector('input[name*="available"], input[value*="available"]');
            if (availabilityCheckbox) {
                availabilityCheckbox.checked = true;
                availabilityCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                this.log('Set item as available');
            }
        } catch (error) {
            this.log(`Availability setup failed: ${error.message}`);
        }
    }

    async submitForm() {
        try {
            const submitSelectors = [
                'button[type="submit"]',
                '[data-testid*="post"], [data-testid*="submit"]',
                'button[class*="post"]',
                'button[class*="submit"]',
                '.post-button',
                '.submit-button'
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
                    btn.textContent.toLowerCase().includes('post') ||
                    btn.textContent.toLowerCase().includes('submit') ||
                    btn.textContent.toLowerCase().includes('publish')
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
            const success = currentUrl.includes('/for_sale_and_free') || 
                          currentUrl !== window.location.href ||
                          document.querySelector('.success, [data-testid*="success"]') ||
                          document.body.textContent.toLowerCase().includes('posted');

            if (success) {
                this.log('Posting appears successful');
                return {
                    success: true,
                    message: 'Posted successfully to Nextdoor',
                    url: currentUrl
                };
            } else {
                // Check for errors
                const errorElements = document.querySelectorAll('.error, [data-testid*="error"], .field-error');
                if (errorElements.length > 0) {
                    const errorMessage = errorElements[0].textContent.trim();
                    throw new Error(`Nextdoor error: ${errorMessage}`);
                }

                return {
                    success: true,
                    message: 'Posted to Nextdoor (status unclear)',
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
        if (!category) return 'General';
        
        const normalized = category.toLowerCase();
        return this.categoryMappings[normalized] || 'General';
    }

    getCategoryMappings() {
        return {
            'electronics': 'Electronics',
            'furniture': 'Furniture',
            'appliances': 'Appliances',
            'clothing': 'Clothing & Accessories',
            'clothes': 'Clothing & Accessories',
            'fashion': 'Clothing & Accessories',
            'accessories': 'Clothing & Accessories',
            'jewelry': 'Clothing & Accessories',
            'books': 'Books & Media',
            'media': 'Books & Media',
            'music': 'Books & Media',
            'movies': 'Books & Media',
            'games': 'Toys & Games',
            'toys': 'Toys & Games',
            'sports': 'Sports & Recreation',
            'sporting': 'Sports & Recreation',
            'exercise': 'Sports & Recreation',
            'fitness': 'Sports & Recreation',
            'automotive': 'Automotive',
            'car': 'Automotive',
            'auto': 'Automotive',
            'vehicle': 'Automotive',
            'home': 'Home & Garden',
            'garden': 'Home & Garden',
            'tools': 'Tools',
            'art': 'Art & Collectibles',
            'collectibles': 'Art & Collectibles',
            'antiques': 'Art & Collectibles',
            'baby': 'Baby & Kids',
            'kids': 'Baby & Kids',
            'children': 'Baby & Kids',
            'pets': 'Pet Supplies',
            'pet': 'Pet Supplies',
            'beauty': 'Health & Beauty',
            'health': 'Health & Beauty',
            'tickets': 'Tickets & Events',
            'events': 'Tickets & Events',
            'general': 'General',
            'other': 'General',
            'miscellaneous': 'General'
        };
    }
}

// Initialize the content script
const nextdoorScript = new NextdoorContentScript();