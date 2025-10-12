// Facebook Marketplace Content Script for Gist List Extension

class FacebookContentScript extends BaseContentScript {
    constructor() {
        super('facebook');
        this.postingUrls = ['/marketplace/create', '/marketplace/item', '/sell'];
        this.categoryMappings = this.getCategoryMappings();
        this.isReady = true;
        this.log('Facebook Marketplace content script initialized');
    }

    async checkLoginStatus() {
        // Check for user profile indicators
        const loginIndicators = [
            '[data-testid="blue_bar_profile_link"]',
            '[aria-label*="Your profile"]',
            'div[data-click="profile_icon"]',
            '.fbxWelcomeText',
            '[data-testid="nav_account_switcher"]'
        ];

        for (const selector of loginIndicators) {
            if (document.querySelector(selector)) {
                return true;
            }
        }

        // Check for login form as negative indicator
        const loginForm = document.querySelector('#loginform, [data-testid="royal_login_form"]');
        return !loginForm;
    }

    isOnPostingPage() {
        const url = this.getCurrentUrl();
        return this.postingUrls.some(postingUrl => url.includes(postingUrl)) ||
               url.includes('marketplace/create') ||
               document.querySelector('[data-testid*="marketplace-composer"]') !== null;
    }

    async navigateToPostingPage() {
        if (this.isOnPostingPage()) return;

        // Navigate to marketplace first if not there
        if (!window.location.href.includes('marketplace')) {
            // Look for marketplace link in navigation
            const marketplaceLinks = document.querySelectorAll('a[href*="/marketplace"]');
            
            if (marketplaceLinks.length > 0) {
                marketplaceLinks[0].click();
                await this.waitForPageLoad();
                await this.delay(2000);
            } else {
                // Navigate directly to marketplace
                this.navigateToUrl('https://www.facebook.com/marketplace/');
                await this.waitForPageLoad();
                await this.delay(2000);
            }
        }

        // Look for create listing button
        const createButtons = [
            'a[href*="/marketplace/create"]',
            '[data-testid*="create-listing"]',
            '[aria-label*="Create new listing"]',
            'div[data-click*="marketplace_create"]'
        ];

        for (const selector of createButtons) {
            try {
                const button = document.querySelector(selector);
                if (button) {
                    button.click();
                    await this.waitForPageLoad();
                    await this.delay(2000);
                    return;
                }
            } catch (error) {
                continue;
            }
        }

        // Direct navigation to create page
        this.navigateToUrl('https://www.facebook.com/marketplace/create/');
        await this.waitForPageLoad();
        await this.delay(2000);
    }

    async fillTitle(title) {
        const selectors = [
            'input[placeholder*="What are you selling?" i]',
            'input[aria-label*="title" i]',
            '[data-testid*="marketplace-title"] input',
            'input[name="title"]',
            '.marketplace-title-input input'
        ];

        // Facebook Marketplace title limits
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
        
        throw new Error('Could not find title field on Facebook Marketplace');
    }

    async fillDescription(description) {
        const selectors = [
            'textarea[placeholder*="Describe your item" i]',
            'textarea[aria-label*="description" i]',
            '[data-testid*="marketplace-description"] textarea',
            'textarea[name="description"]',
            '.marketplace-description-input textarea',
            'div[contenteditable="true"]' // Rich text editor
        ];

        for (const selector of selectors) {
            try {
                const element = await this.waitForElement(selector, 3000);
                
                if (element.contentEditable === 'true') {
                    // Handle Facebook's rich text editor
                    element.focus();
                    element.innerHTML = description.replace(/\n/g, '<br>');
                    
                    // Trigger input events
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    await this.fillInputField(selector, description);
                }
                
                this.log(`Filled description (${description.length} chars)`);
                return;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Could not find description field on Facebook Marketplace');
    }

    async fillPrice(price) {
        const selectors = [
            'input[placeholder*="Price" i]',
            'input[aria-label*="price" i]',
            '[data-testid*="marketplace-price"] input',
            'input[name="price"]',
            '.marketplace-price-input input'
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
        
        throw new Error('Could not find price field on Facebook Marketplace');
    }

    async selectCategory(category) {
        try {
            // Facebook has category selection via dropdown or buttons
            await this.openCategorySelector();
            await this.delay(1000);
            await this.selectCategoryOption(category);
        } catch (error) {
            this.log(`Category selection failed: ${error.message}`);
            throw error;
        }
    }

    async openCategorySelector() {
        const categorySelectors = [
            '[aria-label*="Category"]',
            '[data-testid*="category-selector"]',
            'div[role="button"][aria-haspopup="listbox"]',
            '.marketplace-category-selector'
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

    async selectCategoryOption(category) {
        const mappedCategory = this.mapCategory(category);
        
        // Look for category options in dropdown
        const categoryOptions = document.querySelectorAll('[role="option"], .marketplace-category-option, div[data-value]');
        
        for (const option of categoryOptions) {
            const optionText = option.textContent.toLowerCase();
            if (optionText.includes(mappedCategory.toLowerCase()) ||
                optionText.includes(category.toLowerCase())) {
                option.click();
                await this.delay(500);
                this.log(`Selected category: ${mappedCategory}`);
                
                // Handle subcategory if it appears
                await this.delay(1000);
                await this.selectSubCategoryOption(category);
                return;
            }
        }

        // Fallback to first available category
        if (categoryOptions.length > 0) {
            categoryOptions[0].click();
            this.log('Selected fallback category');
        }
    }

    async selectSubCategoryOption(category) {
        try {
            // Look for subcategory dropdown that might appear
            const subCategoryOptions = document.querySelectorAll('[role="option"], .marketplace-subcategory-option');
            
            if (subCategoryOptions.length === 0) {
                this.log('No subcategory options available');
                return;
            }

            const subCategory = this.getSubCategory(category);
            
            for (const option of subCategoryOptions) {
                if (option.textContent.toLowerCase().includes(subCategory.toLowerCase())) {
                    option.click();
                    await this.delay(500);
                    this.log(`Selected subcategory: ${subCategory}`);
                    return;
                }
            }
        } catch (error) {
            this.log(`Subcategory selection failed: ${error.message}`);
        }
    }

    async fillCondition(condition) {
        try {
            // Facebook Marketplace condition selection
            const conditionSelectors = [
                '[aria-label*="Condition"]',
                '[data-testid*="condition-selector"]',
                '.marketplace-condition-selector'
            ];

            for (const selector of conditionSelectors) {
                try {
                    await this.clickElement(selector);
                    await this.delay(1000);
                    
                    // Select condition from dropdown
                    await this.selectConditionOption(condition);
                    return;
                } catch (error) {
                    continue;
                }
            }

            this.log('Condition selector not found');
        } catch (error) {
            this.log(`Condition selection failed: ${error.message}`);
        }
    }

    async selectConditionOption(condition) {
        const conditionMap = {
            'new': 'New',
            'like new': 'Like New',
            'excellent': 'Good',
            'good': 'Good',
            'fair': 'Fair',
            'poor': 'Poor',
            'used': 'Good'
        };

        const mappedCondition = conditionMap[condition.toLowerCase()] || 'Good';
        
        const conditionOptions = document.querySelectorAll('[role="option"]');
        
        for (const option of conditionOptions) {
            if (option.textContent.toLowerCase().includes(mappedCondition.toLowerCase())) {
                option.click();
                this.log(`Selected condition: ${mappedCondition}`);
                return;
            }
        }
    }

    async uploadImages(images) {
        try {
            const fileInputSelectors = [
                'input[type="file"][accept*="image"]',
                '[data-testid*="photo-upload"] input[type="file"]',
                '.marketplace-photo-upload input[type="file"]'
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
                // Try clicking add photos button
                const addPhotoButtons = [
                    '[aria-label*="Add Photos"]',
                    '[data-testid*="add-photo"]',
                    '.marketplace-add-photos'
                ];

                for (const selector of addPhotoButtons) {
                    try {
                        await this.clickElement(selector);
                        await this.delay(2000);
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

            // Facebook Marketplace allows multiple images
            const maxImages = 10; // Facebook typical limit
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
                    await this.delay(3000 * dataTransfer.files.length);
                    this.log(`Uploaded ${dataTransfer.files.length} images`);
                }
            } else {
                // Individual upload
                for (let i = 0; i < imagesToUpload.length; i++) {
                    try {
                        await this.uploadImageFile(fileInput, imagesToUpload[i]);
                        await this.delay(3000);
                        this.log(`Uploaded image ${i + 1}/${imagesToUpload.length}`);

                        // Look for add more photos button
                        if (i < imagesToUpload.length - 1) {
                            const addMoreBtn = document.querySelector('[aria-label*="Add Photos"], [data-testid*="add-photo"]');
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
        // Set location/delivery options
        await this.setLocationAndDelivery(listing);
        
        // Set availability
        await this.setAvailability();
        
        // Handle any Facebook-specific fields
        await this.handleFacebookSpecificFields(listing);
    }

    async setLocationAndDelivery(listing) {
        try {
            // Facebook auto-detects location, but we can set pickup/delivery preferences
            const deliveryOptions = [
                '[aria-label*="Pickup"]',
                '[data-testid*="pickup-option"]',
                'input[type="checkbox"][value*="pickup"]'
            ];

            for (const selector of deliveryOptions) {
                try {
                    const checkbox = document.querySelector(selector);
                    if (checkbox && !checkbox.checked) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                        this.log('Enabled pickup option');
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            // Enable delivery if shipping cost provided
            if (listing.shippingCost && parseFloat(listing.shippingCost) > 0) {
                const deliveryCheckbox = document.querySelector('[aria-label*="Delivery"], input[value*="delivery"]');
                if (deliveryCheckbox) {
                    deliveryCheckbox.checked = true;
                    deliveryCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                    this.log('Enabled delivery option');
                }
            }

        } catch (error) {
            this.log(`Location/delivery setup failed: ${error.message}`);
        }
    }

    async setAvailability() {
        try {
            // Mark item as available
            const availabilityCheckbox = document.querySelector('[aria-label*="Available"], input[name*="available"]');
            if (availabilityCheckbox) {
                availabilityCheckbox.checked = true;
                availabilityCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                this.log('Set item as available');
            }
        } catch (error) {
            this.log(`Availability setup failed: ${error.message}`);
        }
    }

    async handleFacebookSpecificFields(listing) {
        try {
            // Handle any additional Facebook-specific fields
            // Brand, model, year for vehicles, etc.
            
            if (listing.brand) {
                const brandInput = document.querySelector('input[aria-label*="Brand"], input[name*="brand"]');
                if (brandInput) {
                    await this.fillInputField(brandInput, listing.brand);
                    this.log(`Filled brand: ${listing.brand}`);
                }
            }
        } catch (error) {
            this.log(`Facebook-specific fields failed: ${error.message}`);
        }
    }

    async submitForm() {
        try {
            const submitSelectors = [
                '[aria-label*="Publish"]',
                '[data-testid*="publish"]',
                'div[role="button"][aria-label*="Post"]',
                'button[type="submit"]',
                '.marketplace-publish-button'
            ];

            let submitButton = null;
            for (const selector of submitSelectors) {
                try {
                    submitButton = await this.waitForElement(selector, 3000);
                    if (submitButton && !submitButton.getAttribute('aria-disabled')) break;
                } catch (error) {
                    continue;
                }
            }

            if (!submitButton) {
                // Look for button with publish text
                submitButton = Array.from(document.querySelectorAll('div[role="button"], button')).find(btn =>
                    btn.textContent.toLowerCase().includes('publish') ||
                    btn.textContent.toLowerCase().includes('post') ||
                    btn.getAttribute('aria-label')?.toLowerCase().includes('publish')
                );
            }

            if (!submitButton || submitButton.getAttribute('aria-disabled') === 'true') {
                throw new Error('Publish button not found or disabled');
            }

            submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.delay(1000);
            
            submitButton.click();
            this.log('Clicked publish button');

            // Wait for processing (Facebook can take time)
            await this.delay(8000);

            // Check for success
            const currentUrl = this.getCurrentUrl();
            const success = currentUrl.includes('/marketplace/item/') || 
                          currentUrl.includes('/item/') ||
                          document.querySelector('[data-testid*="success"]') ||
                          document.body.textContent.toLowerCase().includes('posted') ||
                          document.body.textContent.toLowerCase().includes('published');

            if (success) {
                this.log('Posting appears successful');
                return {
                    success: true,
                    message: 'Posted successfully to Facebook Marketplace',
                    url: currentUrl
                };
            } else {
                // Check for errors
                const errorElements = document.querySelectorAll('[data-testid*="error"], div[role="alert"]');
                if (errorElements.length > 0) {
                    const errorMessage = errorElements[0].textContent.trim();
                    throw new Error(`Facebook error: ${errorMessage}`);
                }

                return {
                    success: true,
                    message: 'Posted to Facebook Marketplace (status unclear)',
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
            'vehicles': 'Vehicles',
            'car': 'Vehicles',
            'auto': 'Vehicles',
            'automotive': 'Vehicles',
            'property': 'Property Rentals',
            'real estate': 'Property Rentals',
            'rental': 'Property Rentals',
            'electronics': 'Electronics',
            'clothing': 'Clothing & Accessories',
            'clothes': 'Clothing & Accessories',
            'fashion': 'Clothing & Accessories',
            'shoes': 'Clothing & Accessories',
            'accessories': 'Clothing & Accessories',
            'jewelry': 'Clothing & Accessories',
            'home': 'Home & Garden',
            'furniture': 'Home & Garden',
            'garden': 'Home & Garden',
            'appliances': 'Home & Garden',
            'decor': 'Home & Garden',
            'entertainment': 'Entertainment',
            'games': 'Entertainment',
            'books': 'Entertainment',
            'music': 'Entertainment',
            'movies': 'Entertainment',
            'family': 'Family',
            'baby': 'Family',
            'kids': 'Family',
            'toys': 'Family',
            'hobbies': 'Hobbies',
            'sports': 'Hobbies',
            'sporting': 'Hobbies',
            'fitness': 'Hobbies',
            'musical': 'Hobbies',
            'instruments': 'Hobbies',
            'pet': 'Pet Supplies',
            'pets': 'Pet Supplies',
            'office': 'Office Supplies',
            'business': 'Office Supplies',
            'other': 'Other'
        };
    }

    getSubCategory(category) {
        const subCategories = {
            'phone': 'Cell Phones',
            'laptop': 'Computers',
            'tablet': 'Tablets',
            'tv': 'TVs',
            'camera': 'Cameras',
            'gaming': 'Video Games',
            'furniture': 'Furniture',
            'appliance': 'Appliances',
            'clothing': 'Clothing',
            'shoes': 'Shoes',
            'jewelry': 'Jewelry'
        };

        return subCategories[category.toLowerCase()] || 'Other';
    }
}

// Initialize the content script
const facebookScript = new FacebookContentScript();