/**
 * Tab Analyzer - Deep tab analysis and feature extraction
 * Part 3: Advanced content analysis and signal extraction
 */

class TabAnalyzer {
    constructor() {
        this.cache = new Map();
        this.patterns = this.initializePatterns();
    }

    initializePatterns() {
        return {
            // URL patterns for specific content types
            video: /youtube\.com|vimeo\.com|twitch\.tv|netflix\.com|dailymotion\.com/i,
            social: /facebook\.com|twitter\.com|instagram\.com|linkedin\.com|reddit\.com|tiktok\.com/i,
            dev: /github\.com|gitlab\.com|bitbucket\.org|stackoverflow\.com|dev\.to/i,
            docs: /docs\.|documentation|manual|guide|tutorial|api\.|readme/i,
            shopping: /amazon\.|ebay\.|etsy\.|alibaba\.|shopify\.|cart|checkout/i,
            news: /news|times\.|post\.|bbc\.|cnn\.|reuters\.|bloomberg\./i,
            email: /mail\.|gmail\.|outlook\.|yahoo\.com\/mail|proton/i,
            work: /slack\.|teams\.|jira\.|confluence\.|asana\.|trello\.|notion\./i,
            
            // Content indicators
            codeIndicators: /function|const|let|var|class|import|export|return|if\s*\(|for\s*\(|while\s*\(/,
            academicIndicators: /abstract|methodology|hypothesis|conclusion|references|citation/i,
            commercialIndicators: /price|buy|cart|shipping|discount|sale|order|payment/i
        };
    }

    /**
     * Analyze a single tab and extract features
     */
    async analyzeTab(tab) {
        const cacheKey = `${tab.id}_${tab.url}_${tab.title}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const analysis = {
            tabId: tab.id,
            url: tab.url,
            title: tab.title || '',
            domain: this.extractDomain(tab.url),
            subdomain: this.extractSubdomain(tab.url),
            path: this.extractPath(tab.url),
            
            // URL-based features
            urlFeatures: this.extractUrlFeatures(tab.url),
            
            // Title-based features
            titleFeatures: this.extractTitleFeatures(tab.title || ''),
            
            // Content type detection
            contentType: this.detectContentType(tab),
            
            // Temporal features
            accessTime: Date.now(),
            isActive: tab.active || false,
            isPinned: tab.pinned || false,
            
            // Grouping hints
            suggestedCategory: null,
            confidence: 0,
            signals: {}
        };

        // Calculate suggested category
        const categorization = this.categorizeTab(analysis);
        analysis.suggestedCategory = categorization.category;
        analysis.confidence = categorization.confidence;
        analysis.signals = categorization.signals;

        this.cache.set(cacheKey, analysis);
        return analysis;
    }

    /**
     * Analyze multiple tabs
     */
    async analyzeTabs(tabs) {
        const analyses = [];
        for (const tab of tabs) {
            analyses.push(await this.analyzeTab(tab));
        }
        return analyses;
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url;
        }
    }

    /**
     * Extract subdomain from URL
     */
    extractSubdomain(url) {
        try {
            const urlObj = new URL(url);
            const parts = urlObj.hostname.split('.');
            if (parts.length > 2) {
                return parts[0] === 'www' ? null : parts[0];
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Extract path from URL
     */
    extractPath(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname;
        } catch {
            return '/';
        }
    }

    /**
     * Extract features from URL
     */
    extractUrlFeatures(url) {
        const features = {
            length: url.length,
            hasNumbers: /\d/.test(url),
            hasQueryParams: url.includes('?'),
            queryParamCount: (url.split('?')[1] || '').split('&').filter(p => p).length,
            pathDepth: (url.split('/').length - 3), // Subtract protocol and domain
            fileExtension: this.extractFileExtension(url),
            hasHash: url.includes('#'),
            protocol: url.split(':')[0],
            isSecure: url.startsWith('https'),
            specialPages: this.detectSpecialPages(url)
        };

        // Check for specific URL patterns
        features.isVideoUrl = this.patterns.video.test(url);
        features.isSocialUrl = this.patterns.social.test(url);
        features.isDevUrl = this.patterns.dev.test(url);
        features.isDocsUrl = this.patterns.docs.test(url);
        features.isShoppingUrl = this.patterns.shopping.test(url);
        features.isNewsUrl = this.patterns.news.test(url);
        features.isEmailUrl = this.patterns.email.test(url);
        features.isWorkUrl = this.patterns.work.test(url);

        return features;
    }

    /**
     * Extract file extension from URL
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
     * Detect special pages (login, settings, etc.)
     */
    detectSpecialPages(url) {
        const specialPatterns = {
            login: /login|signin|auth/i,
            settings: /settings|preferences|config/i,
            profile: /profile|account|user\//i,
            search: /search|query|\?q=/i,
            checkout: /checkout|payment|billing/i,
            documentation: /docs|api|reference/i
        };

        const detected = [];
        for (const [type, pattern] of Object.entries(specialPatterns)) {
            if (pattern.test(url)) {
                detected.push(type);
            }
        }
        return detected;
    }

    /**
     * Extract features from title
     */
    extractTitleFeatures(title) {
        if (!title) return {};

        const features = {
            length: title.length,
            wordCount: title.split(/\s+/).length,
            hasNumbers: /\d/.test(title),
            hasPunctuation: /[.,!?;:]/.test(title),
            hasEmoji: /[\u{1F300}-\u{1F9FF}]/u.test(title),
            language: this.detectLanguage(title),
            keywords: this.extractKeywords(title),
            sentiment: this.analyzeSentiment(title)
        };

        // Check for specific content indicators
        features.hasCode = this.patterns.codeIndicators.test(title);
        features.isAcademic = this.patterns.academicIndicators.test(title);
        features.isCommercial = this.patterns.commercialIndicators.test(title);

        return features;
    }

    /**
     * Simple language detection
     */
    detectLanguage(text) {
        // Very basic detection - in production use a proper library
        const hasNonAscii = /[^\x00-\x7F]/.test(text);
        const hasChinese = /[\u4e00-\u9fff]/.test(text);
        const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
        const hasKorean = /[\uac00-\ud7af]/.test(text);
        const hasArabic = /[\u0600-\u06ff]/.test(text);
        const hasCyrillic = /[\u0400-\u04ff]/.test(text);

        if (hasChinese) return 'zh';
        if (hasJapanese) return 'ja';
        if (hasKorean) return 'ko';
        if (hasArabic) return 'ar';
        if (hasCyrillic) return 'ru';
        if (hasNonAscii) return 'other';
        return 'en';
    }

    /**
     * Extract keywords from title
     */
    extractKeywords(title) {
        // Remove common words and extract meaningful keywords
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
            'how', 'when', 'where', 'why', 'what', 'which', 'who', 'whom', 'this',
            'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'should', 'could', 'may', 'might', 'must', 'shall', 'can', 'need'
        ]);

        const words = title.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));

        // Count word frequency
        const wordFreq = {};
        for (const word of words) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }

        // Return top keywords
        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    /**
     * Simple sentiment analysis
     */
    analyzeSentiment(text) {
        const positive = /good|great|awesome|excellent|amazing|love|best|wonderful|fantastic/i;
        const negative = /bad|terrible|awful|worst|hate|horrible|poor|disappointing/i;
        const neutral = /okay|fine|average|normal|regular/i;

        if (positive.test(text)) return 'positive';
        if (negative.test(text)) return 'negative';
        if (neutral.test(text)) return 'neutral';
        return 'unknown';
    }

    /**
     * Detect content type based on all signals
     */
    detectContentType(tab) {
        const url = tab.url.toLowerCase();
        const title = (tab.title || '').toLowerCase();

        // Check file extensions
        const ext = this.extractFileExtension(url);
        if (ext) {
            if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return 'document';
            if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
            if (['mp4', 'webm', 'avi', 'mov'].includes(ext)) return 'video';
            if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'audio';
            if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
            if (['html', 'htm', 'php', 'asp', 'jsp'].includes(ext)) return 'webpage';
            if (['js', 'css', 'json', 'xml', 'yaml'].includes(ext)) return 'code';
        }

        // Check URL patterns
        if (this.patterns.video.test(url)) return 'video';
        if (this.patterns.docs.test(url)) return 'documentation';
        if (/\.(pdf|docx?)(\?|#|$)/i.test(url)) return 'document';

        // Default to webpage
        return 'webpage';
    }

    /**
     * Categorize tab based on all signals
     */
    categorizeTab(analysis) {
        const scores = {};
        const signals = {};

        // Define category rules with weights
        const categories = {
            'Development': {
                urlPattern: this.patterns.dev,
                keywords: ['code', 'github', 'git', 'programming', 'developer', 'api', 'debug', 'repository', 'commit', 'pull request'],
                domains: ['github.com', 'gitlab.com', 'stackoverflow.com', 'dev.to', 'medium.com'],
                weight: 1.0
            },
            'Documentation': {
                urlPattern: this.patterns.docs,
                keywords: ['documentation', 'docs', 'guide', 'tutorial', 'reference', 'manual', 'api', 'readme'],
                domains: ['docs.', 'documentation.', 'wiki.', 'help.'],
                weight: 0.9
            },
            'Social Media': {
                urlPattern: this.patterns.social,
                keywords: ['social', 'share', 'post', 'tweet', 'follow', 'like', 'comment'],
                domains: ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'reddit.com'],
                weight: 1.0
            },
            'Shopping': {
                urlPattern: this.patterns.shopping,
                keywords: ['buy', 'shop', 'cart', 'price', 'product', 'order', 'shipping', 'discount'],
                domains: ['amazon.com', 'ebay.com', 'etsy.com', 'walmart.com'],
                weight: 1.0
            },
            'Media': {
                urlPattern: this.patterns.video,
                keywords: ['video', 'watch', 'stream', 'movie', 'show', 'episode', 'music', 'playlist'],
                domains: ['youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv'],
                weight: 1.0
            },
            'News': {
                urlPattern: this.patterns.news,
                keywords: ['news', 'article', 'breaking', 'report', 'update', 'latest', 'story'],
                domains: ['news.', 'cnn.com', 'bbc.com', 'reuters.com'],
                weight: 0.9
            },
            'Email': {
                urlPattern: this.patterns.email,
                keywords: ['email', 'mail', 'inbox', 'message', 'compose', 'sent'],
                domains: ['mail.google.com', 'outlook.com', 'mail.yahoo.com'],
                weight: 1.0
            },
            'Work': {
                urlPattern: this.patterns.work,
                keywords: ['work', 'team', 'project', 'task', 'meeting', 'deadline', 'report'],
                domains: ['slack.com', 'teams.microsoft.com', 'jira.', 'confluence.'],
                weight: 1.0
            },
            'Research': {
                urlPattern: /scholar|arxiv|pubmed|jstor|sciencedirect/i,
                keywords: ['research', 'paper', 'study', 'journal', 'academic', 'thesis', 'dissertation'],
                domains: ['scholar.google.com', 'arxiv.org', 'pubmed.gov'],
                weight: 0.95
            }
        };

        // Score each category
        for (const [categoryName, rules] of Object.entries(categories)) {
            let score = 0;
            let matchedSignals = [];

            // Check URL pattern
            if (rules.urlPattern && rules.urlPattern.test(analysis.url)) {
                score += 3 * rules.weight;
                matchedSignals.push('url_pattern');
            }

            // Check domain
            const domain = analysis.domain;
            if (rules.domains) {
                for (const ruleDomain of rules.domains) {
                    if (domain.includes(ruleDomain) || ruleDomain.includes(domain)) {
                        score += 4 * rules.weight;
                        matchedSignals.push('domain_match');
                        break;
                    }
                }
            }

            // Check keywords in title
            const titleLower = analysis.title.toLowerCase();
            for (const keyword of rules.keywords) {
                if (titleLower.includes(keyword)) {
                    score += 2 * rules.weight;
                    matchedSignals.push(`keyword:${keyword}`);
                }
            }

            // Check URL features
            if (analysis.urlFeatures) {
                if (categoryName === 'Documentation' && analysis.urlFeatures.isDocsUrl) {
                    score += 3;
                    matchedSignals.push('docs_url');
                }
                if (categoryName === 'Shopping' && analysis.urlFeatures.isShoppingUrl) {
                    score += 3;
                    matchedSignals.push('shopping_url');
                }
            }

            if (score > 0) {
                scores[categoryName] = score;
                signals[categoryName] = matchedSignals;
            }
        }

        // Find the best matching category
        let bestCategory = 'General';
        let bestScore = 0;

        for (const [category, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestCategory = category;
            }
        }

        // Calculate confidence (0-1)
        const maxPossibleScore = 10; // Approximate max score
        const confidence = Math.min(bestScore / maxPossibleScore, 1);

        return {
            category: bestCategory,
            confidence: confidence,
            scores: scores,
            signals: signals[bestCategory] || []
        };
    }

    /**
     * Get tab relationships (parent-child, referrer, etc.)
     */
    findRelationships(tabs) {
        const relationships = [];

        for (let i = 0; i < tabs.length; i++) {
            for (let j = i + 1; j < tabs.length; j++) {
                const tab1 = tabs[i];
                const tab2 = tabs[j];

                // Check if same domain
                if (this.extractDomain(tab1.url) === this.extractDomain(tab2.url)) {
                    relationships.push({
                        type: 'same_domain',
                        tabs: [tab1.id, tab2.id],
                        strength: 0.7
                    });
                }

                // Check if one might be a sub-page of the other
                if (tab1.url.startsWith(tab2.url) || tab2.url.startsWith(tab1.url)) {
                    relationships.push({
                        type: 'parent_child',
                        tabs: [tab1.id, tab2.id],
                        strength: 0.9
                    });
                }

                // Check for similar titles
                const titleSimilarity = this.calculateTitleSimilarity(tab1.title, tab2.title);
                if (titleSimilarity > 0.6) {
                    relationships.push({
                        type: 'similar_content',
                        tabs: [tab1.id, tab2.id],
                        strength: titleSimilarity
                    });
                }
            }
        }

        return relationships;
    }

    /**
     * Calculate similarity between two titles
     */
    calculateTitleSimilarity(title1, title2) {
        if (!title1 || !title2) return 0;

        const words1 = new Set(title1.toLowerCase().split(/\s+/));
        const words2 = new Set(title2.toLowerCase().split(/\s+/));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    /**
     * Clear the analysis cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabAnalyzer;
}