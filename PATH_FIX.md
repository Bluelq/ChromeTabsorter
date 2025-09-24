# TabSorter AI - Path Fix Applied

## What Was Fixed

### The Issue
- Model files were in `ai/models/Xenova/all-MiniLM-L6-v2/`
- Code was looking in `ai/models/`
- This caused "Failed to load model data" error

### The Solution
Updated `background.js` to use the correct path:
```javascript
// OLD (incorrect):
const modelPath = chrome.runtime.getURL('ai/models/');

// NEW (correct):
const modelPath = chrome.runtime.getURL('ai/models/Xenova/all-MiniLM-L6-v2/');
```

## Test the Fix

### 1. Reload the Extension
1. Go to `chrome://extensions/`
2. Click the reload button (↻) on TabSorter AI

### 2. Check Service Worker Console
1. Click "service worker" link on the extension
2. Look for these messages:
   - "Loading model data in background..."
   - "Model data loaded successfully in background"
   - "AI offscreen document ready with model data"

### 3. Quick Test
In the service worker console, run:
```javascript
// Test if model can be loaded
(async () => {
    const url = chrome.runtime.getURL('ai/models/Xenova/all-MiniLM-L6-v2/config.json');
    const response = await fetch(url);
    const config = await response.json();
    console.log('Model type:', config.model_type);
    console.log('Hidden size:', config.hidden_size);
})();
```

Should output:
- Model type: "bert" (or similar)
- Hidden size: 384

### 4. Test Tab Sorting
1. Open various tabs
2. Click extension icon
3. Make sure "AI Semantic Grouping" is ON
4. Click "Sort Tabs Now"

## Expected Results

✅ **No more "Failed to load model data" error**
✅ **Model files load successfully**
✅ **AI initializes within 30 seconds**
✅ **Tabs group semantically**

## Status

The path issue is fixed. The extension should now:
1. Load model configuration files correctly
2. Pass them to the offscreen document
3. Initialize AI successfully
4. Enable semantic tab grouping

---

**Note:** We're still using simplified embeddings (not the actual ONNX model), but the initialization should work now!
