/**
 * Rules Engine - Custom rule-based categorization system
 * Part 3: User-defined rules with priority and conditions
 */

class RulesEngine {
    constructor() {
        this.rules = [];
        this.loadDefaultRules();
    }

    /**
     * Load default system rules
     */
    loadDefaultRules() {
        this.systemRules = [
            // GitHub specific rules
            {
                id: 'github_issues',
                name: 'GitHub Issues',
                conditions: {
                    domain: 'github.com',
                    urlPattern: '/issues|/pull',
                    operator: 'AND'
                },
                action: {
                    category: 'development',
                    subcategory: 'issues',
                    priority: 100
                },
                enabled: true
            },
            {
                id: 'github_repos',
                name: 'GitHub Repositories',
                conditions: {
                    domain: 'github.com',
                    urlPattern: '^[^/]+/[^/]+$',
                    urlExcludes: '/issues|/pull|/settings',
                    operator: 'AND'
                },
                action: {
                    category: 'development',
                    subcategory: 'repositories',
                    priority: 95
                },
                enabled: true
            },
            
            // Google Workspace rules
            {
                id: 'google_docs',
                name: 'Google Docs',
                conditions: {
                    domain: 'docs.google.com',
                    operator: 'AND'
                },
                action: {
                    category: 'work',
                    subcategory: 'documents',
                    priority: 90
                },
                enabled: true
            },
            {
                id: 'google_sheets',
                name: 'Google Sheets',
                conditions: {
                    domain: 'docs.google.com/spreadsheets',
                    operator: 'AND'
                },
                action: {
                    category: 'work',
                    subcategory: 'spreadsheets',
                    priority: 90
                },
                enabled: true
            },
            
            // Shopping cart detection
            {
                id: 'shopping_cart',
                name: 'Shopping Cart',
                conditions: {
                    urlPattern: '/cart|/checkout|/basket',
                    keywords: ['cart', 'checkout', 'order', 'payment'],
                    keywordThreshold: 2,
                    operator: 'OR'
                },
                action: {
                    category: 'shopping',
                    subcategory: 'checkout',
                    priority: 85,
                    groupSeparately: true
                },
                enabled: true
            },
            
            // Video streaming
            {
                id: 'video_streaming',
                name: 'Video Streaming',
                conditions: {
                    domains: ['youtube.com', 'vimeo.com', 'twitch.tv'],
                    urlPattern: '/watch|/video',
                    operator: 'OR'
                },
                action: {
                    category: 'entertainment',
                    subcategory: 'videos',
                    priority: 80
                },
                enabled: true
            },
            
            // Documentation sites
            {
                id: 'technical_docs',
                name: 'Technical Documentation',
                conditions: {
                    urlPattern: '/docs/|/documentation/|/api/',
                    keywords: ['api', 'reference', 'documentation', 'guide'],
                    keywordThreshold: 1,
                    operator: 'OR'
                },
                action: {
                    category: 'development',
                    subcategory: 'documentation',
                    priority: 75
                },
                enabled: true
            },
            
            // Local development
            {
                id: 'localhost',
                name: 'Local Development',
                conditions: {
                    domains: ['localhost', '127.0.0.1', '0.0.0.0'],
                    operator: 'OR'
                },
                action: {
                    category: 'development',
                    subcategory: 'local',
                    priority: 100,
                    pinTab: true
                },
                enabled: true
            },
            
            // Social media profiles
            {
                id: 'social_profiles',
                name: 'Social Media Profiles',
                conditions: {
                    urlPattern: '/profile/|/user/|/@',
                    domains: ['twitter.com', 'instagram.com', 'linkedin.com'],
                    operator: 'AND'
                },
                action: {
                    category: 'social',
                    subcategory: 'profiles',
                    priority: 70
                },
                enabled: true
            },
            
            // Email rules
            {
                id: 'email_compose',
                name: 'Composing Email',
                conditions: {
                    urlPattern: 'compose|draft',
                    domains: ['mail.google.com', 'outlook.com'],
                    operator: 'AND'
                },
                action: {
                    category: 'communication',
                    subcategory: 'compose',
                    priority: 85,
                    keepOpen: true
                },
                enabled: true
            },
            
            // Research papers
            {
                id: 'research_papers',
                name: 'Research Papers',
                conditions: {
                    domains: ['arxiv.org', 'scholar.google.com', 'jstor.org'],
                    fileExtension: 'pdf',
                    operator: 'OR'
                },
                action: {
                    category: 'research',
                    subcategory: 'papers',
                    priority: 90
                },
                enabled: true
            }
        ];
    }

    /**
     * Evaluate rules against a tab
     */
    evaluateTab(tab, userRules = []) {
        const allRules = [...this.systemRules, ...userRules, ...this.rules];
        const matchedRules = [];

        // Sort rules by priority (higher first)
        allRules.sort((a, b) => (b.action?.priority || 0) - (a.action?.priority || 0));

        for (const rule of allRules) {
            if (!rule.enabled) continue;

            if (this.evaluateConditions(tab, rule.conditions)) {
                matchedRules.push({
                    rule: rule,
                    confidence: this.calculateRuleConfidence(tab, rule)
                });

                // If rule has "stop" flag, don't evaluate further rules
                if (rule.action?.stopProcessing) {
                    break;
                }
            }
        }

        return matchedRules;
    }

    /**
     * Evaluate rule conditions
     */
    evaluateConditions(tab, conditions) {
        if (!conditions) return false;

        const results = [];

        // Domain condition
        if (conditions.domain) {
            const domainMatches = this.matchDomain(tab, conditions.domain);
            results.push(domainMatches);
        }

        // Multiple domains
        if (conditions.domains && Array.isArray(conditions.domains)) {
            const domainMatches = conditions.domains.some(domain => 
                this.matchDomain(tab, domain)
            );
            results.push(domainMatches);
        }

        // URL pattern
        if (conditions.urlPattern) {
            const pattern = new RegExp(conditions.urlPattern, 'i');
            results.push(pattern.test(tab.url));
        }

        // URL excludes pattern
        if (conditions.urlExcludes) {
            const pattern = new RegExp(conditions.urlExcludes, 'i');
            results.push(!pattern.test(tab.url));
        }

        // Title pattern
        if (conditions.titlePattern) {
            const pattern = new RegExp(conditions.titlePattern, 'i');
            results.push(pattern.test(tab.title || ''));
        }

        // Keywords in title or URL
        if (conditions.keywords && Array.isArray(conditions.keywords)) {
            const threshold = conditions.keywordThreshold || 1;
            const matchCount = this.countKeywordMatches(tab, conditions.keywords);
            results.push(matchCount >= threshold);
        }

        // File extension
        if (conditions.fileExtension) {
            const ext = this.extractFileExtension(tab.url);
            results.push(ext === conditions.fileExtension);
        }

        // Tab state conditions
        if (conditions.isPinned !== undefined) {
            results.push(tab.pinned === conditions.isPinned);
        }

        if (conditions.isActive !== undefined) {
            results.push(tab.active === conditions.isActive);
        }

        // Time-based conditions
        if (conditions.timeRange) {
            results.push(this.evaluateTimeCondition(conditions.timeRange));
        }

        // Custom function condition (for advanced users)
        if (conditions.customFunction && typeof conditions.customFunction === 'function') {
            try {
                results.push(conditions.customFunction(tab));
            } catch (error) {
                console.error('Error in custom rule function:', error);
                results.push(false);
            }
        }

        // Apply operator
        if (results.length === 0) return false;

        const operator = conditions.operator || 'AND';
        if (operator === 'AND') {
            return results.every(r => r === true);
        } else if (operator === 'OR') {
            return results.some(r => r === true);
        } else if (operator === 'NOT') {
            return !results[0];
        }

        return false;
    }

    /**
     * Match domain with wildcards support
     */
    matchDomain(tab, domainPattern) {
        try {
            const tabDomain = new URL(tab.url).hostname.toLowerCase();
            const pattern = domainPattern.toLowerCase();

            // Exact match
            if (tabDomain === pattern) return true;

            // Wildcard support (*.example.com)
            if (pattern.startsWith('*.')) {
                const baseDomain = pattern.substring(2);
                return tabDomain.endsWith(baseDomain);
            }

            // Partial match
            return tabDomain.includes(pattern);
        } catch {
            return false;
        }
    }

    /**
     * Count keyword matches in tab
     */
    countKeywordMatches(tab, keywords) {
        const text = `${tab.url} ${tab.title || ''}`.toLowerCase();
        let count = 0;

        for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
                count++;
            }
        }

        return count;
    }

    /**
     * Extract file extension
     */
    extractFileExtension(url) {
        try {
            const path = new URL(url).pathname;
            const match = path.match(/\.([a-z0-9]+)$/i);
            return match ? match[1].toLowerCase() : null;
        } catch {
            return null;
        }
    }

    /**
     * Evaluate time-based conditions
     */
    evaluateTimeCondition(timeRange) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();

        if (timeRange.hours) {
            const { start, end } = timeRange.hours;
            if (start <= end) {
                if (currentHour < start || currentHour > end) return false;
            } else {
                // Handles ranges like 22:00 - 02:00
                if (currentHour < start && currentHour > end) return false;
            }
        }

        if (timeRange.days) {
            if (!timeRange.days.includes(currentDay)) return false;
        }

        if (timeRange.dates) {
            const currentDate = now.toISOString().split('T')[0];
            if (!timeRange.dates.includes(currentDate)) return false;
        }

        return true;
    }

    /**
     * Calculate confidence score for a rule match
     */
    calculateRuleConfidence(tab, rule) {
        let confidence = 0.5; // Base confidence

        // Increase confidence based on condition specificity
        if (rule.conditions) {
            if (rule.conditions.domain) confidence += 0.2;
            if (rule.conditions.urlPattern) confidence += 0.15;
            if (rule.conditions.keywords) confidence += 0.1;
            if (rule.conditions.fileExtension) confidence += 0.1;
            if (rule.conditions.customFunction) confidence += 0.25;
        }

        // Adjust based on action priority
        if (rule.action?.priority) {
            confidence += (rule.action.priority / 100) * 0.2;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Apply rules to multiple tabs
     */
    applyRules(tabs, userRules = []) {
        const results = [];

        for (const tab of tabs) {
            const matchedRules = this.evaluateTab(tab, userRules);
            
            if (matchedRules.length > 0) {
                // Use the highest priority rule
                const bestRule = matchedRules[0];
                results.push({
                    tab: tab,
                    rule: bestRule.rule,
                    confidence: bestRule.confidence,
                    category: bestRule.rule.action.category,
                    subcategory: bestRule.rule.action.subcategory,
                    actions: bestRule.rule.action
                });
            } else {
                results.push({
                    tab: tab,
                    rule: null,
                    confidence: 0,
                    category: null,
                    subcategory: null,
                    actions: {}
                });
            }
        }

        return results;
    }

    /**
     * Add a custom rule
     */
    addRule(rule) {
        // Validate rule structure
        if (!this.validateRule(rule)) {
            throw new Error('Invalid rule structure');
        }

        rule.id = rule.id || `custom_${Date.now()}`;
        rule.enabled = rule.enabled !== undefined ? rule.enabled : true;
        rule.createdAt = Date.now();

        this.rules.push(rule);
        return rule.id;
    }

    /**
     * Update a rule
     */
    updateRule(ruleId, updates) {
        const index = this.rules.findIndex(r => r.id === ruleId);
        if (index === -1) {
            throw new Error(`Rule ${ruleId} not found`);
        }

        const updatedRule = { ...this.rules[index], ...updates };
        if (!this.validateRule(updatedRule)) {
            throw new Error('Invalid rule structure after update');
        }

        updatedRule.updatedAt = Date.now();
        this.rules[index] = updatedRule;
        return updatedRule;
    }

    /**
     * Remove a rule
     */
    removeRule(ruleId) {
        const index = this.rules.findIndex(r => r.id === ruleId);
        if (index === -1) {
            throw new Error(`Rule ${ruleId} not found`);
        }

        this.rules.splice(index, 1);
        return true;
    }

    /**
     * Get all rules
     */
    getRules(includeSystem = false) {
        if (includeSystem) {
            return [...this.systemRules, ...this.rules];
        }
        return [...this.rules];
    }

    /**
     * Get rule by ID
     */
    getRule(ruleId) {
        // Check custom rules first
        let rule = this.rules.find(r => r.id === ruleId);
        if (rule) return rule;

        // Check system rules
        return this.systemRules.find(r => r.id === ruleId);
    }

    /**
     * Enable/disable a rule
     */
    toggleRule(ruleId, enabled) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = enabled;
            return true;
        }

        // Check system rules
        const systemRule = this.systemRules.find(r => r.id === ruleId);
        if (systemRule) {
            systemRule.enabled = enabled;
            return true;
        }

        return false;
    }

    /**
     * Validate rule structure
     */
    validateRule(rule) {
        if (!rule || typeof rule !== 'object') return false;
        if (!rule.name || typeof rule.name !== 'string') return false;
        if (!rule.conditions || typeof rule.conditions !== 'object') return false;
        if (!rule.action || typeof rule.action !== 'object') return false;
        if (!rule.action.category || typeof rule.action.category !== 'string') return false;

        return true;
    }

    /**
     * Export rules to JSON
     */
    exportRules() {
        return JSON.stringify(this.rules, null, 2);
    }

    /**
     * Import rules from JSON
     */
    importRules(json, replace = false) {
        try {
            const imported = JSON.parse(json);
            if (!Array.isArray(imported)) {
                throw new Error('Rules must be an array');
            }

            // Validate all rules
            for (const rule of imported) {
                if (!this.validateRule(rule)) {
                    throw new Error(`Invalid rule: ${rule.name || 'unnamed'}`);
                }
            }

            if (replace) {
                this.rules = imported;
            } else {
                // Add with new IDs to avoid conflicts
                for (const rule of imported) {
                    rule.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    this.rules.push(rule);
                }
            }

            return imported.length;
        } catch (error) {
            throw new Error(`Failed to import rules: ${error.message}`);
        }
    }

    /**
     * Get rule statistics
     */
    getRuleStats() {
        return {
            totalRules: this.rules.length + this.systemRules.length,
            customRules: this.rules.length,
            systemRules: this.systemRules.length,
            enabledRules: [...this.systemRules, ...this.rules].filter(r => r.enabled).length,
            categories: [...new Set([...this.systemRules, ...this.rules]
                .map(r => r.action.category)
                .filter(Boolean)
            )]
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RulesEngine;
}