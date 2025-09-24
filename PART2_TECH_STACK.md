# PART 2: AI/ML Engine Setup

## Objective
Integrate Transformers.js for high-quality embeddings and implement clustering algorithms for intelligent tab grouping.

## Prerequisites
- Part 1 must be complete and working
- Extension should be loading without errors
- Message passing system functional

## Tech Stack
- **Transformers.js v2.x** - Browser-based transformer models
- **ML.js** - Machine learning algorithms (DBSCAN clustering)
- **IndexedDB** - Client-side storage for embeddings cache
- **Web Workers** - Background model processing
- **Model**: Xenova/all-MiniLM-L6-v2 or Xenova/all-mpnet-base-v2

## File Structure for Part 2
```
tab-sorter-extension/
├── ai/
│   ├── embeddings.js      # Embedding generation
│   ├── clustering.js      # DBSCAN implementation
│   ├── model-loader.js    # Model management
│   └── ai-worker.js       # Web Worker for processing
├── storage/
│   └── cache-manager.js   # IndexedDB cache
└── lib/
    └── (Transformers.js will be loaded via CDN)
```

## Key Implementations

### 1. Model Loading System
```javascript
// Model options (size vs quality tradeoff)
const MODELS = {
  small: 'Xenova/all-MiniLM-L6-v2',     // 23MB, good quality
  medium: 'Xenova/bge-small-en-v1.5',   // 33MB, better quality  
  large: 'Xenova/all-mpnet-base-v2',    // 420MB, best quality
};
```

### 2. Embedding Pipeline
- Load model once and cache in memory
- Generate 384/768-dimensional embeddings
- Batch processing for efficiency
- Progress callbacks for UI updates

### 3. Caching Strategy
- IndexedDB schema for embeddings
- Cache key: URL + title hash
- Expiration: 7 days
- Size limit: 100MB

### 4. Clustering Algorithm
- DBSCAN with adaptive epsilon
- Minimum cluster size: 2 (configurable)
- Distance metric: Cosine similarity
- Noise point handling

### 5. Web Worker Integration
- Offload model inference to worker
- Non-blocking UI during processing
- Message queue for batch operations

## Implementation Steps

### Step 1: Set up Transformers.js
```javascript
// In manifest.json, add:
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'"
}
```

### Step 2: Model Loader
- Dynamic model selection based on settings
- Progress tracking during download
- Model caching in browser cache
- Fallback to smaller models on failure

### Step 3: Embedding Generation
- Text preprocessing (truncation, cleaning)
- Batch embedding generation
- Similarity calculations
- Vector normalization

### Step 4: Clustering Implementation
- DBSCAN from ML.js
- Dynamic epsilon calculation
- Cluster quality metrics
- Outlier handling strategy

### Step 5: Cache Manager
- IndexedDB setup
- CRUD operations for embeddings
- Cache invalidation logic
- Storage quota management

## API Design

```javascript
// Main AI interface
class TabAI {
  async initialize(modelSize = 'small')
  async generateEmbeddings(texts)
  async clusterTabs(tabData, minClusterSize = 2)
  async getCachedEmbedding(url, title)
  async clearCache()
}
```

## Performance Targets
- Model loading: < 10 seconds (first time)
- Embedding generation: < 50ms per tab
- Clustering 100 tabs: < 500ms
- Cache hit rate: > 80% for repeat tabs

## Testing Checklist
- [ ] Model downloads successfully
- [ ] Embeddings generated for tab titles
- [ ] Clustering produces meaningful groups
- [ ] Cache persists across sessions
- [ ] Worker doesn't block UI
- [ ] Memory usage stays reasonable
- [ ] Handles offline gracefully

## Integration Points
- Background.js: Call clustering in sort flow
- Popup.js: Show model loading progress
- Content.js: No changes needed
- Options.js: Model selection UI (Part 4)

## Next Steps (Part 3 Preview)
- Smart labeling for clusters
- Category prediction
- Content-based analysis
- Rule engine integration

## Dependencies to Add
```json
// No npm needed - load via CDN or bundle
<script src="https://cdn.jsdelivr.net/npm/@xenova/transformers@2.x.x"></script>
```

## Memory Considerations
- Small model: ~50MB RAM
- Medium model: ~100MB RAM  
- Large model: ~500MB RAM
- Monitor via Performance API

## Troubleshooting
- CORS issues: Use bundled version
- Slow loading: Try smaller model
- OOM errors: Reduce batch size
- Worker errors: Check CSP policy
