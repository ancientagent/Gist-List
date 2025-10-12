// Background Service Worker for Gist List Extension
class GistListBackground {
    constructor() {
        this.postingQueue = [];
        this.activePostings = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.platformConfigs = this.getPlatformConfigs();
        
        // Initialize data sync manager
        this.dataSyncManager = null;
        this.initializeDataSync();
        
        this.setupEventListeners();
        this.initializeStorage();
    }

    async initializeDataSync() {
        // Import data sync manager
        try {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('background/data-sync.js');
            document.head.appendChild(script);
            
            script.onload = () => {
                this.dataSyncManager = new DataSyncManager();
                console.log('Data sync manager initialized');
            };
        } catch (error) {
            console.error('Failed to initialize data sync manager:', error);
        }
    }

    setupEventListeners() {
        // Listen for messages from popup and content scripts
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Handle extension startup
        chrome.runtime.onStartup.addListener(() => {
            this.initializeExtension();
        });

        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Listen for tab updates to detect platform availability
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });
    }

    async initializeStorage() {
        try {
            const result = await chrome.storage.local.get(['gistListings', 'gistSettings', 'gistStats']);
            
            // Initialize default settings if not present
            if (!result.gistSettings) {
                const defaultSettings = {
                    platforms: {
                        craigslist: { enabled: true, lastLogin: null },
                        reverb: { enabled: true, lastLogin: null },
                        poshmark: { enabled: true, lastLogin: null },
                        ebay: { enabled: true, lastLogin: null },
                        nextdoor: { enabled: true, lastLogin: null },
                        mercari: { enabled: true, lastLogin: null },
                        facebook: { enabled: true, lastLogin: null }
                    },
                    autoRetry: true,
                    retryDelay: 5000,
                    maxConcurrentPosts: 2
                };
                
                await chrome.storage.local.set({ gistSettings: defaultSettings });
            }

            // Initialize stats if not present
            if (!result.gistStats) {
                const defaultStats = {
                    totalPosts: 0,
                    successfulPosts: 0,
                    failedPosts: 0,
                    platformStats: {},
                    lastSyncTime: null
                };
                
                await chrome.storage.local.set({ gistStats: defaultStats });
            }

            console.log('Gist List Background initialized');
        } catch (error) {
            console.error('Error initializing storage:', error);
        }
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'postListing':
                    await this.handlePostListing(message, sendResponse);
                    break;
                
                case 'refreshListings':
                    await this.handleRefreshListings(sendResponse);
                    break;
                
                case 'checkPlatformStatus':
                    await this.handleCheckPlatformStatus(message.platform, sendResponse);
                    break;
                
                case 'cancelPosting':
                    await this.handleCancelPosting(message.postingId, sendResponse);
                    break;
                
                case 'getStats':
                    await this.handleGetStats(sendResponse);
                    break;
                
                case 'updateSettings':
                    await this.handleUpdateSettings(message.settings, sendResponse);
                    break;
                
                case 'contentScriptReady':
                    await this.handleContentScriptReady(message.platform, sender.tab.id, sendResponse);
                    break;
                
                case 'postingResult':
                    await this.handlePostingResult(message, sendResponse);
                    break;
                
                case 'syncData':
                    await this.handleDataSync(message, sendResponse);
                    break;
                
                case 'exportListings':
                    await this.handleExportListings(message, sendResponse);
                    break;
                
                case 'generateSampleData':
                    await this.handleGenerateSampleData(sendResponse);
                    break;
                
                default:
                    console.warn('Unknown message action:', message.action);
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handlePostListing(message, sendResponse) {
        const { listing, platform } = message;
        const postingId = this.generatePostingId();
        
        try {
            // Add to posting queue
            const postingTask = {
                id: postingId,
                listing,
                platform,
                status: 'queued',
                attempts: 0,
                createdAt: Date.now()
            };
            
            this.postingQueue.push(postingTask);
            this.activePostings.set(postingId, postingTask);
            
            // Start processing
            const result = await this.processPosting(postingTask);
            
            sendResponse(result);
            
        } catch (error) {
            console.error('Error handling post listing:', error);
            sendResponse({
                success: false,
                message: error.message,
                postingId
            });
        }
    }

    async processPosting(postingTask) {
        const { id, listing, platform } = postingTask;
        
        try {
            // Update status
            postingTask.status = 'processing';
            postingTask.attempts++;
            
            // Notify popup of progress
            this.notifyPopup({
                action: 'postingProgress',
                postingId: id,
                message: `Starting to post "${listing.title}" to ${platform}...`
            });

            // Check if platform tab is available
            const platformTab = await this.findOrCreatePlatformTab(platform);
            
            if (!platformTab) {
                throw new Error(`Unable to access ${platform}. Please log in first.`);
            }

            // Inject content script if needed
            await this.ensureContentScript(platformTab.id, platform);
            
            // Send posting request to content script
            const result = await this.sendToContentScript(platformTab.id, {
                action: 'fillAndSubmitListing',
                listing,
                platform
            });

            if (result.success) {
                postingTask.status = 'completed';
                postingTask.completedAt = Date.now();
                
                // Update stats
                await this.updateStats('success', platform);
                
                this.notifyPopup({
                    action: 'postingProgress',
                    postingId: id,
                    message: `Successfully posted "${listing.title}" to ${platform}`
                });
                
                return {
                    success: true,
                    message: 'Posted successfully',
                    postingId: id,
                    url: result.url
                };
                
            } else {
                throw new Error(result.error || 'Unknown error from content script');
            }
            
        } catch (error) {
            console.error('Posting error:', error);
            
            // Handle retry logic
            if (postingTask.attempts < this.maxRetries) {
                postingTask.status = 'retrying';
                
                this.notifyPopup({
                    action: 'postingProgress',
                    postingId: id,
                    message: `Retry ${postingTask.attempts}/${this.maxRetries} for "${listing.title}" on ${platform}`
                });
                
                // Retry after delay
                await this.delay(5000);
                return await this.processPosting(postingTask);
                
            } else {
                postingTask.status = 'failed';
                postingTask.error = error.message;
                
                await this.updateStats('failure', platform);
                
                this.notifyPopup({
                    action: 'postingProgress',
                    postingId: id,
                    message: `Failed to post "${listing.title}" to ${platform}: ${error.message}`
                });
                
                return {
                    success: false,
                    message: error.message,
                    postingId: id
                };
            }
        }
    }

    async findOrCreatePlatformTab(platform) {
        const platformUrl = this.getPlatformBaseUrl(platform);
        
        try {
            // First, try to find existing tab
            const tabs = await chrome.tabs.query({ url: `*://${platformUrl}/*` });
            
            if (tabs.length > 0) {
                // Use existing tab
                await chrome.tabs.update(tabs[0].id, { active: false });
                return tabs[0];
            }
            
            // Create new tab if none exists
            const newTab = await chrome.tabs.create({
                url: `https://${platformUrl}`,
                active: false
            });
            
            // Wait for tab to load
            await this.waitForTabLoad(newTab.id);
            
            return newTab;
            
        } catch (error) {
            console.error(`Error finding/creating tab for ${platform}:`, error);
            return null;
        }
    }

    async ensureContentScript(tabId, platform) {
        try {
            // Try to ping existing content script
            const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            
            if (response && response.ready) {
                return true;
            }
        } catch (error) {
            // Content script not ready, inject it
        }
        
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: [`content-scripts/${platform}.js`]
            });
            
            // Wait a moment for script to initialize
            await this.delay(1000);
            
            return true;
        } catch (error) {
            console.error(`Error injecting content script for ${platform}:`, error);
            return false;
        }
    }

    async sendToContentScript(tabId, message) {
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    resolve({
                        success: false,
                        error: chrome.runtime.lastError.message
                    });
                } else {
                    resolve(response || { success: false, error: 'No response' });
                }
            });
        });
    }

    async waitForTabLoad(tabId, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkTab = async () => {
                try {
                    const tab = await chrome.tabs.get(tabId);
                    
                    if (tab.status === 'complete') {
                        resolve(tab);
                        return;
                    }
                    
                    if (Date.now() - startTime > timeout) {
                        reject(new Error('Tab load timeout'));
                        return;
                    }
                    
                    setTimeout(checkTab, 500);
                } catch (error) {
                    reject(error);
                }
            };
            
            checkTab();
        });
    }

    async handleRefreshListings(sendResponse) {
        try {
            // This would typically call an API to get fresh listings
            // For now, we'll just return stored listings
            const result = await chrome.storage.local.get(['gistListings']);
            
            sendResponse({
                success: true,
                listings: result.gistListings || [],
                timestamp: Date.now()
            });
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    async handleCheckPlatformStatus(platform, sendResponse) {
        try {
            const platformUrl = this.getPlatformBaseUrl(platform);
            const tabs = await chrome.tabs.query({ url: `*://${platformUrl}/*` });
            
            const status = {
                platform,
                available: tabs.length > 0,
                tabCount: tabs.length,
                lastChecked: Date.now()
            };
            
            sendResponse({ success: true, status });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async updateStats(result, platform) {
        try {
            const { gistStats } = await chrome.storage.local.get(['gistStats']);
            const stats = gistStats || {};
            
            stats.totalPosts = (stats.totalPosts || 0) + 1;
            
            if (result === 'success') {
                stats.successfulPosts = (stats.successfulPosts || 0) + 1;
            } else {
                stats.failedPosts = (stats.failedPosts || 0) + 1;
            }
            
            // Update platform-specific stats
            if (!stats.platformStats) stats.platformStats = {};
            if (!stats.platformStats[platform]) stats.platformStats[platform] = { success: 0, failure: 0 };
            
            stats.platformStats[platform][result === 'success' ? 'success' : 'failure']++;
            stats.lastSyncTime = Date.now();
            
            await chrome.storage.local.set({ gistStats: stats });
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    notifyPopup(message) {
        try {
            chrome.runtime.sendMessage(message);
        } catch (error) {
            // Popup might not be open, that's okay
            console.log('Could not notify popup:', error.message);
        }
    }

    getPlatformBaseUrl(platform) {
        const urls = {
            craigslist: 'craigslist.org',
            reverb: 'reverb.com',
            poshmark: 'poshmark.com',
            ebay: 'ebay.com',
            nextdoor: 'nextdoor.com',
            mercari: 'mercari.com',
            facebook: 'facebook.com'
        };
        return urls[platform] || '';
    }

    getPlatformConfigs() {
        return {
            craigslist: {
                name: 'Craigslist',
                baseUrl: 'https://craigslist.org',
                postingUrl: '/post',
                requiresLogin: false,
                categories: ['for-sale', 'electronics', 'furniture', 'clothing']
            },
            reverb: {
                name: 'Reverb',
                baseUrl: 'https://reverb.com',
                postingUrl: '/sell/listings/new',
                requiresLogin: true,
                categories: ['guitars', 'amps', 'drums', 'keyboards', 'audio']
            },
            poshmark: {
                name: 'Poshmark',
                baseUrl: 'https://poshmark.com',
                postingUrl: '/create-listing',
                requiresLogin: true,
                categories: ['women', 'men', 'kids', 'home', 'pets']
            },
            ebay: {
                name: 'eBay',
                baseUrl: 'https://ebay.com',
                postingUrl: '/sell/create',
                requiresLogin: true,
                categories: ['electronics', 'fashion', 'home', 'collectibles']
            },
            nextdoor: {
                name: 'Nextdoor',
                baseUrl: 'https://nextdoor.com',
                postingUrl: '/for_sale_and_free',
                requiresLogin: true,
                categories: ['general', 'furniture', 'electronics', 'clothing']
            },
            mercari: {
                name: 'Mercari',
                baseUrl: 'https://mercari.com',
                postingUrl: '/sell',
                requiresLogin: true,
                categories: ['electronics', 'fashion', 'home', 'toys', 'beauty']
            },
            facebook: {
                name: 'Facebook Marketplace',
                baseUrl: 'https://facebook.com',
                postingUrl: '/marketplace/create',
                requiresLogin: true,
                categories: ['vehicles', 'property', 'electronics', 'clothing']
            }
        };
    }

    generatePostingId() {
        return 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    handleInstallation(details) {
        if (details.reason === 'install') {
            console.log('Gist List extension installed');
            // Could show onboarding or open options page
        } else if (details.reason === 'update') {
            console.log('Gist List extension updated');
            // Handle any migration logic
        }
    }

    initializeExtension() {
        console.log('Gist List extension started');
        this.initializeStorage();
    }

    async handleDataSync(message, sendResponse) {
        try {
            if (!this.dataSyncManager) {
                throw new Error('Data sync manager not initialized');
            }

            const { method, options } = message;
            const result = await this.dataSyncManager.syncData(method, options);
            
            sendResponse({
                success: true,
                result
            });

        } catch (error) {
            console.error('Data sync failed:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    async handleExportListings(message, sendResponse) {
        try {
            if (!this.dataSyncManager) {
                throw new Error('Data sync manager not initialized');
            }

            const { options } = message;
            const exportData = await this.dataSyncManager.exportListings(options);
            
            sendResponse({
                success: true,
                data: exportData
            });

        } catch (error) {
            console.error('Export failed:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    async handleGenerateSampleData(sendResponse) {
        try {
            if (!this.dataSyncManager) {
                throw new Error('Data sync manager not initialized');
            }

            const sampleData = this.dataSyncManager.generateSampleData();
            
            // Save sample data to storage for testing
            await chrome.storage.local.set({ gistListings: sampleData.listings });
            
            sendResponse({
                success: true,
                data: sampleData,
                message: `Generated ${sampleData.listings.length} sample listings`
            });

        } catch (error) {
            console.error('Sample data generation failed:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        // Monitor platform tabs for login status changes
        if (changeInfo.status === 'complete' && tab.url) {
            const platformUrls = Object.values(this.platformConfigs).map(config => config.baseUrl);
            const isPlatformTab = platformUrls.some(url => tab.url.includes(url.replace('https://', '')));
            
            if (isPlatformTab) {
                // Notify popup about platform availability change
                this.notifyPopup({
                    action: 'platformStatusChanged',
                    tabId,
                    url: tab.url
                });
            }
        }
    }
}

// Initialize background script
const gistListBackground = new GistListBackground();