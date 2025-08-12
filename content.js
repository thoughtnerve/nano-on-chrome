// Content script to extract page content for AI context

function extractPageContent() {
  try {
    // Get basic page information
    const title = document.title || 'Untitled Page';
    const url = window.location.href;
    
    // Extract main content, avoiding navigation, headers, footers, etc.
    const contentSelectors = [
      'main',
      'article', 
      '[role="main"]',
      '.content',
      '.main-content',
      '#content',
      '#main',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.page-content'
    ];
    
    let mainContent = '';
    let contentSource = 'fallback';
    
    // Try to find main content area
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim().length > 100) {
        mainContent = element.innerText;
        contentSource = selector;
        break;
      }
    }
    
    // Enhanced fallback: extract from body but exclude common non-content elements
    if (!mainContent || mainContent.length < 100) {
      const body = document.body.cloneNode(true);
      
      // Remove common non-content elements
      const elementsToRemove = [
        'nav', 'header', 'footer', 'aside',
        '.nav', '.navigation', '.header', '.footer', '.sidebar',
        '.menu', '.ads', '.advertisement', '.social-media',
        '.comments', '.comment-section', '.related-posts',
        'script', 'style', 'noscript', 'iframe',
        '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]',
        '.cookie-notice', '.popup', '.modal', '.overlay'
      ];
      
      elementsToRemove.forEach(selector => {
        const elements = body.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
      
      mainContent = body.innerText;
      contentSource = 'body-filtered';
    }
    
    // Clean up the content
    mainContent = mainContent
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    // If still no meaningful content, extract paragraph text
    if (!mainContent || mainContent.length < 50) {
      const paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
      const textParts = [];
      paragraphs.forEach(p => {
        const text = p.innerText.trim();
        if (text.length > 10) {
          textParts.push(text);
        }
      });
      mainContent = textParts.join('\n');
      contentSource = 'paragraphs';
    }
    
    // Final fallback - just get all text
    if (!mainContent || mainContent.length < 20) {
      mainContent = document.body.innerText || document.documentElement.innerText || 'No readable content found';
      contentSource = 'document-text';
    }
    
    // Limit content length to avoid overwhelming the AI
    const maxLength = 4000; // Reasonable limit for context
    if (mainContent.length > maxLength) {
      mainContent = mainContent.substring(0, maxLength) + '...[content truncated]';
    }
    
    console.log('Content extracted:', {
      source: contentSource,
      length: mainContent.length,
      title,
      url
    });
    
    return {
      title,
      url,
      content: mainContent,
      contentSource,
      timestamp: Date.now(),
      success: true
    };
  } catch (error) {
    console.error('Error extracting page content:', error);
    return {
      title: document.title || 'Error',
      url: window.location.href,
      content: 'Error: Could not extract page content. This might be a protected page or the content is dynamically loaded.',
      contentSource: 'error',
      timestamp: Date.now(),
      success: false,
      error: error.message
    };
  }
}

// Listen for requests from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    const pageData = extractPageContent();
    sendResponse(pageData);
  }
});

// Send page content when the page loads/changes
let lastUrl = window.location.href;
let lastContent = '';

function checkForChanges() {
  const currentUrl = window.location.href;
  const currentContent = document.body.innerText.substring(0, 1000);
  
  if (currentUrl !== lastUrl || currentContent !== lastContent) {
    lastUrl = currentUrl;
    lastContent = currentContent;
    
    // Notify that page content has changed
    chrome.runtime.sendMessage({
      action: 'pageContentChanged',
      data: extractPageContent()
    });
  }
}

// Check for changes periodically (for SPAs)
setInterval(checkForChanges, 2000);

// Also check when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkForChanges);
} else {
  checkForChanges();
}
