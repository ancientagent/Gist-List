// Popup Script for Gist List Extension
class GistListPopup {
    constructor() {
        this.listings = [];
        this.selectedListings = [];
        this.selectedPlatforms = [];
        this.isPosting = false;
        this.postingProgress = {
            current: 0,
            total: 0,
            details: []
        };
        
        // Initialize user feedback system
        this.feedbackManager = new UserFeedbackManager();
        this.currentProgressId = null;
        
        this.init();
    }

    async init() {
        // Load stored data
        await this.loadStoredData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateUI();
        
        // Check platform availability
        this.checkPlatformAvailability();
    }

    setupEventListeners() {
        // Data import and sync
        document.getElementById('importData').addEventListener('click', () => this.importData());
        document.getElementById('refreshData').addEventListener('click', () => this.refreshData());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileImport(e));

        // Platform selection
        document.querySelectorAll('input[name="platform"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updatePlatformSelection());
        });

        // Action buttons
        document.getElementById('selectAll').addEventListener('click', () => this.selectAllListings());
        document.getElementById('postListings').addEventListener('click', () => this.startPosting());
        document.getElementById('cancelPosting').addEventListener('click', () => this.cancelPosting());
        document.getElementById('startOver').addEventListener('click', () => this.resetToStart());

        // Listen for background script messages
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleBackgroundMessage(message, sender, sendResponse);
        });
    }

    async loadStoredData() {
        try {
            const result = await chrome.storage.local.get(['gistListings', 'gistSettings']);
            this.listings = result.gistListings || [];
            this.settings = result.gistSettings || {
                platforms: {
                    craigslist: { enabled: true },
                    reverb: { enabled: true },
                    poshmark: { enabled: true },
                    ebay: { enabled: true },
                    nextdoor: { enabled: true },
                    mercari: { enabled: true },
                    facebook: { enabled: true }
                }
            };
        } catch (error) {
            console.error('Error loading stored data:', error);
            this.feedbackManager.handleError(error, {
                context: 'loadStoredData',
                retryCallback: () => this.loadStoredData()
            });
        }
    }

    async saveData() {
        try {
            await chrome.storage.local.set({
                gistListings: this.listings,
                gistSettings: this.settings
            });
        } catch (error) {
            console.error('Error saving data:', error);
            this.showStatus('Error saving data', 'error');
        }
    }

    importData() {
        // Trigger file input
        document.getElementById('fileInput').click();
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const loadingToast = this.feedbackManager.showLoading('Importing listings...');

        try {
            const text = await file.text();
            
            // Use background data sync for validation and processing
            chrome.runtime.sendMessage({
                action: 'syncData',
                method: 'file_import',
                options: { fileData: text }
            }, (response) => {
                this.feedbackManager.removeToast(loadingToast);
                
                if (response && response.success) {
                    this.listings = response.result.total || [];
                    this.updateUI();
                    this.feedbackManager.showSuccess(
                        `Successfully imported ${response.result.imported} listings!`, 
                        4000
                    );
                } else {
                    this.feedbackManager.handleError(new Error(response?.error || 'Import failed'), {
                        context: 'fileImport',
                        retryCallback: () => this.handleFileImport(event)
                    });
                }
            });
            
        } catch (error) {
            this.feedbackManager.removeToast(loadingToast);
            this.feedbackManager.handleError(error, {
                context: 'fileImport',
                category: 'validation',
                retryCallback: () => this.handleFileImport(event)
            });
        }

        // Reset file input
        event.target.value = '';
    }

    validateListingData(data) {
        const items = Array.isArray(data) ? data : [data];
        
        return items.every(item => {
            return item && 
                   typeof item.title === 'string' &&
                   typeof item.description === 'string' &&
                   typeof item.price === 'number' &&
                   Array.isArray(item.images);
        });
    }

    async refreshData() {
        this.showStatus('Refreshing data...', 'loading');
        
        // Request fresh data from background script
        chrome.runtime.sendMessage({ action: 'refreshListings' }, (response) => {
            if (response && response.success) {
                this.listings = response.listings || [];
                this.updateUI();
                this.showStatus('Data refreshed', 'success');
            } else {
                this.showStatus('No new data available', 'info');
            }
        });
    }

    updateUI() {
        this.updateListingsDisplay();
        this.updatePlatformSection();
        this.updateActionSection();
    }

    updateListingsDisplay() {
        const container = document.getElementById('listingsContainer');
        const countElement = document.getElementById('listingCount');
        const emptyState = document.getElementById('emptyState');

        countElement.textContent = this.listings.length;

        if (this.listings.length === 0) {
            container.innerHTML = '';
            container.appendChild(emptyState);
            return;
        }

        // Hide empty state
        if (emptyState.parentNode) {
            emptyState.parentNode.removeChild(emptyState);
        }

        // Generate listings HTML
        container.innerHTML = this.listings.map((listing, index) => `
            <div class="listing-item" data-index="${index}">
                <input type="checkbox" id="listing-${index}" ${this.selectedListings.includes(index) ? 'checked' : ''}>
                <div class="listing-info">
                    <div class="listing-title">${this.escapeHtml(listing.title)}</div>
                    <div class="listing-details">
                        <span class="listing-price">$${listing.price.toFixed(2)}</span>
                        <span class="listing-category">${listing.category || 'Uncategorized'}</span>
                    </div>
                </div>
                ${listing.images && listing.images.length > 0 ? 
                    `<img class="listing-image" src="${listing.images[0]}" alt="Product image">` : ''}
            </div>
        `).join('');

        // Add event listeners to listing checkboxes
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.closest('.listing-item').dataset.index);
                this.toggleListingSelection(index, e.target.checked);
            });
        });
    }

    toggleListingSelection(index, selected) {
        if (selected && !this.selectedListings.includes(index)) {
            this.selectedListings.push(index);
        } else if (!selected) {
            this.selectedListings = this.selectedListings.filter(i => i !== index);
        }
        this.updateActionSection();
    }

    selectAllListings() {
        const allCheckboxes = document.querySelectorAll('#listingsContainer input[type="checkbox"]');
        const selectAllBtn = document.getElementById('selectAll');
        
        if (this.selectedListings.length === this.listings.length) {
            // Deselect all
            this.selectedListings = [];
            allCheckboxes.forEach(cb => cb.checked = false);
            selectAllBtn.textContent = 'Select All';
        } else {
            // Select all
            this.selectedListings = this.listings.map((_, index) => index);
            allCheckboxes.forEach(cb => cb.checked = true);
            selectAllBtn.textContent = 'Deselect All';
        }
        
        this.updateActionSection();
    }

    updatePlatformSection() {
        const section = document.getElementById('platformSection');
        section.style.display = this.listings.length > 0 ? 'block' : 'none';
    }

    updatePlatformSelection() {
        this.selectedPlatforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
            .map(cb => cb.value);
        this.updateActionSection();
    }

    updateActionSection() {
        const section = document.getElementById('actionSection');
        const postBtn = document.getElementById('postListings');
        const selectAllBtn = document.getElementById('selectAll');

        const hasListings = this.listings.length > 0;
        const hasSelectedListings = this.selectedListings.length > 0;
        const hasSelectedPlatforms = this.selectedPlatforms.length > 0;

        section.style.display = hasListings ? 'block' : 'none';
        postBtn.disabled = !hasSelectedListings || !hasSelectedPlatforms || this.isPosting;
        
        // Update select all button text
        selectAllBtn.textContent = this.selectedListings.length === this.listings.length ? 'Deselect All' : 'Select All';
        
        // Update post button text
        if (hasSelectedListings && hasSelectedPlatforms) {
            const listingText = this.selectedListings.length === 1 ? 'listing' : 'listings';
            const platformText = this.selectedPlatforms.length === 1 ? 'platform' : 'platforms';
            postBtn.textContent = `Post ${this.selectedListings.length} ${listingText} to ${this.selectedPlatforms.length} ${platformText}`;
        } else {
            postBtn.textContent = 'Post to Selected Platforms';
        }
    }

    async checkPlatformAvailability() {
        // Check which platforms are currently accessible
        const platforms = ['craigslist', 'reverb', 'poshmark', 'ebay', 'nextdoor', 'mercari', 'facebook'];
        
        for (const platform of platforms) {
            try {
                const tabs = await chrome.tabs.query({ url: this.getPlatformUrl(platform) });
                const statusElement = document.getElementById(`${platform}-status`);
                
                if (tabs.length > 0) {
                    statusElement.textContent = 'Ready';
                    statusElement.className = 'platform-status ready';
                } else {
                    statusElement.textContent = 'Login needed';
                    statusElement.className = 'platform-status error';
                }
            } catch (error) {
                console.error(`Error checking ${platform}:`, error);
            }
        }
    }

    getPlatformUrl(platform) {
        const urls = {
            craigslist: '*://*.craigslist.org/*',
            reverb: '*://*.reverb.com/*',
            poshmark: '*://*.poshmark.com/*',
            ebay: '*://*.ebay.com/*',
            nextdoor: '*://*.nextdoor.com/*',
            mercari: '*://*.mercari.com/*',
            facebook: '*://*.facebook.com/*'
        };
        return urls[platform] || '';
    }

    async startPosting() {
        if (this.isPosting) return;

        this.isPosting = true;
        this.postingProgress.current = 0;
        this.postingProgress.total = this.selectedListings.length * this.selectedPlatforms.length;
        this.postingProgress.details = [];

        // Create enhanced progress tracking
        this.currentProgressId = `posting_${Date.now()}`;
        const progress = this.feedbackManager.progressManager.createProgress(this.currentProgressId, {
            total: this.postingProgress.total,
            details: 'Starting to post listings...',
            cancellable: true,
            onCancel: () => this.cancelPosting()
        });

        // Show progress section
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('platformSection').style.display = 'none';
        document.getElementById('actionSection').style.display = 'none';

        // Start posting process
        try {
            const results = await this.processPostings();
            
            // Complete progress
            this.feedbackManager.progressManager.completeProgress(
                this.currentProgressId, 
                `Posted ${results.successful}/${results.total} listings successfully`
            );
            
            // Show summary
            if (results.successful === results.total) {
                this.feedbackManager.showSuccess(
                    `All ${results.total} listings posted successfully!`, 
                    5000
                );
            } else if (results.successful > 0) {
                this.feedbackManager.showWarning(
                    `Posted ${results.successful} out of ${results.total} listings. Check results for details.`,
                    6000
                );
            } else {
                this.feedbackManager.showError('No listings were posted successfully.');
            }
            
        } catch (error) {
            console.error('Posting error:', error);
            
            this.feedbackManager.progressManager.failProgress(
                this.currentProgressId, 
                'Posting process failed'
            );
            
            this.feedbackManager.handleError(error, {
                context: 'posting',
                category: 'platform',
                retryCallback: () => this.startPosting()
            });
        }

        this.isPosting = false;
        this.currentProgressId = null;
    }

    async processPostings() {
        const results = [];
        let successful = 0;
        let failed = 0;

        for (const listingIndex of this.selectedListings) {
            const listing = this.listings[listingIndex];
            
            for (const platform of this.selectedPlatforms) {
                const progressMessage = `Posting "${listing.title}" to ${platform}...`;
                
                // Update enhanced progress
                if (this.currentProgressId) {
                    this.feedbackManager.progressManager.updateProgress(
                        this.currentProgressId, 
                        this.postingProgress.current,
                        progressMessage
                    );
                }
                
                // Update legacy progress display
                this.updateProgress(progressMessage);
                
                try {
                    const result = await this.postToPlafrom(listing, platform);
                    const success = result && result.success;
                    
                    results.push({
                        listing: listing.title,
                        platform,
                        success,
                        message: result?.message || (success ? 'Posted successfully' : 'Unknown error'),
                        url: result?.url
                    });
                    
                    if (success) {
                        successful++;
                    } else {
                        failed++;
                    }
                    
                } catch (error) {
                    failed++;
                    results.push({
                        listing: listing.title,
                        platform,
                        success: false,
                        message: error.message || 'Unknown error occurred'
                    });
                }
                
                this.postingProgress.current++;
                this.updateProgressBar();
                
                // Add delay between posts to avoid rate limiting
                await this.delay(2000);
            }
        }

        // Show results in the existing UI
        this.showResults(results);
        
        // Return summary for enhanced feedback
        return {
            total: results.length,
            successful,
            failed,
            results
        };
    }

    async postToPlafrom(listing, platform) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'postListing',
                listing,
                platform
            }, (response) => {
                resolve(response || { success: false, message: 'No response from background script' });
            });
        });
    }

    updateProgress(message) {
        document.getElementById('progressText').textContent = message;
        this.postingProgress.details.unshift(`${new Date().toLocaleTimeString()}: ${message}`);
        
        const detailsContainer = document.getElementById('progressDetails');
        detailsContainer.innerHTML = this.postingProgress.details.slice(0, 10).map(detail => 
            `<div>${this.escapeHtml(detail)}</div>`
        ).join('');
    }

    updateProgressBar() {
        const percentage = (this.postingProgress.current / this.postingProgress.total) * 100;
        document.getElementById('progressFill').style.width = `${percentage}%`;
    }

    showResults(results) {
        // Hide progress section and show results
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';

        const container = document.getElementById('resultsContainer');
        container.innerHTML = results.map(result => `
            <div class="result-item ${result.success ? 'success' : 'error'}">
                <strong>${result.platform}</strong>: ${this.escapeHtml(result.listing)} - ${this.escapeHtml(result.message)}
            </div>
        `).join('');
    }

    cancelPosting() {
        this.isPosting = false;
        this.resetToStart();
        this.showStatus('Posting cancelled', 'info');
    }

    resetToStart() {
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('platformSection').style.display = this.listings.length > 0 ? 'block' : 'none';
        document.getElementById('actionSection').style.display = this.listings.length > 0 ? 'block' : 'none';
    }

    handleBackgroundMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'postingProgress':
                this.updateProgress(message.message);
                break;
            case 'postingComplete':
                this.updateProgress('Posting completed');
                break;
            case 'error':
                this.showStatus(message.message, 'error');
                break;
        }
    }

    showStatus(message, type = 'info') {
        // Update legacy status display
        const statusElement = document.getElementById('syncStatus');
        const statusText = statusElement?.querySelector('.status-text');
        
        if (statusText) {
            statusText.textContent = message;
            statusText.className = `status-text ${type}`;
            
            // Auto-hide after 3 seconds for non-error messages
            if (type !== 'error') {
                setTimeout(() => {
                    if (statusText.textContent === message) {
                        statusText.textContent = 'Ready';
                        statusText.className = 'status-text';
                    }
                }, 3000);
            }
        }
        
        // Also show enhanced feedback
        const duration = type === 'error' ? 0 : 3000;
        switch (type) {
            case 'success':
                this.feedbackManager.showSuccess(message, duration);
                break;
            case 'error':
                this.feedbackManager.showToast(message, 'error', duration);
                break;
            case 'warning':
                this.feedbackManager.showWarning(message, duration);
                break;
            case 'loading':
                this.feedbackManager.showLoading(message);
                break;
            default:
                this.feedbackManager.showInfo(message, duration);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GistListPopup();
});