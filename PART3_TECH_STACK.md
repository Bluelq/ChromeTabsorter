# PART 3: Tab Analysis & Categorization Logic

## Objective
Implement intelligent categorization using embeddings from Part 2, adding smart labeling, rule engines, and content analysis.

## Prerequisites
- Part 1 & 2 complete and tested
- Embedding generation working
- Clustering algorithm functional

## Tech Stack
- **Core JavaScript** - Categorization algorithms
- **Chrome Scripting API** - Enhanced content extraction
- **JSON Rule Engine** - Custom categorization rules
- **Statistical Analysis** - TF-IDF for keywords

## File Structure for Part 3
```
tab-sorter-extension/
├── core/
│   ├── tab-analyzer.js       # Deep tab analysis
│   ├── categorizer.js        # Smart categorization
│   ├── rules-engine.js       # Rule-based overrides
│   └── label-generator.js    # Cluster labeling
├── data/
│   ├── default-categories.json
│   ├── domain-mappings.json
│   └── keyword-patterns.json
└── analysis/
    └── content-analyzer.js   # Page content analysis
```

## Key Implementations

### 1. Tab Analysis Pipeline
```javascript
// Full analysis flow
TabData → Content Extraction → Feature Engineering → 
Embedding → Clustering → Labeling → Rule Application → Final Categories
```

### 2. Smart Categorization Features
- **Multi-signal approach:**
  - URL patterns
  - Page title analysis
  - Meta tags
  - Content keywords
  - Domain reputation
  - Time patterns

### 3. Category Generation Strategies

#### A. Zero-shot Classification
```javascript
const categories = [
  'Work', 'Research', 'Shopping', 'Entertainment',
  'Social', 'News', 'Documentation', 'Finance'
];
// Match tabs to predefined categories using embeddings
```

#### B. Cluster Labeling
- Extract top keywords from cluster
- Find common domains
- Generate descriptive labels
- Use TF-IDF for relevance

#### C. Hybrid Approach
- Start with zero-shot
- Refine with clustering
- Override with rules

### 4. Rule Engine System
```javascript
{
  "rules": [
    {
      "id": "github-dev",
      "condition": {
        "domain": "github.com",
        "urlPattern": "/issues|/pull"
      },
      "action": {
        "category": "Development",
        "priority": 100
      }
    },
    {
      "id": "shopping-cart",
      "condition": {
        "keywords": ["cart", "checkout", "order"],
        "confidence": 0.7
      },
      "action": {
        "category": "Shopping"
      }
    }
  ]
}
```

### 5. Content Analysis
- Extract semantic information
- Identify content type (article, video, forum)
- Detect language
- Find key entities
- Calculate reading time

## Advanced Features

### 1. Temporal Patterns
- Group by access time
- Detect work hours patterns
- Session-based grouping

### 2. Relationship Detection
- Parent-child tabs
- Cross-references
- Sequential browsing patterns

### 3. Smart Merging
- Combine small clusters
- Split large clusters
- Rebalance groups

### 4. Quality Scoring
```javascript
// Score each categorization
{
  category: "Research",
  confidence: 0.92,
  signals: {
    embedding: 0.85,
    domain: 1.0,
    content: 0.88,
    rules: 0.95
  }
}
```

## Implementation Steps

### Step 1: Enhanced Content Extraction
- Improve content script
- Extract more signals
- Handle special cases (PDFs, videos)

### Step 2: Feature Engineering
- Create feature vectors
- Normalize signals
- Weight importance

### Step 3: Category Prediction
- Implement zero-shot classifier
- Create fallback strategies
- Handle edge cases

### Step 4: Label Generation
- TF-IDF implementation
- Keyword extraction
- Label quality scoring

### Step 5: Rule Engine
- Rule parser
- Condition evaluator
- Priority resolution
- Conflict handling

## Default Categories Schema
```javascript
{
  "categories": [
    {
      "id": "work",
      "name": "Work",
      "color": "blue",
      "keywords": ["jira", "slack", "confluence"],
      "domains": ["*.company.com"],
      "embeddings": [], // Pre-computed
      "priority": 90
    }
  ]
}
```

## Performance Optimization
- Parallel processing
- Incremental updates
- Lazy evaluation
- Result caching

## Testing Scenarios
- [ ] 100+ tabs from various domains
- [ ] Single domain with many pages
- [ ] Mixed content types
- [ ] Foreign language pages
- [ ] Technical documentation
- [ ] Social media tabs
- [ ] Shopping sessions
- [ ] Research sessions

## Quality Metrics
- Categorization accuracy
- User satisfaction (implicit)
- Processing speed
- Memory efficiency

## Integration Points
- Background.js: Replace simple categorization
- AI module: Use embeddings
- Storage: Save user feedback
- UI: Show confidence scores

## Next Steps (Part 4 Preview)
- User customization UI
- Category editor
- Rule builder
- Visual feedback

## Algorithm Pseudocode
```
1. Collect all tab data
2. Extract features from each tab
3. Generate embeddings
4. Cluster tabs (DBSCAN)
5. For each cluster:
   a. Generate label from keywords
   b. Find best matching category
   c. Apply confidence threshold
6. Apply user rules (override)
7. Merge small clusters
8. Return categorized tabs
```

## Edge Cases
- New/blank tabs
- Chrome internal pages
- Local files
- Error pages
- Duplicate tabs
- Foreign languages
- Adult content (filter)
