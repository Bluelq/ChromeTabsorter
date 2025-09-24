/**
 * Smart Categorizer - Advanced categorization with multiple strategies
 * Part 3: Multi-signal categorization and clustering
 */

class SmartCategorizer {
    constructor() {
        this.analyzer = new TabAnalyzer();
        this.defaultCategories = this.loadDefaultCategories();
        this.customRules = [];
    }

    /**
     * Load default categories with their characteristics
     */
    loadDefaultCategories() {
        return {
            'Work': {
                id: 'work',
                name: 'Work',
                emoji: '💼',
                color: 'blue',
                priority: 90,
                keywords: ['work', 'job', 'office', 'meeting', 'project', 'task', 'deadline', 'report', 'presentation'],
                domains: ['slack.com', 'teams.microsoft.com', 'zoom.us', 'meet.google.com'],
                patterns: /work|office|meeting|project/i
            },
            'Development': {
                id: 'development',
                name: 'Development',
                emoji: '💻',
                color: 'purple',
                priority: 85,
                keywords: ['code', 'programming', 'github', 'debug', 'api', 'function', 'class', 'repository'],
                domains: ['github.com', 'gitlab.com', 'stackoverflow.com', 'localhost'],
                patterns: /github|gitlab|code|programming|developer/i
            },
            'Research': {
                id: 'research',
                name: 'Research',
                emoji: '🔬',
                color: 'green',
                priority: 80,
                keywords: ['research', 'study', 'paper', 'journal', 'academic', 'scholar', 'thesis'],
                domains: ['scholar.google.com', 'arxiv.org', 'jstor.org', 'pubmed.gov'],
                patterns: /research|study|paper|academic/i
            },
            'Shopping': {
                id: 'shopping',
                name: 'Shopping',
                emoji: '🛒',
                color: 'orange',
                priority: 70,
                keywords: ['shop', 'buy', 'cart', 'checkout', 'order', 'product', 'price', 'discount'],
                domains: ['amazon.com', 'ebay.com', 'etsy.com', 'alibaba.com'],
                patterns: /shop|buy|cart|product|store/i
            },
            'Entertainment': {
                id: 'entertainment',
                name: 'Entertainment',
                emoji: '🎬',
                color: 'red',
                priority: 60,
                keywords: ['video', 'movie', 'show', 'watch', 'stream', 'music', 'game', 'play'],
                domains: ['youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv'],
                patterns: /youtube|netflix|video|watch|stream/i
            },
            'Social': {
                id: 'social',
                name: 'Social',
                emoji: '💬',
                color: 'pink',
                priority: 50,
                keywords: ['social', 'friend', 'post', 'share', 'like', 'comment', 'follow'],
                domains: ['facebook.com', 'twitter.com', 'instagram.com', 'reddit.com'],
                patterns: /facebook|twitter|instagram|social/i
            },
            'News': {
                id: 'news',
                name: 'News',
                emoji: '📰',
                color: 'grey',
                priority: 40,
                keywords: ['news', 'article', 'report', 'breaking', 'latest', 'update', 'story'],
                domains: ['cnn.com', 'bbc.com', 'reuters.com', 'nytimes.com'],
                patterns: /news|article|breaking|latest/i
            },
            'Learning': {
                id: 'learning',
                name: 'Learning',
                emoji: '📚',
                color: 'cyan',
                priority: 75,
                keywords: ['learn', 'course', 'tutorial', 'lesson', 'education', 'training', 'study'],
                domains: ['coursera.org', 'udemy.com', 'khan', 'edx.org'],
                patterns: /learn|course|tutorial|education/i
            },
            'Finance': {
                id: 'finance',
                name: 'Finance',
                emoji: '💰',
                color: 'yellow',
                priority: 85,
                keywords: ['bank', 'finance', 'money', 'invest', 'stock', 'crypto', 'payment'],
                domains: ['bank', 'paypal.com', 'coinbase.com', 'robinhood.com'],
                patterns: /bank|finance|money|invest|stock/i
            },
            'Communication': {
                id: 'communication',
                name: 'Communication',
                emoji: '📧',
                color: 'teal',
                priority: 70,
                keywords: ['email', 'mail', 'message', 'chat', 'inbox', 'compose'],
                domains: ['gmail.com', 'outlook.com', 'mail.yahoo.com', 'protonmail.com'],
                patterns: /mail|email|message|inbox/i
            }
        };
    }

    /**
     * Main categorization method using multiple strategies
     */
    async categorizeTabs(tabs, options = {}) {
        const {
            useAI = true,
            useRules = true,
            useClustering = true,
            minGroupSize = 2,
            similarityThreshold = 0.45
        } = options;

        // Analyze all tabs first
        const analyzedTabs = await this.analyzer.analyzeTabs(tabs);

        // Strategy 1: Rule-based categorization
        let categorized = useRules ? 
            this.applyRuleBasedCategorization(analyzedTabs) : 
            analyzedTabs.map(tab => ({ ...tab, category: null }));

        // Strategy 2: AI/Embedding-based clustering (if available)
        if (useAI && useClustering) {
            categorized = await this.applyAIClustering(categorized, similarityThreshold);
        }

        // Strategy 3: Apply custom rules (overrides)
        categorized = this.applyCustomRules(categorized);

        // Group tabs by category
        const groups = this.groupByCategory(categorized, minGroupSize);

        // Post-processing: merge small groups, split large ones
        const optimizedGroups = this.optimizeGroups(groups);

        // Add metadata and scoring
        return this.finalizeGroups(optimizedGroups);
    }

    /**
     * Apply rule-based categorization
     */
    applyRuleBasedCategorization(analyzedTabs) {
        return analyzedTabs.map(tab => {
            let bestMatch = null;
            let bestScore = 0;

            // Check each default category
            for (const [categoryId, category] of Object.entries(this.defaultCategories)) {
                let score = 0;

                // Domain matching (highest weight)
                const domain = tab.domain.toLowerCase();
                if (category.domains.some(d => domain.includes(d) || d.includes(domain))) {
                    score += 5;
                }

                // Keyword matching in title
                const title = tab.title.toLowerCase();
                for (const keyword of category.keywords) {
                    if (title.includes(keyword)) {
                        score += 2;
                    }
                }

                // Pattern matching
                if (category.patterns.test(tab.url) || category.patterns.test(tab.title)) {
                    score += 3;
                }

                // URL features matching
                if (tab.urlFeatures) {
                    if (categoryId === 'shopping' && tab.urlFeatures.isShoppingUrl) score += 4;
                    if (categoryId === 'development' && tab.urlFeatures.isDevUrl) score += 4;
                    if (categoryId === 'social' && tab.urlFeatures.isSocialUrl) score += 4;
                    if (categoryId === 'entertainment' && tab.urlFeatures.isVideoUrl) score += 4;
                    if (categoryId === 'news' && tab.urlFeatures.isNewsUrl) score += 4;
                    if (categoryId === 'communication' && tab.urlFeatures.isEmailUrl) score += 4;
                    if (categoryId === 'work' && tab.urlFeatures.isWorkUrl) score += 4;
                }

                // Check suggested category from analyzer
                if (tab.suggestedCategory && tab.suggestedCategory.toLowerCase() === categoryId) {
                    score += 3;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = {
                        categoryId: categoryId,
                        category: category,
                        score: score,
                        confidence: Math.min(score / 15, 1) // Normalize to 0-1
                    };
                }
            }

            return {
                ...tab,
                category: bestMatch ? bestMatch.categoryId : 'general',
                categoryMatch: bestMatch,
                ruleScore: bestScore
            };
        });
    }

    /**
     * Apply AI-based clustering (connects to offscreen AI processor)
     */
    async applyAIClustering(categorizedTabs, threshold) {
        try {
            // Send to AI processor if available
            const response = await chrome.runtime.sendMessage({
                type: 'CLUSTER_TABS',
                tabs: categorizedTabs,
                threshold: threshold
            });

            if (response && response.success) {
                return this.mergeAIResults(categorizedTabs, response.clusters);
            }
        } catch (error) {
            console.log('AI clustering not available, using rule-based only');
        }

        return categorizedTabs;
    }

    /**
     * Merge AI clustering results with rule-based results
     */
    mergeAIResults(categorizedTabs, aiClusters) {
        // Create a map of tab ID to AI cluster
        const aiClusterMap = new Map();
        
        aiClusters.forEach((cluster, index) => {
            cluster.tabs.forEach(tab => {
                aiClusterMap.set(tab.id, {
                    clusterId: index,
                    clusterLabel: cluster.label,
                    clusterConfidence: cluster.confidence
                });
            });
        });

        return categorizedTabs.map(tab => {
            const aiInfo = aiClusterMap.get(tab.tabId);
            
            if (aiInfo) {
                // If AI confidence is high, override rule-based category
                if (aiInfo.clusterConfidence > 0.7 && (!tab.categoryMatch || tab.categoryMatch.confidence < 0.6)) {
                    return {
                        ...tab,
                        category: this.mapAILabelToCategory(aiInfo.clusterLabel),
                        aiCluster: aiInfo,
                        categorySource: 'ai'
                    };
                }
                
                // Otherwise, add AI info but keep rule-based category
                return {
                    ...tab,
                    aiCluster: aiInfo,
                    categorySource: 'hybrid'
                };
            }
            
            return {
                ...tab,
                categorySource: 'rules'
            };
        });
    }

    /**
     * Map AI cluster labels to categories
     */
    mapAILabelToCategory(aiLabel) {
        const labelLower = aiLabel.toLowerCase();
        
        // Try to match with existing categories
        for (const [categoryId, category] of Object.entries(this.defaultCategories)) {
            if (labelLower.includes(categoryId) || 
                labelLower.includes(category.name.toLowerCase()) ||
                category.keywords.some(k => labelLower.includes(k))) {
                return categoryId;
            }
        }
        
        // Default mapping for common AI labels
        if (labelLower.includes('development') || labelLower.includes('code')) return 'development';
        if (labelLower.includes('social')) return 'social';
        if (labelLower.includes('shop')) return 'shopping';
        if (labelLower.includes('media') || labelLower.includes('video')) return 'entertainment';
        if (labelLower.includes('work')) return 'work';
        if (labelLower.includes('research')) return 'research';
        if (labelLower.includes('news')) return 'news';
        
        return 'general';
    }

    /**
     * Apply custom user-defined rules
     */
    applyCustomRules(categorizedTabs) {
        // Apply each custom rule in order (later rules override earlier ones)
        for (const rule of this.customRules) {
            categorizedTabs = categorizedTabs.map(tab => {
                if (this.evaluateRule(rule, tab)) {
                    return {
                        ...tab,
                        category: rule.category,
                        customRule: rule.id,
                        categorySource: 'custom_rule'
                    };
                }
                return tab;
            });
        }
        
        return categorizedTabs;
    }

    /**
     * Evaluate if a rule matches a tab
     */
    evaluateRule(rule, tab) {
        // Check domain condition
        if (rule.domain) {
            const domainPattern = new RegExp(rule.domain, 'i');
            if (!domainPattern.test(tab.domain)) {
                return false;
            }
        }
        
        // Check URL pattern
        if (rule.urlPattern) {
            const urlPattern = new RegExp(rule.urlPattern, 'i');
            if (!urlPattern.test(tab.url)) {
                return false;
            }
        }
        
        // Check title keywords
        if (rule.titleKeywords && rule.titleKeywords.length > 0) {
            const titleLower = tab.title.toLowerCase();
            const hasKeyword = rule.titleKeywords.some(keyword => 
                titleLower.includes(keyword.toLowerCase())
            );
            if (!hasKeyword) {
                return false;
            }
        }
        
        // Check confidence threshold
        if (rule.minConfidence && tab.confidence < rule.minConfidence) {
            return false;
        }
        
        return true;
    }

    /**
     * Group tabs by their assigned category
     */
    groupByCategory(categorizedTabs, minGroupSize) {
        const groups = new Map();
        
        for (const tab of categorizedTabs) {
            const category = tab.category || 'general';
            
            if (!groups.has(category)) {
                const categoryInfo = this.defaultCategories[category] || {
                    id: category,
                    name: category.charAt(0).toUpperCase() + category.slice(1),
                    emoji: '📑',
                    color: 'grey'
                };
                
                groups.set(category, {
                    categoryId: category,
                    categoryInfo: categoryInfo,
                    tabs: [],
                    avgConfidence: 0
                });
            }
            
            groups.get(category).tabs.push(tab);
        }
        
        // Calculate average confidence for each group
        for (const group of groups.values()) {
            if (group.tabs.length > 0) {
                const totalConfidence = group.tabs.reduce((sum, tab) => 
                    sum + (tab.categoryMatch ? tab.categoryMatch.confidence : 0), 0
                );
                group.avgConfidence = totalConfidence / group.tabs.length;
            }
        }
        
        // Filter out groups smaller than minGroupSize (unless they're the only group for that category)
        const filteredGroups = [];
        const ungrouped = [];
        
        for (const group of groups.values()) {
            if (group.tabs.length >= minGroupSize) {
                filteredGroups.push(group);
            } else {
                ungrouped.push(...group.tabs);
            }
        }
        
        // If we have ungrouped tabs, create a "General" group for them
        if (ungrouped.length >= minGroupSize) {
            filteredGroups.push({
                categoryId: 'general',
                categoryInfo: {
                    id: 'general',
                    name: 'General',
                    emoji: '📑',
                    color: 'grey'
                },
                tabs: ungrouped,
                avgConfidence: 0.3
            });
        }
        
        return filteredGroups;
    }

    /**
     * Optimize groups by merging small ones and splitting large ones
     */
    optimizeGroups(groups) {
        const optimized = [];
        const maxGroupSize = 20;
        const minGroupSize = 2;
        
        for (const group of groups) {
            // Split large groups
            if (group.tabs.length > maxGroupSize) {
                const subgroups = this.splitLargeGroup(group, maxGroupSize);
                optimized.push(...subgroups);
            } 
            // Keep normal-sized groups
            else if (group.tabs.length >= minGroupSize) {
                optimized.push(group);
            }
            // Small groups might be merged later
            else {
                optimized.push(group);
            }
        }
        
        // Try to merge very small groups with similar categories
        return this.mergeSmallGroups(optimized, minGroupSize);
    }

    /**
     * Split a large group into smaller subgroups
     */
    splitLargeGroup(group, maxSize) {
        const subgroups = [];
        const tabs = [...group.tabs];
        
        // Sort tabs by subdomain or path similarity to keep related tabs together
        tabs.sort((a, b) => {
            if (a.subdomain === b.subdomain) {
                return a.path.localeCompare(b.path);
            }
            return (a.subdomain || '').localeCompare(b.subdomain || '');
        });
        
        // Create subgroups
        let subgroupIndex = 1;
        while (tabs.length > 0) {
            const subgroupTabs = tabs.splice(0, Math.min(maxSize, tabs.length));
            subgroups.push({
                ...group,
                categoryId: `${group.categoryId}_${subgroupIndex}`,
                categoryInfo: {
                    ...group.categoryInfo,
                    name: `${group.categoryInfo.name} ${subgroupIndex}`
                },
                tabs: subgroupTabs,
                isSubgroup: true,
                parentGroup: group.categoryId
            });
            subgroupIndex++;
        }
        
        return subgroups;
    }

    /**
     * Merge small groups that are similar
     */
    mergeSmallGroups(groups, minSize) {
        const merged = [];
        const small = [];
        
        // Separate small and normal groups
        for (const group of groups) {
            if (group.tabs.length < minSize) {
                small.push(group);
            } else {
                merged.push(group);
            }
        }
        
        // Try to merge small groups with each other or with larger groups
        for (const smallGroup of small) {
            let wasMerged = false;
            
            // Try to merge with an existing group of similar category
            for (const existingGroup of merged) {
                if (this.canMergeGroups(smallGroup, existingGroup)) {
                    existingGroup.tabs.push(...smallGroup.tabs);
                    wasMerged = true;
                    break;
                }
            }
            
            // If not merged, keep as is (might be the only tabs in that category)
            if (!wasMerged) {
                merged.push(smallGroup);
            }
        }
        
        return merged;
    }

    /**
     * Check if two groups can be merged
     */
    canMergeGroups(group1, group2) {
        // Same category
        if (group1.categoryId === group2.categoryId) {
            return true;
        }
        
        // Similar categories (you can define similarity rules here)
        const similarCategories = {
            'work': ['communication'],
            'development': ['documentation', 'learning'],
            'entertainment': ['social'],
            'shopping': ['finance']
        };
        
        const cat1 = group1.categoryId;
        const cat2 = group2.categoryId;
        
        return (similarCategories[cat1] && similarCategories[cat1].includes(cat2)) ||
               (similarCategories[cat2] && similarCategories[cat2].includes(cat1));
    }

    /**
     * Finalize groups with metadata and scoring
     */
    finalizeGroups(groups) {
        return groups.map(group => {
            // Calculate group quality score
            const qualityScore = this.calculateGroupQuality(group);
            
            // Generate a descriptive label
            const label = this.generateGroupLabel(group);
            
            // Add tab IDs for easy reference
            const tabIds = group.tabs.map(tab => tab.tabId);
            
            return {
                id: `group_${group.categoryId}_${Date.now()}`,
                categoryId: group.categoryId,
                category: group.categoryInfo,
                label: label,
                emoji: group.categoryInfo.emoji,
                color: group.categoryInfo.color,
                tabs: group.tabs,
                tabIds: tabIds,
                tabCount: group.tabs.length,
                confidence: group.avgConfidence,
                quality: qualityScore,
                isSubgroup: group.isSubgroup || false,
                parentGroup: group.parentGroup || null,
                metadata: {
                    createdAt: Date.now(),
                    source: this.determinePrimarySource(group.tabs),
                    domains: this.extractUniqueDomains(group.tabs),
                    keywords: this.extractGroupKeywords(group.tabs)
                }
            };
        });
    }

    /**
     * Calculate quality score for a group
     */
    calculateGroupQuality(group) {
        let score = 0;
        
        // Confidence score (0-40 points)
        score += group.avgConfidence * 40;
        
        // Size score (0-20 points) - not too small, not too large
        const idealSize = 8;
        const sizeDiff = Math.abs(group.tabs.length - idealSize);
        score += Math.max(0, 20 - sizeDiff * 2);
        
        // Homogeneity score (0-40 points) - how similar are the tabs
        const homogeneity = this.calculateHomogeneity(group.tabs);
        score += homogeneity * 40;
        
        return Math.round(score);
    }

    /**
     * Calculate how homogeneous a group is
     */
    calculateHomogeneity(tabs) {
        if (tabs.length < 2) return 1;
        
        // Check domain similarity
        const domains = tabs.map(tab => tab.domain);
        const uniqueDomains = new Set(domains);
        const domainHomogeneity = 1 - (uniqueDomains.size - 1) / (domains.length - 1);
        
        // Check category consistency
        const categories = tabs.map(tab => tab.category);
        const uniqueCategories = new Set(categories);
        const categoryHomogeneity = 1 - (uniqueCategories.size - 1) / (categories.length - 1);
        
        // Average the two
        return (domainHomogeneity + categoryHomogeneity) / 2;
    }

    /**
     * Generate a descriptive label for the group
     */
    generateGroupLabel(group) {
        const category = group.categoryInfo;
        const tabCount = group.tabs.length;
        
        // Get the most common domain
        const domains = group.tabs.map(tab => tab.domain);
        const domainCounts = {};
        for (const domain of domains) {
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        }
        const topDomain = Object.entries(domainCounts)
            .sort((a, b) => b[1] - a[1])[0];
        
        // Generate label
        let label = `${category.emoji} ${category.name}`;
        
        // Add domain info if most tabs are from the same domain
        if (topDomain && topDomain[1] > tabCount * 0.6) {
            const domainName = topDomain[0].split('.')[0];
            label += ` - ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}`;
        }
        
        // Add count if it's a subgroup
        if (group.isSubgroup) {
            label += ` (${tabCount})`;
        }
        
        return label;
    }

    /**
     * Determine the primary source of categorization
     */
    determinePrimarySource(tabs) {
        const sources = tabs.map(tab => tab.categorySource || 'unknown');
        const sourceCounts = {};
        
        for (const source of sources) {
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        }
        
        return Object.entries(sourceCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
    }

    /**
     * Extract unique domains from tabs
     */
    extractUniqueDomains(tabs) {
        return [...new Set(tabs.map(tab => tab.domain))];
    }

    /**
     * Extract common keywords from group
     */
    extractGroupKeywords(tabs) {
        const allKeywords = [];
        
        for (const tab of tabs) {
            if (tab.titleFeatures && tab.titleFeatures.keywords) {
                allKeywords.push(...tab.titleFeatures.keywords);
            }
        }
        
        // Count frequency
        const keywordCounts = {};
        for (const keyword of allKeywords) {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        }
        
        // Return top 5 keywords
        return Object.entries(keywordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([keyword]) => keyword);
    }

    /**
     * Add a custom rule
     */
    addCustomRule(rule) {
        this.customRules.push({
            id: `rule_${Date.now()}`,
            ...rule,
            priority: rule.priority || 100
        });
        
        // Sort rules by priority (higher priority first)
        this.customRules.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Remove a custom rule
     */
    removeCustomRule(ruleId) {
        this.customRules = this.customRules.filter(rule => rule.id !== ruleId);
    }

    /**
     * Get all custom rules
     */
    getCustomRules() {
        return [...this.customRules];
    }

    /**
     * Clear all custom rules
     */
    clearCustomRules() {
        this.customRules = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartCategorizer;
}