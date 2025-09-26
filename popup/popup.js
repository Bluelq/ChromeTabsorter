// popup/popup.js - Fixed version without module imports

class TabSorterPopup {
  constructor() {
    this.tabs = [];
    this.selectedTabs = new Set();
    this.categories = [];
    this.settings = {};
    this.selectionMode = false;
    this.searchMode = false;
    this.searchResults = [];
    this.init();
  }

  async init() {
    console.log('TabSorter popup initializing...');
    await this.loadSettings();
    await this.loadCategories();
    await this.analyzeTabs();
    this.setupEventListeners();
    this.updateUI();
  }

  async loadSettings() {
    const result = await chrome.storage.sync.get('settings');
    this.settings = result.settings || {
      autoGroup: false,
      smartMode: true,
      partialGrouping: false,
      minConfidence: 0.7,
      preservePinned: true,
      groupingMode: 'groups', // Fixed from 'windows' to 'groups' as default
      analysisDepth: 'standard'
    };
  }

  async loadCategories() {
    const result = await chrome.storage.sync.get('categories');
    this.categories = result.categories || [];
    
    if (this.categories.length === 0) {
      try {
        const response = await fetch(chrome.runtime.getURL('data/default-categories.json'));
        if (response.ok) {
          const defaultCategories = await response.json();
          this.categories = defaultCategories;
        }
      } catch (error) {
        console.log('Using fallback categories');
        this.categories = this.getDefaultCategories();
      }
    }
  }

  getDefaultCategories() {
    return [
      { id: 'work', name: 'Work & Productivity', icon: '💼' },
      { id: 'shopping', name: 'Shopping', icon: '🛍️' },
      { id: 'social', name: 'Social Media', icon: '👥' },
      { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
      { id: 'news', name: 'News', icon: '📰' },
      { id: 'development', name: 'Development', icon: '💻' },
      { id: 'research', name: 'Research', icon: '🔬' },
      { id: 'other', name: 'Other', icon: '📌' }
    ];
  }

  async analyzeTabs(tabsToAnalyze = null) {
    try {
      const tabs = tabsToAnalyze || await chrome.tabs.query({ currentWindow: true });
      this.tabs = tabs;
      
      // Filter tabs based on selection mode
      const tabsForAnalysis = this.selectionMode && this.selectedTabs.size > 0
        ? tabs.filter(tab => this.selectedTabs.has(tab.id))
        : tabs;
      
      // Send tabs for analysis with AI depth setting
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeTabs',
        tabs: tabsForAnalysis,
        settings: {
          ...this.settings,
          analysisDepth: document.getElementById('analysisDepth')?.value || 'standard'
        }
      });
      
      if (response && response.categorized) {
        this.displayResults(response.categorized, response.stats);
      }
    } catch (error) {
      console.error('Error analyzing tabs:', error);
      this.showError('Failed to analyze tabs');
    }
  }

  // Search functionality
  searchTabs(query) {
    if (!query) {
      this.searchMode = false;
      this.searchResults = [];
      document.getElementById('searchResults').style.display = 'none';
      this.displayCurrentView();
      return;
    }
    
    this.searchMode = true;
    const queryLower = query.toLowerCase();
    
    // Search through tabs
    this.searchResults = this.tabs.filter(tab => {
      return tab.title.toLowerCase().includes(queryLower) ||
             tab.url.toLowerCase().includes(queryLower);
    });
    
    // Display search results
    this.displaySearchResults(this.searchResults);
  }

  displaySearchResults(results) {
    const searchResultsDiv = document.getElementById('searchResults');
    
    if (results.length === 0) {
      searchResultsDiv.innerHTML = '<div class="no-results">No tabs found</div>';
    } else {
      searchResultsDiv.innerHTML = `
        <div class="search-header">
          <span>${results.length} tabs found</span>
          <button id="groupSearchResultsBtn" class="text-btn primary">Group These Tabs</button>
        </div>
        <div class="search-tabs">
          ${results.map(tab => `
            <div class="search-tab-item" data-tab-id="${tab.id}">
              <img src="${tab.favIconUrl || '../icons/icon-16.png'}" class="tab-favicon" onerror="this.src='../icons/icon-16.png'">
              <span class="tab-title">${this.truncateText(tab.title, 50)}</span>
              <button class="tab-action-btn" data-action="focus" data-tab-id="${tab.id}">→</button>
            </div>
          `).join('')}
        </div>
      `;
      
      // Add event listener for grouping search results
      document.getElementById('groupSearchResultsBtn')?.addEventListener('click', () => {
        this.groupSearchResults();
      });
      
      // Add click handlers for individual tabs
      document.querySelectorAll('.tab-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tabId = parseInt(e.target.dataset.tabId);
          chrome.tabs.update(tabId, { active: true });
        });
      });
    }
    
    searchResultsDiv.style.display = 'block';
  }

  async groupSearchResults() {
    if (this.searchResults.length === 0) return;
    
    try {
      // Analyze just the search results
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeTabs',
        tabs: this.searchResults,
        settings: this.settings
      });
      
      if (response && response.categorized) {
        // Apply the grouping
        await chrome.runtime.sendMessage({
          action: 'sortTabs',
          tabs: this.searchResults,
          settings: this.settings
        });
        
        this.showNotification(`Grouped ${this.searchResults.length} search results`, 'success');
        
        // Clear search
        document.getElementById('searchInput').value = '';
        this.searchTabs('');
      }
    } catch (error) {
      console.error('Error grouping search results:', error);
      this.showError('Failed to group search results');
    }
  }

  // Tab selection mode
  toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;
    
    if (this.selectionMode) {
      this.showTabSelectionList();
      document.querySelector('.selection-mode-section').style.display = 'block';
      document.getElementById('groupsContainer').style.display = 'none';
      document.getElementById('sortBtnText').textContent = 'Sort Selected';
      document.getElementById('selectTabsBtn').classList.add('active');
    } else {
      this.hideTabSelectionList();
      document.querySelector('.selection-mode-section').style.display = 'none';
      document.getElementById('groupsContainer').style.display = 'block';
      document.getElementById('sortBtnText').textContent = 'Sort All Tabs';
      document.getElementById('selectTabsBtn').classList.remove('active');
      this.selectedTabs.clear();
      this.analyzeTabs(); // Re-analyze all tabs
    }
  }

  showTabSelectionList() {
    const listDiv = document.getElementById('tabSelectionList');
    
    listDiv.innerHTML = `
      <div class="tab-selection-header">
        <h3>Select tabs to organize:</h3>
      </div>
      <div class="tab-checkboxes">
        ${this.tabs.map(tab => `
          <label class="tab-checkbox-item" data-tab-id="${tab.id}">
            <input type="checkbox" class="tab-checkbox" data-tab-id="${tab.id}" 
                   ${this.selectedTabs.has(tab.id) ? 'checked' : ''}>
            <img src="${tab.favIconUrl || '../icons/icon-16.png'}" class="tab-favicon" onerror="this.src='../icons/icon-16.png'">
            <span class="tab-title">${this.truncateText(tab.title, 45)}</span>
          </label>
        `).join('')}
      </div>
    `;
    
    listDiv.style.display = 'block';
    
    // Add checkbox event listeners
    document.querySelectorAll('.tab-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const tabId = parseInt(e.target.dataset.tabId);
        if (e.target.checked) {
          this.selectedTabs.add(tabId);
        } else {
          this.selectedTabs.delete(tabId);
        }
        this.updateSelectionCount();
        
        // Re-analyze with selected tabs only
        if (this.selectedTabs.size > 0) {
          this.analyzeTabs();
        }
      });
    });
  }

  hideTabSelectionList() {
    document.getElementById('tabSelectionList').style.display = 'none';
  }

  updateSelectionCount() {
    document.querySelector('.selection-count').textContent = 
      `${this.selectedTabs.size} tabs selected`;
  }

  // Export to bookmarks
  async exportToBookmarks() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getCategorizationPreview',
        settings: this.settings
      });
      
      if (!response || !response.preview) {
        this.showError('No groups to export');
        return;
      }
      
      // Create a bookmark folder
      const dateStr = new Date().toISOString().split('T')[0];
      const rootFolder = await chrome.bookmarks.create({
        title: `TabSorter Export - ${dateStr}`
      });
      
      // Create subfolders for each group
      for (const [groupName, tabs] of Object.entries(response.preview.groups)) {
        const groupFolder = await chrome.bookmarks.create({
          parentId: rootFolder.id,
          title: groupName
        });
        
        // Add bookmarks for each tab
        for (const tab of tabs) {
          await chrome.bookmarks.create({
            parentId: groupFolder.id,
            title: tab.title,
            url: tab.url
          });
        }
      }
      
      this.showNotification('Tabs exported to bookmarks!', 'success');
    } catch (error) {
      console.error('Error exporting to bookmarks:', error);
      this.showError('Failed to export bookmarks');
    }
  }

  // Export session
  async exportSession() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getCategorizationPreview',
        settings: this.settings
      });
      
      if (!response || !response.preview) {
        this.showError('No groups to export');
        return;
      }
      
      // Create session data
      const sessionData = {
        version: '1.1.0',
        timestamp: new Date().toISOString(),
        groups: {},
        stats: response.preview.stats
      };
      
      // Convert tabs to exportable format
      for (const [groupName, tabs] of Object.entries(response.preview.groups)) {
        sessionData.groups[groupName] = tabs.map(tab => ({
          title: tab.title,
          url: tab.url,
          favicon: tab.favIconUrl
        }));
      }
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tabsorter-session-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showNotification('Session exported!', 'success');
    } catch (error) {
      console.error('Error exporting session:', error);
      this.showError('Failed to export session');
    }
  }

  displayResults(categorizedTabs, stats) {
    const groupsContainer = document.getElementById('groupsContainer');
    const statsDiv = document.getElementById('stats');
    
    // Update statistics
    statsDiv.innerHTML = `
      <div class="stat-grid">
        <div class="stat-item">
          <span class="stat-value">${this.selectionMode ? this.selectedTabs.size : this.tabs.length}</span>
          <span class="stat-label">${this.selectionMode ? 'Selected' : 'Total'} Tabs</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${Object.keys(categorizedTabs).length}</span>
          <span class="stat-label">Groups Found</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${Math.round((stats?.avgConfidence || 0) * 100)}%</span>
          <span class="stat-label">Avg Confidence</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats?.duplicates || 0}</span>
          <span class="stat-label">Duplicates</span>
        </div>
      </div>
    `;
    
    // Don't update groups view if in selection mode
    if (this.selectionMode) return;
    
    // Clear and populate groups container
    groupsContainer.innerHTML = '';
    
    // Display ALL categorized groups
    Object.entries(categorizedTabs).forEach(([category, tabs], index) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'category-group';
      groupDiv.dataset.category = category;
      groupDiv.dataset.tabIds = JSON.stringify(tabs.map(t => t.id));
      
      const groupName = this.deriveGroupName(tabs, category);
      
      groupDiv.innerHTML = `
        <div class="group-header clickable-group" data-index="${index}">
          <span class="group-icon">${this.getCategoryIcon(category)}</span>
          <span class="group-name">${groupName}</span>
          <span class="group-count">${tabs.length} tabs</span>
          <span class="group-action">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </span>
        </div>
        <div class="group-tabs" id="group-tabs-${index}" style="display: none;">
          ${tabs.slice(0, 5).map(tab => `
            <div class="tab-item" data-tab-id="${tab.id}">
              <img src="${tab.favIconUrl || '../icons/icon-16.png'}" alt="" class="tab-favicon" onerror="this.src='../icons/icon-16.png'">
              <span class="tab-title">${this.truncateText(tab.title, 40)}</span>
            </div>
          `).join('')}
          ${tabs.length > 5 ? `<div class="more-tabs">+${tabs.length - 5} more tabs</div>` : ''}
        </div>
      `;
      
      groupsContainer.appendChild(groupDiv);
      
      // Add click handler to navigate to group
      const groupHeader = groupDiv.querySelector('.group-header');
      groupHeader.addEventListener('click', () => this.handleGroupClick(tabs, groupName));
    });
    
    // Add custom scrollbar styles
    this.addScrollbarStyles();
  }

  displayCurrentView() {
    if (!this.searchMode && !this.selectionMode) {
      this.analyzeTabs();
    }
  }
  
  deriveGroupName(tabs, defaultCategory) {
    const titles = tabs.map(t => t.title.toLowerCase());
    const urls = tabs.map(t => t.url);
    
    const wordFrequency = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from', 'up', 'about', 'into', 'through', 'during', 'how', 'all', 'would', 'should', 'could', 'be', 'is', 'are', 'was', 'were', 'been', '|', '-', '–', '—']);
    
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
    
    const domains = urls.map(url => {
      try {
        return new URL(url).hostname.replace('www.', '');
      } catch {
        return '';
      }
    });
    
    const uniqueDomains = [...new Set(domains)];
    if (uniqueDomains.length === 1 && uniqueDomains[0]) {
      const domain = uniqueDomains[0];
      const domainName = domain.split('.')[0];
      return domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }
    
    return defaultCategory;
  }
  
  handleGroupClick(tabs, groupName) {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true }, () => {
        if (this.settings.highlightGroups !== false) {
          chrome.tabs.highlight({
            tabs: tabs.map(t => t.index),
            windowId: tabs[0].windowId
          });
        }
        this.showNotification(`Navigated to "${groupName}" group (${tabs.length} tabs)`, 'success');
      });
    }
  }
  
  addScrollbarStyles() {
    if (!document.getElementById('scrollbar-styles')) {
      const style = document.createElement('style');
      style.id = 'scrollbar-styles';
      style.textContent = `
        .groups-scroll-container::-webkit-scrollbar {
          width: 8px;
        }
        .groups-scroll-container::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 4px;
        }
        .groups-scroll-container::-webkit-scrollbar-thumb {
          background: var(--primary-color);
          border-radius: 4px;
          opacity: 0.5;
        }
        .groups-scroll-container::-webkit-scrollbar-thumb:hover {
          opacity: 0.8;
        }
        .clickable-group {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .clickable-group:hover {
          background: rgba(99, 102, 241, 0.1);
          transform: translateX(4px);
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  setupEventListeners() {
    // Sort button - now sorts selected tabs if in selection mode
    document.getElementById('sortBtn')?.addEventListener('click', () => {
      this.sortTabs();
    });
    
    // Select tabs button
    document.getElementById('selectTabsBtn')?.addEventListener('click', () => {
      this.toggleSelectionMode();
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        clearSearchBtn.style.display = query ? 'block' : 'none';
        this.searchTabs(query);
      });
    }
    
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        this.searchTabs('');
      });
    }
    
    // Selection mode controls
    document.getElementById('selectAllBtn')?.addEventListener('click', () => {
      this.tabs.forEach(tab => this.selectedTabs.add(tab.id));
      this.showTabSelectionList();
      this.updateSelectionCount();
      this.analyzeTabs();
    });
    
    document.getElementById('deselectAllBtn')?.addEventListener('click', () => {
      this.selectedTabs.clear();
      this.showTabSelectionList();
      this.updateSelectionCount();
    });
    
    document.getElementById('cancelSelectionBtn')?.addEventListener('click', () => {
      this.toggleSelectionMode();
    });
    
    // Export buttons
    document.getElementById('exportBookmarksBtn')?.addEventListener('click', () => {
      this.exportToBookmarks();
    });
    
    document.getElementById('exportSessionBtn')?.addEventListener('click', () => {
      this.exportSession();
    });
    
    // AI Analysis depth
    document.getElementById('analysisDepth')?.addEventListener('change', (e) => {
      this.settings.analysisDepth = e.target.value;
      this.saveSettings();
      this.analyzeTabs(); // Re-analyze with new depth
    });
    
    // Preview button - simplified without modal
    document.getElementById('previewBtn')?.addEventListener('click', () => {
      this.showPreview();
    });
    
    // Settings button
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    
    // Toggle switches
    document.getElementById('autoGroupToggle')?.addEventListener('change', (e) => {
      this.settings.autoGroup = e.target.checked;
      this.saveSettings();
    });
    
    document.getElementById('smartModeToggle')?.addEventListener('change', (e) => {
      this.settings.smartMode = e.target.checked;
      this.saveSettings();
      this.analyzeTabs();
    });
    
    document.getElementById('partialGroupingToggle')?.addEventListener('change', (e) => {
      this.settings.partialGrouping = e.target.checked;
      this.saveSettings();
      this.analyzeTabs();
    });
    
    document.getElementById('preservePinnedToggle')?.addEventListener('change', (e) => {
      this.settings.preservePinned = e.target.checked;
      this.saveSettings();
    });
  }
  
  async showPreview() {
    // Simplified preview without modal
    const tabsToPreview = this.selectionMode && this.selectedTabs.size > 0
      ? this.tabs.filter(tab => this.selectedTabs.has(tab.id))
      : this.tabs;
      
    const response = await chrome.runtime.sendMessage({
      action: 'getCategorizationPreview',
      tabs: tabsToPreview,
      settings: this.settings
    });
    
    if (response && response.preview) {
      // Show preview in the current view
      this.displayResults(response.preview.groups, response.preview.stats);
      this.showNotification('Preview mode - Click "Sort Tabs" to apply', 'info');
    }
  }
  
  async sortTabs() {
    try {
      const tabsToSort = this.selectionMode && this.selectedTabs.size > 0
        ? this.tabs.filter(tab => this.selectedTabs.has(tab.id))
        : null; // null means sort all tabs
      
      const response = await chrome.runtime.sendMessage({
        action: 'sortTabs',
        tabs: tabsToSort,
        settings: this.settings
      });
      
      if (response && response.success) {
        const tabCount = tabsToSort ? tabsToSort.length : this.tabs.length;
        this.showNotification(`Successfully sorted ${tabCount} tabs!`, 'success');
        
        // Exit selection mode if active
        if (this.selectionMode) {
          this.toggleSelectionMode();
        }
        
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        this.showError(response?.error || 'Failed to sort tabs');
      }
    } catch (error) {
      console.error('Error sorting tabs:', error);
      this.showError('An error occurred while sorting tabs');
    }
  }
  
  getCategoryIcon(category) {
    const icons = {
      work: '💼',
      shopping: '🛍️',
      social: '👥',
      entertainment: '🎬',
      news: '📰',
      development: '💻',
      research: '🔬',
      finance: '💰',
      travel: '✈️',
      utilities: '🔧',
      reference: '📚',
      communication: '💬',
      health: '❤️',
      education: '🎓',
      energy: '⚡',
      other: '📌'
    };
    
    const categoryKey = category.toLowerCase().split(' ')[0];
    return icons[categoryKey] || '📁';
  }
  
  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  showError(message) {
    this.showNotification(message, 'error');
  }
  
  async saveSettings() {
    await chrome.storage.sync.set({ settings: this.settings });
  }
  
  updateUI() {
    const autoGroupToggle = document.getElementById('autoGroupToggle');
    if (autoGroupToggle) {
      autoGroupToggle.checked = this.settings.autoGroup;
    }
    
    const smartModeToggle = document.getElementById('smartModeToggle');
    if (smartModeToggle) {
      smartModeToggle.checked = this.settings.smartMode;
    }
    
    const partialToggle = document.getElementById('partialGroupingToggle');
    if (partialToggle) {
      partialToggle.checked = this.settings.partialGrouping;
    }
    
    const preservePinnedToggle = document.getElementById('preservePinnedToggle');
    if (preservePinnedToggle) {
      preservePinnedToggle.checked = this.settings.preservePinned !== false;
    }
    
    const analysisDepth = document.getElementById('analysisDepth');
    if (analysisDepth) {
      analysisDepth.value = this.settings.analysisDepth || 'standard';
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('TabSorter popup loaded');
  new TabSorterPopup();
});