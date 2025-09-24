# AI Tab Sorter Extension - Project Structure

## 5-Part Development Plan

### Part 1: Extension Foundation & Core Infrastructure
**Deliverables:**
- manifest.json with all permissions
- Background service worker scaffold
- Basic popup UI
- Content script injection system
- Message passing infrastructure
- Storage initialization

**Files:**
- manifest.json
- background.js (service worker)
- popup/popup.html, popup.js, popup.css
- content/content.js
- utils/messaging.js

### Part 2: AI/ML Engine Setup
**Deliverables:**
- Transformers.js integration
- Model loading and caching system
- Embedding generation pipeline
- Clustering algorithms (DBSCAN/HDBSCAN)
- IndexedDB for embedding cache

**Files:**
- ai/embeddings.js
- ai/clustering.js
- ai/model-loader.js
- storage/cache-manager.js

### Part 3: Tab Analysis & Categorization Logic
**Deliverables:**
- Tab data collection system
- Content extraction from pages
- Category generation algorithms
- Rule-based categorization overlay
- Smart labeling system

**Files:**
- core/tab-analyzer.js
- core/categorizer.js
- core/rules-engine.js
- data/default-categories.json

### Part 4: UI & Settings System
**Deliverables:**
- Settings page with category management
- Visual feedback system
- Tab preview before sorting
- Custom rule creation interface
- Import/export settings

**Files:**
- options/options.html, options.js, options.css
- components/category-editor.js
- components/preview-modal.js
- styles/common.css

### Part 5: Integration & Optimization
**Deliverables:**
- Tab movement orchestration
- Window/group management
- Performance optimizations
- Batch processing system
- Error handling and recovery
- Auto-sort scheduling

**Files:**
- core/orchestrator.js
- core/scheduler.js
- utils/performance.js
- utils/error-handler.js

## Tech Stack per Part

### Part 1 Tech Stack:
- Chrome Extension Manifest V3
- Chrome APIs: tabs, storage, runtime, windows, tabGroups
- Vanilla JavaScript ES6+

### Part 2 Tech Stack:
- Transformers.js v2.x
- ML.js for clustering
- IndexedDB API
- Web Workers for background processing

### Part 3 Tech Stack:
- Chrome Scripting API
- DOM parsing utilities
- JSON for rule definitions

### Part 4 Tech Stack:
- HTML5/CSS3
- Chrome Storage Sync API
- Custom Elements (optional)

### Part 5 Tech Stack:
- Chrome Alarms API for scheduling
- Performance API for monitoring
- Chrome Runtime messaging

## Development Order
1. Start with Part 1 for foundation
2. Part 2 can be developed in parallel or separately
3. Part 3 depends on Parts 1 & 2
4. Part 4 can be started after Part 1
5. Part 5 integrates everything

## Model Recommendations
Since quality is priority and size isn't a concern:
- Primary: sentence-transformers/all-mpnet-base-v2 (Better quality, 420MB)
- Alternative: Xenova/all-MiniLM-L6-v2 (Balanced, 23MB)
- Fallback: Xenova/all-distilroberta-v1 (Good quality, 290MB)
