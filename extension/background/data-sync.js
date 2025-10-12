// Data Synchronization System for Gist List Extension

class DataSyncManager {
    constructor() {
        this.syncMethods = {
            FILE_IMPORT: 'file_import',
            GOOGLE_DRIVE: 'google_drive',
            DROPBOX: 'dropbox',
            QR_CODE: 'qr_code',
            URL_SHARE: 'url_share'
        };
        
        this.dataVersion = '1.0';
        this.maxListings = 100;
        this.supportedImageFormats = ['jpg', 'jpeg', 'png', 'webp'];
        
        this.init();
    }

    async init() {
        // Initialize sync settings
        const syncSettings = await this.getSyncSettings();
        if (!syncSettings) {
            await this.initializeSyncSettings();
        }
    }

    async getSyncSettings() {
        try {
            const result = await chrome.storage.local.get(['gistSyncSettings']);
            return result.gistSyncSettings;
        } catch (error) {
            console.error('Error getting sync settings:', error);
            return null;
        }
    }

    async initializeSyncSettings() {
        const defaultSettings = {
            version: this.dataVersion,
            enabledMethods: [this.syncMethods.FILE_IMPORT],
            lastSyncTime: null,
            autoSync: false,
            syncInterval: 300000, // 5 minutes
            cloudConfig: {
                googleDrive: {
                    enabled: false,
                    folderId: null,
                    fileName: 'gist-listings.json'
                },
                dropbox: {
                    enabled: false,
                    accessToken: null,
                    folderPath: '/Apps/GistList/'
                }
            }
        };

        await chrome.storage.local.set({ gistSyncSettings: defaultSettings });
        return defaultSettings;
    }

    // Main sync method dispatcher
    async syncData(method = this.syncMethods.FILE_IMPORT, options = {}) {
        try {
            console.log(`Starting sync with method: ${method}`);
            
            switch (method) {
                case this.syncMethods.FILE_IMPORT:
                    return await this.syncFromFile(options);
                
                case this.syncMethods.GOOGLE_DRIVE:
                    return await this.syncFromGoogleDrive(options);
                
                case this.syncMethods.DROPBOX:
                    return await this.syncFromDropbox(options);
                
                case this.syncMethods.QR_CODE:
                    return await this.syncFromQRCode(options);
                
                case this.syncMethods.URL_SHARE:
                    return await this.syncFromURL(options);
                
                default:
                    throw new Error(`Unsupported sync method: ${method}`);
            }
        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
        }
    }

    // File Import Sync Method
    async syncFromFile(options) {
        const { fileData } = options;
        
        if (!fileData) {
            throw new Error('No file data provided');
        }

        try {
            const parsedData = JSON.parse(fileData);
            const validatedData = await this.validateAndNormalizeData(parsedData);
            
            // Merge with existing data
            const existingListings = await this.getStoredListings();
            const mergedListings = await this.mergeListings(existingListings, validatedData.listings);
            
            // Save merged data
            await this.saveListings(mergedListings);
            
            // Update sync timestamp
            await this.updateSyncTimestamp(this.syncMethods.FILE_IMPORT);
            
            return {
                success: true,
                method: this.syncMethods.FILE_IMPORT,
                imported: validatedData.listings.length,
                total: mergedListings.length,
                timestamp: Date.now()
            };
            
        } catch (error) {
            throw new Error(`File import failed: ${error.message}`);
        }
    }

    // Google Drive Sync Method
    async syncFromGoogleDrive(options) {
        const { accessToken, fileId } = options;
        
        if (!accessToken) {
            throw new Error('Google Drive access token required');
        }

        try {
            // Get file from Google Drive
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Google Drive API error: ${response.status}`);
            }

            const fileData = await response.text();
            return await this.syncFromFile({ fileData });
            
        } catch (error) {
            throw new Error(`Google Drive sync failed: ${error.message}`);
        }
    }

    // Dropbox Sync Method
    async syncFromDropbox(options) {
        const { accessToken, filePath } = options;
        
        if (!accessToken) {
            throw new Error('Dropbox access token required');
        }

        try {
            const response = await fetch('https://content.dropboxapi.com/2/files/download', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: filePath || '/gist-listings.json'
                    })
                }
            });

            if (!response.ok) {
                throw new Error(`Dropbox API error: ${response.status}`);
            }

            const fileData = await response.text();
            return await this.syncFromFile({ fileData });
            
        } catch (error) {
            throw new Error(`Dropbox sync failed: ${error.message}`);
        }
    }

    // QR Code Sync Method
    async syncFromQRCode(options) {
        const { qrData } = options;
        
        try {
            // QR code contains either direct JSON data or URL to data
            let dataToSync;
            
            if (qrData.startsWith('http')) {
                // QR contains URL - fetch the data
                const response = await fetch(qrData);
                dataToSync = await response.text();
            } else {
                // QR contains direct data (base64 encoded JSON)
                try {
                    dataToSync = atob(qrData);
                } catch (e) {
                    dataToSync = qrData; // Try as plain text
                }
            }
            
            return await this.syncFromFile({ fileData: dataToSync });
            
        } catch (error) {
            throw new Error(`QR code sync failed: ${error.message}`);
        }
    }

    // URL Share Sync Method
    async syncFromURL(options) {
        const { shareUrl } = options;
        
        try {
            const response = await fetch(shareUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch from URL: ${response.status}`);
            }
            
            const fileData = await response.text();
            return await this.syncFromFile({ fileData });
            
        } catch (error) {
            throw new Error(`URL sync failed: ${error.message}`);
        }
    }

    // Data validation and normalization
    async validateAndNormalizeData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
        }

        // Check version compatibility
        if (data.version && !this.isVersionCompatible(data.version)) {
            throw new Error(`Incompatible data version: ${data.version}`);
        }

        // Normalize listings array
        let listings = [];
        
        if (Array.isArray(data)) {
            listings = data;
        } else if (data.listings && Array.isArray(data.listings)) {
            listings = data.listings;
        } else if (data.items && Array.isArray(data.items)) {
            listings = data.items;
        } else {
            throw new Error('No valid listings found in data');
        }

        // Validate and normalize each listing
        const validatedListings = [];
        
        for (let i = 0; i < Math.min(listings.length, this.maxListings); i++) {
            try {
                const validatedListing = this.validateListing(listings[i]);
                if (validatedListing) {
                    validatedListings.push(validatedListing);
                }
            } catch (error) {
                console.warn(`Skipping invalid listing ${i}:`, error.message);
            }
        }

        if (validatedListings.length === 0) {
            throw new Error('No valid listings found');
        }

        return {
            version: this.dataVersion,
            listings: validatedListings,
            importedAt: Date.now()
        };
    }

    validateListing(listing) {
        if (!listing || typeof listing !== 'object') {
            throw new Error('Listing must be an object');
        }

        // Required fields
        const required = ['title', 'description', 'price'];
        for (const field of required) {
            if (!listing[field] || (typeof listing[field] === 'string' && listing[field].trim() === '')) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Normalize and validate fields
        const normalized = {
            id: listing.id || `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: this.sanitizeString(listing.title, 100),
            description: this.sanitizeString(listing.description, 2000),
            price: this.validatePrice(listing.price),
            category: this.sanitizeString(listing.category || 'general', 50),
            condition: this.validateCondition(listing.condition),
            images: this.validateImages(listing.images || []),
            createdAt: listing.createdAt || Date.now(),
            updatedAt: Date.now()
        };

        // Optional fields
        if (listing.brand) normalized.brand = this.sanitizeString(listing.brand, 50);
        if (listing.model) normalized.model = this.sanitizeString(listing.model, 50);
        if (listing.size) normalized.size = this.sanitizeString(listing.size, 20);
        if (listing.color) normalized.color = this.sanitizeString(listing.color, 30);
        if (listing.location) normalized.location = this.sanitizeString(listing.location, 100);
        if (listing.shippingCost) normalized.shippingCost = this.validatePrice(listing.shippingCost);
        if (listing.year) normalized.year = this.validateYear(listing.year);

        return normalized;
    }

    sanitizeString(str, maxLength) {
        if (typeof str !== 'string') {
            str = String(str);
        }
        return str.trim().substring(0, maxLength);
    }

    validatePrice(price) {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice < 0) {
            throw new Error(`Invalid price: ${price}`);
        }
        return Math.round(numPrice * 100) / 100; // Round to 2 decimal places
    }

    validateCondition(condition) {
        const validConditions = ['new', 'like new', 'excellent', 'good', 'fair', 'poor', 'used'];
        const normalized = (condition || 'used').toLowerCase().trim();
        
        if (!validConditions.includes(normalized)) {
            return 'used'; // Default fallback
        }
        
        return normalized;
    }

    validateImages(images) {
        if (!Array.isArray(images)) {
            return [];
        }

        const validImages = [];
        for (const image of images.slice(0, 20)) { // Max 20 images
            if (typeof image === 'string' && this.isValidImageUrl(image)) {
                validImages.push(image);
            }
        }

        return validImages;
    }

    validateYear(year) {
        const numYear = parseInt(year);
        const currentYear = new Date().getFullYear();
        
        if (isNaN(numYear) || numYear < 1900 || numYear > currentYear + 1) {
            return null;
        }
        
        return numYear;
    }

    isValidImageUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            return this.supportedImageFormats.some(format => pathname.includes(`.${format}`));
        } catch (error) {
            return false;
        }
    }

    isVersionCompatible(version) {
        // Simple version compatibility check
        const major = version.split('.')[0];
        const currentMajor = this.dataVersion.split('.')[0];
        return major === currentMajor;
    }

    // Data merging and storage
    async mergeListings(existing, incoming) {
        const existingMap = new Map();
        
        // Create map of existing listings by ID
        existing.forEach(listing => {
            existingMap.set(listing.id, listing);
        });

        // Merge incoming listings
        incoming.forEach(listing => {
            const existingListing = existingMap.get(listing.id);
            
            if (existingListing) {
                // Update existing listing if incoming is newer
                if (listing.updatedAt > existingListing.updatedAt) {
                    existingMap.set(listing.id, listing);
                }
            } else {
                // Add new listing
                existingMap.set(listing.id, listing);
            }
        });

        return Array.from(existingMap.values());
    }

    async getStoredListings() {
        try {
            const result = await chrome.storage.local.get(['gistListings']);
            return result.gistListings || [];
        } catch (error) {
            console.error('Error getting stored listings:', error);
            return [];
        }
    }

    async saveListings(listings) {
        try {
            await chrome.storage.local.set({ gistListings: listings });
            return true;
        } catch (error) {
            console.error('Error saving listings:', error);
            throw error;
        }
    }

    async updateSyncTimestamp(method) {
        try {
            const syncSettings = await this.getSyncSettings();
            syncSettings.lastSyncTime = Date.now();
            syncSettings.lastSyncMethod = method;
            
            await chrome.storage.local.set({ gistSyncSettings: syncSettings });
        } catch (error) {
            console.error('Error updating sync timestamp:', error);
        }
    }

    // Export functionality for phone app integration
    async exportListings(options = {}) {
        try {
            const listings = await this.getStoredListings();
            const exportData = {
                version: this.dataVersion,
                exportedAt: Date.now(),
                exportedBy: 'gist-list-extension',
                listings: listings
            };

            if (options.format === 'url') {
                return await this.createShareableURL(exportData);
            } else if (options.format === 'qr') {
                return await this.createQRCode(exportData);
            } else {
                return JSON.stringify(exportData, null, 2);
            }
        } catch (error) {
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    async createShareableURL(data) {
        // For demo purposes, create a data URL
        // In production, this would upload to a temporary cloud storage
        const encodedData = btoa(JSON.stringify(data));
        return `data:application/json;base64,${encodedData}`;
    }

    async createQRCode(data) {
        // Create base64 encoded data for QR code
        const encodedData = btoa(JSON.stringify(data));
        return {
            qrData: encodedData,
            format: 'base64_json'
        };
    }

    // Cloud service authentication helpers
    async authenticateGoogleDrive() {
        // This would implement Google OAuth flow
        // For now, return placeholder
        return {
            success: false,
            message: 'Google Drive authentication not implemented yet'
        };
    }

    async authenticateDropbox() {
        // This would implement Dropbox OAuth flow
        // For now, return placeholder
        return {
            success: false,
            message: 'Dropbox authentication not implemented yet'
        };
    }

    // Utility methods
    generateSampleData() {
        return {
            version: this.dataVersion,
            listings: [
                {
                    id: 'sample_1',
                    title: 'Vintage Leather Jacket',
                    description: 'Genuine leather jacket in excellent condition. Size Medium. Perfect for fall weather.',
                    price: 89.99,
                    category: 'clothing',
                    condition: 'excellent',
                    brand: 'Wilson Leather',
                    size: 'M',
                    color: 'brown',
                    images: [
                        'https://i.ebayimg.com/images/g/UuIAAOSwxcRh~Vk7/s-l400.jpg',
                        'https://www.shutterstock.com/image-photo/rear-view-handsome-casual-man-600nw-2362904699.jpg'
                    ],
                    createdAt: Date.now() - 86400000, // 1 day ago
                    updatedAt: Date.now()
                },
                {
                    id: 'sample_2',
                    title: 'iPhone 13 Pro Max',
                    description: 'Unlocked iPhone 13 Pro Max 128GB in Space Gray. Includes original box and charger.',
                    price: 799.00,
                    category: 'electronics',
                    condition: 'like new',
                    brand: 'Apple',
                    model: 'iPhone 13 Pro Max',
                    color: 'space gray',
                    images: [
                        'https://i.ytimg.com/vi/4jXZ6G9tavA/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAO_iRVE7yHk5J_XBHJeHT--qY9Qw',
                        'https://i.ytimg.com/vi/4SLdK2n3-aU/maxresdefault.jpg'
                    ],
                    createdAt: Date.now() - 172800000, // 2 days ago
                    updatedAt: Date.now()
                }
            ]
        };
    }
}

// Export for use in background script
window.DataSyncManager = DataSyncManager;