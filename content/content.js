/**
 * Content Script
 * Extracts relevant content from web pages for categorization
 */

// Message listener for content extraction requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    const content = extractPageContent();
    sendResponse({
      success: true,
      data: content
    });
  }
  return true; // Keep message channel open
});

/**
 * Extract relevant content from the current page
 */
function extractPageContent() {
  const content = {
    title: document.title,
    description: null,
    keywords: null,
    author: null,
    type: null,
    text: null,
    headings: [],
    links: [],
    images: [],
    metadata: {}
  };
  
  // Get meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    content.description = metaDescription.content;
  }
  
  // Get meta keywords
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    content.keywords = metaKeywords.content;
  }
  
  // Get author
  const metaAuthor = document.querySelector('meta[name="author"]');
  if (metaAuthor) {
    content.author = metaAuthor.content;
  }
  
  // Get page type (article, product, etc.)
  const ogType = document.querySelector('meta[property="og:type"]');
  if (ogType) {
    content.type = ogType.content;
  }
  
  // Get Open Graph data
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    content.metadata.ogTitle = ogTitle.content;
  }
  
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    content.metadata.ogDescription = ogDescription.content;
  }
  
  // Get main headings (for context)
  const headings = document.querySelectorAll('h1, h2');
  content.headings = Array.from(headings)
    .slice(0, 5)
    .map(h => h.textContent.trim())
    .filter(text => text.length > 0);
  
  // Get first paragraph or main content (limited)
  const mainContent = findMainContent();
  if (mainContent) {
    content.text = extractTextContent(mainContent, 500); // Limit to 500 chars
  }
  
  // Count links and images for content type detection
  content.links = Array.from(document.querySelectorAll('a')).length;
  content.images = Array.from(document.querySelectorAll('img')).length;
  
  // Detect specific content patterns
  content.patterns = detectContentPatterns();
  
  // Get structured data if available
  const structuredData = extractStructuredData();
  if (structuredData) {
    content.metadata.structured = structuredData;
  }
  
  return content;
}

/**
 * Find the main content area of the page
 */
function findMainContent() {
  // Try common content selectors
  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '#main',
    '#content',
    '.content',
    '.main-content',
    '.article-content',
    '.entry-content',
    '.post-content'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  
  // Fallback to body
  return document.body;
}

/**
 * Extract text content with length limit
 */
function extractTextContent(element, maxLength = 500) {
  let text = '';
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (parent && (
          parent.tagName === 'SCRIPT' ||
          parent.tagName === 'STYLE' ||
          parent.tagName === 'NOSCRIPT'
        )) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    const nodeText = node.textContent.trim();
    if (nodeText) {
      text += nodeText + ' ';
      if (text.length >= maxLength) {
        break;
      }
    }
  }
  
  return text.substring(0, maxLength).trim();
}

/**
 * Detect specific content patterns
 */
function detectContentPatterns() {
  const patterns = {
    isArticle: false,
    isShopping: false,
    isVideo: false,
    isDocumentation: false,
    isForum: false,
    isSocial: false,
    isSearch: false,
    isNews: false
  };
  
  // Detect article/blog
  if (document.querySelector('article') || 
      document.querySelector('.post') ||
      document.querySelector('.blog-post') ||
      document.querySelector('[itemtype*="Article"]')) {
    patterns.isArticle = true;
  }
  
  // Detect shopping
  if (document.querySelector('.price') ||
      document.querySelector('.add-to-cart') ||
      document.querySelector('[itemtype*="Product"]') ||
      window.location.href.includes('/product/')) {
    patterns.isShopping = true;
  }
  
  // Detect video
  if (document.querySelector('video') ||
      document.querySelector('iframe[src*="youtube"]') ||
      document.querySelector('iframe[src*="vimeo"]')) {
    patterns.isVideo = true;
  }
  
  // Detect documentation
  if (document.querySelector('.docs') ||
      document.querySelector('.documentation') ||
      window.location.pathname.includes('/docs/') ||
      window.location.pathname.includes('/api/')) {
    patterns.isDocumentation = true;
  }
  
  // Detect forum/discussion
  if (document.querySelector('.thread') ||
      document.querySelector('.comment') ||
      document.querySelector('.discussion')) {
    patterns.isForum = true;
  }
  
  // Detect social media
  const socialDomains = ['twitter.com', 'facebook.com', 'linkedin.com', 'instagram.com', 'reddit.com'];
  if (socialDomains.some(domain => window.location.hostname.includes(domain))) {
    patterns.isSocial = true;
  }
  
  // Detect search results
  if (document.querySelector('.search-results') ||
      document.querySelector('.results') ||
      window.location.pathname.includes('/search')) {
    patterns.isSearch = true;
  }
  
  // Detect news
  if (document.querySelector('.news') ||
      document.querySelector('.breaking-news') ||
      document.querySelector('[itemtype*="NewsArticle"]')) {
    patterns.isNews = true;
  }
  
  return patterns;
}

/**
 * Extract structured data (JSON-LD)
 */
function extractStructuredData() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  const structured = [];
  
  scripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent);
      structured.push(data);
    } catch (e) {
      // Ignore parse errors
    }
  });
  
  return structured.length > 0 ? structured : null;
}

/**
 * Initialize content script
 */
(function init() {
  // Send ready signal to background
  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_READY',
    data: {
      url: window.location.href,
      title: document.title
    }
  }).catch(() => {
    // Background script might not be ready
  });
  
  console.log('Tab Sorter content script loaded');
})();
