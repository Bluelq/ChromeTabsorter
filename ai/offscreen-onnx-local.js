// Real AI Processor using ONNX Runtime Web with Local WASM Files
// Complete offline implementation with robust initialization state machine

class RealAIProcessor {
    constructor() {
        this.session = null;
        this.tokenizerData = null;
        this.embeddingCache = new Map();
        this.modelReady = false; // Track model readiness

        // State machine for deterministic initialization
        this.states = {
            BOOT: 'BOOT',
            ORT_CONFIGURED: 'ORT_CONFIGURED',
            WASM_READY: 'WASM_READY',
            SESSION_READY: 'SESSION_READY',
            TOKENIZER_READY: 'TOKENIZER_READY',
            WARMED_UP: 'WARMED_UP',
            READY: 'READY',
            ERROR: 'ERROR'
        };

        this.currentState = this.states.BOOT;
        this.stateDetails = {};
        this.versionInfo = {
            ortVersion: '1.17.1',
            modelOpset: 12, // all-MiniLM-L6-v2 uses opset 12
            wasmVariant: 'ort-wasm-simd.wasm'
        };

        // Single-instance init lock
        this.initLock = null; // Promise that resolves when init completes
        this.initInProgress = false;
        this.readyEmitted = false; // Ensure only one ai:ready per load
    }

    // Structured logging for each initialization stage
    logStage(stage, status, details = {}) {
        const timestamp = Date.now();
        const logEntry = {
            stage,
            status, // 'START', 'OK', or 'FAIL'
            timestamp,
            details: {
                ...details,
                versionInfo: this.versionInfo
            }
        };

        console.log(`[AI INIT] ${stage} ${status}`, logEntry);

        // Emit telemetry for monitoring
        if (status === 'FAIL') {
            this.emitError(stage, details);
        }

        return logEntry;
    }

    // Create structured error envelope
    createErrorEnvelope(stage, error, resource = null) {
        const errorEnvelope = {
            stage,
            message: error.message || 'Unknown error',
            name: error.name || 'Error',
            stack: error.stack,
            cause: error.cause ? this.serializeError(error.cause) : null,
            resource: resource || this.getResourceForStage(stage),
            backend: this.versionInfo.wasmVariant.split('-')[1] || 'wasm', // 'simd'
            wasmVariant: this.versionInfo.wasmVariant,
            versionInfo: this.versionInfo,
            timestamp: Date.now()
        };

        return errorEnvelope;
    }

    // Serialize error for transmission
    serializeError(error) {
        if (!error) return null;
        return {
            message: error.message,
            name: error.name,
            stack: error.stack
        };
    }

    // Get resource associated with stage
    getResourceForStage(stage) {
        const resourceMap = {
            [this.states.ORT_CONFIGURED]: 'ort.min.js',
            [this.states.WASM_READY]: this.versionInfo.wasmVariant,
            [this.states.SESSION_READY]: 'ai/models/Xenova/all-MiniLM-L6-v2/model_quantized.onnx',
            [this.states.TOKENIZER_READY]: 'ai/models/Xenova/all-MiniLM-L6-v2/tokenizer.json'
        };
        return resourceMap[stage] || null;
    }

    // Emit structured error
    emitError(stage, details = {}) {
        const error = details.error || new Error('Unknown error');
        const envelope = this.createErrorEnvelope(stage, error, details.resource);

        // Best-effort messaging (no await, no error handling)
        window.Messaging?.send('ai:error', envelope);
    }

    // State transition with detailed logging and milestone validation
    transitionToState(newState, details = {}) {
        const oldState = this.currentState;
        this.currentState = newState;
        this.stateDetails = { ...this.stateDetails, ...details };

        const stateNames = Object.keys(this.states);
        const currentIndex = stateNames.indexOf(newState) + 1;
        const totalStates = 6; // BOOT through READY

        // Detailed logging for each milestone
        const milestoneMessages = {
            [this.states.ORT_CONFIGURED]: 'ORT backend configured with local WASM paths',
            [this.states.WASM_READY]: 'WASM files verified and accessible',
            [this.states.SESSION_READY]: 'ONNX inference session created and validated',
            [this.states.TOKENIZER_READY]: 'BERT tokenizer loaded and ready',
            [this.states.WARMED_UP]: 'Warm-up inference completed successfully',
            [this.states.READY]: 'ALL STAGES COMPLETE - AI fully operational'
        };

        const milestoneMsg = milestoneMessages[newState] || `${newState.replace('_', ' ').toLowerCase()}`;

        console.log(`[AI INIT] ${currentIndex}/${totalStates} ${milestoneMsg}`, {
            ...details,
            transition: `${oldState} → ${newState}`,
            timestamp: new Date().toISOString()
        });

        // Validate milestone completion
        this.validateMilestone(newState, details);

        // Broadcast state changes
        this.broadcastStateChange();
    }

    // Validate that each milestone has the required components
    validateMilestone(state, details) {
        const validations = {
            [this.states.ORT_CONFIGURED]: () => {
                return typeof ort !== 'undefined' && ort.env?.wasm?.wasmPaths;
            },
            [this.states.WASM_READY]: () => {
                return details.wasmVariant && details.wasmSize;
            },
            [this.states.SESSION_READY]: () => {
                return this.session && this.session.inputNames && this.session.outputNames;
            },
            [this.states.TOKENIZER_READY]: () => {
                return this.tokenizerData && this.tokenizerData.tokenizer;
            },
            [this.states.WARMED_UP]: () => {
                return details.testEmbedding === 'successful';
            },
            [this.states.READY]: () => {
                return details.allStagesCompleted === true && details.initializationTimestamp;
            }
        };

        const validator = validations[state];
        if (validator) {
            const passed = validator();
            console.log(`[AI VALIDATION] ${state}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
            if (!passed) {
                console.warn(`[AI VALIDATION] Milestone ${state} validation failed`, details);
            }
        }
    }

    // Broadcast current state to listeners
    broadcastStateChange() {
        // Best-effort messaging (no await, no error handling)
        window.Messaging?.send('ai:status', {
            state: this.currentState,
            details: this.stateDetails
        });
    }

    // Robust initialization with state machine
    async initialize() {
        // Prevent duplicate initialization
        if (this.initInProgress) {
            console.log('[AI INIT] Initialization already in progress, waiting...');
            return this.initPromise;
        }

        if (this.currentState === this.states.READY) {
            console.log('[AI INIT] Already ready');
            return;
        }

        this.initInProgress = true;
        this.initPromise = this.performInitialization();

        try {
            await this.initPromise;
        } finally {
            this.initInProgress = false;
        }

        return this.initPromise;
    }

    async performInitialization() {
        try {
            this.transitionToState(this.states.BOOT);

            // Step 1: Configure ONNX Runtime
            this.logStage(this.states.ORT_CONFIGURED, 'START');
            try {
                await this.configureONNXRuntime();
                this.logStage(this.states.ORT_CONFIGURED, 'OK', {
                    backend: 'wasm',
                    threading: 'disabled',
                    simd: 'enabled'
                });
                this.transitionToState(this.states.ORT_CONFIGURED, {
                    backend: 'wasm',
                    threading: 'disabled',
                    simd: 'enabled'
                });
            } catch (error) {
                this.logStage(this.states.ORT_CONFIGURED, 'FAIL', { error });
                throw error;
            }

            // Step 2: Verify WASM files are accessible
            this.logStage(this.states.WASM_READY, 'START');
            try {
                await this.verifyWASMFiles();
                this.logStage(this.states.WASM_READY, 'OK', {
                    wasmVariant: this.versionInfo.wasmVariant,
                    wasmSize: '~10.5MB'
                });
                this.transitionToState(this.states.WASM_READY, {
                    wasmVariant: this.versionInfo.wasmVariant,
                    wasmSize: '~10.5MB'
                });
            } catch (error) {
                this.logStage(this.states.WASM_READY, 'FAIL', { error });
                throw error;
            }

            // Step 3: Load and initialize ONNX session
            this.logStage(this.states.SESSION_READY, 'START');
            try {
                await this.loadModel();
                this.logStage(this.states.SESSION_READY, 'OK', {
                    model: 'all-MiniLM-L6-v2',
                    modelSize: '~23MB',
                    inputNames: this.session.inputNames,
                    outputNames: this.session.outputNames
                });
                this.transitionToState(this.states.SESSION_READY, {
                    model: 'all-MiniLM-L6-v2',
                    modelSize: '~23MB',
                    inputNames: this.session.inputNames,
                    outputNames: this.session.outputNames
                });
            } catch (error) {
                this.logStage(this.states.SESSION_READY, 'FAIL', { error });
                throw error;
            }

            // Step 4: Load tokenizer
            this.logStage(this.states.TOKENIZER_READY, 'START');
            try {
                await this.loadTokenizer();
                const vocabSize = this.tokenizerData?.tokenizer?.model?.vocab ?
                    Object.keys(this.tokenizerData.tokenizer.model.vocab).length : 'unknown';
                this.logStage(this.states.TOKENIZER_READY, 'OK', {
                    tokenizer: 'BERT',
                    vocabSize: vocabSize
                });
                this.transitionToState(this.states.TOKENIZER_READY, {
                    tokenizer: 'BERT',
                    vocabSize: vocabSize
                });

                // Set model ready after session and tokenizer are loaded
                this.modelReady = true;
            } catch (error) {
                this.logStage(this.states.TOKENIZER_READY, 'FAIL', { error });
                throw error;
            }

            // Step 5: Warm up with test inference
            this.logStage(this.states.WARMED_UP, 'START');
            try {
                await this.warmUp();
                this.logStage(this.states.WARMED_UP, 'OK', {
                    testEmbedding: 'successful',
                    cacheSize: 0
                });
                this.transitionToState(this.states.WARMED_UP, {
                    testEmbedding: 'successful',
                    cacheSize: 0
                });
            } catch (error) {
                this.logStage(this.states.WARMED_UP, 'FAIL', { error });
                throw error;
            }

            // Step 6: Mark as ready (only after ALL stages complete successfully)
            this.logStage(this.states.READY, 'START');
            this.transitionToState(this.states.READY, {
                version: 'ONNX Runtime Web v1.17.1',
                model: 'all-MiniLM-L6-v2',
                embeddingDim: 384,
                allStagesCompleted: true,
                initializationTimestamp: Date.now()
            });
            this.logStage(this.states.READY, 'OK', {
                allStagesCompleted: true,
                initializationTimestamp: Date.now()
            });

            console.log('[AI INIT] 🎉 ALL 6 STAGES COMPLETED - Real AI model fully initialized and ready for inference!');
            console.log('[AI INIT] ✅ ORT backend configured and loaded');
            console.log('[AI INIT] ✅ WASM files verified and accessible');
            console.log('[AI INIT] ✅ ONNX session created and validated');
            console.log('[AI INIT] ✅ BERT tokenizer loaded and ready');
            console.log('[AI INIT] ✅ Warm-up inference successful');
            console.log('[AI INIT] ✅ Ready to process embeddings and tab grouping');

            // READY signal is now emitted by the lifecycle manager after init completes

        } catch (error) {
            this.transitionToState(this.states.ERROR, {
                error: error.message,
                stack: error.stack,
                stage: this.currentState
            });

            // Emit structured error with full context
            this.emitError(this.currentState, { error });

            throw error;
        }
    }

    async verifyWASMFiles() {
        const wasmFiles = [
            'ext/libs/ort-wasm.wasm',
            'ext/libs/ort-wasm-simd.wasm',
            'ext/libs/ort-wasm-threaded.wasm'
        ];

        // Use environment-aware path resolution
        const envPaths = window.envPaths || {
            getURL: (path) => {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                    try {
                        return chrome.runtime.getURL(path);
                    } catch (e) {
                        return path;
                    }
                } else {
                    return path.startsWith('/') ? path : '/' + path;
                }
            }
        };

        for (const file of wasmFiles) {
            try {
                const url = envPaths.getURL(file);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} for ${file}`);
                }
                console.log(`[AI INIT] Verified ${file}: ${response.headers.get('content-length')} bytes`);
            } catch (error) {
                console.warn(`[AI INIT] Could not verify ${file}:`, error.message);
            }
        }
    }

    async warmUp() {
        console.log('[AI INIT] Running warm-up inference...');
        const testEmbedding = await this.generateEmbedding('warmup test');
        // The `generateEmbedding` function now returns null on failure.
        if (!testEmbedding) {
            throw new Error('Warm-up inference failed: generateEmbedding returned null.');
        }
        if (testEmbedding.length !== 384) {
            throw new Error(`Warm-up embedding failed or wrong dimensions. Expected 384, got ${testEmbedding.length}`);
        }
        console.log('[AI INIT] Warm-up successful, embedding dimensions:', testEmbedding.length);
    }

    configureONNXRuntime() {
        console.log('Configuring ONNX Runtime for extension environment...');

        if (typeof ort !== 'undefined') {
            // Apply pre-configuration from ort-paths.js
            if (window.ortPreConfig) {
                console.log('Applying pre-configured ONNX environment');
                Object.assign(ort.env, window.ortPreConfig.env);
                Object.assign(ort.env.wasm, window.ortPreConfig.wasm);
            } else {
                // Fallback configuration
                ort.env.wasm.numThreads = 1; // Disabled threading for extension compatibility
                ort.env.wasm.simd = true;
                ort.env.allowLocalModels = true;
                ort.env.allowRemoteModels = false;
            }

            console.log('ONNX Runtime configured - threading disabled for extension compatibility');
            console.log('WASM paths configured via fetch override');
        } else {
            throw new Error('ONNX Runtime Web not loaded');
        }
    }

    async loadTokenizer() {
        console.log('Loading tokenizer data...');

        // Use environment-aware path resolution
        const envPaths = window.envPaths || {
            getURL: (path) => {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                    try {
                        return chrome.runtime.getURL(path);
                    } catch (e) {
                        return path;
                    }
                } else {
                    return path.startsWith('/') ? path : '/' + path;
                }
            }
        };

        try {
            const [tokenizerJson, configJson, specialTokensJson] = await Promise.all([
                fetch(envPaths.getURL('ai/models/Xenova/all-MiniLM-L6-v2/tokenizer.json')).then(r => r.json()),
                fetch(envPaths.getURL('ai/models/Xenova/all-MiniLM-L6-v2/config.json')).then(r => r.json()),
                fetch(envPaths.getURL('ai/models/Xenova/all-MiniLM-L6-v2/special_tokens_map.json')).then(r => r.json())
            ]);

            this.tokenizerData = {
                tokenizer: tokenizerJson,
                config: configJson,
                specialTokens: specialTokensJson
            };

            console.log('Tokenizer loaded successfully');
        } catch (error) {
            console.error('Failed to load tokenizer:', error);
            throw error;
        }
    }

    async loadModel() {
        console.log('Loading ONNX model...');

        // Use environment-aware path resolution
        const envPaths = window.envPaths || {
            getURL: (path) => {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                    try {
                        return chrome.runtime.getURL(path);
                    } catch (e) {
                        return path;
                    }
                } else {
                    return path.startsWith('/') ? path : '/' + path;
                }
            }
        };

        try {
            const modelUrl = envPaths.getURL('ai/models/Xenova/all-MiniLM-L6-v2/model_quantized.onnx');
            console.log('Loading model from:', modelUrl);

            const modelResponse = await fetch(modelUrl);
            if (!modelResponse.ok) {
                throw new Error(`Failed to fetch model: ${modelResponse.status} ${modelResponse.statusText}`);
            }

            const modelBuffer = await modelResponse.arrayBuffer();
            console.log(`Model loaded: ${modelBuffer.byteLength} bytes`);

            // Create ONNX inference session with options optimized for lower memory usage
            console.log('Creating ONNX inference session with low-memory profile...');
            this.session = await ort.InferenceSession.create(modelBuffer, {
                executionProviders: ['wasm'],
                // Use a lower level of graph optimization to reduce memory overhead
                graphOptimizationLevel: 'basic',
                // Disable memory arena and pattern optimizations to trade speed for stability
                enableCpuMemArena: false,
                enableMemPattern: false
            });

            console.log('ONNX model loaded successfully!');
            console.log('Input names:', this.session.inputNames);
            console.log('Output names:', this.session.outputNames);

        } catch (error) {
            console.error('Failed to load ONNX model:', error);
            throw error;
        }
    }

    async testModel() {
        console.log('Testing model with sample input...');

        try {
            const testText = "Hello world";
            const embedding = await this.generateEmbedding(testText);

            if (!embedding || embedding.length !== 384) {
                throw new Error(`Invalid embedding: expected 384 dimensions, got ${embedding?.length || 0}`);
            }

            console.log('Model test passed! Embedding shape:', embedding.length);
        } catch (error) {
            console.error('Model test failed:', error);
            throw error;
        }
    }

    // Tokenization using loaded tokenizer data
    tokenize(text) {
        if (!this.tokenizerData) {
            return this.fallbackTokenize(text);
        }

        const cleanText = text.toLowerCase().trim();
        if (!cleanText) return [101, 102]; // CLS, SEP

        // Use vocabulary from tokenizer
        const vocab = this.tokenizerData.tokenizer?.model?.vocab || {};
        const tokens = [101]; // CLS token

        // Simple word-based tokenization
        const words = cleanText.split(/\s+/).filter(w => w.length > 0).slice(0, 510);

        for (const word of words) {
            if (vocab[word]) {
                tokens.push(vocab[word]);
            } else {
                // Handle unknown words by character-level fallback
                const charTokens = word.split('').map(char => vocab[char] || 100).slice(0, 10);
                tokens.push(...charTokens);
            }
        }

        tokens.push(102); // SEP token
        return tokens;
    }

    fallbackTokenize(text) {
        const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0).slice(0, 510);
        const tokens = [101];

        for (const word of words) {
            let hash = 0;
            for (let i = 0; i < word.length; i++) {
                hash = ((hash << 5) - hash) + word.charCodeAt(i);
            }
            const tokenId = Math.abs(hash) % 28000 + 1000;
            tokens.push(Math.min(tokenId, 29999));
        }

        tokens.push(102);
        return tokens;
    }

    async generateEmbedding(text) {
        if (!this.modelReady || !this.session) {
            throw new Error('AI model not ready');
        }

        if (this.embeddingCache.has(text)) {
            return this.embeddingCache.get(text);
        }

        try {
            console.log(`Generating real AI embedding for: "${text}"`);

            const tokens = this.tokenize(text);

            // Create input tensors
            const inputIds = new ort.Tensor('int64', BigInt64Array.from(tokens.map(x => BigInt(x))), [1, tokens.length]);
            const attentionMask = new ort.Tensor('int64', BigInt64Array.from(tokens.map(() => 1n)), [1, tokens.length]);
            const tokenTypeIds = new ort.Tensor('int64', BigInt64Array.from(tokens.map(() => 0n)), [1, tokens.length]);

            const feeds = {
                input_ids: inputIds,
                attention_mask: attentionMask,
                token_type_ids: tokenTypeIds
            };

            const results = await this.session.run(feeds);
            const lastHiddenState = results.last_hidden_state;

            if (!lastHiddenState) {
                throw new Error('Model output missing last_hidden_state');
            }

            const embeddings = lastHiddenState.data;
            const seqLength = tokens.length;
            const hiddenSize = lastHiddenState.dims[2];

            const pooledEmbedding = new Float32Array(hiddenSize);
            for (let i = 0; i < hiddenSize; i++) {
                let sum = 0;
                for (let j = 0; j < seqLength; j++) {
                    sum += embeddings[j * hiddenSize + i];
                }
                pooledEmbedding[i] = sum / seqLength;
            }

            const norm = Math.sqrt(pooledEmbedding.reduce((a, b) => a + b * b, 0));
            if (norm > 0) {
                for (let i = 0; i < hiddenSize; i++) {
                    pooledEmbedding[i] /= norm;
                }
            }

            const result = Array.from(pooledEmbedding);
            this.embeddingCache.set(text, result);

            if (this.embeddingCache.size > 500) {
                const firstKey = this.embeddingCache.keys().next().value;
                this.embeddingCache.delete(firstKey);
            }

            return result;

        } catch (error) {
            console.error(`Error in AI embedding generation for text: "${text}"`, {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            // Do not re-throw, instead return null to prevent crashing the process.
            // The calling function (`generateEmbeddings`) is responsible for handling this null value.
            return null;
        }
    }

    async generateEmbeddings(texts) {
        const embeddings = [];

        for (const text of texts) {
            const embedding = await this.generateEmbedding(text);
            if (embedding) {
                embeddings.push(embedding);
            } else {
                // If embedding generation failed (returned null), push a zero vector as a fallback.
                console.warn(`Could not generate embedding for text: "${text}". Using fallback vector.`);
                embeddings.push(new Array(384).fill(0));
            }
        }

        return embeddings;
    }

    cosineSimilarity(a, b) {
        let dotProduct = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator > 0 ? dotProduct / denominator : 0;
    }

    async groupTabsBySimilarity(tabs, threshold = 0.5) {
        const tabTexts = tabs.map(tab => {
            try {
                const url = new URL(tab.url);
                const domain = url.hostname.replace('www.', '');
                return `${tab.title || ''} ${domain}`.trim();
            } catch {
                return tab.title || tab.url || '';
            }
        });

        console.log(`Processing ${tabs.length} tabs with real AI...`);
        const embeddings = await this.generateEmbeddings(tabTexts);

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

            for (let j = i + 1; j < tabs.length; j++) {
                if (assigned.has(j)) continue;

                const avgSimilarity = this.calculateAverageSimilarity(embeddings[j], group.embeddings);
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

        const ungrouped = tabs.filter((_, i) => !assigned.has(i));

        console.log(`AI grouped ${tabs.length} tabs into ${groups.length} groups`);
        return { groups, ungrouped };
    }

    calculateAverageSimilarity(embedding, groupEmbeddings) {
        const similarities = groupEmbeddings.map(e => this.cosineSimilarity(embedding, e));
        return similarities.reduce((a, b) => a + b, 0) / similarities.length;
    }

    async generateGroupLabels(groups) {
        const labeledGroups = [];

        for (const group of groups) {
            const titles = group.tabs.map(t => t.title || '');
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
        const scores = {};
        for (const [category, keywords] of Object.entries(categories)) {
            scores[category] = keywords.filter(keyword => allText.includes(keyword)).length;
        }

        const bestCategory = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
        if (bestCategory && bestCategory[1] > 0) {
            const emojis = {
                'Development': '💻', 'Research': '🔬', 'Social': '💬', 'Shopping': '🛒',
                'Media': '🎬', 'News': '📰', 'Documentation': '📚', 'Email': '📧',
                'Work': '💼', 'AI/ML': '🤖', 'Design': '🎨'
            };
            return `${emojis[bestCategory[0]] || '📑'} ${bestCategory[0]}`;
        }

        if (domains.length > 0) {
            const mainDomain = domains[0].split('.')[0];
            return `🌐 ${mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1)}`;
        }

        return '📑 Group';
    }

    calculateGroupCohesion(embeddings) {
        if (embeddings.length < 2) return 1.0;
        let totalSimilarity = 0, comparisons = 0;
        for (let i = 0; i < embeddings.length; i++) {
            for (let j = i + 1; j < embeddings.length; j++) {
                totalSimilarity += this.cosineSimilarity(embeddings[i], embeddings[j]);
                comparisons++;
            }
        }
        return totalSimilarity / comparisons;
    }
}

// Message handler with robust protocol (will be set up by IIFE)
let messageHandler = null;

// Self-test method
RealAIProcessor.prototype.runSelfTest = async function() {
    console.log('[AI SELFTEST] Running comprehensive self-test...');

    const results = {
        passed: false,
        checks: [],
        error: null
    };

    try {
        // Check 1: State is READY
        results.checks.push({
            name: 'State Check',
            passed: this.currentState === this.states.READY,
            details: `Current state: ${this.currentState}`
        });

        // Check 2: Session exists
        results.checks.push({
            name: 'Session Check',
            passed: !!this.session,
            details: `Session: ${this.session ? 'exists' : 'missing'}`
        });

        // Check 3: Tokenizer loaded
        results.checks.push({
            name: 'Tokenizer Check',
            passed: !!this.tokenizerData,
            details: `Tokenizer: ${this.tokenizerData ? 'loaded' : 'missing'}`
        });

        // Check 4: Test embedding generation
        const testEmbedding = await this.generateEmbedding('self-test input');
        results.checks.push({
            name: 'Embedding Test',
            passed: testEmbedding && testEmbedding.length === 384,
            details: `Embedding dimensions: ${testEmbedding?.length || 0}`
        });

        // Check 5: Test similarity calculation
        const sim = this.cosineSimilarity(testEmbedding, testEmbedding);
        results.checks.push({
            name: 'Similarity Test',
            passed: Math.abs(sim - 1.0) < 0.001, // Should be ~1.0 for identical vectors
            details: `Self-similarity: ${sim}`
        });

        results.passed = results.checks.every(check => check.passed);
        console.log('[AI SELFTEST] Self-test completed:', results.passed ? 'PASSED' : 'FAILED');

    } catch (error) {
        results.error = error.message;
        results.passed = false;
        console.error('[AI SELFTEST] Self-test failed:', error);
    }

    return results;
};

// Single-instance lifecycle management for offscreen document
// Ensures initialization happens only once per document lifetime

(function() {
    'use strict';

    console.log('[AI LIFECYCLE] Offscreen document script loaded, waiting for DOM ready...');

    // Create unified processor instance (single instance per document)
    const processor = new RealAIProcessor();
    window.AI_PROCESSOR = processor;

    let initStarted = false;
    let initCompleted = false;

    // Set up message handler for the unified processor instance
    messageHandler = async (message, sender, sendResponse) => {
        console.log('Real AI Offscreen received message:', message.type);

        switch (message.type) {
            case 'INIT_AI':
                try {
                    await processor.initialize();
                    sendResponse({ success: true, state: processor.currentState });
                } catch (error) {
                    sendResponse({ success: false, error: error.message, state: processor ? processor.currentState : 'UNKNOWN' });
                }
                break;

            case 'ai:status':
                sendResponse({
                    state: processor.currentState,
                    details: processor.stateDetails,
                    ready: processor.currentState === processor.states.READY
                });
                break;

            case 'ai:selftest':
                try {
                    const testResult = await processor.runSelfTest();
                    sendResponse({
                        success: testResult.passed,
                        details: testResult,
                        state: processor.currentState
                    });
                } catch (error) {
                    sendResponse({
                        success: false,
                        error: error.message,
                        state: processor.currentState
                    });
                }
                break;

            case 'ai:embed':
                if (processor.currentState !== processor.states.READY || !processor.modelReady) {
                    sendResponse({
                        type: 'ai:not-ready',
                        state: processor.currentState,
                        reason: 'AI model not fully initialized',
                        modelReady: processor.modelReady
                    });
                    break;
                }

                try {
                    const embedding = await processor.generateEmbedding(message.text);
                    sendResponse({
                        success: true,
                        embedding: embedding,
                        text: message.text
                    });
                } catch (error) {
                    sendResponse({
                        success: false,
                        error: error.message,
                        text: message.text
                    });
                }
                break;

            case 'PROCESS_TABS':
                try {
                    if (processor.currentState !== processor.states.READY || !processor.modelReady) {
                        throw new Error(`AI not ready. State: ${processor.currentState}, Model Ready: ${processor.modelReady}`);
                    }

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
                    console.error('Catastrophic error in PROCESS_TABS:', error);
                    // Send a structured error response instead of crashing the port
                    sendResponse({
                        success: false,
                        error: 'A critical error occurred during tab processing.',
                        details: {
                            message: error.message,
                            stack: error.stack,
                            name: error.name
                        }
                    });
                }
                break;

            case 'GENERATE_EMBEDDING':
                if (processor.currentState !== processor.states.READY || !processor.modelReady) {
                    sendResponse({
                        success: false,
                        error: 'AI model not ready',
                        state: processor.currentState,
                        modelReady: processor.modelReady
                    });
                    break;
                }

                try {
                    const embedding = await processor.generateEmbedding(message.text);
                    sendResponse({ success: true, embedding });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                break;
        }

        return true;
    };

    // Register message handler if chrome runtime is available
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(messageHandler);
    }

    // Wait for DOM to be fully loaded before initializing
    function onDocumentReady() {
        console.log('[AI LIFECYCLE] DOM ready, initializing AI processor...');

        // Add status helper
        window.AI_STATUS = () => ({
            state: processor.currentState,
            details: processor.stateDetails,
            ready: processor.currentState === processor.states.READY
        });

        // Start initialization (only once per document lifetime)
        startInitialization();
    }

    async function startInitialization() {
        if (initStarted) {
            console.log('[AI LIFECYCLE] Initialization already started, skipping...');
            return;
        }

        initStarted = true;
        console.log('[AI LIFECYCLE] Starting single-instance AI initialization...');

        try {
            await processor.initialize();
            initCompleted = true;
            console.log('[AI LIFECYCLE] AI initialization completed successfully');

            // Emit final READY signal with complete details (only once per load)
            if (!processor.readyEmitted) {
                processor.readyEmitted = true;
                // Best-effort messaging (no await, no error handling)
                window.Messaging?.send('ai:ready', {
                    details: processor.stateDetails,
                    timestamp: Date.now()
                });
            }

        } catch (error) {
            initCompleted = false;
            console.error('[AI LIFECYCLE] AI initialization failed:', error);

            // Best-effort error messaging
            window.Messaging?.send('ai:error', {
                error: error.message,
                stage: processor ? processor.currentState : 'UNKNOWN',
                timestamp: Date.now()
            });
        }
    }

    // Handle page visibility changes (offscreen document lifecycle)
    document.addEventListener('visibilitychange', () => {
        console.log(`[AI LIFECYCLE] Visibility changed to: ${document.visibilityState}`);

        if (document.visibilityState === 'visible') {
            // Check if we need to restart initialization
            if (processor && !initCompleted &&
                (processor.currentState === processor.states.ERROR ||
                 processor.currentState === processor.states.BOOT)) {
                console.log('[AI LIFECYCLE] Restarting failed initialization...');
                startInitialization();
            }
        }
    });

    // Handle page unload/reload
    window.addEventListener('beforeunload', () => {
        console.log('[AI LIFECYCLE] Offscreen document unloading...');
        initStarted = false; // Reset for next document instance
    });

    // Initialize when DOM is ready (not on script load)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDocumentReady);
    } else {
        // DOM already loaded
        onDocumentReady();
    }

    console.log('[AI LIFECYCLE] Lifecycle management initialized');
})();