// Local AI Model Processor - Receives model data directly
// No fetching required - data is passed from background script

class LocalModelProcessor {
    constructor() {
        this.modelData = null;
        this.modelLoaded = false;
    }

    // Load model data passed from background
    loadModelData(modelData) {
        console.log('Loading model data passed from background...');
        
        this.modelData = modelData;
        this.modelLoaded = true;
        
        console.log('Model data loaded:', {
            hasConfig: !!modelData.config,
            hasTokenizer: !!modelData.tokenizer,
            hasTokenizerConfig: !!modelData.tokenizerConfig,
            vocabSize: modelData.tokenizer?.model?.vocab?.length || 'unknown'
        });
        
        return true;
    }

    // Simple tokenization (fallback implementation)
    tokenize(text) {
        // This is a simplified tokenization - in production you'd use the full tokenizer
        const words = text.toLowerCase().split(/\s+/);
        const tokens = [];
        
        // Create a simple hash for each word
        for (const word of words) {
            let hash = 0;
            for (let i = 0; i < word.length; i++) {
                hash = ((hash << 5) - hash) + word.charCodeAt(i);
                hash = hash & hash;
            }
            tokens.push(Math.abs(hash) % 30000); // Vocab size approximation
        }
        
        return tokens;
    }

    // Generate a deterministic embedding
    generateEmbedding(text) {
        if (!this.modelLoaded) {
            throw new Error('Model not loaded');
        }

        // For now, create a deterministic embedding based on the text
        // This is a placeholder - real implementation would use ONNX runtime
        const tokens = this.tokenize(text);
        const embedding = new Float32Array(384); // all-MiniLM-L6-v2 has 384 dimensions
        
        // Generate pseudo-embedding based on tokens
        for (let i = 0; i < embedding.length; i++) {
            let value = 0;
            for (let j = 0; j < tokens.length; j++) {
                value += Math.sin(tokens[j] * (i + 1) * 0.01) / tokens.length;
            }
            embedding[i] = value;
        }
        
        // Normalize the embedding
        let norm = 0;
        for (let i = 0; i < embedding.length; i++) {
            norm += embedding[i] * embedding[i];
        }
        norm = Math.sqrt(norm);
        
        if (norm > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] /= norm;
            }
        }
        
        return Array.from(embedding);
    }
}

// Simplified AI Processor
class SimpleAIProcessor {
    constructor() {
        this.modelProcessor = new LocalModelProcessor();
        this.modelReady = false;
        this.embeddingCache = new Map();
    }

    // Initialize with model data passed from background
    async initializeWithData(modelData) {
        if (this.modelReady) return;
        
        try {
            console.log('Initializing AI processor with passed data...');
            
            // Load the model data
            this.modelProcessor.loadModelData(modelData);
            this.modelReady = true;
            
            console.log('AI processor ready (using simplified embeddings)');
            
            // Notify background that we're ready
            chrome.runtime.sendMessage({
                type: 'AI_MODEL_READY'
            }).catch(err => {
                console.log('Could not send ready message:', err);
            });
            
        } catch (error) {
            console.error('Failed to initialize AI processor:', error);
            chrome.runtime.sendMessage({
                type: 'AI_MODEL_ERROR',
                error: error.message
            }).catch(err => {
                console.log('Could not send error message:', err);
            });
        }
    }

    generateEmbedding(text) {
        if (!this.modelReady) {
            throw new Error('Model not initialized');
        }

        // Check cache
        if (this.embeddingCache.has(text)) {
            return this.embeddingCache.get(text);
        }

        try {
            const embedding = this.modelProcessor.generateEmbedding(text);
            this.embeddingCache.set(text, embedding);
            return embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    generateEmbeddings(texts) {
        const embeddings = [];
        for (const text of texts) {
            const embedding = this.generateEmbedding(text);
            embeddings.push(embedding);
        }
        return embeddings;
    }

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

    async groupTabsBySimilarity(tabs, threshold = 0.45) {
        // Prepare texts for embedding
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
        const embeddings = this.generateEmbeddings(tabTexts);
        
        // Create similarity groups
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
                
                // Calculate average similarity with group
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
        
        // Collect ungrouped tabs
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

    async generateGroupLabels(groups) {
        const labeledGroups = [];
        
        for (const group of groups) {
            const titles = group.tabs.map(t => t.title);
            const domains = new Set();
            
            group.tabs.forEach(tab => {
                try {
                    const url = new URL(tab.url);
                    domains.add(url.hostname.replace('www.', ''));
                } catch {}
            });
            
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

// Create the processor instance
const processor = new SimpleAIProcessor();

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Offscreen received message:', message.type);
    
    // Handle the new initialization message with model data
    if (message.type === 'INIT_AI_WITH_DATA') {
        processor.initializeWithData(message.modelData).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
    }
    
    // Handle other messages
    switch (message.type) {
        case 'PROCESS_TABS':
            if (!processor.modelReady) {
                sendResponse({
                    success: false,
                    error: 'Model not initialized'
                });
                return true;
            }
            
            // Process tabs asynchronously
            (async () => {
                try {
                    const { groups, ungrouped } = await processor.groupTabsBySimilarity(
                        message.tabs,
                        message.threshold || 0.45
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
            })();
            return true;
            
        case 'GENERATE_EMBEDDING':
            if (!processor.modelReady) {
                sendResponse({
                    success: false,
                    error: 'Model not initialized'
                });
                return true;
            }
            
            try {
                const embedding = processor.generateEmbedding(message.text);
                sendResponse({ success: true, embedding });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
            return true;
            
        default:
            // Unknown message type
            console.log('Unknown message type:', message.type);
            return false;
    }
});

console.log('TabSorter AI Offscreen processor loaded (waiting for model data)');
