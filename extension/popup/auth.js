
// Authentication Script for GISTer Extension
class AuthManager {
    constructor() {
        this.apiClient = new GisterAPIClient();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        const form = document.getElementById('authForm');
        form.addEventListener('submit', (e) => this.handleLogin(e));
    }

    async checkExistingAuth() {
        await this.apiClient.loadAuthData();
        
        if (this.apiClient.isAuthenticated()) {
            // Already authenticated, redirect to main popup
            this.showSuccess('Already connected! Redirecting...');
            setTimeout(() => {
                window.location.href = 'popup.html';
            }, 1000);
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const connectBtn = document.getElementById('connectBtn');

        // Validation
        if (!email || !password) {
            this.showError('Please enter both email and password');
            return;
        }

        // Show loading state
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';
        this.hideMessages();

        try {
            const result = await this.apiClient.verifyAuth(email, password);

            if (result.success) {
                this.showSuccess('✓ Connected successfully! Redirecting...');
                
                // Redirect to main popup after short delay
                setTimeout(() => {
                    window.location.href = 'popup.html';
                }, 1500);
            } else {
                this.showError(result.error || 'Authentication failed. Please check your credentials.');
                connectBtn.disabled = false;
                connectBtn.textContent = 'Connect Extension';
            }
        } catch (error) {
            this.showError('Connection failed. Please try again.');
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect Extension';
        }
    }

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        const successEl = document.getElementById('successMessage');
        successEl.style.display = 'none';
    }

    showSuccess(message) {
        const successEl = document.getElementById('successMessage');
        successEl.textContent = message;
        successEl.style.display = 'block';
        
        const errorEl = document.getElementById('errorMessage');
        errorEl.style.display = 'none';
    }

    hideMessages() {
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('successMessage').style.display = 'none';
    }
}

// Initialize auth manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
