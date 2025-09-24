// TabSorter AI - Background Service Worker with AI Integration
// Part 2: Semantic tab grouping using Transformers.js

class TabManager {
  constructor() {
    this.tabs = [];
    this.groups = new Map();
    this.offscreenReady = false;
    this.aiMode = true; // Default value, will be updated from storage

    // Load the aiMode state from storage when the service worker starts
    chrome.storage.local.get('aiMode').then(result => {
      if (result.aiMode !== undefined) {
        this.aiMode = result.aiMode;
      }
    });
  }

  // Model data loading removed - full AI implementation loads models directly

  // Initialize offscreen document for full AI processing
  async initializeOffscreen() {
    // Check if the document already exists to avoid errors
    if (await chrome.offscreen.hasDocument()) {
      this.offscreenReady = true;
      console.log('Offscreen document already active.');
      return;
    }

    try {
      // Create the offscreen document
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['WORKERS'],
        justification: 'AI processing for tab grouping'
      });

      // Wait a moment for the document to load
      await new Promise(resolve => setTimeout(resolve, 100));

      // Wait for the AI model to signal it's ready (full AI implementation initializes itself)
      await new Promise((resolve, reject) => {
        const listener = (message) => {
          // Listen for 'ai:ready' for success
          if (message.type === 'ai:ready') {
            console.log('Received ai:ready signal from offscreen document.');
            chrome.runtime.onMessage.removeListener(listener);
            clearTimeout(timeoutId);
            resolve();
          } else if (message.type === 'ai:error') {
            // Listen for 'ai:error' for failure
            console.error('Received ai:error signal from offscreen document:', message);
            chrome.runtime.onMessage.removeListener(listener);
            clearTimeout(timeoutId);
            // Reject with a more informative error message
            const errorMessage = message.error || 'Unknown AI initialization error';
            const errorStage = message.stage || 'UNKNOWN_STAGE';
            reject(new Error(`AI initialization failed at stage ${errorStage}: ${errorMessage}`));
          }
        };

        const timeoutId = setTimeout(() => {
          chrome.runtime.onMessage.removeListener(listener);
          reject(new Error('AI model initialization timed out.'));
        }, 90000); // 90 seconds for full AI initialization

        chrome.runtime.onMessage.addListener(listener);
      });

      this.offscreenReady = true;
      console.log('AI offscreen document ready with full AI implementation');
    } catch (error) {
      console.error('Failed to create offscreen document:', error);
      this.aiMode = false;
      // Also save the fallback state to storage
      await chrome.storage.local.set({ aiMode: false });
    }
  }

  // Collect all tabs from all windows
  async collectAllTabs() {
    const windows = await chrome.windows.getAll({ populate: true });
    this.tabs = windows.flatMap(w => w.tabs);
    console.log(`Collected ${this.tabs.length} tabs from ${windows.length} windows`);
    return this.tabs;
  }

  // AI-powered semantic grouping
  async groupTabsWithAI() {
    await this.initializeOffscreen();

    if (!this.offscreenReady) {
      console.log('AI not ready, falling back to domain grouping');
      return this.groupTabsByDomain();
    }

    // Double-check that offscreen document still exists before sending message
    try {
      const hasDocument = await chrome.offscreen.hasDocument();
      if (!hasDocument) {
        console.log('Offscreen document no longer exists, reinitializing...');
        this.offscreenReady = false;
        await this.initializeOffscreen();
        if (!this.offscreenReady) {
          console.log('Failed to reinitialize offscreen, falling back to domain grouping');
          return this.groupTabsByDomain();
        }
      }
    } catch (error) {
      console.error('Error checking offscreen document status:', error);
      return this.groupTabsByDomain();
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'PROCESS_TABS',
        tabs: this.tabs,
        threshold: 0.45 // Similarity threshold (adjustable)
      });

      // Check for a valid response before accessing its properties
      if (!response) {
        throw new Error("No response from AI processor. It may have closed or crashed.");
      }

      if (!response.success) {
        throw new Error(response.error);
      }

      const formattedGroups = response.groups.map(group => ({
        label: group.label,
        tabs: group.tabs,
        count: group.tabs.length,
        confidence: group.confidence
      }));

      formattedGroups.sort((a, b) => {
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        return b.count - a.count;
      });

      console.log(`AI grouped ${this.tabs.length} tabs into ${formattedGroups.length} semantic groups`);
      return formattedGroups;

    } catch (error) {
      console.error('AI grouping failed:', error);

      // If message port closed, mark offscreen as not ready for next attempt
      if (error.message && error.message.includes('message port closed')) {
        console.log('Offscreen document crashed, will reinitialize on next attempt');
        this.offscreenReady = false;
      }

      return this.groupTabsByDomain();
    }
  }

  // Fallback: Basic domain-based grouping
  groupTabsByDomain() {
    const domainGroups = new Map();

    this.tabs.forEach(tab => {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname.replace('www.', '');

        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain).push(tab);
      } catch (e) {
        const protocol = tab.url.split(':')[0];
        if (!domainGroups.has(protocol)) {
          domainGroups.set(protocol, []);
        }
        domainGroups.get(protocol).push(tab);
      }
    });

    return Array.from(domainGroups.entries())
      .map(([domain, tabs]) => ({
        label: this.generateGroupLabel(domain, tabs),
        domain: domain,
        tabs: tabs,
        count: tabs.length
      }))
      .filter(group => group.count >= 2)
      .sort((a, b) => b.count - a.count);
  }

  generateGroupLabel(domain, tabs) {
    const labels = {
      'github.com': '💻 Development',
      'stackoverflow.com': '💻 Development',
      'google.com': '🔍 Search',
      'youtube.com': '🎥 Media',
      'twitter.com': '💬 Social',
      'linkedin.com': '💼 Professional',
      'reddit.com': '💬 Social',
      'docs.google.com': '📄 Documents',
      'mail.google.com': '📧 Email'
    };
    return labels[domain] || `🌐 ${domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)}`;
  }

  // Create tab groups in current window
  async createTabGroups(groupedTabs, targetWindowId = null) {
    try {
      if (!targetWindowId) {
        const currentWindow = await chrome.windows.getCurrent();
        targetWindowId = currentWindow.id;
      }

      const allTabIds = groupedTabs.flatMap(group => group.tabs.map(t => t.id));
      await chrome.tabs.move(allTabIds, { windowId: targetWindowId, index: -1 });

      for (const group of groupedTabs) {
        const tabIds = group.tabs.map(t => t.id);
        const groupId = await chrome.tabs.group({ tabIds, createProperties: { windowId: targetWindowId } });

        await chrome.tabGroups.update(groupId, {
          title: group.label,
          collapsed: false,
          color: this.getGroupColor(group.label)
        });
      }

      return { success: true, groupCount: groupedTabs.length };
    } catch (error) {
      console.error('Error creating tab groups:', error);
      return { success: false, error: error.message };
    }
  }

  getGroupColor(label) {
    if (label.includes('Development') || label.includes('💻')) return 'blue';
    if (label.includes('Social') || label.includes('💬')) return 'green';
    if (label.includes('Media') || label.includes('🎬') || label.includes('🎥')) return 'red';
    if (label.includes('Search') || label.includes('🔍')) return 'yellow';
    if (label.includes('Documentation') || label.includes('📚')) return 'purple';
    if (label.includes('Email') || label.includes('📧')) return 'orange';
    if (label.includes('Work') || label.includes('💼')) return 'cyan';
    if (label.includes('Shopping') || label.includes('🛒')) return 'pink';
    if (label.includes('News') || label.includes('📰')) return 'grey';
    if (label.includes('AI') || label.includes('🤖')) return 'purple';
    if (label.includes('Design') || label.includes('🎨')) return 'pink';
    if (label.includes('Research') || label.includes('🔬')) return 'blue';
    return 'grey';
  }

  // Alternative: Create separate windows instead of groups
  async createWindows(groupedTabs) {
    try {
      const windows = [];
      for (const group of groupedTabs) {
        const tabIds = group.tabs.map(t => t.id);
        const newWindow = await chrome.windows.create({
          tabId: tabIds[0],
          focused: false
        });
        if (tabIds.length > 1) {
          await chrome.tabs.move(tabIds.slice(1), {
            windowId: newWindow.id,
            index: -1
          });
        }
        windows.push({ windowId: newWindow.id, group: group.label });
      }
      return { success: true, windows };
    } catch (error) {
      console.error('Error creating windows:', error);
      return { success: false, error: error.message };
    }
  }
}

const tabManager = new TabManager();

chrome.runtime.onInstalled.addListener(async () => {
  console.log('TabSorter AI installed/updated - initializing AI...');
  await tabManager.initializeOffscreen();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'sort-tabs') {
    await sortTabs();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Skip internal AI messages
  if (request.type && request.type.startsWith('AI_')) {
    return; // Internal message for offscreen setup, handled elsewhere
  }

  if (request.action === 'sortTabs') {
    sortTabs(request.options || {}).then(sendResponse);
    return true; // Asynchronous response
  }

  if (request.action === 'getTabStats') {
    getTabStats().then(sendResponse);
    return true; // Asynchronous response
  }

  if (request.action === 'toggleAIMode') {
    tabManager.aiMode = request.enabled;
    // Persist the user's choice in storage
    chrome.storage.local.set({ aiMode: request.enabled }).then(() => {
        sendResponse({ aiMode: tabManager.aiMode });
    });
    return true; // Asynchronous response because storage is async
  }
});

async function sortTabs(options = {}) {
  console.log('Starting tab sort...');
  await tabManager.collectAllTabs();

  let grouped;
  try {
    grouped = tabManager.aiMode ?
      await tabManager.groupTabsWithAI() :
      tabManager.groupTabsByDomain();
  } catch (error) {
    console.error('Error during tab grouping:', error);
    // Fallback to domain grouping if AI fails
    grouped = tabManager.groupTabsByDomain();
  }

  const useWindows = options.useWindows || false;
  let result;
  try {
    if (useWindows) {
      result = await tabManager.createWindows(grouped);
    } else {
      result = await tabManager.createTabGroups(grouped);
    }
  } catch (error) {
    console.error('Error creating tab groups/windows:', error);
    result = { success: false, error: error.message };
  }

  return {
    ...result,
    totalTabs: tabManager.tabs.length,
    groupsCreated: grouped.length,
    groups: grouped.map(g => ({
      label: g.label,
      count: g.count,
      confidence: g.confidence
    })),
    aiMode: tabManager.aiMode
  };
}

async function getTabStats() {
  await tabManager.collectAllTabs();

  let grouped;
  try {
    grouped = tabManager.aiMode ?
      await tabManager.groupTabsWithAI() :
      tabManager.groupTabsByDomain();
  } catch (error) {
    console.error('Error getting tab stats:', error);
    // Fallback to domain grouping if AI fails
    grouped = tabManager.groupTabsByDomain();
  }

  return {
    totalTabs: tabManager.tabs.length,
    potentialGroups: grouped.length,
    groups: grouped.map(g => ({
      label: g.label,
      ...( 'domain' in g && { domain: g.domain }),
      count: g.count,
      confidence: g.confidence
    })),
    aiMode: tabManager.aiMode,
    offscreenReady: tabManager.offscreenReady
  };
}

console.log('TabSorter AI background service loaded (v2.0 with AI)');