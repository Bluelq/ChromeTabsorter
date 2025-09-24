// Offscreen AI Processor - Local Version
// Uses bundled Transformers.js for fully offline operation

// Access the transformers library from the global scope (loaded via bundle)
// Try different possible global names
const transformersLib = window.transformers || window.A || window;
const { pipeline, env } = transformersLib;

// Configure for local model loading
if (env) {
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localURL = chrome.runtime.getURL('models/');
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.simd = true;
}

class AIProcessor {
    constructor() {
        this.embedder = null;
        this.modelReady = false;
        this.embeddingCache = new Map();
        this.modelPath = chrome.runtime.getURL('models/all-MiniLM-L6-v2/');
    }

    async initialize() {
        if (this.modelReady) return;
        
        try {
            console.log('Loading AI model from local bundle...');
            
            // Use local model files
            this.embedder = await pipeline(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2',
                { 
                    quantized: true,
                    progress_callback: (progress) => {
                        console.log(`Model loading: ${Math.round(progress.progress)}%`);
                    }
                }
            );
            
            this.modelReady = true;
            console.log('AI model loaded successfully');
            
            // Send ready message
            chrome.runtime.sendMessage({
                type: 'AI_MODEL_READY'
            });
            
        } catch (error) {
            console.error('Failed to load AI model:', error);
            chrome.runtime.sendMessage({
                type: 'AI_MODEL_ERROR',
                error: error.message
            });
        }
    }

    async generateEmbedding(text) {
        if (!this.modelReady) {
            await this.initialize();
        }

        // Check cache first
        if (this.embeddingCache.has(text)) {
            return this.embeddingCache.get(text);
        }

        try {
            // Generate embedding
            const output = await this.embedder(text, {
                pooling: 'mean',
                normalize: true
            });
            
            // Convert to array
            const embedding = Array.from(output.data);
            
            // Cache the result
            this.embeddingCache.set(text, embedding);
            
            // Limit cache size
            if (this.embeddingCache.size > 500) {
                const firstKey = this.embeddingCache.keys().next().value;
                this.embeddingCache.delete(firstKey);
            }
            
            return embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    async generateEmbeddings(texts) {
        const embeddings = [];
        
        for (const text of texts) {
            const embedding = await this.generateEmbedding(text);
            embeddings.push(embedding);
        }
        
        return embeddings;
    }

    // Calculate cosine similarity between two embeddings
    cosineSimilarity(a, b) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Group tabs based on semantic similarity
    async groupTabsBySimilarity(tabs, threshold = 0.5) {
        // Prepare texts for embedding (combine title and domain)
        const tabTexts = tabs.map(tab => {
            try {
                const url = new URL(tab.url);
                const domain = url.hostname.replace('www.', '');
                return `${tab.title} ${domain}`;
            } catch {
                return tab.title || tab.url;
            }
        });

        // Generate embeddings
        const embeddings = await this.generateEmbeddings(tabTexts);
        
        // Create similarity matrix
        const groups = [];
        const assigned = new Set();
        
        for (let i = 0; i < tabs.length; i++) {
            if (assigned.has(i)) continue;
            
            const group = {
                tabs: [tabs[i]],
                embeddings: [embeddings[i]],
                indices: [i]
            };
            
            assigned.add(i);
            
            // Find similar tabs
            for (let j = i + 1; j < tabs.length; j++) {
                if (assigned.has(j)) continue;
                
                // Check similarity with group centroid
                const avgSimilarity = this.calculateAverageSimilarity(
                    embeddings[j],
                    group.embeddings
                );
                
                if (avgSimilarity > threshold) {
                    group.tabs.push(tabs[j]);
                    group.embeddings.push(embeddings[j]);
                    group.indices.push(j);
                    assigned.add(j);
                }
            }
            
            if (group.tabs.length >= 2) {
                groups.push(group);
            }
        }
        
        // Add ungrouped tabs
        const ungrouped = [];
        for (let i = 0; i < tabs.length; i++) {
            if (!assigned.has(i)) {
                ungrouped.push(tabs[i]);
            }
        }
        
        return { groups, ungrouped };
    }

    calculateAverageSimilarity(embedding, groupEmbeddings) {
        const similarities = groupEmbeddings.map(e => 
            this.cosineSimilarity(embedding, e)
        );
        return similarities.reduce((a, b) => a + b, 0) / similarities.length;
    }

    // Generate smart labels for groups
    async generateGroupLabels(groups) {
        const labeledGroups = [];
        
        for (const group of groups) {
            // Extract common themes from tabs
            const titles = group.tabs.map(t => t.title);
            const domains = new Set();
            
            group.tabs.forEach(tab => {
                try {
                    const url = new URL(tab.url);
                    domains.add(url.hostname.replace('www.', ''));
                } catch {}
            });
            
            // Generate label based on common patterns
            const label = this.extractCommonTheme(titles, Array.from(domains));
            
            labeledGroups.push({
                label,
                tabs: group.tabs,
                confidence: this.calculateGroupCohesion(group.embeddings)
            });
        }
        
        return labeledGroups;
    }

    extractCommonTheme(titles, domains) {
        // Common keywords to category mapping
        const categories = {
            'Development': ['github', 'stackoverflow', 'npm', 'code', 'api', 'dev', 'programming', 'debug'],
            'Research': ['arxiv', 'scholar', 'paper', 'research', 'study', 'academic', 'journal'],
            'Social': ['twitter', 'facebook', 'linkedin', 'reddit', 'social', 'instagram'],
            'Shopping': ['amazon', 'ebay', 'shop', 'store', 'buy', 'cart', 'product'],
            'Media': ['youtube', 'netflix', 'spotify', 'video', 'music', 'watch', 'stream'],
            'News': ['news', 'cnn', 'bbc', 'article', 'times', 'post', 'daily'],
            'Documentation': ['docs', 'documentation', 'guide', 'tutorial', 'manual', 'reference'],
            'Email': ['mail', 'gmail', 'outlook', 'inbox', 'message'],
            'Work': ['slack', 'teams', 'jira', 'confluence', 'asana', 'trello'],
            'AI/ML': ['hugging', 'openai', 'anthropic', 'model', 'llm', 'neural', 'machine learning'],
            'Design': ['figma', 'sketch', 'adobe', 'design', 'canva', 'dribbble']
        };

        // Combine all text for analysis
        const allText = [...titles, ...domains].join(' ').toLowerCase();
        
        // Score each category
        const scores = {};
        for (const [category, keywords] of Object.entries(categories)) {
            scores[category] = keywords.filter(keyword => 
                allText.includes(keyword)
            ).length;
        }
        
        // Find best matching category
        const bestCategory = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (bestCategory && bestCategory[1] > 0) {
            // Add appropriate emoji
            const emojis = {
                'Development': '💻',
                'Research': '🔬',
                'Social': '💬',
                'Shopping': '🛒',
                'Media': '🎬',
                'News': '📰',
                'Documentation': '📚',
                'Email': '📧',
                'Work': '💼',
                'AI/ML': '🤖',
                'Design': '🎨'
            };
            
            return `${emojis[bestCategory[0]] || '📑'} ${bestCategory[0]}`;
        }
        
        // Fallback to domain-based naming
        if (domains.length > 0) {
            const mainDomain = domains[0].split('.')[0];
            return `🌐 ${mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1)}`;
        }
        
        return '📑 Group';
    }

    calculateGroupCohesion(embeddings) {
        if (embeddings.length < 2) return 1.0;
        
        let totalSimilarity = 0;
        let comparisons = 0;
        
        for (let i = 0; i < embeddings.length; i++) {
            for (let j = i + 1; j < embeddings.length; j++) {
                totalSimilarity += this.cosineSimilarity(embeddings[i], embeddings[j]);
                comparisons++;
            }
        }
        
        return totalSimilarity / comparisons;
    }
}

// Initialize processor
const processor = new AIProcessor();

// Listen for messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Offscreen received message:', message.type);
    
    switch (message.type) {
        case 'INIT_AI':
            await processor.initialize();
            sendResponse({ success: true });
            break;
            
        case 'PROCESS_TABS':
            try {
                const { groups, ungrouped } = await processor.groupTabsBySimilarity(
                    message.tabs,
                    message.threshold || 0.5
                );
                
                const labeledGroups = await processor.generateGroupLabels(groups);
                
                sendResponse({
                    success: true,
                    groups: labeledGroups,
                    ungrouped
                });
            } catch (error) {
                console.error('Error processing tabs:', error);
                sendResponse({
                    success: false,
                    error: error.message
                });
            }
            break;
            
        case 'GENERATE_EMBEDDING':
            try {
                const embedding = await processor.generateEmbedding(message.text);
                sendResponse({ success: true, embedding });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
            break;
    }
    
    return true; // Keep message channel open for async response
});

// Initialize on load
processor.initialize();

console.log('TabSorter AI Offscreen processor loaded (local version)');
