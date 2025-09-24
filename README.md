# TabSorter AI Extension v2.0 🤖

## ✨ AI-Powered Tab Sorting with Semantic Understanding

Your browser tabs are now intelligently grouped by **meaning**, not just domain. Using advanced AI embeddings, TabSorter understands that "React tutorials" and "Vue documentation" belong together, even from different websites.

## 🚀 Features

### Core Capabilities
- **🧠 AI Semantic Grouping** - Groups tabs by topic similarity using ML embeddings
- **🎯 Smart Categorization** - Auto-detects: Development, Research, Social, Media, etc.
- **📊 Confidence Scoring** - Visual indicators show group cohesion strength
- **⚡ Keyboard Shortcut** - `Ctrl+Shift+S` for instant sorting
- **🔄 Dual Modes** - Toggle between AI and domain-based grouping
- **🪟 Flexible Output** - Create tab groups or separate windows

### AI Categories
- 💻 **Development** - GitHub, Stack Overflow, API docs
- 🔬 **Research** - Academic papers, studies, journals  
- 💬 **Social** - Twitter, Reddit, LinkedIn
- 🛒 **Shopping** - E-commerce from any site
- 🎬 **Media** - YouTube, streaming, videos
- 📰 **News** - Articles, blogs, publications
- 🤖 **AI/ML** - Hugging Face, OpenAI, model docs
- 💼 **Work** - Slack, Jira, productivity tools
- 🎨 **Design** - Figma, Adobe, Dribbble
- 📚 **Documentation** - Guides, tutorials, references

## 📦 Installation

1. **Icons Setup**
   - Open `icon-generator.html` in Chrome
   - Download the 3 icon sizes
   - Move to `icons/` folder

2. **Load Extension**
   - Chrome → `chrome://extensions/`
   - Enable "Developer mode" 
   - "Load unpacked" → Select this folder

3. **First Run**
   - AI model downloads on first use (~30MB)
   - Takes 10-15 seconds initially
   - Cached for instant future use

## 🎮 Usage

### Quick Sort
- Click extension icon OR press `Ctrl+Shift+S`
- AI analyzes your tabs
- Groups appear instantly

### Options
- **AI Semantic Grouping** - Toggle AI vs domain mode
- **Use Windows** - Create windows instead of tab groups

### AI Status Indicators
- 🟢 **Green** - AI ready, semantic mode active
- 🟡 **Yellow** - AI loading (first run)
- 🔴 **Red** - Domain mode (fallback)

## 🏗️ Architecture

```
tab-sorter-extension/
├── manifest.json          # v2.0 with AI permissions
├── background.js          # Core logic + AI orchestration
├── popup.html/js/css      # Minimalist black & white UI
├── offscreen.html         # AI processing host
├── ai/
│   └── offscreen-ai.js   # Transformers.js embeddings
├── icons/                 # Your custom icons
└── docs/                  # Development guides
```

## 🔬 Technical Details

### AI Model
- **Model**: all-MiniLM-L6-v2 (quantized)
- **Size**: ~30MB compressed
- **Performance**: 2-3 seconds for 50 tabs
- **Accuracy**: 0.45 similarity threshold

### Technologies
- Chrome Extension Manifest V3
- Transformers.js for embeddings
- Offscreen API for processing
- Cosine similarity clustering
- IndexedDB caching (coming in Part 5)

## 📈 Development Progress

- [x] **Part 1**: Core extension structure
- [x] **Part 2**: AI semantic grouping
- [ ] **Part 3**: Advanced clustering algorithms
- [ ] **Part 4**: User settings & custom rules
- [ ] **Part 5**: Performance optimization

## 🐛 Troubleshooting

### AI Not Working?
- Check console for errors (F12 in popup)
- Ensure internet connection for first model download
- Try reloading extension

### Groups Not Semantic?
- Verify AI toggle is ON
- Check confidence bars (higher = better grouping)
- May need more similar tabs for grouping

### Performance Issues?
- First load is slow (model download)
- Subsequent sorts are fast (2-3 sec)
- Clear cache if issues persist

## 🔮 Coming Next (Parts 3-5)

- **DBSCAN clustering** for dynamic group sizes
- **Custom categories** you can define
- **Domain rules** for specific sites
- **Keyword patterns** for fine-tuning
- **IndexedDB caching** for instant results
- **Batch processing** for 100+ tabs
- **Settings UI** for full customization

---

**Version**: 2.0.0 | **License**: MIT | **Status**: AI Semantic Grouping Active 🟢
