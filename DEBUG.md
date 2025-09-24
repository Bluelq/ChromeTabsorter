# TabSorter AI - Debug Guide

## Fixed Issues ✅

1. **Removed module type** from manifest.json (was causing service worker issues)
2. **Extracted inline styles** to popup.css (fixes CSP violations)
3. **Fixed display toggling** using CSS classes instead of inline styles

## Current Status

The extension should now work correctly once you:
1. Add the 3 required icon files (see icons/README.md)
2. Reload the extension in Chrome

## Testing Steps

1. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Find TabSorter AI
   - Click the refresh icon

2. **Check for Errors**:
   - Click "Details" under the extension
   - Look for "Errors" tab
   - If any errors, they'll be listed there

3. **Test Functionality**:
   - Open multiple tabs from different sites
   - Click extension icon
   - Should show tab count and potential groups
   - Click "Sort Tabs Now" button

## Common Issues & Solutions

### Icons Missing
- Extension won't load without icon files
- See `icons/README.md` for quick solutions

### Service Worker Not Loading
- Fixed by removing `"type": "module"` from manifest
- Make sure to reload extension after changes

### Popup Not Opening
- Check console for errors (F12 in popup)
- Ensure all files are present

### Tabs Not Sorting
- Check permissions in manifest
- Try disabling other tab management extensions
- Check browser console for errors

## Ready for Part 2?

Once the basic sorting works (groups tabs by domain), you're ready for Part 2 which adds:
- AI embeddings with Transformers.js
- Semantic similarity grouping
- Web Workers for background processing

To continue: "Implement Part 2: AI Model Integration for TabSorter in C:\Aentic\tab-sorter-extension"
