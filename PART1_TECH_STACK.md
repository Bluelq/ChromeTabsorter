# PART 1: Extension Foundation & Core Infrastructure

## Objective
Create the Chrome extension foundation with all necessary permissions, message passing infrastructure, and basic UI scaffolding.

## Tech Stack
- **Chrome Extension Manifest V3**
- **Chrome APIs Required:**
  - tabs (access tab information)
  - tabGroups (create/manage tab groups)
  - storage (save settings)
  - windows (manage browser windows)
  - scripting (inject content scripts)
  - activeTab (access current tab)
  - host_permissions: <all_urls> (for content extraction)
- **JavaScript ES6+** (no transpilation needed)
- **HTML5/CSS3** for popup and options

## File Structure for Part 1
```
tab-sorter-extension/
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   └── content.js
├── utils/
│   └── messaging.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Key Implementations

### 1. Manifest Configuration
- Service worker setup for background processing
- Content script injection configuration
- Permission declarations for all needed APIs
- Action (popup) configuration

### 2. Background Service Worker
- Message routing system
- Tab event listeners
- Storage initialization
- Command registration (keyboard shortcuts)

### 3. Popup Interface
- Quick action buttons (Sort Now, Settings)
- Current tab count display
- Last sort status
- Connection to background worker

### 4. Content Script
- Page content extraction capability
- Meta tag reading
- Title and description extraction
- Message passing to background

### 5. Messaging Infrastructure
- Centralized message types definition
- Promise-based message passing
- Error handling wrapper
- Type safety helpers

## Communication Flow
1. **Popup → Background**: User triggers sort action
2. **Background → Content**: Request page data
3. **Content → Background**: Return extracted data
4. **Background → Storage**: Save state and settings
5. **Background → Tabs API**: Execute sorting

## Storage Schema
```javascript
{
  settings: {
    sortMode: 'windows' | 'groups',
    autoSort: boolean,
    minGroupSize: number,
    lastSortTime: timestamp
  },
  stats: {
    totalSorts: number,
    tabsProcessed: number
  }
}
```

## Message Types
```javascript
const MessageTypes = {
  SORT_TABS: 'SORT_TABS',
  GET_TAB_DATA: 'GET_TAB_DATA',
  TAB_DATA_RESPONSE: 'TAB_DATA_RESPONSE',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  GET_STATS: 'GET_STATS'
}
```

## Success Criteria
- Extension loads without errors
- Popup opens and displays UI
- Can access all tabs information
- Message passing works between components
- Storage read/write functional
- Content script injects successfully

## Testing Checklist
- [ ] Extension installs in Chrome
- [ ] Popup opens on icon click
- [ ] Background worker stays persistent
- [ ] Can read tab titles and URLs
- [ ] Messages pass between popup and background
- [ ] Content script extracts page data
- [ ] Settings persist in storage
- [ ] No permission errors in console

## Next Steps (Part 2 Preview)
Once Part 1 is complete, Part 2 will add:
- AI model loading system
- Embedding generation for tab titles
- Caching infrastructure
- Clustering algorithms

## Notes for Separate Session
If implementing this part in a new chat session:
1. Reference this document for requirements
2. Create all files in the specified structure
3. Test the extension installation first
4. Verify all permissions are granted
5. Ensure message passing works before proceeding
