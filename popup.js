// Popup UI Controller with AI Integration

document.addEventListener('DOMContentLoaded', async () => {
  // Load initial stats
  await loadTabStats();
  
  // Load saved preferences
  const prefs = await chrome.storage.local.get(['useWindows', 'useAI']);
  if (prefs.useWindows) {
    document.getElementById('useWindows').checked = true;
  }
  if (prefs.useAI !== false) { // Default to true
    document.getElementById('useAI').checked = true;
  }
  
  // Set up event listeners
  document.getElementById('sortButton').addEventListener('click', sortTabs);
  
  document.getElementById('useWindows').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ useWindows: e.target.checked });
  });
  
  document.getElementById('useAI').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ useAI: e.target.checked });
    // Toggle AI mode in background
    await chrome.runtime.sendMessage({ 
      action: 'toggleAIMode', 
      enabled: e.target.checked 
    });
    // Reload stats with new mode
    await loadTabStats();
  });
});

async function loadTabStats() {
  try {
    const stats = await chrome.runtime.sendMessage({ action: 'getTabStats' });
    
    // Update AI status indicator
    updateAIStatus(stats);
    
    document.getElementById('totalTabs').textContent = stats.totalTabs;
    document.getElementById('potentialGroups').textContent = stats.potentialGroups;
    
    // Show group preview if there are groups
    if (stats.groups && stats.groups.length > 0) {
      const preview = document.getElementById('groupsPreview');
      preview.classList.remove('hidden');
      preview.innerHTML = '';
      
      stats.groups.slice(0, 5).forEach(group => {
        const item = document.createElement('div');
        item.className = 'group-item';
        
        // Build HTML with confidence indicator if available
        let html = `
          <span>${group.label}</span>
          <div style="display: flex; align-items: center;">
            <span style="margin-right: 8px;">${group.count} tabs</span>
        `;
        
        if (group.confidence !== undefined && stats.aiMode) {
          const confidencePercent = Math.round(group.confidence * 100);
          html += `
            <div class="group-confidence" title="AI Confidence: ${confidencePercent}%">
              <div class="group-confidence-bar" style="width: ${confidencePercent}%"></div>
            </div>
          `;
        }
        
        html += '</div>';
        item.innerHTML = html;
        preview.appendChild(item);
      });
      
      if (stats.groups.length > 5) {
        const more = document.createElement('div');
        more.className = 'group-item';
        more.style.fontStyle = 'italic';
        more.style.justifyContent = 'center';
        more.textContent = `...and ${stats.groups.length - 5} more groups`;
        preview.appendChild(more);
      }
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    updateAIStatus({ aiMode: false, offscreenReady: false });
  }
}

function updateAIStatus(stats) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  if (stats.aiMode && stats.offscreenReady) {
    statusDot.className = 'status-dot ready';
    statusText.textContent = 'AI Ready - Semantic Grouping Active';
  } else if (stats.aiMode && !stats.offscreenReady) {
    statusDot.className = 'status-dot';
    statusText.textContent = 'AI Loading... (using domain grouping)';
  } else {
    statusDot.className = 'status-dot error';
    statusText.textContent = 'Domain Grouping Mode';
  }
}

async function sortTabs() {
  const button = document.getElementById('sortButton');
  const loading = document.getElementById('loading');
  const statsCard = document.querySelector('.stats-card');
  const options = document.querySelector('.options');
  const shortcutHint = document.querySelector('.shortcut-hint');
  const aiStatus = document.querySelector('.ai-status');
  
  // Show loading state
  button.classList.add('hidden');
  statsCard.classList.add('hidden');
  options.classList.add('hidden');
  shortcutHint.classList.add('hidden');
  aiStatus.classList.add('hidden');
  loading.classList.remove('hidden');
  
  // Update loading message based on AI mode
  const useAI = document.getElementById('useAI').checked;
  if (useAI) {
    loading.querySelector('p').textContent = 'AI is analyzing your tabs...';
  }
  
  try {
    const useWindows = document.getElementById('useWindows').checked;
    
    const result = await chrome.runtime.sendMessage({
      action: 'sortTabs',
      options: { useWindows }
    });
    
    // Show success message
    const modeText = result.aiMode ? 'AI Semantic' : 'Domain';
    loading.innerHTML = `
      <div style="font-size: 48px;">✅</div>
      <h2 style="color: white; margin: 10px 0;">Success!</h2>
      <p style="color: rgba(255,255,255,0.9);">
        Sorted ${result.totalTabs} tabs into ${result.groupsCreated} groups
      </p>
      <p style="color: rgba(255,255,255,0.7); font-size: 12px;">
        Using ${modeText} Grouping
      </p>
    `;
    
    // Close popup after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
    
  } catch (error) {
    console.error('Error sorting tabs:', error);
    
    // Show error message
    loading.innerHTML = `
      <div style="font-size: 48px;">❌</div>
      <h2 style="color: white; margin: 10px 0;">Error</h2>
      <p style="color: rgba(255,255,255,0.9);">
        ${error.message || 'Failed to sort tabs'}
      </p>
    `;
    
    // Re-enable button after 3 seconds
    setTimeout(() => {
      button.classList.remove('hidden');
      statsCard.classList.remove('hidden');
      options.classList.remove('hidden');
      shortcutHint.classList.remove('hidden');
      aiStatus.classList.remove('hidden');
      loading.classList.add('hidden');
      loadTabStats();
    }, 3000);
  }
}
