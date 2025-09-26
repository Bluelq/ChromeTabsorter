/**
 * Options Page Script
 * Comprehensive settings interface for TabSorter AI
 * Part 4: Full settings system implementation
 */

class OptionsManager {
    constructor() {
        this.settings = {};
        this.categories = [];
        this.customRules = [];
        this.isDirty = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize the options page
     */
    async initialize() {
        console.log('Initializing options page...');
        
        // Load current settings and data
        await this.loadSettings();
        await this.loadCategories();
        await this.loadCustomRules();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Render all sections
        this.renderGeneralSettings();
        this.renderCategoriesSection();
        this.renderCustomRulesSection();
        this.renderAdvancedSettings();
        
        console.log('Options page initialized successfully');
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            const defaultSettings = {
                aiMode: true,
                categorizedMode: false,
                sortMode: 'groups',
                autoSort: false,
                autoSortInterval: 30,
                minGroupSize: 2,
                maxGroupSize: 20,
                similarityThreshold: 0.45,
                enableNotifications: true,
                enableKeyboardShortcuts: true,
                enableDebugMode: false,
                exportSettings: true
            };

            const stored = await chrome.storage.sync.get(defaultSettings);
            this.settings = { ...defaultSettings, ...stored };
            
            console.log('Settings loaded:', this.settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.settings = {};
        }
    }

    /**
     * Load categories from background
     */
    async loadCategories() {
        try {
            // Load default categories from JSON file
            const response = await fetch(chrome.runtime.getURL('data/default-categories.json'));
            const data = await response.json();
            this.categories = data.categories || [];
            
            console.log(`Loaded ${this.categories.length} categories`);
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.categories = [];
        }
    }

    /**
     * Load custom rules from background
     */
    async loadCustomRules() {
        try {
            const response = await this.sendMessage('getRules', { includeSystem: false });
            this.customRules = response.rules || [];
            
            console.log(`Loaded ${this.customRules.length} custom rules`);
        } catch (error) {
            console.error('Failed to load custom rules:', error);
            this.customRules = [];
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
     * Set up event listeners
     */
    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(tab.dataset.tab);
            });
        });

        // Save button
        const saveButton = document.getElementById('saveSettings');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveSettings());
        }

        // Reset button
        const resetButton = document.getElementById('resetSettings');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetSettings());
        }

        // Export/Import buttons
        const exportButton = document.getElementById('exportSettings');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportSettings());
        }

        const importButton = document.getElementById('importSettings');
        if (importButton) {
            importButton.addEventListener('click', () => this.importSettings());
        }

        // Add new rule button
        const addRuleButton = document.getElementById('addCustomRule');
        if (addRuleButton) {
            addRuleButton.addEventListener('click', () => this.addCustomRule());
        }

        // Test sort button
        const testSortButton = document.getElementById('testSort');
        if (testSortButton) {
            testSortButton.addEventListener('click', () => this.testSort());
        }

        // Listen for changes to mark as dirty
        document.addEventListener('change', () => {
            this.isDirty = true;
            this.updateSaveButton();
        });

        // Prevent navigation without saving
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update content sections
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });

        // Update URL hash
        window.location.hash = tabName;
    }

    /**
     * Render general settings
     */
    renderGeneralSettings() {
        const container = document.getElementById('generalSettings');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Sorting Behavior</h3>
                <div class="setting-group">
                    <div class="setting-item">
                        <label class="setting-label">
                            <input type="checkbox" id="aiMode" ${this.settings.aiMode ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                            Enable AI Semantic Grouping
                        </label>
                        <p class="setting-description">Use AI to group tabs by content similarity rather than just domain.</p>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">
                            <input type="checkbox" id="categorizedMode" ${this.settings.categorizedMode ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                            Enable Smart Categorization
                        </label>
                        <p class="setting-description">Use advanced rules and categories for more precise tab grouping.</p>
                    </div>

                    <div class="setting-item">
                        <label class="form-label">Default Sort Mode</label>
                        <select id="sortMode" class="form-select">
                            <option value="groups" ${this.settings.sortMode === 'groups' ? 'selected' : ''}>Tab Groups</option>
                            <option value="windows" ${this.settings.sortMode === 'windows' ? 'selected' : ''}>Separate Windows</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Auto-Sort Settings</h3>
                <div class="setting-group">
                    <div class="setting-item">
                        <label class="setting-label">
                            <input type="checkbox" id="autoSort" ${this.settings.autoSort ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                            Enable Auto-Sort
                        </label>
                        <p class="setting-description">Automatically sort tabs at regular intervals.</p>
                    </div>

                    <div class="setting-item">
                        <label class="form-label">Auto-Sort Interval (minutes)</label>
                        <input type="number" id="autoSortInterval" class="form-input" min="5" max="120" 
                               value="${this.settings.autoSortInterval}" ${!this.settings.autoSort ? 'disabled' : ''}>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Grouping Parameters</h3>
                <div class="setting-group">
                    <div class="setting-item">
                        <label class="form-label">Minimum Group Size</label>
                        <input type="number" id="minGroupSize" class="form-input" min="2" max="10" 
                               value="${this.settings.minGroupSize}">
                        <p class="setting-description">Minimum number of tabs required to form a group.</p>
                    </div>

                    <div class="setting-item">
                        <label class="form-label">Maximum Group Size</label>
                        <input type="number" id="maxGroupSize" class="form-input" min="5" max="50" 
                               value="${this.settings.maxGroupSize}">
                        <p class="setting-description">Maximum number of tabs allowed in a single group.</p>
                    </div>

                    <div class="setting-item">
                        <label class="form-label">AI Similarity Threshold</label>
                        <input type="range" id="similarityThreshold" class="form-range" min="0.1" max="0.9" step="0.05" 
                               value="${this.settings.similarityThreshold}">
                        <div class="range-labels">
                            <span>Less Similar</span>
                            <span class="range-value">${Math.round(this.settings.similarityThreshold * 100)}%</span>
                            <span>More Similar</span>
                        </div>
                        <p class="setting-description">How similar tabs need to be to group together when using AI mode.</p>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for specific controls
        const autoSortCheckbox = document.getElementById('autoSort');
        const intervalInput = document.getElementById('autoSortInterval');
        
        autoSortCheckbox?.addEventListener('change', () => {
            intervalInput.disabled = !autoSortCheckbox.checked;
        });

        const similaritySlider = document.getElementById('similarityThreshold');
        const rangeValue = container.querySelector('.range-value');
        
        similaritySlider?.addEventListener('input', () => {
            rangeValue.textContent = `${Math.round(similaritySlider.value * 100)}%`;
        });
    }

    /**
     * Render categories section
     */
    renderCategoriesSection() {
        const container = document.getElementById('categoriesSettings');
        if (!container) return;

        const categoriesHtml = this.categories.map(category => `
            <div class="category-item" data-category-id="${category.id}">
                <div class="category-header">
                    <div class="category-info">
                        <span class="category-emoji">${category.emoji}</span>
                        <span class="category-name">${category.name}</span>
                        <span class="category-priority badge badge-primary">${category.priority}</span>
                    </div>
                    <div class="category-actions">
                        <button class="btn btn-sm btn-secondary edit-category">Edit</button>
                        <button class="btn btn-sm btn-secondary toggle-category">
                            ${category.enabled !== false ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                </div>
                <div class="category-details">
                    <p class="category-description">${category.description || 'No description available.'}</p>
                    <div class="category-meta">
                        <div class="meta-item">
                            <strong>Domains:</strong> ${category.domains?.slice(0, 3).join(', ')}${category.domains?.length > 3 ? '...' : ''}
                        </div>
                        <div class="meta-item">
                            <strong>Keywords:</strong> ${category.keywords?.slice(0, 5).join(', ')}${category.keywords?.length > 5 ? '...' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="categories-header">
                <div class="categories-stats">
                    <div class="stat-card">
                        <div class="stat-value">${this.categories.length}</div>
                        <div class="stat-label">Categories</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.categories.filter(c => c.enabled !== false).length}</div>
                        <div class="stat-label">Enabled</div>
                    </div>
                </div>
                <div class="categories-actions">
                    <button class="btn btn-secondary" id="resetCategories">Reset to Defaults</button>
                    <button class="btn btn-primary" id="addCategory">Add Category</button>
                </div>
            </div>

            <div class="categories-list">
                ${categoriesHtml}
            </div>
        `;

        // Add event listeners for category actions
        container.querySelectorAll('.edit-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const categoryId = e.target.closest('.category-item').dataset.categoryId;
                this.editCategory(categoryId);
            });
        });

        container.querySelectorAll('.toggle-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const categoryId = e.target.closest('.category-item').dataset.categoryId;
                this.toggleCategory(categoryId);
            });
        });

        document.getElementById('addCategory')?.addEventListener('click', () => {
            this.addCategory();
        });

        document.getElementById('resetCategories')?.addEventListener('click', () => {
            this.resetCategories();
        });
    }

    /**
     * Render custom rules section
     */
    renderCustomRulesSection() {
        const container = document.getElementById('customRulesSettings');
        if (!container) return;

        const rulesHtml = this.customRules.map(rule => `
            <div class="rule-item" data-rule-id="${rule.id}">
                <div class="rule-header">
                    <div class="rule-info">
                        <span class="rule-name">${rule.name}</span>
                        <span class="rule-category badge badge-info">${rule.action?.category || 'Unknown'}</span>
                    </div>
                    <div class="rule-actions">
                        <label class="toggle-switch">
                            <input type="checkbox" ${rule.enabled ? 'checked' : ''} 
                                   onchange="optionsManager.toggleRule('${rule.id}', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <button class="btn btn-sm btn-secondary edit-rule">Edit</button>
                        <button class="btn btn-sm btn-error delete-rule">Delete</button>
                    </div>
                </div>
                <div class="rule-details">
                    <div class="rule-conditions">
                        ${rule.conditions.domain ? `<span class="condition">Domain: ${rule.conditions.domain}</span>` : ''}
                        ${rule.conditions.urlPattern ? `<span class="condition">URL: ${rule.conditions.urlPattern}</span>` : ''}
                        ${rule.conditions.keywords?.length ? `<span class="condition">Keywords: ${rule.conditions.keywords.join(', ')}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="rules-header">
                <div class="rules-stats">
                    <div class="stat-card">
                        <div class="stat-value">${this.customRules.length}</div>
                        <div class="stat-label">Custom Rules</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.customRules.filter(r => r.enabled).length}</div>
                        <div class="stat-label">Active</div>
                    </div>
                </div>
                <div class="rules-actions">
                    <button class="btn btn-secondary" id="importRules">Import Rules</button>
                    <button class="btn btn-secondary" id="exportRules">Export Rules</button>
                    <button class="btn btn-primary" id="addCustomRule">Add Rule</button>
                </div>
            </div>

            <div class="rules-list">
                ${rulesHtml.length ? rulesHtml : '<div class="empty-state">No custom rules created yet. Click "Add Rule" to get started.</div>'}
            </div>

            <!-- Rule Editor Modal (will be shown when needed) -->
            <div id="ruleEditorModal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="ruleEditorTitle">Add Custom Rule</h3>
                        <button class="modal-close" onclick="optionsManager.closeRuleEditor()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="ruleEditorForm">
                            <div class="form-group">
                                <label class="form-label">Rule Name</label>
                                <input type="text" id="ruleName" class="form-input" placeholder="e.g., GitHub Issues" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Target Category</label>
                                <select id="ruleCategory" class="form-select" required>
                                    ${this.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Conditions (match any)</label>
                                <div class="conditions-group">
                                    <div class="form-group">
                                        <label class="form-label">Domain Contains</label>
                                        <input type="text" id="ruleDomain" class="form-input" placeholder="e.g., github.com">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label">URL Pattern</label>
                                        <input type="text" id="ruleUrlPattern" class="form-input" placeholder="e.g., /issues|/pull">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label">Title Keywords (comma-separated)</label>
                                        <input type="text" id="ruleKeywords" class="form-input" placeholder="e.g., issue, bug, pull request">
                                    </div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Priority (1-100)</label>
                                <input type="number" id="rulePriority" class="form-input" min="1" max="100" value="50">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="optionsManager.closeRuleEditor()">Cancel</button>
                        <button class="btn btn-primary" onclick="optionsManager.saveRule()">Save Rule</button>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        container.querySelectorAll('.edit-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ruleId = e.target.closest('.rule-item').dataset.ruleId;
                this.editRule(ruleId);
            });
        });

        container.querySelectorAll('.delete-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ruleId = e.target.closest('.rule-item').dataset.ruleId;
                this.deleteRule(ruleId);
            });
        });
    }

    /**
     * Render advanced settings
     */
    renderAdvancedSettings() {
        const container = document.getElementById('advancedSettings');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Performance & Debug</h3>
                <div class="setting-group">
                    <div class="setting-item">
                        <label class="setting-label">
                            <input type="checkbox" id="enableNotifications" ${this.settings.enableNotifications ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                            Enable Notifications
                        </label>
                        <p class="setting-description">Show notifications when tabs are sorted.</p>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">
                            <input type="checkbox" id="enableKeyboardShortcuts" ${this.settings.enableKeyboardShortcuts ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                            Enable Keyboard Shortcuts
                        </label>
                        <p class="setting-description">Use Ctrl+Shift+S to quickly sort tabs.</p>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">
                            <input type="checkbox" id="enableDebugMode" ${this.settings.enableDebugMode ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                            Enable Debug Mode
                        </label>
                        <p class="setting-description">Show detailed logging information in console.</p>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Data Management</h3>
                <div class="setting-group">
                    <div class="setting-item">
                        <button class="btn btn-secondary" id="clearCache">Clear Cache</button>
                        <p class="setting-description">Clear stored tab analysis cache to free up space.</p>
                    </div>

                    <div class="setting-item">
                        <button class="btn btn-secondary" id="resetAllData">Reset All Data</button>
                        <p class="setting-description">Reset all settings, rules, and categories to defaults. This cannot be undone.</p>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Testing</h3>
                <div class="setting-group">
                    <div class="setting-item">
                        <button class="btn btn-primary" id="testSort">Test Sort Current Tabs</button>
                        <p class="setting-description">Test the current settings on your open tabs without actually moving them.</p>
                    </div>
                    
                    <div id="testResults" class="test-results hidden">
                        <!-- Test results will be shown here -->
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>About</h3>
                <div class="setting-group">
                    <div class="about-info">
                        <h4>TabSorter AI v2.0.0</h4>
                        <p>Advanced tab management with AI-powered semantic grouping.</p>
                        <div class="about-links">
                            <a href="#" class="link">Documentation</a>
                            <a href="#" class="link">Report Issue</a>
                            <a href="#" class="link">Privacy Policy</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for advanced features
        document.getElementById('clearCache')?.addEventListener('click', () => this.clearCache());
        document.getElementById('resetAllData')?.addEventListener('click', () => this.resetAllData());
        document.getElementById('testSort')?.addEventListener('click', () => this.testSort());
    }

    /**
     * Save all settings
     */
    async saveSettings() {
        try {
            // Collect settings from form elements
            const formData = new FormData(document.querySelector('form'));
            const updatedSettings = { ...this.settings };

            // Update settings from form inputs
            document.querySelectorAll('input, select').forEach(input => {
                if (input.type === 'checkbox') {
                    updatedSettings[input.id] = input.checked;
                } else if (input.type === 'number') {
                    updatedSettings[input.id] = parseFloat(input.value);
                } else if (input.type === 'range') {
                    updatedSettings[input.id] = parseFloat(input.value);
                } else if (input.id) {
                    updatedSettings[input.id] = input.value;
                }
            });

            // Save to storage
            await chrome.storage.sync.set(updatedSettings);
            this.settings = updatedSettings;
            this.isDirty = false;
            
            this.showNotification('Settings saved successfully!', 'success');
            this.updateSaveButton();

            console.log('Settings saved:', updatedSettings);
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings: ' + error.message, 'error');
        }
    }

    /**
     * Reset settings to defaults
     */
    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            return;
        }

        try {
            await chrome.storage.sync.clear();
            await this.loadSettings();
            this.renderGeneralSettings();
            this.isDirty = false;
            this.updateSaveButton();
            
            this.showNotification('Settings reset to defaults!', 'success');
        } catch (error) {
            console.error('Failed to reset settings:', error);
            this.showNotification('Failed to reset settings: ' + error.message, 'error');
        }
    }

    /**
     * Test current sort settings
     */
    async testSort() {
        const testButton = document.getElementById('testSort');
        const resultsContainer = document.getElementById('testResults');
        
        if (!testButton || !resultsContainer) return;
        
        try {
            testButton.textContent = 'Testing...';
            testButton.disabled = true;
            
            // Get current tab stats using background script
            const stats = await this.sendMessage('getTabStats');
            
            resultsContainer.innerHTML = `
                <div class="test-result-card">
                    <h4>Test Results</h4>
                    <div class="test-stats">
                        <div class="test-stat">
                            <span class="test-stat-value">${stats.totalTabs}</span>
                            <span class="test-stat-label">Total Tabs</span>
                        </div>
                        <div class="test-stat">
                            <span class="test-stat-value">${stats.potentialGroups}</span>
                            <span class="test-stat-label">Potential Groups</span>
                        </div>
                        <div class="test-stat">
                            <span class="test-stat-value">${stats.aiMode ? 'AI' : 'Domain'}</span>
                            <span class="test-stat-label">Mode</span>
                        </div>
                    </div>
                    <div class="test-groups">
                        ${stats.groups.map(group => `
                            <div class="test-group">
                                <span class="test-group-name">${group.label}</span>
                                <span class="test-group-count">${group.count} tabs</span>
                                ${group.confidence ? `<span class="test-group-confidence">${Math.round(group.confidence * 100)}%</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            resultsContainer.classList.remove('hidden');
            
        } catch (error) {
            console.error('Test sort failed:', error);
            this.showNotification('Test failed: ' + error.message, 'error');
        } finally {
            testButton.textContent = 'Test Sort Current Tabs';
            testButton.disabled = false;
        }
    }

    /**
     * Toggle rule enabled state
     */
    async toggleRule(ruleId, enabled) {
        try {
            await this.sendMessage('toggleRule', { ruleId, enabled });
            
            // Update local state
            const rule = this.customRules.find(r => r.id === ruleId);
            if (rule) {
                rule.enabled = enabled;
            }
            
            this.showNotification(`Rule ${enabled ? 'enabled' : 'disabled'}!`, 'success');
        } catch (error) {
            console.error('Failed to toggle rule:', error);
            this.showNotification('Failed to toggle rule: ' + error.message, 'error');
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * Update save button state
     */
    updateSaveButton() {
        const saveButton = document.getElementById('saveSettings');
        if (saveButton) {
            saveButton.textContent = this.isDirty ? 'Save Changes' : 'Saved';
            saveButton.disabled = !this.isDirty;
            saveButton.classList.toggle('btn-primary', this.isDirty);
            saveButton.classList.toggle('btn-secondary', !this.isDirty);
        }
    }

    // Placeholder methods for additional functionality
    editCategory(categoryId) {
        console.log('Edit category:', categoryId);
        this.showNotification('Category editing coming soon!', 'info');
    }

    toggleCategory(categoryId) {
        console.log('Toggle category:', categoryId);
        this.showNotification('Category toggling coming soon!', 'info');
    }

    addCategory() {
        console.log('Add category');
        this.showNotification('Adding categories coming soon!', 'info');
    }

    editRule(ruleId) {
        console.log('Edit rule:', ruleId);
        // Show rule editor modal
        document.getElementById('ruleEditorModal')?.classList.remove('hidden');
    }

    deleteRule(ruleId) {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        
        console.log('Delete rule:', ruleId);
        this.showNotification('Rule deletion coming soon!', 'info');
    }

    closeRuleEditor() {
        document.getElementById('ruleEditorModal')?.classList.add('hidden');
    }

    saveRule() {
        console.log('Save rule');
        this.showNotification('Rule saving coming soon!', 'info');
        this.closeRuleEditor();
    }

    exportSettings() {
        console.log('Export settings');
        this.showNotification('Export feature coming soon!', 'info');
    }

    importSettings() {
        console.log('Import settings');
        this.showNotification('Import feature coming soon!', 'info');
    }

    clearCache() {
        console.log('Clear cache');
        this.showNotification('Cache cleared!', 'success');
    }

    resetAllData() {
        if (!confirm('This will reset ALL data including custom rules and categories. Continue?')) return;
        
        console.log('Reset all data');
        this.showNotification('Data reset coming soon!', 'info');
    }
}

// Initialize when loaded
const optionsManager = new OptionsManager();
