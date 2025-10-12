
// GISTer API Client for Chrome Extension
class GisterAPIClient {
    constructor() {
        // Default to production, fallback to localhost for development
        this.apiBaseUrl = 'https://gistlist.abacusai.app';
        this.authToken = null;
        this.userId = null;
        
        this.loadAuthData();
    }

    async loadAuthData() {
        try {
            const result = await chrome.storage.local.get(['gisterAuthToken', 'gisterUserId', 'gisterApiUrl']);
            this.authToken = result.gisterAuthToken || null;
            this.userId = result.gisterUserId || null;
            if (result.gisterApiUrl) {
                this.apiBaseUrl = result.gisterApiUrl;
            }
        } catch (error) {
            console.error('Error loading auth data:', error);
        }
    }

    async saveAuthData() {
        try {
            await chrome.storage.local.set({
                gisterAuthToken: this.authToken,
                gisterUserId: this.userId,
                gisterApiUrl: this.apiBaseUrl
            });
        } catch (error) {
            console.error('Error saving auth data:', error);
        }
    }

    async clearAuthData() {
        this.authToken = null;
        this.userId = null;
        await chrome.storage.local.remove(['gisterAuthToken', 'gisterUserId']);
    }

    isAuthenticated() {
        return this.authToken !== null && this.userId !== null;
    }

    // API Request Helper
    async makeRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const options = {
            method,
            headers,
            credentials: 'include'
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            
            if (response.status === 401) {
                // Token expired or invalid
                await this.clearAuthData();
                throw new Error('Authentication required. Please log in to GISTer app.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // Authentication Methods
    async verifyAuth(email, password) {
        try {
            const data = await this.makeRequest('/api/extension/auth/verify', 'POST', {
                email,
                password
            });

            this.authToken = data.token;
            this.userId = data.userId;
            await this.saveAuthData();

            return {
                success: true,
                user: data.user
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Listings Methods
    async getListings() {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const data = await this.makeRequest('/api/extension/listings', 'GET');
            return data.listings || [];
        } catch (error) {
            throw error;
        }
    }

    async markListingAsPosted(listingId, platform, result) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            await this.makeRequest(`/api/extension/listings/${listingId}/posted`, 'POST', {
                platform,
                success: result.success,
                error: result.error || null,
                listingUrl: result.listingUrl || null
            });
        } catch (error) {
            console.error('Failed to mark listing as posted:', error);
        }
    }

    // Scheduled Posts Methods
    async getScheduledPosts() {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const data = await this.makeRequest('/api/extension/schedule', 'GET');
            return data.scheduledPosts || [];
        } catch (error) {
            throw error;
        }
    }

    async createScheduledPost(listingId, platforms, scheduledTime, useAITime = false) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const data = await this.makeRequest('/api/extension/schedule', 'POST', {
                listingId,
                platforms,
                scheduledTime: useAITime ? null : scheduledTime,
                useAITime
            });
            return data.scheduledPost;
        } catch (error) {
            throw error;
        }
    }

    async updateScheduledPost(scheduleId, updates) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const data = await this.makeRequest('/api/extension/schedule', 'PUT', {
                scheduleId,
                ...updates
            });
            return data.scheduledPost;
        } catch (error) {
            throw error;
        }
    }

    async deleteScheduledPost(scheduleId) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            await this.makeRequest('/api/extension/schedule', 'DELETE', {
                scheduleId
            });
        } catch (error) {
            throw error;
        }
    }

    // AI Recommendations
    async getAIRecommendedTime(listingId, category) {
        // This would call an AI endpoint to get optimal posting time
        // For now, return a smart recommendation based on category
        const recommendations = {
            'Electronics': { hour: 19, reason: 'Peak evening browsing time' },
            'Clothing': { hour: 20, reason: 'Evening shopping time' },
            'Collectibles': { hour: 14, reason: 'Weekend afternoon peak' },
            'Furniture': { hour: 10, reason: 'Morning home browsing' },
            'default': { hour: 18, reason: 'Evening peak traffic' }
        };

        const recommendation = recommendations[category] || recommendations['default'];
        
        // Calculate next occurrence of recommended hour
        const now = new Date();
        const recommendedTime = new Date();
        recommendedTime.setHours(recommendation.hour, 0, 0, 0);
        
        if (recommendedTime <= now) {
            recommendedTime.setDate(recommendedTime.getDate() + 1);
        }

        return {
            scheduledTime: recommendedTime.toISOString(),
            reason: recommendation.reason,
            confidence: 0.85
        };
    }
}

// Export for use in background and popup scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GisterAPIClient;
}
