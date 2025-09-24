// Offscreen AI Processor using ONNX Runtime Web
// Direct implementation for fully local AI processing

class ONNXAIProcessor {
    constructor() {
        this.session = null;
        this.tokenizerData = null;
        this.modelReady = false;
        this.embeddingCache = new Map();
    }

    async initialize() {
        if (this.modelReady) return;

        try {
            console.log('Initializing ONNX AI processor...');

            // Load tokenizer data
            await this.loadTokenizer();

            // Load ONNX model
            await this.loadModel();

            this.modelReady = true;
            console.log('ONNX AI model loaded successfully');

            // Send ready message
            chrome.runtime.sendMessage({
                type: 'AI_MODEL_READY'
            });

        } catch (error) {
            console.error('Failed to initialize ONNX AI model:', error);
            chrome.runtime.sendMessage({
                type: 'AI_MODEL_ERROR',
                error: error.message
            });
        }
    }

    async loadTokenizer() {
        console.log('Loading tokenizer...');

        // Load tokenizer files
        const [tokenizerJson, configJson, specialTokensJson] = await Promise.all([
            fetch(chrome.runtime.getURL('ai/models/Xenova/all-MiniLM-L6-v2/tokenizer.json')).then(r => r.json()),
            fetch(chrome.runtime.getURL('ai/models/Xenova/all-MiniLM-L6-v2/config.json')).then(r => r.json()),
            fetch(chrome.runtime.getURL('ai/models/Xenova/all-MiniLM-L6-v2/special_tokens_map.json')).then(r => r.json())
        ]);

        this.tokenizerData = {
            tokenizer: tokenizerJson,
            config: configJson,
            specialTokens: specialTokensJson
        };

        console.log('Tokenizer loaded');
    }

    async loadModel() {
        console.log('Loading ONNX model...');

        // Create ONNX session
        const modelUrl = chrome.runtime.getURL('ai/models/Xenova/all-MiniLM-L6-v2/model_quantized.onnx');
        const modelResponse = await fetch(modelUrl);
        const modelBuffer = await modelResponse.arrayBuffer();

        this.session = await ort.InferenceSession.create(modelBuffer, {
            executionProviders: ['wasm']
        });

        console.log('ONNX model loaded');
    }

    // Improved tokenization based on BERT tokenizer patterns
    tokenize(text) {
        if (!this.tokenizerData) {
            // Fallback if tokenizer data not loaded
            return this.basicTokenize(text);
        }

        // Basic word-level tokenization
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' $& ')
            .split(/\s+/)
            .filter(t => t.length > 0)
            .slice(0, 510); // Limit length

        const tokens = [101]; // CLS token

        for (const word of words) {
            // Check if word is in vocab
            const vocab = this.tokenizerData.tokenizer?.model?.vocab || {};
            if (vocab[word]) {
                tokens.push(vocab[word]);
            } else {
                // Word not in vocab, use subword tokenization approximation
                const subTokens = this.subwordTokenize(word, vocab);
                tokens.push(...subTokens);
            }
        }

        tokens.push(102); // SEP token
        return tokens;
    }

    basicTokenize(text) {
        // Very basic tokenization as fallback
        const basicTokens = text.toLowerCase()
            .replace(/[^\w\s]/g, ' $& ')
            .split(/\s+/)
            .filter(t => t.length > 0);

        const tokens = [101]; // CLS token

        for (const token of basicTokens.slice(0, 510)) {
            // Simple hash-based token ID generation
            let hash = 0;
            for (let i = 0; i < token.length; i++) {
                hash = ((hash << 5) - hash) + token.charCodeAt(i);
                hash = hash & hash;
            }
            const tokenId = Math.abs(hash) % 29000 + 1000; // Avoid special tokens
            tokens.push(Math.min(tokenId, 29999));
        }

        tokens.push(102); // SEP token
        return tokens;
    }

    subwordTokenize(word, vocab) {
        // Simple subword tokenization - split into characters if word not found
        const tokens = [];
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const charToken = vocab[char];
            if (charToken) {
                tokens.push(charToken);
            } else {
                // Use hash for unknown characters
                const hash = char.charCodeAt(0) % 1000 + 2000;
                tokens.push(hash);
            }
        }
        return tokens;
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
            // Tokenize input
            const tokens = this.tokenize(text);

            // Create input tensor
            const inputIds = new ort.Tensor('int64', BigInt64Array.from(tokens.map(x => BigInt(x))), [1, tokens.length]);
            const attentionMask = new ort.Tensor('int64', BigInt64Array.from(tokens.map(() => 1n)), [1, tokens.length]);

            // Run inference
            const feeds = {
                input_ids: inputIds,
                attention_mask: attentionMask
            };

            const results = await this.session.run(feeds);

            // Extract embeddings (mean pooling)
            const embeddings = results.last_hidden_state.data;
            const seqLength = tokens.length;
            const hiddenSize = embeddings.length / seqLength;

            // Mean pooling across sequence dimension
            const pooledEmbedding = new Float32Array(hiddenSize);
            for (let i = 0; i < hiddenSize; i++) {
                let sum = 0;
                for (let j = 0; j < seqLength; j++) {
                    sum += embeddings[j * hiddenSize + i];
                }
                pooledEmbedding[i] = sum / seqLength;
            }

            // Normalize
            const norm = Math.sqrt(pooledEmbedding.reduce((a, b) => a + b * b, 0));
            for (let i = 0; i < hiddenSize; i++) {
                pooledEmbedding[i] /= norm;
            }

            const result = Array.from(pooledEmbedding);

            // Cache the result
            this.embeddingCache.set(text, result);

            // Limit cache size
            if (this.embeddingCache.size > 500) {
                const firstKey = this.embeddingCache.keys().next().value;
                this.embeddingCache.delete(firstKey);
            }

            return result;

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
const processor = new ONNXAIProcessor();

// Listen for messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('ONNX Offscreen received message:', message.type);

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

console.log('ONNX AI Offscreen processor loaded (direct ONNX implementation)');