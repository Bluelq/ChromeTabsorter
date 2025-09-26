/**
 * Preview Modal Component
 * Shows preview of tab sorting before applying changes
 * Part 4: Component for previewing tab organization
 */

class PreviewModal {
    constructor() {
        this.isOpen = false;
        this.groupData = [];
        this.tabData = [];
        this.previewMode = 'groups'; // 'groups' or 'windows'
        
        this.createModal();
        this.setupEventListeners();
    }

    /**
     * Create the modal DOM structure
     */
    createModal() {
        const modalHtml = `
            <div id="previewModal" class="preview-modal hidden">
                <div class="modal-backdrop"></div>
                <div class="modal-container">
                    <div class="modal-header">
                        <div class="modal-title">
                            <h3>Preview Tab Organization</h3>
                            <p class="modal-subtitle">Review how your tabs will be organized</p>
                        </div>
                        <button class="modal-close" aria-label="Close preview">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <div class="modal-controls">
                        <div class="view-mode-toggle">
                            <button class="view-toggle-btn active" data-mode="groups">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                                Groups View
                            </button>
                            <button class="view-toggle-btn" data-mode="windows">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="9" x2="15" y2="9"></line>
                                    <line x1="9" y1="15" x2="15" y2="15"></line>
                                </svg>
                                Windows View
                            </button>
                        </div>

                        <div class="preview-stats">
                            <div class="stat">
                                <span class="stat-value" id="previewTotalTabs">0</span>
                                <span class="stat-label">Total Tabs</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value" id="previewTotalGroups">0</span>
                                <span class="stat-label">Groups</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value" id="previewUngrouped">0</span>
                                <span class="stat-label">Ungrouped</span>
                            </div>
                        </div>
                    </div>

                    <div class="modal-body">
                        <div id="previewContent" class="preview-content">
                            <!-- Content will be populated dynamically -->
                        </div>
                    </div>

                    <div class="modal-footer">
                        <div class="footer-info">
                            <div class="confidence-indicator">
                                <span class="confidence-label">Average Confidence:</span>
                                <span class="confidence-value" id="averageConfidence">0%</span>
                                <div class="confidence-bar">
                                    <div class="confidence-fill" id="confidenceFill"></div>
                                </div>
                            </div>
                        </div>
                        <div class="footer-actions">
                            <button class="btn btn-secondary" id="cancelPreview">Cancel</button>
                            <button class="btn btn-primary" id="applyChanges">Apply Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modal = document.getElementById('previewModal');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Close modal events
        document.querySelector('#previewModal .modal-close')?.addEventListener('click', () => {
            this.close();
        });

        document.querySelector('#previewModal .modal-backdrop')?.addEventListener('click', () => {
            this.close();
        });

        document.getElementById('cancelPreview')?.addEventListener('click', () => {
            this.close();
        });

        // Apply changes
        document.getElementById('applyChanges')?.addEventListener('click', () => {
            this.applyChanges();
        });

        // View mode toggle
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchViewMode(btn.dataset.mode);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isOpen) {
                if (e.key === 'Escape') {
                    this.close();
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    this.applyChanges();
                }
            }
        });
    }

    /**
     * Show the preview modal with tab grouping data
     */
    async show(options = {}) {
        try {
            // Get current tab grouping preview
            const response = await this.sendMessage('getTabStats');
            
            this.groupData = response.groups || [];
            this.tabData = await this.getAllTabs();
            this.previewMode = options.mode || 'groups';

            // Update modal content
            this.updatePreviewStats();
            this.renderPreviewContent();
            
            // Show modal
            this.modal.classList.remove('hidden');
            this.isOpen = true;

            // Focus management
            this.modal.querySelector('.modal-close')?.focus();

        } catch (error) {
            console.error('Failed to show preview:', error);
            this.showNotification('Failed to load preview: ' + error.message, 'error');
        }
    }

    /**
     * Close the modal
     */
    close() {
        this.modal.classList.add('hidden');
        this.isOpen = false;
        this.groupData = [];
        this.tabData = [];
    }

    /**
     * Switch between view modes
     */
    switchViewMode(mode) {
        this.previewMode = mode;

        // Update toggle buttons
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Re-render content
        this.renderPreviewContent();
    }

    /**
     * Update preview statistics
     */
    updatePreviewStats() {
        const totalTabs = this.tabData.length;
        const totalGroups = this.groupData.length;
        const groupedTabs = this.groupData.reduce((sum, group) => sum + (group.count || group.tabCount || 0), 0);
        const ungroupedTabs = totalTabs - groupedTabs;
        
        document.getElementById('previewTotalTabs').textContent = totalTabs;
        document.getElementById('previewTotalGroups').textContent = totalGroups;
        document.getElementById('previewUngrouped').textContent = Math.max(0, ungroupedTabs);

        // Calculate average confidence
        const confidenceScores = this.groupData
            .map(group => group.confidence)
            .filter(confidence => typeof confidence === 'number');
        
        const avgConfidence = confidenceScores.length > 0 
            ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length
            : 0;

        const confidencePercent = Math.round(avgConfidence * 100);
        document.getElementById('averageConfidence').textContent = `${confidencePercent}%`;
        
        const confidenceFill = document.getElementById('confidenceFill');
        if (confidenceFill) {
            confidenceFill.style.width = `${confidencePercent}%`;
            confidenceFill.className = `confidence-fill ${this.getConfidenceClass(avgConfidence)}`;
        }
    }

    /**
     * Render the preview content
     */
    renderPreviewContent() {
        const container = document.getElementById('previewContent');
        if (!container) return;

        if (this.previewMode === 'groups') {
            container.innerHTML = this.renderGroupsView();
        } else {
            container.innerHTML = this.renderWindowsView();
        }

        // Add expand/collapse functionality
        this.setupGroupInteractions();
    }

    /**
     * Render groups view
     */
    renderGroupsView() {
        if (this.groupData.length === 0) {
            return `
                <div class="empty-preview">
                    <div class="empty-icon">📭</div>
                    <h4>No Groups Found</h4>
                    <p>No tab groups were generated with current settings.</p>
                </div>
            `;
        }

        return `
            <div class="groups-preview">
                ${this.groupData.map((group, index) => this.renderGroup(group, index)).join('')}
            </div>
        `;
    }

    /**
     * Render a single group
     */
    renderGroup(group, index) {
        const tabCount = group.count || group.tabCount || 0;
        const confidence = group.confidence || 0;
        const tabs = group.tabs || [];

        return `
            <div class="preview-group" data-group-index="${index}">
                <div class="group-header">
                    <div class="group-info">
                        <div class="group-title">
                            <span class="group-emoji">${this.getGroupEmoji(group)}</span>
                            <span class="group-name">${group.label || `Group ${index + 1}`}</span>
                            <span class="tab-count">${tabCount} tab${tabCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="group-meta">
                            ${confidence > 0 ? `
                                <span class="confidence-badge ${this.getConfidenceClass(confidence)}">
                                    ${Math.round(confidence * 100)}% confidence
                                </span>
                            ` : ''}
                            ${group.category ? `<span class="category-badge">${group.category}</span>` : ''}
                        </div>
                    </div>
                    <button class="group-toggle" aria-label="Toggle group details">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                
                <div class="group-content">
                    <div class="tab-list">
                        ${tabs.slice(0, 10).map(tab => this.renderTabPreview(tab)).join('')}
                        ${tabs.length > 10 ? `
                            <div class="tab-overflow">
                                +${tabs.length - 10} more tabs
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render a tab preview
     */
    renderTabPreview(tab) {
        return `
            <div class="tab-preview">
                <div class="tab-favicon">
                    <img src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23ccc"/></svg>'}" 
                         alt="Favicon" onerror="this.style.display='none'">
                </div>
                <div class="tab-info">
                    <div class="tab-title">${this.truncateText(tab.title || 'Untitled', 50)}</div>
                    <div class="tab-url">${this.truncateText(tab.url || '', 60)}</div>
                </div>
                ${tab.pinned ? '<div class="tab-pin">📌</div>' : ''}
            </div>
        `;
    }

    /**
     * Render windows view
     */
    renderWindowsView() {
        return `
            <div class="windows-preview">
                <div class="windows-info">
                    <h4>Window Organization Preview</h4>
                    <p>Each group will be moved to its own browser window.</p>
                </div>
                
                <div class="windows-grid">
                    ${this.groupData.map((group, index) => `
                        <div class="window-preview">
                            <div class="window-header">
                                <div class="window-controls">
                                    <div class="window-control close"></div>
                                    <div class="window-control minimize"></div>
                                    <div class="window-control maximize"></div>
                                </div>
                                <div class="window-title">${group.label || `Window ${index + 1}`}</div>
                            </div>
                            <div class="window-content">
                                <div class="window-tab-bar">
                                    ${(group.tabs || []).slice(0, 3).map(tab => `
                                        <div class="window-tab">
                                            <img src="${tab.favIconUrl || ''}" alt="" class="tab-favicon" onerror="this.style.display='none'">
                                            <span>${this.truncateText(tab.title || 'Untitled', 15)}</span>
                                        </div>
                                    `).join('')}
                                    ${(group.tabs || []).length > 3 ? `
                                        <div class="window-tab more">+${(group.tabs || []).length - 3}</div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Set up group interaction handlers
     */
    setupGroupInteractions() {
        document.querySelectorAll('.group-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const group = e.target.closest('.preview-group');
                const content = group.querySelector('.group-content');
                const isExpanded = content.style.maxHeight && content.style.maxHeight !== '0px';
                
                if (isExpanded) {
                    content.style.maxHeight = '0px';
                    toggle.style.transform = 'rotate(0deg)';
                } else {
                    content.style.maxHeight = content.scrollHeight + 'px';
                    toggle.style.transform = 'rotate(180deg)';
                }
            });
        });

        // Initially collapse all groups
        document.querySelectorAll('.group-content').forEach(content => {
            content.style.maxHeight = '0px';
        });
    }

    /**
     * Apply the changes (perform actual sorting)
     */
    async applyChanges() {
        try {
            const applyButton = document.getElementById('applyChanges');
            const originalText = applyButton.textContent;
            
            // Show loading state
            applyButton.textContent = 'Applying...';
            applyButton.disabled = true;
            applyButton.classList.add('loading');

            // Send sort request to background
            const result = await this.sendMessage('sortTabs', {
                useWindows: this.previewMode === 'windows'
            });

            if (result.success !== false) {
                this.showNotification('Tabs organized successfully!', 'success');
                this.close();
                
                // Trigger callback if provided
                if (this.onApply) {
                    this.onApply(result);
                }
            } else {
                throw new Error(result.error || 'Sort failed');
            }

        } catch (error) {
            console.error('Failed to apply changes:', error);
            this.showNotification('Failed to organize tabs: ' + error.message, 'error');
        } finally {
            // Reset button state
            const applyButton = document.getElementById('applyChanges');
            applyButton.textContent = 'Apply Changes';
            applyButton.disabled = false;
            applyButton.classList.remove('loading');
        }
    }

    /**
     * Get all tabs from browser
     */
    async getAllTabs() {
        try {
            return await chrome.tabs.query({});
        } catch (error) {
            console.error('Failed to get tabs:', error);
            return [];
        }
    }

    /**
     * Send message to background script
     */
    async sendMessage(action, data = {}) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action, ...data }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Get emoji for group based on its properties
     */
    getGroupEmoji(group) {
        if (group.emoji) return group.emoji;
        if (group.label) {
            if (group.label.includes('Development') || group.label.includes('💻')) return '💻';
            if (group.label.includes('Social') || group.label.includes('💬')) return '💬';
            if (group.label.includes('Shopping') || group.label.includes('🛒')) return '🛒';
            if (group.label.includes('Media') || group.label.includes('🎬')) return '🎬';
            if (group.label.includes('News') || group.label.includes('📰')) return '📰';
            if (group.label.includes('Work') || group.label.includes('💼')) return '💼';
        }
        return '📁';
    }

    /**
     * Get confidence class based on confidence score
     */
    getConfidenceClass(confidence) {
        if (confidence > 0.8) return 'high';
        if (confidence > 0.6) return 'medium';
        if (confidence > 0.3) return 'low';
        return 'very-low';
    }

    /**
     * Truncate text to specified length
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * Set callback for when changes are applied
     */
    onApplyCallback(callback) {
        this.onApply = callback;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewModal;
}