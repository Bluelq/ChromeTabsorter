/**
 * Popup Script
 * Handles the extension popup interface
 */

import { MessageTypes, sendMessage } from '../utils/messaging.js';

// DOM elements
const elements = {
  tabCount: document.getElementById('tabCount'),
  windowCount: document.getElementById('windowCount'),
  lastSort: document.getElementById('lastSort'),
  sortAllBtn: document.getElementById('sortAllBtn'),
  sortWindowBtn: document.getElementById('sortWindowBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  statusSection: document.getElementById('statusSection'),
  statusText: document.getElementById('statusText'),
  progressFill: document.getElementById('progressFill'),
  resultsSection: document.getElementById('resultsSection'),
  resultsList: document.getElementById('resultsList'),
  groupMode: document.getElementById('groupMode'),
  windowMode: document.getElementById('windowMode'),
  totalSorts: document.getElementById('totalSorts')
};

// State
let currentSettings = null;
let isProcessing = false;

/**
 * Initialize popup
 */
async function initialize() {
  console.log('Initializing popup...');
  
  // Load current stats
  await updateStats();
  
  // Load settings
  await loadSettings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Update tab count
  await updateTabCount();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Sort buttons
  elements.sortAllBtn.addEventListener('click', () => sortTabs('all'));
  elements.sortWindowBtn.addEventListener('click', () => sortTabs('window'));
  
  // Settings button
  elements.settingsBtn.addEventListener('click', openSettings);
  
  // Sort mode toggle
  elements.groupMode.addEventListener('change', updateSortMode);
  elements.windowMode.addEventListener('change', updateSortMode);
}

/**
 * Sort tabs
 */
async function sortTabs(scope) {
  if (isProcessing) return;
  
  isProcessing = true;
  showStatus('Analyzing tabs...');
  
  try {
    // Send sort request to background
    const result = await sendMessage(MessageTypes.SORT_TABS, { scope });
    
    if (result.success) {
      showResults(result.data);
      await updateStats();
    } else {
      showError('Sort failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Sort error:', error);
    showError('Failed to sort tabs: ' + error.message);
  } finally {
    isProcessing = false;
    hideStatus();
  }
}

/**
 * Update tab and window count
 */
async function updateTabCount() {
  try {
    // Get all tabs
    const tabs = await chrome.tabs.query({});
    elements.tabCount.textContent = tabs.length;
    
    // Get all windows
    const windows = await chrome.windows.getAll();
    elements.windowCount.textContent = windows.length;
  } catch (error) {
    console.error('Failed to get tab count:', error);
  }
}

/**
 * Update statistics
 */
async function updateStats() {
  try {
    const stats = await sendMessage(MessageTypes.GET_STATS);
    
    if (stats.data) {
      // Update last sort time
      if (stats.data.lastSortTime) {
        elements.lastSort.textContent = formatTime(stats.data.lastSortTime);
      }
      
      // Update total sorts
      if (stats.data.totalSorts !== undefined) {
        elements.totalSorts.textContent = `${stats.data.totalSorts} total sorts`;
      }
    }
  } catch (error) {
    console.error('Failed to get stats:', error);
  }
}

/**
 * Load settings
 */
async function loadSettings() {
  try {
    const settings = await sendMessage(MessageTypes.GET_SETTINGS);
    
    if (settings.data) {
      currentSettings = settings.data;
      
      // Update UI based on settings
      if (settings.data.sortMode === 'windows') {
        elements.windowMode.checked = true;
      } else {
        elements.groupMode.checked = true;
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Update sort mode setting
 */
async function updateSortMode() {
  const sortMode = elements.groupMode.checked ? 'groups' : 'windows';
  
  try {
    await sendMessage(MessageTypes.UPDATE_SETTINGS, { sortMode });
    currentSettings.sortMode = sortMode;
  } catch (error) {
    console.error('Failed to update sort mode:', error);
  }
}

/**
 * Show status message
 */
function showStatus(message, progress = 0) {
  elements.statusSection.classList.remove('hidden');
  elements.statusText.textContent = message;
  
  if (progress > 0) {
    elements.progressFill.style.width = `${progress}%`;
  }
}

/**
 * Hide status message
 */
function hideStatus() {
  elements.statusSection.classList.add('hidden');
  elements.progressFill.style.width = '0%';
}

/**
 * Show results
 */
function showResults(data) {
  elements.resultsSection.classList.remove('hidden');
  elements.resultsList.innerHTML = '';
  
  if (data.categories && data.categories.length > 0) {
    const list = document.createElement('ul');
    
    data.categories.forEach(category => {
      const item = document.createElement('li');
      item.textContent = category;
      list.appendChild(item);
    });
    
    elements.resultsList.appendChild(list);
    
    // Add summary
    const summary = document.createElement('div');
    summary.className = 'results-summary';
    summary.textContent = `✅ ${data.tabsProcessed} tabs sorted into ${data.categories.length} categories`;
    elements.resultsList.appendChild(summary);
  }
  
  // Auto-hide results after 3 seconds
  setTimeout(() => {
    elements.resultsSection.classList.add('hidden');
  }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
  elements.statusSection.classList.remove('hidden');
  elements.statusText.textContent = '❌ ' + message;
  elements.statusText.classList.add('error');
  
  setTimeout(() => {
    hideStatus();
    elements.statusText.classList.remove('error');
  }, 3000);
}

/**
 * Format time difference
 */
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

/**
 * Open settings page
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Listen for tab changes
chrome.tabs.onCreated.addListener(updateTabCount);
chrome.tabs.onRemoved.addListener(updateTabCount);
chrome.windows.onCreated.addListener(updateTabCount);
chrome.windows.onRemoved.addListener(updateTabCount);
