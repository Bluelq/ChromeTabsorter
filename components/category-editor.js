/**
 * Category Editor Component
 * Advanced category management interface
 * Part 4: Component for editing and managing categories
 */

class CategoryEditor {
    constructor(container) {
        this.container = container;
        this.currentCategory = null;
        this.isEditing = false;
        this.categories = [];
        
        this.init();
    }

    /**
     * Initialize the category editor
     */
    async init() {
        await this.loadCategories();
        this.render();
        this.setupEventListeners();
    }

    /**
     * Load categories from storage/background
     */
    async loadCategories() {
        try {
            const response = await fetch(chrome.runtime.getURL('data/default-categories.json'));
            const data = await response.json();
            this.categories = data.categories || [];
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.categories = [];
        }
    }

    /**
     * Render the category editor interface
     */
    render() {
        const html = `
            <div class="category-editor">
                <div class="editor-header">
                    <h3>Category Editor</h3>
                    <button class="btn btn-primary" id="addNewCategory">Add New Category</button>
                </div>

                <div class="categories-grid">
                    ${this.renderCategoriesGrid()}
                </div>

                <!-- Category Edit Modal -->
                <div id="categoryModal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="categoryModalTitle">Edit Category</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.renderCategoryForm()}
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="categoryEditor.closeModal()">Cancel</button>
                            <button class="btn btn-error" id="deleteCategory" onclick="categoryEditor.deleteCategory()">Delete</button>
                            <button class="btn btn-primary" onclick="categoryEditor.saveCategory()">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    }

    /**
     * Render categories grid
     */
    renderCategoriesGrid() {
        return this.categories.map(category => `
            <div class="category-card" data-category-id="${category.id}">
                <div class="category-card-header">
                    <div class="category-icon">${category.emoji}</div>
                    <div class="category-info">
                        <h4>${category.name}</h4>
                        <span class="priority-badge">Priority: ${category.priority}</span>
                    </div>
                    <button class="edit-btn" onclick="categoryEditor.editCategory('${category.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </div>
                <div class="category-card-body">
                    <p class="category-description">${category.description || 'No description'}</p>
                    <div class="category-stats">
                        <span class="stat">🌐 ${category.domains?.length || 0} domains</span>
                        <span class="stat">🏷️ ${category.keywords?.length || 0} keywords</span>
                    </div>
                </div>
                <div class="category-card-footer">
                    <div class="category-color" style="background: var(--${category.color}-color, #666)"></div>
                    <span class="category-enabled">
                        ${category.enabled !== false ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render category form
     */
    renderCategoryForm() {
        return `
            <form id="categoryForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Category Name</label>
                        <input type="text" id="categoryName" class="form-input" placeholder="e.g., Development" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Emoji</label>
                        <input type="text" id="categoryEmoji" class="form-input emoji-input" placeholder="💻" maxlength="2">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Color Theme</label>
                        <select id="categoryColor" class="form-select">
                            <option value="blue">Blue</option>
                            <option value="purple">Purple</option>
                            <option value="green">Green</option>
                            <option value="orange">Orange</option>
                            <option value="red">Red</option>
                            <option value="pink">Pink</option>
                            <option value="yellow">Yellow</option>
                            <option value="cyan">Cyan</option>
                            <option value="grey">Grey</option>
                            <option value="indigo">Indigo</option>
                            <option value="teal">Teal</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Priority (1-100)</label>
                        <input type="number" id="categoryPriority" class="form-input" min="1" max="100" value="50">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea id="categoryDescription" class="form-textarea" placeholder="Describe what this category is for..."></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">Keywords (comma-separated)</label>
                    <textarea id="categoryKeywords" class="form-textarea" placeholder="keyword1, keyword2, keyword3..."></textarea>
                    <small class="form-hint">Keywords help identify tabs that belong to this category</small>
                </div>

                <div class="form-group">
                    <label class="form-label">Domains (one per line)</label>
                    <textarea id="categoryDomains" class="form-textarea" placeholder="example.com\\ngithub.com\\nstackoverflow.com"></textarea>
                    <small class="form-hint">Domains that should automatically be categorized here</small>
                </div>

                <div class="form-group">
                    <label class="form-label">URL Patterns (one per line)</label>
                    <textarea id="categoryPatterns" class="form-textarea" placeholder="/docs/.*\\n/api/.*\\n.*\\/issues\\/.*"></textarea>
                    <small class="form-hint">Regular expression patterns to match URLs</small>
                </div>

                <div class="form-group">
                    <div class="form-checkbox">
                        <label class="setting-label">
                            <input type="checkbox" id="categoryEnabled" checked>
                            <span class="checkbox-custom"></span>
                            Enable this category
                        </label>
                    </div>
                </div>
            </form>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add new category button
        document.getElementById('addNewCategory')?.addEventListener('click', () => {
            this.addNewCategory();
        });

        // Modal close button
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        document.getElementById('categoryModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'categoryModal') {
                this.closeModal();
            }
        });
    }

    /**
     * Edit existing category
     */
    editCategory(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;

        this.currentCategory = category;
        this.isEditing = true;

        // Populate form
        document.getElementById('categoryName').value = category.name || '';
        document.getElementById('categoryEmoji').value = category.emoji || '';
        document.getElementById('categoryColor').value = category.color || 'blue';
        document.getElementById('categoryPriority').value = category.priority || 50;
        document.getElementById('categoryDescription').value = category.description || '';
        document.getElementById('categoryKeywords').value = (category.keywords || []).join(', ');
        document.getElementById('categoryDomains').value = (category.domains || []).join('\\n');
        document.getElementById('categoryPatterns').value = (category.urlPatterns || []).join('\\n');
        document.getElementById('categoryEnabled').checked = category.enabled !== false;

        // Update modal title
        document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        document.getElementById('deleteCategory').style.display = 'block';

        // Show modal
        this.openModal();
    }

    /**
     * Add new category
     */
    addNewCategory() {
        this.currentCategory = null;
        this.isEditing = false;

        // Clear form
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryPriority').value = 50;
        document.getElementById('categoryEnabled').checked = true;

        // Update modal title
        document.getElementById('categoryModalTitle').textContent = 'Add New Category';
        document.getElementById('deleteCategory').style.display = 'none';

        // Show modal
        this.openModal();
    }

    /**
     * Save category
     */
    async saveCategory() {
        const form = document.getElementById('categoryForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        try {
            // Collect form data
            const categoryData = {
                id: this.currentCategory?.id || this.generateCategoryId(),
                name: document.getElementById('categoryName').value,
                emoji: document.getElementById('categoryEmoji').value,
                color: document.getElementById('categoryColor').value,
                priority: parseInt(document.getElementById('categoryPriority').value),
                description: document.getElementById('categoryDescription').value,
                keywords: document.getElementById('categoryKeywords').value
                    .split(',')
                    .map(k => k.trim())
                    .filter(k => k),
                domains: document.getElementById('categoryDomains').value
                    .split('\\n')
                    .map(d => d.trim())
                    .filter(d => d),
                urlPatterns: document.getElementById('categoryPatterns').value
                    .split('\\n')
                    .map(p => p.trim())
                    .filter(p => p),
                enabled: document.getElementById('categoryEnabled').checked
            };

            // Update categories array
            if (this.isEditing) {
                const index = this.categories.findIndex(c => c.id === this.currentCategory.id);
                if (index !== -1) {
                    this.categories[index] = categoryData;
                }
            } else {
                this.categories.push(categoryData);
            }

            // Save to storage (this would need to be implemented)
            await this.saveCategoriesToStorage();

            // Re-render
            this.render();
            this.setupEventListeners();

            // Close modal
            this.closeModal();

            // Show success message
            this.showNotification(`Category ${this.isEditing ? 'updated' : 'created'} successfully!`, 'success');

        } catch (error) {
            console.error('Failed to save category:', error);
            this.showNotification('Failed to save category: ' + error.message, 'error');
        }
    }

    /**
     * Delete category
     */
    async deleteCategory() {
        if (!this.currentCategory) return;

        if (!confirm(`Are you sure you want to delete the "${this.currentCategory.name}" category?`)) {
            return;
        }

        try {
            // Remove from categories array
            this.categories = this.categories.filter(c => c.id !== this.currentCategory.id);

            // Save to storage
            await this.saveCategoriesToStorage();

            // Re-render
            this.render();
            this.setupEventListeners();

            // Close modal
            this.closeModal();

            // Show success message
            this.showNotification('Category deleted successfully!', 'success');

        } catch (error) {
            console.error('Failed to delete category:', error);
            this.showNotification('Failed to delete category: ' + error.message, 'error');
        }
    }

    /**
     * Open modal
     */
    openModal() {
        document.getElementById('categoryModal')?.classList.remove('hidden');
        // Focus first input
        setTimeout(() => {
            document.getElementById('categoryName')?.focus();
        }, 100);
    }

    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('categoryModal')?.classList.add('hidden');
        this.currentCategory = null;
        this.isEditing = false;
    }

    /**
     * Generate unique category ID
     */
    generateCategoryId() {
        return 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Save categories to storage (placeholder)
     */
    async saveCategoriesToStorage() {
        // This would save to chrome.storage or send to background script
        console.log('Saving categories to storage:', this.categories);
        // Implementation would depend on the storage strategy
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryEditor;
}
