// Reverb Content Script for Gist List Extension

class ReverbContentScript extends BaseContentScript {
    constructor() {
        super('reverb');
        this.postingUrls = ['/sell/listings/new', '/sell/draft', '/my/selling'];
        this.categoryMappings = this.getCategoryMappings();
        this.isReady = true;
        this.log('Reverb content script initialized');
    }

    async checkLoginStatus() {
        // Check for login indicators
        const loginIndicators = [
            '.user-menu',
            '.account-menu',
            '[data-testid="user-menu"]',
            '.user-avatar',
            'a[href*="/my/"]'
        ];

        for (const selector of loginIndicators) {
            if (document.querySelector(selector)) {
                return true;
            }
        }

        // Check for login button as negative indicator
        const loginButton = document.querySelector('a[href*="/login"], .login-button, [data-testid="login"]');
        return !loginButton;
    }

    isOnPostingPage() {
        const url = this.getCurrentUrl();
        return this.postingUrls.some(postingUrl => url.includes(postingUrl)) ||
               url.includes('new-listing') ||
               document.querySelector('form[class*="listing"], [data-testid="listing-form"]') !== null;
    }

    async navigateToPostingPage() {
        if (this.isOnPostingPage()) return;

        // Look for "Sell Your Gear" or similar links
        const sellLinks = document.querySelectorAll('a[href*="/sell"], .sell-link, [data-testid*="sell"]');
        
        for (const link of sellLinks) {
            if (link.textContent.toLowerCase().includes('sell') || 
                link.textContent.toLowerCase().includes('list')) {
                link.click();
                await this.waitForPageLoad();
                return;
            }
        }

        // Navigate directly
        this.navigateToUrl('https://reverb.com/sell/listings/new');
        await this.waitForPageLoad();
    }

    async fillTitle(title) {
        const selectors = [
            'input[name*="title"]',
            'input[data-testid*="title"]',
            '#listing-title',
            '.listing-title input',
            'input[placeholder*="title" i]'
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
        
        throw new Error('Could not find title field on Reverb');
    }

    async fillDescription(description) {
        const selectors = [
            'textarea[name*="description"]',
            'textarea[data-testid*="description"]',
            '#listing-description',
            '.listing-description textarea',
            'textarea[placeholder*="description" i]',
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
        
        throw new Error('Could not find description field on Reverb');
    }

    async fillPrice(price) {
        const selectors = [
            'input[name*="price"]',
            'input[data-testid*="price"]',
            '#listing-price',
            '.price-input input',
            'input[placeholder*="price" i]'
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
        
        throw new Error('Could not find price field on Reverb');
    }

    async selectCategory(category) {
        try {
            const selectors = [
                'select[name*="category"]',
                '[data-testid*="category"] select',
                '#category-select',
                '.category-select select'
            ];

            const mappedCategory = this.mapCategory(category);

            for (const selector of selectors) {
                try {
                    await this.selectDropdownOption(selector, mappedCategory);
                    this.log(`Selected category: ${mappedCategory}`);
                    
                    // Wait for sub-category dropdown to appear
                    await this.delay(1000);
                    await this.selectSubCategory(category);
                    return;
                } catch (error) {
                    continue;
                }
            }

            throw new Error('Category dropdown not found');
        } catch (error) {
            this.log(`Category selection failed: ${error.message}`);
            throw error;
        }
    }

    async selectSubCategory(category) {
        try {
            const subCategorySelectors = [
                'select[name*="subcategory"]',
                'select[name*="sub-category"]',
                '[data-testid*="subcategory"] select'
            ];

            const subCategoryMapping = this.getSubCategoryMapping(category);

            for (const selector of subCategorySelectors) {
                try {
                    await this.selectDropdownOption(selector, subCategoryMapping);
                    this.log(`Selected sub-category: ${subCategoryMapping}`);
                    return;
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            this.log(`Sub-category selection failed: ${error.message}`);
        }
    }

    async fillCondition(condition) {
        const selectors = [
            'select[name*="condition"]',
            '[data-testid*="condition"] select',
            '#condition-select'
        ];

        const conditionMap = {
            'new': 'Brand New',
            'mint': 'Mint',
            'excellent': 'Excellent',
            'very good': 'Very Good',
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
                '#photo-upload'
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
                // Try clicking photo upload area to activate file input
                const uploadAreas = [
                    '.photo-upload-area',
                    '[data-testid*="photo-upload"]',
                    '.upload-photos'
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

            // Upload images (Reverb allows multiple images)
            const maxImages = 20; // Reverb typical limit
            const imagesToUpload = images.slice(0, maxImages);

            // Create FileList with all images
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
                
                // Wait for uploads to process
                await this.delay(3000 * imagesToUpload.length);
                this.log(`Uploaded ${dataTransfer.files.length} images`);
            }

        } catch (error) {
            this.log(`Image upload failed: ${error.message}`);
        }
    }

    async fillPlatformSpecificFields(listing) {
        // Fill brand if provided
        if (listing.brand) {
            const brandSelectors = [
                'input[name*="brand"]',
                '[data-testid*="brand"] input',
                '#brand-input'
            ];

            for (const selector of brandSelectors) {
                try {
                    await this.fillInputField(selector, listing.brand);
                    this.log(`Filled brand: ${listing.brand}`);
                    break;
                } catch (error) {
                    continue;
                }
            }
        }

        // Fill model if provided
        if (listing.model) {
            const modelSelectors = [
                'input[name*="model"]',
                '[data-testid*="model"] input',
                '#model-input'
            ];

            for (const selector of modelSelectors) {
                try {
                    await this.fillInputField(selector, listing.model);
                    this.log(`Filled model: ${listing.model}`);
                    break;
                } catch (error) {
                    continue;
                }
            }
        }

        // Fill year if provided
        if (listing.year) {
            const yearSelectors = [
                'input[name*="year"]',
                '[data-testid*="year"] input',
                '#year-input'
            ];

            for (const selector of yearSelectors) {
                try {
                    await this.fillInputField(selector, listing.year.toString());
                    this.log(`Filled year: ${listing.year}`);
                    break;
                } catch (error) {
                    continue;
                }
            }
        }

        // Set shipping preferences
        await this.setShippingOptions(listing);
    }

    async setShippingOptions(listing) {
        try {
            // Enable shipping if checkbox exists
            const shippingCheckbox = document.querySelector('input[name*="shipping"], [data-testid*="shipping"] input[type="checkbox"]');
            if (shippingCheckbox && !shippingCheckbox.checked) {
                shippingCheckbox.checked = true;
                shippingCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Set shipping cost if provided
            if (listing.shippingCost) {
                const shippingCostSelectors = [
                    'input[name*="shipping_cost"]',
                    '[data-testid*="shipping-cost"] input'
                ];

                for (const selector of shippingCostSelectors) {
                    try {
                        await this.fillInputField(selector, listing.shippingCost.toString());
                        this.log(`Set shipping cost: $${listing.shippingCost}`);
                        break;
                    } catch (error) {
                        continue;
                    }
                }
            }

            this.log('Shipping options configured');
        } catch (error) {
            this.log(`Shipping setup failed: ${error.message}`);
        }
    }

    async submitForm() {
        try {
            // Look for publish/submit button
            const submitSelectors = [
                'button[type="submit"]',
                '[data-testid*="submit"]',
                '[data-testid*="publish"]',
                'button[class*="submit"]',
                'button[class*="publish"]'
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

            // Also try text-based search
            if (!submitButton) {
                submitButton = Array.from(document.querySelectorAll('button')).find(btn =>
                    btn.textContent.toLowerCase().includes('publish') ||
                    btn.textContent.toLowerCase().includes('list') ||
                    btn.textContent.toLowerCase().includes('submit')
                );
            }

            if (!submitButton || submitButton.disabled) {
                throw new Error('Submit button not found or disabled');
            }

            // Scroll to and click submit
            submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.delay(1000);
            
            submitButton.click();
            this.log('Clicked submit button');

            // Wait for processing
            await this.delay(5000);

            // Check for success
            const currentUrl = this.getCurrentUrl();
            const success = currentUrl.includes('/my/selling') || 
                          currentUrl.includes('/listings/') ||
                          document.querySelector('.success, [data-testid*="success"]');

            if (success) {
                this.log('Posting appears successful');
                return {
                    success: true,
                    message: 'Posted successfully to Reverb',
                    url: currentUrl
                };
            } else {
                // Check for errors
                const errorElements = document.querySelectorAll('.error, [data-testid*="error"], [class*="error"]');
                if (errorElements.length > 0) {
                    const errorMessage = errorElements[0].textContent.trim();
                    throw new Error(`Reverb error: ${errorMessage}`);
                }

                return {
                    success: true, // Assume success if no clear error
                    message: 'Posted to Reverb (status unclear)',
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
        if (!category) return 'guitars';
        
        const normalized = category.toLowerCase();
        return this.categoryMappings[normalized] || 'guitars';
    }

    getCategoryMappings() {
        return {
            'guitar': 'guitars',
            'guitars': 'guitars',
            'electric guitar': 'guitars',
            'acoustic guitar': 'guitars',
            'bass': 'bass',
            'bass guitar': 'bass',
            'amp': 'amps',
            'amplifier': 'amps',
            'amps': 'amps',
            'drums': 'drums',
            'drum': 'drums',
            'percussion': 'drums',
            'keyboard': 'keyboards',
            'keyboards': 'keyboards',
            'piano': 'keyboards',
            'synthesizer': 'keyboards',
            'audio': 'pro-audio',
            'recording': 'pro-audio',
            'microphone': 'pro-audio',
            'mic': 'pro-audio',
            'effects': 'effects',
            'pedal': 'effects',
            'pedals': 'effects',
            'strings': 'strings',
            'cables': 'cables',
            'accessories': 'accessories'
        };
    }

    getSubCategoryMapping(category) {
        const subCategories = {
            'electric guitar': 'Electric Guitars',
            'acoustic guitar': 'Acoustic Guitars',
            'bass guitar': 'Electric Bass',
            'guitar': 'Electric Guitars',
            'amplifier': 'Guitar Amps',
            'amp': 'Guitar Amps'
        };

        return subCategories[category.toLowerCase()] || 'Other';
    }
}

// Initialize the content script
const reverbScript = new ReverbContentScript();