// Enhanced User Feedback and Error Handling System for Gist List Extension

class UserFeedbackManager {
    constructor() {
        this.toastContainer = null;
        this.progressManager = null;
        this.errorCategories = this.getErrorCategories();
        this.init();
    }

    init() {
        this.createToastContainer();
        this.progressManager = new ProgressManager();
    }

    createToastContainer() {
        // Create toast container if it doesn't exist
        this.toastContainer = document.getElementById('toast-container');
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toast-container';
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }
    }

    // Toast notification system
    showToast(message, type = 'info', duration = 4000, actions = []) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getToastIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
                ${actions.length > 0 ? `
                    <div class="toast-actions">
                        ${actions.map(action => 
                            `<button class="toast-action" data-action="${action.id}">${action.label}</button>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
            <button class="toast-close">&times;</button>
        `;

        // Add event listeners
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Action button handlers
        actions.forEach(action => {
            const button = toast.querySelector(`[data-action="${action.id}"]`);
            if (button) {
                button.addEventListener('click', () => {
                    action.callback();
                    if (action.closeOnClick !== false) {
                        this.removeToast(toast);
                    }
                });
            }
        });

        // Add to container
        this.toastContainer.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });

        // Auto-remove
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    this.removeToast(toast);
                }
            }, duration);
        }

        return toast;
    }

    removeToast(toast) {
        toast.classList.add('toast-removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ',
            loading: '⟳'
        };
        return icons[type] || icons.info;
    }

    // Enhanced error handling
    handleError(error, context = {}) {
        console.error('Gist List Error:', error, context);
        
        const errorInfo = this.categorizeError(error, context);
        const userMessage = this.createUserFriendlyMessage(errorInfo);
        const actions = this.createErrorActions(errorInfo, context);

        // Show error toast with actions
        this.showToast(userMessage.message, 'error', 0, actions);

        // Log error for analytics/debugging
        this.logError(errorInfo, context);

        return errorInfo;
    }

    categorizeError(error, context) {
        const message = error.message || error.toString();
        const stack = error.stack;
        
        // Determine error category
        let category = 'unknown';
        let severity = 'medium';
        let recoverable = true;

        for (const [cat, patterns] of Object.entries(this.errorCategories)) {
            if (patterns.some(pattern => message.toLowerCase().includes(pattern))) {
                category = cat;
                break;
            }
        }

        // Set severity based on category
        const severityMap = {
            network: 'high',
            authentication: 'high',
            validation: 'medium',
            platform: 'high',
            permission: 'high',
            timeout: 'medium',
            storage: 'high',
            unknown: 'medium'
        };

        severity = severityMap[category] || 'medium';

        // Determine if recoverable
        const nonRecoverableCategories = ['permission', 'authentication'];
        recoverable = !nonRecoverableCategories.includes(category);

        return {
            originalError: error,
            category,
            severity,
            recoverable,
            message,
            stack,
            context,
            timestamp: Date.now()
        };
    }

    createUserFriendlyMessage(errorInfo) {
        const { category, message, context } = errorInfo;
        
        const friendlyMessages = {
            network: {
                title: 'Connection Problem',
                message: 'Unable to connect to the platform. Please check your internet connection and try again.',
                suggestions: ['Check your internet connection', 'Try refreshing the page', 'Verify the platform is accessible']
            },
            authentication: {
                title: 'Login Required',
                message: 'Please log in to the platform before posting listings.',
                suggestions: ['Log in to the platform in a new tab', 'Refresh the page after logging in']
            },
            validation: {
                title: 'Invalid Data',
                message: 'Some of your listing information is invalid or missing.',
                suggestions: ['Check that all required fields are filled', 'Verify image URLs are accessible', 'Ensure price is a valid number']
            },
            platform: {
                title: 'Platform Issue',
                message: `There's an issue with ${context.platform || 'the platform'}. This might be temporary.`,
                suggestions: ['Try again in a few minutes', 'Check if the platform is down', 'Try a different platform']
            },
            permission: {
                title: 'Permission Denied',
                message: 'The extension needs additional permissions to work on this site.',
                suggestions: ['Grant the extension permission for this site', 'Reload the page after granting permissions']
            },
            timeout: {
                title: 'Request Timeout',
                message: 'The operation took too long to complete.',
                suggestions: ['Try again with fewer items', 'Check your internet connection', 'Try during off-peak hours']
            },
            storage: {
                title: 'Storage Issue',
                message: 'Unable to save or retrieve your data.',
                suggestions: ['Check available storage space', 'Try restarting the browser', 'Clear extension data if necessary']
            },
            unknown: {
                title: 'Unexpected Error',
                message: 'An unexpected error occurred. Please try again.',
                suggestions: ['Refresh the page', 'Restart the browser', 'Contact support if the problem persists']
            }
        };

        const template = friendlyMessages[category] || friendlyMessages.unknown;
        
        return {
            title: template.title,
            message: template.message,
            suggestions: template.suggestions,
            technical: message
        };
    }

    createErrorActions(errorInfo, context) {
        const { category, recoverable } = errorInfo;
        const actions = [];

        // Retry action for recoverable errors
        if (recoverable) {
            actions.push({
                id: 'retry',
                label: 'Retry',
                callback: () => {
                    if (context.retryCallback) {
                        context.retryCallback();
                    }
                }
            });
        }

        // Category-specific actions
        switch (category) {
            case 'authentication':
                actions.push({
                    id: 'login',
                    label: 'Open Login Page',
                    callback: () => {
                        if (context.platform) {
                            const platformUrls = {
                                facebook: 'https://facebook.com/login',
                                ebay: 'https://signin.ebay.com',
                                poshmark: 'https://poshmark.com/login',
                                reverb: 'https://reverb.com/login',
                                mercari: 'https://mercari.com/login',
                                nextdoor: 'https://nextdoor.com/login'
                            };
                            
                            const url = platformUrls[context.platform];
                            if (url) {
                                chrome.tabs.create({ url });
                            }
                        }
                    }
                });
                break;

            case 'validation':
                actions.push({
                    id: 'review',
                    label: 'Review Data',
                    callback: () => {
                        // Focus on the problematic field if known
                        if (context.field) {
                            const element = document.querySelector(`[name="${context.field}"], #${context.field}`);
                            if (element) {
                                element.focus();
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }
                    }
                });
                break;

            case 'platform':
                actions.push({
                    id: 'check-status',
                    label: 'Check Platform Status',
                    callback: () => {
                        // Open platform status page or main site
                        if (context.platform) {
                            const statusUrls = {
                                facebook: 'https://facebook.com',
                                ebay: 'https://ebay.com',
                                poshmark: 'https://poshmark.com',
                                reverb: 'https://reverb.com',
                                mercari: 'https://mercari.com',
                                nextdoor: 'https://nextdoor.com'
                            };
                            
                            const url = statusUrls[context.platform];
                            if (url) {
                                chrome.tabs.create({ url });
                            }
                        }
                    }
                });
                break;
        }

        // Help action
        actions.push({
            id: 'help',
            label: 'Get Help',
            callback: () => {
                this.showHelpDialog(errorInfo);
            }
        });

        return actions;
    }

    showHelpDialog(errorInfo) {
        const helpDialog = document.createElement('div');
        helpDialog.className = 'help-dialog-overlay';
        
        const userMessage = this.createUserFriendlyMessage(errorInfo);
        
        helpDialog.innerHTML = `
            <div class="help-dialog">
                <div class="help-dialog-header">
                    <h3>${userMessage.title}</h3>
                    <button class="help-dialog-close">&times;</button>
                </div>
                <div class="help-dialog-content">
                    <p><strong>What happened:</strong> ${userMessage.message}</p>
                    <div class="help-suggestions">
                        <h4>Try these solutions:</h4>
                        <ul>
                            ${userMessage.suggestions.map(suggestion => 
                                `<li>${suggestion}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    <details class="technical-details">
                        <summary>Technical Details</summary>
                        <pre>${userMessage.technical}</pre>
                    </details>
                </div>
                <div class="help-dialog-footer">
                    <button class="btn btn-secondary help-dialog-close">Close</button>
                    <button class="btn btn-primary" id="contact-support">Contact Support</button>
                </div>
            </div>
        `;

        // Event listeners
        helpDialog.querySelectorAll('.help-dialog-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(helpDialog);
            });
        });

        helpDialog.querySelector('#contact-support').addEventListener('click', () => {
            this.openSupportPage(errorInfo);
        });

        // Close on overlay click
        helpDialog.addEventListener('click', (e) => {
            if (e.target === helpDialog) {
                document.body.removeChild(helpDialog);
            }
        });

        document.body.appendChild(helpDialog);
    }

    openSupportPage(errorInfo) {
        const supportData = {
            error: errorInfo.message,
            category: errorInfo.category,
            timestamp: new Date(errorInfo.timestamp).toISOString(),
            context: errorInfo.context
        };

        const encodedData = encodeURIComponent(JSON.stringify(supportData));
        const supportUrl = `mailto:support@example.com?subject=Gist%20List%20Extension%20Error&body=Error%20Details:%20${encodedData}`;
        
        chrome.tabs.create({ url: supportUrl });
    }

    logError(errorInfo, context) {
        try {
            // Store error in local storage for debugging
            chrome.storage.local.get(['errorLogs'], (result) => {
                const logs = result.errorLogs || [];
                logs.push({
                    ...errorInfo,
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    extensionVersion: chrome.runtime.getManifest().version
                });

                // Keep only last 50 errors
                const trimmedLogs = logs.slice(-50);
                
                chrome.storage.local.set({ errorLogs: trimmedLogs });
            });
        } catch (error) {
            console.error('Failed to log error:', error);
        }
    }

    getErrorCategories() {
        return {
            network: ['network', 'connection', 'timeout', 'fetch', 'cors', 'net::', 'offline'],
            authentication: ['login', 'auth', 'unauthorized', '401', 'sign in', 'signin'],
            validation: ['validation', 'invalid', 'required', 'missing', 'format', 'length'],
            platform: ['platform', 'site', 'page', 'element', 'selector', 'not found'],
            permission: ['permission', 'denied', 'blocked', 'forbidden', '403'],
            timeout: ['timeout', 'time out', 'took too long', 'slow'],
            storage: ['storage', 'quota', 'space', 'save', 'load', 'data']
        };
    }

    // Success feedback
    showSuccess(message, duration = 3000) {
        return this.showToast(message, 'success', duration);
    }

    // Warning feedback
    showWarning(message, duration = 4000) {
        return this.showToast(message, 'warning', duration);
    }

    // Info feedback
    showInfo(message, duration = 3000) {
        return this.showToast(message, 'info', duration);
    }

    // Loading feedback
    showLoading(message) {
        return this.showToast(message, 'loading', 0);
    }
}

// Progress Manager Class
class ProgressManager {
    constructor() {
        this.activeProgress = new Map();
    }

    createProgress(id, options = {}) {
        const progress = {
            id,
            total: options.total || 100,
            current: 0,
            status: 'active',
            startTime: Date.now(),
            eta: null,
            details: options.details || '',
            cancellable: options.cancellable || false,
            onCancel: options.onCancel,
            element: null
        };

        this.activeProgress.set(id, progress);
        this.renderProgress(progress);
        return progress;
    }

    updateProgress(id, current, details) {
        const progress = this.activeProgress.get(id);
        if (!progress) return;

        progress.current = current;
        if (details) progress.details = details;

        // Calculate ETA
        const elapsed = Date.now() - progress.startTime;
        const rate = current / elapsed;
        const remaining = progress.total - current;
        progress.eta = remaining > 0 ? remaining / rate : 0;

        this.renderProgress(progress);
    }

    completeProgress(id, message) {
        const progress = this.activeProgress.get(id);
        if (!progress) return;

        progress.status = 'completed';
        progress.current = progress.total;
        progress.details = message || 'Completed';

        this.renderProgress(progress);

        // Auto-remove after delay
        setTimeout(() => {
            this.removeProgress(id);
        }, 2000);
    }

    failProgress(id, message) {
        const progress = this.activeProgress.get(id);
        if (!progress) return;

        progress.status = 'failed';
        progress.details = message || 'Failed';

        this.renderProgress(progress);

        // Auto-remove after delay
        setTimeout(() => {
            this.removeProgress(id);
        }, 5000);
    }

    removeProgress(id) {
        const progress = this.activeProgress.get(id);
        if (!progress) return;

        if (progress.element && progress.element.parentNode) {
            progress.element.parentNode.removeChild(progress.element);
        }

        this.activeProgress.delete(id);
    }

    renderProgress(progress) {
        if (!progress.element) {
            progress.element = this.createProgressElement(progress);
            
            // Add to progress container
            let container = document.getElementById('progress-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'progress-container';
                container.className = 'progress-container';
                document.body.appendChild(container);
            }
            
            container.appendChild(progress.element);
        }

        this.updateProgressElement(progress);
    }

    createProgressElement(progress) {
        const element = document.createElement('div');
        element.className = `progress-item progress-${progress.status}`;
        element.innerHTML = `
            <div class="progress-header">
                <span class="progress-id">${progress.id}</span>
                ${progress.cancellable ? '<button class="progress-cancel">✕</button>' : ''}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-details">
                <span class="progress-text"></span>
                <span class="progress-eta"></span>
            </div>
        `;

        // Cancel button
        if (progress.cancellable) {
            element.querySelector('.progress-cancel').addEventListener('click', () => {
                if (progress.onCancel) {
                    progress.onCancel();
                }
                this.removeProgress(progress.id);
            });
        }

        return element;
    }

    updateProgressElement(progress) {
        const { element, current, total, status, details, eta } = progress;
        
        const percentage = Math.min(100, (current / total) * 100);
        
        element.className = `progress-item progress-${status}`;
        element.querySelector('.progress-fill').style.width = `${percentage}%`;
        element.querySelector('.progress-text').textContent = details;
        
        // ETA display
        const etaElement = element.querySelector('.progress-eta');
        if (eta && status === 'active') {
            const etaMinutes = Math.ceil(eta / 60000);
            etaElement.textContent = `ETA: ${etaMinutes}m`;
        } else {
            etaElement.textContent = '';
        }
    }
}

// Export for use in other scripts
window.UserFeedbackManager = UserFeedbackManager;
window.ProgressManager = ProgressManager;