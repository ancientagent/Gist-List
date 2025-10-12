// Base Content Script Utilities for Gist List Extension
class BaseContentScript {
    constructor(platformName) {
        this.platformName = platformName;
        this.isReady = false;
        this.currentListing = null;
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'ping':
                    sendResponse({ ready: this.isReady, platform: this.platformName });
                    break;

                case 'fillAndSubmitListing':
                    await this.fillAndSubmitListing(message.listing, sendResponse);
                    break;

                case 'checkLoginStatus':
                    const loginStatus = await this.checkLoginStatus();
                    sendResponse({ success: true, loggedIn: loginStatus });
                    break;

                case 'navigateToPostingPage':
                    await this.navigateToPostingPage(sendResponse);
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error(`Error in ${this.platformName} content script:`, error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async fillAndSubmitListing(listing, sendResponse) {
        try {
            this.currentListing = listing;
            
            // Navigate to posting page if not already there
            if (!this.isOnPostingPage()) {
                await this.navigateToPostingPage();
                await this.waitForPageLoad();
            }

            // Fill form fields
            await this.fillTitle(listing.title);
            await this.fillDescription(listing.description);
            await this.fillPrice(listing.price);
            await this.selectCategory(listing.category);
            await this.fillCondition(listing.condition || 'used');
            
            // Upload images
            if (listing.images && listing.images.length > 0) {
                await this.uploadImages(listing.images);
            }

            // Fill platform-specific fields
            await this.fillPlatformSpecificFields(listing);

            // Submit the form
            const result = await this.submitForm();

            sendResponse({
                success: result.success,
                message: result.message,
                url: result.url
            });

        } catch (error) {
            console.error(`Error filling and submitting listing on ${this.platformName}:`, error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    // Utility methods to be implemented by platform-specific scripts
    async checkLoginStatus() {
        throw new Error('checkLoginStatus must be implemented by platform script');
    }

    isOnPostingPage() {
        throw new Error('isOnPostingPage must be implemented by platform script');
    }

    async navigateToPostingPage() {
        throw new Error('navigateToPostingPage must be implemented by platform script');
    }

    async fillTitle(title) {
        throw new Error('fillTitle must be implemented by platform script');
    }

    async fillDescription(description) {
        throw new Error('fillDescription must be implemented by platform script');
    }

    async fillPrice(price) {
        throw new Error('fillPrice must be implemented by platform script');
    }

    async selectCategory(category) {
        throw new Error('selectCategory must be implemented by platform script');
    }

    async fillCondition(condition) {
        // Optional - not all platforms have condition field
        console.log(`Condition field not implemented for ${this.platformName}`);
    }

    async uploadImages(images) {
        throw new Error('uploadImages must be implemented by platform script');
    }

    async fillPlatformSpecificFields(listing) {
        // Override this method for platform-specific fields
        console.log(`No platform-specific fields for ${this.platformName}`);
    }

    async submitForm() {
        throw new Error('submitForm must be implemented by platform script');
    }

    // Common utility methods
    async waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const check = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    async waitForElementToDisappear(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const check = () => {
                const element = document.querySelector(selector);
                if (!element) {
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element ${selector} did not disappear within ${timeout}ms`));
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    async fillInputField(selector, value, method = 'type') {
        try {
            const element = await this.waitForElement(selector);
            
            // Clear existing value
            element.focus();
            element.select();
            
            if (method === 'type') {
                // Simulate typing
                element.value = '';
                for (let i = 0; i < value.length; i++) {
                    element.value += value[i];
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    await this.delay(50);
                }
            } else {
                // Direct value setting
                element.value = value;
            }
            
            // Trigger change events
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            
            return true;
        } catch (error) {
            console.error(`Error filling field ${selector}:`, error);
            throw error;
        }
    }

    async selectDropdownOption(selector, value) {
        try {
            const dropdown = await this.waitForElement(selector);
            
            // Try to find option by value or text
            const options = dropdown.querySelectorAll('option');
            let targetOption = null;
            
            for (const option of options) {
                if (option.value === value || 
                    option.textContent.toLowerCase().includes(value.toLowerCase()) ||
                    option.getAttribute('data-value') === value) {
                    targetOption = option;
                    break;
                }
            }
            
            if (targetOption) {
                dropdown.value = targetOption.value;
                dropdown.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            } else {
                throw new Error(`Option ${value} not found in dropdown`);
            }
        } catch (error) {
            console.error(`Error selecting dropdown option ${selector}:`, error);
            throw error;
        }
    }

    async clickElement(selector) {
        try {
            const element = await this.waitForElement(selector);
            
            // Scroll into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.delay(500);
            
            // Click
            element.click();
            
            return true;
        } catch (error) {
            console.error(`Error clicking element ${selector}:`, error);
            throw error;
        }
    }

    async uploadImageFile(fileInputSelector, imageUrl) {
        try {
            const fileInput = await this.waitForElement(fileInputSelector);
            
            // Convert URL to File object
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const fileName = imageUrl.split('/').pop() || 'image.jpg';
            const file = new File([blob], fileName, { type: blob.type });
            
            // Create FileList
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            // Set files
            fileInput.files = dataTransfer.files;
            
            // Trigger change event
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            return true;
        } catch (error) {
            console.error(`Error uploading image ${imageUrl}:`, error);
            throw error;
        }
    }

    async waitForPageLoad(timeout = 30000) {
        return new Promise((resolve, reject) => {
            if (document.readyState === 'complete') {
                resolve();
                return;
            }
            
            const startTime = Date.now();
            
            const checkState = () => {
                if (document.readyState === 'complete') {
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error('Page load timeout'));
                    return;
                }
                
                setTimeout(checkState, 100);
            };
            
            checkState();
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    sanitizeText(text) {
        return text.replace(/[<>]/g, '').trim();
    }

    formatPrice(price) {
        return typeof price === 'number' ? price.toFixed(2) : parseFloat(price).toFixed(2);
    }

    getCurrentUrl() {
        return window.location.href;
    }

    navigateToUrl(url) {
        window.location.href = url;
    }

    log(message) {
        console.log(`[${this.platformName}] ${message}`);
    }

    error(message, error) {
        console.error(`[${this.platformName}] ${message}`, error);
    }
}

// Export for use in platform-specific scripts
window.BaseContentScript = BaseContentScript;