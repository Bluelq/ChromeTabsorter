// background.js - Fixed version without module imports
// TabSorter AI v1.1 - Complete working implementation

class TabSorterBackground {
  constructor() {
    this.isProcessing = false;
    this.categories = [];
    this.init();
  }

  async init() {
    console.log('TabSorter AI v1.1 initializing...');
    
    // Load default categories
    await this.loadCategories();
    
    // Set up message listeners
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
    
    // Set up context menu
    this.setupContextMenu();
    
    // Set up tab listeners for auto-grouping
    this.setupTabListeners();
    
    // Set up alarm for periodic categorization
    chrome.alarms.create('autoCategories', { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'autoCategories') {
        this.performAutoGrouping();
      }
    });
    
    // Set up command handlers for keyboard shortcuts
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
    });
    
    console.log('TabSorter AI initialized successfully');
  }

  async loadCategories() {
    try {
      const response = await fetch(chrome.runtime.getURL('data/default-categories.json'));
      if (response.ok) {
        this.categories = await response.json();
      } else {
        this.categories = this.getDefaultCategories();
      }
    } catch (error) {
      console.log('Using built-in categories');
      this.categories = this.getDefaultCategories();
    }
  }

  getDefaultCategories() {
    return [
      {
        id: 'work',
        name: 'Work & Productivity',
        keywords: ['work', 'office', 'meeting', 'project', 'task'],
        domains: ['slack.com', 'teams.microsoft.com', 'zoom.us', 'notion.so']
      },
      {
        id: 'development',
        name: 'Development & Code',
        keywords: ['code', 'github', 'programming', 'api', 'development'],
        domains: ['github.com', 'stackoverflow.com', 'gitlab.com', 'codepen.io']
      },
      {
        id: 'shopping',
        name: 'Shopping & E-commerce',
        keywords: ['shop', 'buy', 'cart', 'price', 'product'],
        domains: ['amazon.', 'ebay.', 'etsy.com', 'walmart.']
      },
      {
        id: 'social',
        name: 'Social Media',
        keywords: ['social', 'friend', 'post', 'share', 'like'],
        domains: ['facebook.com', 'twitter.com', 'instagram.com', 'reddit.com']
      },
      {
        id: 'entertainment',
        name: 'Entertainment & Media',
        keywords: ['watch', 'video', 'movie', 'music', 'stream'],
        domains: ['youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv']
      },
      {
        id: 'news',
        name: 'News & Articles',
        keywords: ['news', 'article', 'breaking', 'report', 'latest'],
        domains: ['cnn.com', 'bbc.', 'nytimes.com', 'reuters.com']
      },
      {
        id: 'research',
        name: 'Research & Learning',
        keywords: ['research', 'study', 'learn', 'education', 'course'],
        domains: ['wikipedia.org', 'scholar.google.com', 'coursera.org']
      },
      {
        id: 'other',
        name: 'Other',
        keywords: [],
        domains: []
      }
    ];
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      console.log('Handling message:', request.action);
      
      switch (request.action) {
        case 'analyzeTabs':
          const analysis = await this.analyzeTabs(request.tabs, request.settings);
          sendResponse(analysis);
          break;
          
        case 'sortTabs':
          const result = await this.sortTabs(request.tabs, request.settings);
          sendResponse(result);
          break;
          
        case 'getCategorizationPreview':
          const preview = await this.getCategorizationPreview(request.tabs, request.settings);
          sendResponse({ preview });
          break;
          
        case 'applyPreviewChanges':
          const applyResult = await this.applyPreviewChanges(request.changes, request.settings);
          sendResponse(applyResult);
          break;
          
        case 'getCategoriesStats':
          const stats = await this.getCategoriesStats();
          sendResponse(stats);
          break;
          
        default:
          sendResponse({ error: 'Unknown action: ' + request.action });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async handleCommand(command) {
    switch (command) {
      case 'sort_tabs':
        await this.sortTabs(null, await this.getSettings());
        break;
      case 'preview_changes':
        chrome.action.openPopup();
        break;
    }
  }

  async analyzeTabs(tabs = null, settings = {}) {
    if (!tabs) {
      tabs = await chrome.tabs.query({ currentWindow: true });
    }
    
    // Filter out chrome:// and other system tabs
    tabs = tabs.filter(tab => 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('edge://') &&
      !tab.url.startsWith('brave://') &&
      !tab.url.startsWith('about:')
    );
    
    // Preserve pinned tabs if setting is enabled
    if (settings.preservePinned) {
      tabs = tabs.filter(tab => !tab.pinned);
    }
    
    // Apply different analysis depth based on settings
    let result;
    switch (settings.analysisDepth) {
      case 'quick':
        result = await this.quickAnalysis(tabs, settings);
        break;
      case 'deep':
        result = await this.deepAnalysis(tabs, settings);
        break;
      default: // 'standard'
        result = await this.standardAnalysis(tabs, settings);
    }
    
    // Apply partial grouping filtering if enabled
    if (settings.partialGrouping) {
      const filtered = this.filterPartialGroups(result.categorized, result.stats, settings);
      result.categorized = filtered.categorized;
      result.stats = filtered.stats;
    }
    
    return result;
  }

  async quickAnalysis(tabs, settings) {
    // Quick analysis - URL patterns only
    const categorized = {};
    const stats = {
      totalTabs: tabs.length,
      categorized: 0,
      uncategorized: 0,
      duplicates: 0,
      avgConfidence: 0,
      groupsFormed: 0
    };
    
    // Group by domain quickly
    const domainGroups = new Map();
    
    for (const tab of tabs) {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname.replace('www.', '');
        
        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain).push(tab);
        
        // Check for duplicates
        if (tabs.filter(t => t.url === tab.url).length > 1) {
          stats.duplicates++;
        }
      } catch {
        // Invalid URL
      }
    }
    
    // Convert domain groups to categories
    for (const [domain, domainTabs] of domainGroups) {
      if (domainTabs.length >= (settings.minGroupSize || 2)) {
        const groupName = this.formatDomainName(domain);
        categorized[groupName] = domainTabs;
        stats.categorized += domainTabs.length;
        stats.groupsFormed++;
        stats.avgConfidence += 0.9;
      } else {
        stats.uncategorized += domainTabs.length;
      }
    }
    
    if (stats.groupsFormed > 0) {
      stats.avgConfidence /= stats.groupsFormed;
    }
    
    return { categorized, stats };
  }

  async standardAnalysis(tabs, settings) {
    // Standard analysis - URL + Title
    const categorized = {};
    const uncategorized = [];
    const stats = {
      totalTabs: tabs.length,
      categorized: 0,
      uncategorized: 0,
      duplicates: 0,
      avgConfidence: 0,
      groupsFormed: 0
    };
    
    // Analyze each tab
    for (const tab of tabs) {
      const category = this.categorizeTab(tab);
      
      if (category && category.name !== 'other') {
        if (!categorized[category.name]) {
          categorized[category.name] = [];
        }
        categorized[category.name].push(tab);
        stats.avgConfidence += category.confidence;
      } else {
        uncategorized.push(tab);
      }
      
      // Check for duplicates
      if (tabs.filter(t => t.url === tab.url).length > 1) {
        stats.duplicates++;
      }
    }
    
    // Try to group uncategorized tabs by common patterns
    const domainGroups = this.groupByDomain(uncategorized);
    for (const [domain, domainTabs] of Object.entries(domainGroups)) {
      if (domainTabs.length >= (settings.minGroupSize || 2)) {
        const groupName = this.deriveGroupName(domainTabs, domain);
        categorized[groupName] = domainTabs;
      }
    }
    
    // Calculate stats
    stats.categorized = Object.values(categorized).reduce((sum, group) => sum + group.length, 0);
    stats.uncategorized = tabs.length - stats.categorized;
    stats.groupsFormed = Object.keys(categorized).length;
    
    if (stats.groupsFormed > 0) {
      stats.avgConfidence /= stats.categorized;
    }
    
    return { categorized, stats };
  }

  async deepAnalysis(tabs, settings) {
    // Deep analysis - Enhanced pattern matching
    const result = await this.standardAnalysis(tabs, settings);
    
    // Apply enhanced keyword analysis
    const uncategorizedTabs = tabs.filter(tab => {
      return !Object.values(result.categorized).some(group => 
        group.some(t => t.id === tab.id)
      );
    });
    
    if (uncategorizedTabs.length > 0) {
      const enhancedGroups = this.performEnhancedGrouping(uncategorizedTabs);
      Object.assign(result.categorized, enhancedGroups);
      
      // Update stats
      result.stats.categorized = Object.values(result.categorized).reduce((sum, group) => sum + group.length, 0);
      result.stats.uncategorized = tabs.length - result.stats.categorized;
      result.stats.groupsFormed = Object.keys(result.categorized).length;
    }
    
    return result;
  }

  categorizeTab(tab) {
    let bestMatch = null;
    let highestConfidence = 0;
    
    const urlLower = tab.url.toLowerCase();
    const titleLower = tab.title.toLowerCase();
    
    for (const category of this.categories) {
      let confidence = 0;
      
      // Check domain matches
      for (const domain of category.domains || []) {
        if (urlLower.includes(domain.toLowerCase())) {
          confidence = Math.max(confidence, 0.9);
          break;
        }
      }
      
      // Check keyword matches
      let keywordMatches = 0;
      for (const keyword of category.keywords || []) {
        if (titleLower.includes(keyword.toLowerCase()) || urlLower.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      }
      
      if (keywordMatches > 0) {
        confidence = Math.max(confidence, 0.5 + (keywordMatches * 0.1));
      }
      
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = {
          name: category.name || category.id,
          id: category.id,
          confidence: confidence
        };
      }
    }
    
    return bestMatch;
  }

  groupByDomain(tabs) {
    const groups = {};
    
    for (const tab of tabs) {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname.replace('www.', '');
        
        if (!groups[domain]) {
          groups[domain] = [];
        }
        groups[domain].push(tab);
      } catch {
        // Invalid URL
      }
    }
    
    return groups;
  }

  performEnhancedGrouping(tabs) {
    const groups = {};
    const keywordMap = new Map();
    
    // Extract and count keywords across all tabs
    for (const tab of tabs) {
      const keywords = this.extractKeywords(tab);
      for (const keyword of keywords) {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, []);
        }
        keywordMap.get(keyword).push(tab);
      }
    }
    
    // Create groups based on common keywords
    for (const [keyword, keywordTabs] of keywordMap) {
      if (keywordTabs.length >= 3) {
        const groupName = this.capitalizeWords(keyword) + ' Related';
        groups[groupName] = keywordTabs;
      }
    }
    
    return groups;
  }

  extractKeywords(tab) {
    const keywords = new Set();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    // Extract from title
    const titleWords = tab.title.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    titleWords.forEach(word => {
      if (!stopWords.has(word)) {
        keywords.add(word);
      }
    });
    
    // Extract from URL path
    try {
      const url = new URL(tab.url);
      const pathWords = url.pathname.split(/[\/\-\_\.]/).filter(w => w.length > 3);
      pathWords.forEach(word => keywords.add(word.toLowerCase()));
    } catch {
      // Invalid URL
    }
    
    return Array.from(keywords);
  }

  deriveGroupName(tabs, defaultName) {
    // Intelligent group naming based on tab content
    const titles = tabs.map(t => t.title.toLowerCase());
    const wordFrequency = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from']);
    
    titles.forEach(title => {
      const words = title.match(/\b[a-z]+\b/gi) || [];
      words.forEach(word => {
        const cleanWord = word.toLowerCase();
        if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
          wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
        }
      });
    });
    
    const sortedWords = Object.entries(wordFrequency)
      .filter(([word, count]) => count >= Math.min(2, Math.ceil(tabs.length * 0.3)))
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedWords.length > 0) {
      const topWords = sortedWords.slice(0, 2).map(([word]) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      );
      
      // Special case detection
      if (titles.some(t => t.includes('electricity') || t.includes('power') || t.includes('energy'))) {
        if (titles.some(t => t.includes('broker') || t.includes('trading'))) {
          return 'Energy Brokerage';
        }
        return 'Energy & Power';
      }
      
      if (topWords.length > 0) {
        return topWords.join(' ');
      }
    }
    
    // Format domain name as fallback
    return this.formatDomainName(defaultName);
  }

  formatDomainName(domain) {
    // Remove TLD and format nicely
    const parts = domain.split('.');
    const name = parts[0];
    return this.capitalizeWords(name.replace(/[-_]/g, ' '));
  }

  capitalizeWords(str) {
    return str.split(/[\s-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  filterPartialGroups(categorized, stats, settings) {
    const filtered = {};
    const newStats = { ...stats };
    const minConfidence = Math.max(0.8, settings.minConfidence || 0.8);
    const minGroupSize = settings.minGroupSize || 2;
    
    let totalCategorized = 0;
    let totalUncategorized = 0;
    
    for (const [category, tabs] of Object.entries(categorized)) {
      if (tabs.length < minGroupSize) {
        totalUncategorized += tabs.length;
        continue;
      }
      
      const groupConfidence = this.calculateGroupConfidence(tabs, category);
      
      if (groupConfidence >= minConfidence) {
        filtered[category] = tabs;
        totalCategorized += tabs.length;
      } else {
        totalUncategorized += tabs.length;
      }
    }
    
    newStats.categorized = totalCategorized;
    newStats.uncategorized = totalUncategorized;
    newStats.groupsFormed = Object.keys(filtered).length;
    
    return { categorized: filtered, stats: newStats };
  }

  calculateGroupConfidence(tabs, category) {
    if (!tabs || tabs.length === 0) return 0;
    
    const domains = tabs.map(tab => {
      try {
        return new URL(tab.url).hostname;
      } catch {
        return '';
      }
    });
    
    const uniqueDomains = [...new Set(domains)];
    const domainConsistency = 1 / uniqueDomains.length;
    
    const titles = tabs.map(t => t.title.toLowerCase());
    const commonWords = this.findCommonWords(titles);
    const titleSimilarity = Math.min(1, commonWords.length / 5);
    
    return (domainConsistency * 0.4 + titleSimilarity * 0.6);
  }

  findCommonWords(titles) {
    const wordFreq = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    titles.forEach(title => {
      const words = title.match(/\b[a-z]+\b/gi) || [];
      words.forEach(word => {
        const clean = word.toLowerCase();
        if (clean.length > 3 && !stopWords.has(clean)) {
          wordFreq[clean] = (wordFreq[clean] || 0) + 1;
        }
      });
    });
    
    return Object.entries(wordFreq)
      .filter(([word, count]) => count >= 2)
      .map(([word]) => word);
  }

  async sortTabs(tabsToSort = null, settings = {}) {
    if (this.isProcessing) {
      return { success: false, error: 'Already processing tabs' };
    }
    
    this.isProcessing = true;
    
    try {
      // If specific tabs provided, use those; otherwise get all tabs
      const tabs = tabsToSort || await chrome.tabs.query({ currentWindow: true });
      
      const analysis = await this.analyzeTabs(tabs, settings);
      
      if (Object.keys(analysis.categorized).length === 0) {
        this.isProcessing = false;
        return { success: false, error: 'No groups found to sort' };
      }
      
      // Apply sorting based on grouping mode
      if (settings.groupingMode === 'windows') {
        await this.sortIntoWindows(analysis.categorized);
      } else {
        await this.sortIntoGroups(analysis.categorized);
      }
      
      this.isProcessing = false;
      return { success: true, stats: analysis.stats };
      
    } catch (error) {
      this.isProcessing = false;
      console.error('Error sorting tabs:', error);
      return { success: false, error: error.message };
    }
  }

  async sortIntoGroups(categorized) {
    const currentWindow = await chrome.windows.getCurrent();
    
    for (const [category, tabs] of Object.entries(categorized)) {
      if (tabs.length === 0) continue;
      
      try {
        const tabIds = tabs.map(tab => tab.id);
        const group = await chrome.tabs.group({
          tabIds: tabIds,
          createProperties: {
            windowId: currentWindow.id
          }
        });
        
        await chrome.tabGroups.update(group, {
          title: category,
          color: this.getGroupColor(category),
          collapsed: false
        });
      } catch (error) {
        console.error('Error creating group for', category, error);
      }
    }
  }

  async sortIntoWindows(categorized) {
    const windows = [];
    
    for (const [category, tabs] of Object.entries(categorized)) {
      if (tabs.length === 0) continue;
      
      try {
        const newWindow = await chrome.windows.create({
          url: tabs[0].url,
          focused: false,
          state: 'normal'
        });
        
        windows.push(newWindow);
        
        for (let i = 1; i < tabs.length; i++) {
          await chrome.tabs.move(tabs[i].id, {
            windowId: newWindow.id,
            index: -1
          });
        }
      } catch (error) {
        console.error('Error creating window for', category, error);
      }
    }
    
    return windows;
  }

  getGroupColor(category) {
    const colors = {
      work: 'blue',
      shopping: 'red',
      social: 'purple',
      entertainment: 'orange',
      news: 'cyan',
      development: 'green',
      research: 'yellow',
      finance: 'pink',
      travel: 'grey',
      energy: 'blue',
      other: 'grey'
    };
    
    const categoryKey = category.toLowerCase().split(' ')[0];
    return colors[categoryKey] || 'grey';
  }

  async getCategorizationPreview(tabs = null, settings = {}) {
    const tabsToAnalyze = tabs || await chrome.tabs.query({ currentWindow: true });
    const analysis = await this.analyzeTabs(tabsToAnalyze, settings);
    
    return {
      groups: analysis.categorized,
      stats: analysis.stats,
      totalTabs: tabsToAnalyze.length
    };
  }

  async applyPreviewChanges(changes, settings) {
    try {
      if (settings.groupingMode === 'windows') {
        await this.sortIntoWindows(changes.groups);
      } else {
        await this.sortIntoGroups(changes.groups);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error applying changes:', error);
      return { success: false, error: error.message };
    }
  }

  async getCategoriesStats() {
    const tabs = await chrome.tabs.query({});
    const analysis = await this.analyzeTabs(tabs);
    
    const stats = {
      totalTabs: tabs.length,
      categories: {}
    };
    
    for (const [category, categoryTabs] of Object.entries(analysis.categorized)) {
      stats.categories[category] = {
        count: categoryTabs.length,
        percentage: (categoryTabs.length / tabs.length * 100).toFixed(1)
      };
    }
    
    return stats;
  }

  setupContextMenu() {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'sortCurrentTab',
        title: 'Sort this tab',
        contexts: ['page']
      });
      
      chrome.contextMenus.create({
        id: 'sortAllTabs',
        title: 'Sort all tabs',
        contexts: ['page']
      });
    });
    
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === 'sortCurrentTab') {
        await this.sortSingleTab(tab);
      } else if (info.menuItemId === 'sortAllTabs') {
        await this.sortTabs(null, await this.getSettings());
      }
    });
  }

  async sortSingleTab(tab) {
    const category = this.categorizeTab(tab);
    
    if (category && category.name !== 'other') {
      try {
        const groups = await chrome.tabGroups.query({ title: category.name });
        
        if (groups.length > 0) {
          await chrome.tabs.group({
            tabIds: [tab.id],
            groupId: groups[0].id
          });
        } else {
          const groupId = await chrome.tabs.group({
            tabIds: [tab.id]
          });
          
          await chrome.tabGroups.update(groupId, {
            title: category.name,
            color: this.getGroupColor(category.name)
          });
        }
      } catch (error) {
        console.error('Error sorting single tab:', error);
      }
    }
  }

  setupTabListeners() {
    chrome.tabs.onCreated.addListener(async (tab) => {
      const settings = await this.getSettings();
      if (settings.autoGroup) {
        setTimeout(() => {
          this.sortSingleTab(tab);
        }, 2000);
      }
    });
    
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        const settings = await this.getSettings();
        if (settings.autoGroup && !tab.pinned) {
          if (changeInfo.url) {
            this.sortSingleTab(tab);
          }
        }
      }
    });
  }

  async performAutoGrouping() {
    const settings = await this.getSettings();
    if (settings.autoGroup) {
      await this.sortTabs(null, settings);
    }
  }

  async getSettings() {
    const result = await chrome.storage.sync.get('settings');
    return result.settings || {
      autoGroup: false,
      smartMode: true,
      partialGrouping: false,
      minConfidence: 0.7,
      preservePinned: true,
      groupingMode: 'groups',
      minGroupSize: 2,
      analysisDepth: 'standard'
    };
  }
}

// Initialize the background script
const tabSorter = new TabSorterBackground();
console.log('TabSorter AI v1.1 - Background service started');