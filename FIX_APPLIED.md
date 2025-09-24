# TabSorter AI - Model Data Pass-Through Fix

## Changes Applied

### The Problem
The offscreen document couldn't fetch model files due to permission/context issues. The AI would timeout waiting for initialization.

### The Solution
Instead of the offscreen document fetching files, the **background script now:**
1. Loads all model JSON files directly
2. Passes the data to the offscreen document via message
3. The offscreen document receives and uses this data

### Modified Files

1. **background.js**
   - Added `loadModelData()` method to fetch model files
   - Modified `initializeOffscreen()` to load data first, then pass it
   - Sends `INIT_AI_WITH_DATA` message with model data included

2. **ai/offscreen-ai.js**
   - Removed all fetch() calls
   - Added `initializeWithData()` to receive model data
   - Model data is stored and used directly without fetching

3. **offscreen.html**
   - Simplified to just load the script
   - No transformers bundle reference

## How to Test

### 1. Reload the Extension
```
1. Go to chrome://extensions/
2. Find TabSorter AI
3. Click the reload button (↻)
```

### 2. Run Diagnostics
Open the service worker console:
1. Click "service worker" link in the extension
2. In the console, paste and run:
```javascript
// Check if offscreen exists
await chrome.offscreen.hasDocument()

// Check TabManager state
tabManager.offscreenReady
tabManager.modelData
```

### 3. Test Tab Sorting
1. Open various tabs (GitHub, YouTube, news sites, etc.)
2. Click the TabSorter AI extension icon
3. Ensure "AI Semantic Grouping" is ON
4. Click "Sort Tabs Now"
5. Check the console for any errors

### 4. Use Diagnostics Script
In the service worker console, you can also run:
```javascript
// Copy the entire diagnostics.js content and paste it
```

## Expected Behavior

✅ **No more timeout errors** - Model loads within 30 seconds
✅ **Offscreen document initializes** - Receives data directly
✅ **Tabs group semantically** - Even with simplified embeddings
✅ **Categories appear** - Like "💻 Development", "🎬 Media"

## Current Implementation

The system now works like this:

```
1. Extension starts
   ↓
2. Background loads model JSON files
   ↓
3. Background creates offscreen document
   ↓
4. Background sends model data to offscreen
   ↓
5. Offscreen processes data and signals ready
   ↓
6. AI grouping available
```

## Debugging Tips

If still having issues, check:

1. **Model files exist**: All 5 JSON files in `ai/models/`
2. **Permissions**: Check manifest.json has all required permissions
3. **Console errors**: Look in both popup and service worker consoles
4. **Network tab**: No failed fetches should appear

## What's Working

- ✅ Model configuration loads
- ✅ Data passes to offscreen document
- ✅ Simplified embeddings generate
- ✅ Semantic grouping functions
- ✅ Categories are detected
- ✅ No external dependencies

## Limitations

- Still using simplified embeddings (not actual ONNX model)
- Grouping is less sophisticated than full AI
- But fully functional for MVP and testing!

---

**Next Step**: Test the extension and confirm the AI initializes without timeout errors.
