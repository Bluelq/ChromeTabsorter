// Environment-aware path resolver for TabSorter AI
// Handles URL resolution in both extension and web page contexts

class EnvPaths {
    constructor() {
        this.isExtension = this.detectExtension();
        console.log(`[ENV PATHS] Environment: ${this.isExtension ? 'extension' : 'web page'}`);
    }

    // Detect if running in Chrome extension
    detectExtension() {
        return typeof chrome !== 'undefined' &&
               chrome.runtime &&
               chrome.runtime.id;
    }

    // Get URL for a resource path
    getURL(path) {
        if (this.isExtension) {
            // Extension context - use chrome.runtime.getURL
            try {
                return chrome.runtime.getURL(path);
            } catch (error) {
                console.warn('[ENV PATHS] chrome.runtime.getURL failed:', error.message);
                return path; // Fallback to relative path
            }
        } else {
            // Web page context - use relative paths
            // Assume resources are served from root or same directory
            if (path.startsWith('/')) {
                return path; // Already absolute
            } else {
                return '/' + path; // Make relative paths absolute from root
            }
        }
    }

    // Get multiple URLs at once
    getURLs(paths) {
        return paths.map(path => this.getURL(path));
    }

    // Get environment info
    getEnvironment() {
        return {
            isExtension: this.isExtension,
            hasChromeRuntime: this.isExtension,
            urlResolution: this.isExtension ? 'chrome.runtime.getURL' : 'relative paths'
        };
    }
}

// Create singleton instance
const envPaths = new EnvPaths();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = envPaths;
}

// Make available globally for script tags
if (typeof window !== 'undefined') {
    window.EnvPaths = EnvPaths;
    window.envPaths = envPaths;
}