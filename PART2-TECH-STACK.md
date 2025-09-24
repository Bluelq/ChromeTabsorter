# Part 2: AI Model Integration - Tech Stack (Preview)

## What Part 2 Will Add

### Core Components
1. **Transformers.js Integration**
   - All-MiniLM-L6-v2 model for semantic embeddings
   - ~30MB model download (cached locally)
   - Runs entirely in browser

2. **Web Worker Architecture**
   - `ai-worker.js` - Offload AI processing
   - Non-blocking UI during embedding generation
   - Message passing for async operations

3. **Model Management**
   - `model-loader.js` - Handle model initialization
   - Progress indicators during first load
   - Caching in browser storage

### Files to Create
```
tab-sorter-extension/
├── ai/
│   ├── ai-worker.js        # Web Worker for AI processing
│   ├── model-loader.js     # Model initialization
│   └── embeddings.js       # Embedding generation logic
├── lib/
│   └── transformers.min.js # Transformers.js library
└── background-ai.js        # Updated background with AI
```

### Key Features
- Generate embeddings for tab titles + URLs
- Calculate cosine similarity between tabs
- Replace domain grouping with semantic clustering
- Cache embeddings for performance

### APIs & Libraries
- **Transformers.js** v2.x
- **Web Workers API**
- **IndexedDB** for model caching
- **Chrome OffscreenDocument** (if needed)

### Sample Code Preview
```javascript
// In ai-worker.js
import { pipeline } from './transformers.min.js';

let embedder = null;

async function initModel() {
  embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2'
  );
}

async function generateEmbedding(text) {
  const output = await embedder(text);
  return Array.from(output.data);
}
```

## To Start Part 2
Share this message in a new chat:
"Please implement Part 2: AI Model Integration for the TabSorter extension located at C:\Aentic\tab-sorter-extension. Add Transformers.js with all-MiniLM-L6-v2 model for semantic tab grouping."
