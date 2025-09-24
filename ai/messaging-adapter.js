// Environment-aware messaging adapter for TabSorter AI
// Works in Chrome extension and web page contexts

class MessagingAdapter {
    constructor() {
        this.environment = this.detectEnvironment();
        this.listeners = new Map();
        this.messageId = 0;

        // Log transport selection once
        console.log(`[AI LIFECYCLE] Messaging transport: ${this.environment.transport}`);

        // Set up listeners based on transport
        this.setupListeners();
    }

    // Detect execution environment
    detectEnvironment() {
        const hasChromeRuntime = typeof chrome !== 'undefined' &&
                                chrome.runtime &&
                                chrome.runtime.id;

        const hasPostMessage = typeof window !== 'undefined' &&
                              window.postMessage;

        const isExtension = hasChromeRuntime;

        let transport = 'noop';
        if (isExtension) {
            transport = 'chrome';
        } else if (hasPostMessage) {
            transport = 'postMessage';
        }

        return {
            isExtension,
            hasChromeRuntime,
            hasPostMessage,
            transport
        };
    }

    // Set up message listeners based on transport
    setupListeners() {
        if (this.environment.transport === 'chrome') {
            // Chrome extension transport - listeners are set up externally
            // This adapter only handles sending
        } else if (this.environment.transport === 'postMessage') {
            // Web page transport - listen for postMessage
            window.addEventListener('message', (event) => {
                // Filter messages from TabSorter AI
                if (event.data && event.data.source === 'TabSorterAI') {
                    const { type, ...payload } = event.data;
                    this.notifyListeners(type, payload, event);
                }
            });
        }
        // noop transport has no listeners
    }

    // Send message via appropriate transport
    async send(type, payload = {}) {
        const messageId = ++this.messageId;
        const message = {
            type,
            ...payload,
            messageId,
            timestamp: Date.now()
        };

        try {
            if (this.environment.transport === 'chrome') {
                // Chrome extension transport
                await this.sendViaChrome(message);
            } else if (this.environment.transport === 'postMessage') {
                // Web page transport
                this.sendViaPostMessage(message);
            } else {
                // Noop transport - just log
                console.log('[MESSAGING] Noop transport - message not sent:', message);
            }
        } catch (error) {
            console.warn('[MESSAGING] Send failed but continuing:', error.message);
            // Don't throw - callers expect resolution
        }

        return messageId;
    }

    // Send via Chrome extension runtime
    async sendViaChrome(message) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(message, (response) => {
                    // Ignore chrome.runtime.lastError - don't reject on missing listeners
                    resolve(response);
                });
            } catch (error) {
                // If chrome.runtime is not available, resolve anyway
                resolve(null);
            }
        });
    }

    // Send via window.postMessage
    sendViaPostMessage(message) {
        const fullMessage = {
            source: 'TabSorterAI',
            ...message
        };

        try {
            window.postMessage(fullMessage, '*');
        } catch (error) {
            console.warn('[MESSAGING] postMessage failed:', error.message);
        }
    }

    // Register listener for message type
    on(type, handler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(handler);
    }

    // Unregister listener
    off(type, handler) {
        const typeListeners = this.listeners.get(type);
        if (typeListeners) {
            typeListeners.delete(handler);
            if (typeListeners.size === 0) {
                this.listeners.delete(type);
            }
        }
    }

    // Notify registered listeners
    notifyListeners(type, payload, event) {
        const typeListeners = this.listeners.get(type);
        if (typeListeners) {
            for (const handler of typeListeners) {
                try {
                    handler(payload, event);
                } catch (error) {
                    console.error('[MESSAGING] Listener error:', error);
                }
            }
        }
    }

    // Get current environment info
    getEnvironment() {
        return { ...this.environment };
    }
}

// Create singleton instance
const Messaging = new MessagingAdapter();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Messaging;
}

// Make available globally for script tags
if (typeof window !== 'undefined') {
    window.MessagingAdapter = MessagingAdapter;
    window.Messaging = Messaging;
}