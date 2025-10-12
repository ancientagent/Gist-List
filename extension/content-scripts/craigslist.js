// Craigslist Content Script for Gist List Extension

// Include base content script
if (typeof window.BaseContentScript === 'undefined') {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content-scripts/base-content-script.js');
    document.head.appendChild(script);
}

class CraigslistContentScript extends BaseContentScript {
    constructor() {
        super('craigslist');
        this.postingUrls = ['/post', '/post/', 'post.craigslist'];
        this.categoryMappings = this.getCategoryMappings();
        this.isReady = true;
        this.log('Craigslist content script initialized');
    }

    async checkLoginStatus() {
        // Craigslist doesn't require login for basic posting
        // Check if we can access posting page
        return true; // Most Craigslist areas allow anonymous posting
    }

    isOnPostingPage() {
        const url = this.getCurrentUrl();
        return this.postingUrls.some(postingUrl => url.includes(postingUrl)) ||
               url.includes('post.craigslist') ||
               document.querySelector('form[name="postingForm"]') !== null;
    }

    async navigateToPostingPage() {
        if (this.isOnPostingPage()) return;

        // Look for "post to classifieds" link or similar
        const postLink = document.querySelector('a[href*="/post"]') || 
                        document.querySelector('a[href*="post.craigslist"]') ||
                        document.querySelector('.post, #post, .posting');

        if (postLink) {
            postLink.click();
            await this.waitForPageLoad();
        } else {
            // Navigate directly to post URL
            const currentDomain = window.location.hostname;
            this.navigateToUrl(`https://${currentDomain}/post/`);
            await this.waitForPageLoad();
        }
    }

    async fillTitle(title) {
        const selectors = [
            'input[name="PostingTitle"]',
            'input[id*="title"]',
            'input[name*="title"]',
            '#PostingTitle'
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
        
        throw new Error('Could not find title field on Craigslist');
    }

    async fillDescription(description) {
        const selectors = [
            'textarea[name="PostingBody"]',
            'textarea[id*="body"]',
            'textarea[name*="body"]',
            '#PostingBody',
            '.postingBody textarea'
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
        
        throw new Error('Could not find description field on Craigslist');
    }

    async fillPrice(price) {
        const selectors = [
            'input[name="price"]',
            'input[id*="price"]',
            '#price',
            '.price input'
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
        
        // Price might be optional on some Craigslist categories
        this.log('Price field not found (might be optional)');
    }

    async selectCategory(category) {
        try {
            // First, check if we're on the category selection page
            const categoryLinks = document.querySelectorAll('a[href*="category"]');
            if (categoryLinks.length > 0) {
                // We're on the category selection page
                const mappedCategory = this.mapCategory(category);
                const targetLink = Array.from(categoryLinks).find(link => 
                    link.textContent.toLowerCase().includes(mappedCategory.toLowerCase()) ||
                    link.href.includes(mappedCategory)
                );

                if (targetLink) {
                    targetLink.click();
                    await this.waitForPageLoad();
                    this.log(`Selected category: ${mappedCategory}`);
                    return;
                }
            }

            // Try dropdown selection
            const selectors = [
                'select[name="category"]',
                'select[id*="category"]',
                '#category'
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

            this.log('Category selection not found or not required');
        } catch (error) {
            this.log(`Category selection failed: ${error.message}`);
        }
    }

    async fillCondition(condition) {
        const selectors = [
            'select[name="condition"]',
            'input[name="condition"]',
            '#condition'
        ];

        const conditionMap = {
            'new': 'new',
            'like new': 'like new',
            'good': 'good',
            'fair': 'fair',
            'used': 'good' // Default used to good
        };

        const mappedCondition = conditionMap[condition.toLowerCase()] || 'good';

        for (const selector of selectors) {
            try {
                const element = await this.waitForElement(selector, 3000);
                
                if (element.tagName.toLowerCase() === 'select') {
                    await this.selectDropdownOption(selector, mappedCondition);
                } else if (element.type === 'radio') {
                    const radioButton = document.querySelector(`input[name="condition"][value="${mappedCondition}"]`);
                    if (radioButton) {
                        radioButton.checked = true;
                        radioButton.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                
                this.log(`Set condition: ${mappedCondition}`);
                return;
            } catch (error) {
                continue;
            }
        }

        this.log('Condition field not found (might not be available)');
    }

    async uploadImages(images) {
        try {
            const fileInputSelectors = [
                'input[type="file"][name*="image"]',
                'input[type="file"][id*="image"]',
                'input[type="file"][accept*="image"]',
                '#imageUpload',
                '.image-upload input[type="file"]'
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
                this.log('Image upload field not found');
                return;
            }

            // Upload first few images (Craigslist usually has a limit)
            const maxImages = 8; // Craigslist typical limit
            const imagesToUpload = images.slice(0, maxImages);

            for (let i = 0; i < imagesToUpload.length; i++) {
                await this.uploadImageFile(fileInput, imagesToUpload[i]);
                await this.delay(2000); // Wait between uploads
                this.log(`Uploaded image ${i + 1}/${imagesToUpload.length}`);

                // Check if we need to find the next file input
                if (i < imagesToUpload.length - 1) {
                    const nextFileInput = document.querySelector('input[type="file"]:not([disabled])');
                    if (nextFileInput) {
                        fileInput = nextFileInput;
                    }
                }
            }

        } catch (error) {
            this.log(`Image upload failed: ${error.message}`);
        }
    }

    async fillPlatformSpecificFields(listing) {
        // Fill location if provided
        if (listing.location) {
            const locationSelectors = [
                'input[name="location"]',
                'input[id*="location"]',
                '#location'
            ];

            for (const selector of locationSelectors) {
                try {
                    await this.fillInputField(selector, listing.location);
                    this.log(`Filled location: ${listing.location}`);
                    break;
                } catch (error) {
                    continue;
                }
            }
        }

        // Fill contact email if required
        if (listing.contactEmail) {
            const emailSelectors = [
                'input[name="contact_email"]',
                'input[type="email"]',
                '#email'
            ];

            for (const selector of emailSelectors) {
                try {
                    await this.fillInputField(selector, listing.contactEmail);
                    this.log(`Filled contact email`);
                    break;
                } catch (error) {
                    continue;
                }
            }
        }

        // Handle "hide contact info" checkbox if present
        const hideContactCheckbox = document.querySelector('input[name*="hide_contact"]');
        if (hideContactCheckbox) {
            hideContactCheckbox.checked = false;
        }
    }

    async submitForm() {
        try {
            // Look for submit/publish button
            const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button[name="submit"]',
                '.submit-btn',
                'button:contains("publish")',
                'button:contains("post")',
                'button[id*="submit"]'
            ];

            let submitButton = null;
            for (const selector of submitSelectors) {
                try {
                    if (selector.includes(':contains')) {
                        // Handle text-based selectors
                        submitButton = Array.from(document.querySelectorAll('button')).find(btn =>
                            btn.textContent.toLowerCase().includes('publish') ||
                            btn.textContent.toLowerCase().includes('post') ||
                            btn.textContent.toLowerCase().includes('submit')
                        );
                        if (submitButton) break;
                    } else {
                        submitButton = await this.waitForElement(selector, 3000);
                        if (submitButton) break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (!submitButton) {
                throw new Error('Submit button not found');
            }

            // Click submit button
            await this.clickElement(submitButton);
            this.log('Clicked submit button');

            // Wait for redirect or success message
            await this.delay(3000);

            // Check for success indicators
            const successIndicators = [
                '.success',
                '.posted',
                '[class*="success"]',
                'text:contains("posted")',
                'text:contains("published")'
            ];

            let success = false;
            for (const indicator of successIndicators) {
                try {
                    if (indicator.includes('text:contains')) {
                        success = document.body.textContent.toLowerCase().includes('posted') ||
                                document.body.textContent.toLowerCase().includes('published');
                    } else {
                        success = document.querySelector(indicator) !== null;
                    }
                    if (success) break;
                } catch (error) {
                    continue;
                }
            }

            // Check URL change as another success indicator
            const currentUrl = this.getCurrentUrl();
            const urlChanged = !currentUrl.includes('/post') || 
                             currentUrl.includes('posted') || 
                             currentUrl.includes('success');

            if (success || urlChanged) {
                this.log('Posting appears successful');
                return {
                    success: true,
                    message: 'Posted successfully to Craigslist',
                    url: currentUrl
                };
            } else {
                // Check for error messages
                const errorElements = document.querySelectorAll('.error, [class*="error"], .warning');
                if (errorElements.length > 0) {
                    const errorMessage = errorElements[0].textContent.trim();
                    throw new Error(`Craigslist error: ${errorMessage}`);
                }

                return {
                    success: true, // Assume success if no clear error
                    message: 'Posted to Craigslist (status unclear)',
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
        if (!category) return 'general';
        
        const normalized = category.toLowerCase();
        return this.categoryMappings[normalized] || 'general';
    }

    getCategoryMappings() {
        return {
            'electronics': 'electronics',
            'furniture': 'furniture',
            'clothing': 'clothing',
            'clothes': 'clothing',
            'apparel': 'clothing',
            'books': 'books',
            'music': 'music+instr',
            'instruments': 'music+instr',
            'cars': 'cars+trucks',
            'vehicles': 'cars+trucks',
            'auto': 'cars+trucks',
            'motorcycles': 'motorcycles',
            'bikes': 'bicycles',
            'bicycle': 'bicycles',
            'sporting': 'sporting',
            'sports': 'sporting',
            'tools': 'tools',
            'garden': 'garden+outdoor',
            'outdoor': 'garden+outdoor',
            'appliances': 'appliances',
            'antiques': 'antiques',
            'art': 'arts+crafts',
            'crafts': 'arts+crafts',
            'baby': 'baby+kids',
            'kids': 'baby+kids',
            'toys': 'toys+games',
            'games': 'toys+games',
            'beauty': 'beauty+hlth',
            'health': 'beauty+hlth',
            'jewelry': 'jewelry',
            'materials': 'materials',
            'general': 'general'
        };
    }
}

// Initialize the content script
const craigslistScript = new CraigslistContentScript();