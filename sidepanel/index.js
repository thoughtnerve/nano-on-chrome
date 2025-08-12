/* global LanguageModel */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

const inputPrompt = document.body.querySelector('#input-prompt');
const buttonPrompt = document.body.querySelector('#button-prompt');
const buttonReset = document.body.querySelector('#button-reset');
const chatMessages = document.body.querySelector('#chat-messages');
const loadingMessage = document.body.querySelector('#loading-message');
const errorToast = document.body.querySelector('#error-toast');
const errorText = document.body.querySelector('#error');
const sliderTemperature = document.body.querySelector('#temperature');
const sliderTopK = document.body.querySelector('#top-k');
const labelTemperature = document.body.querySelector('#label-temperature');
const labelTopK = document.body.querySelector('#label-top-k');
const pageContextToggle = document.body.querySelector('#page-context-toggle');
const pageContextCard = document.body.querySelector('#page-context-card');
const pageErrorDetails = document.body.querySelector('#page-error-details');

let session;
let currentPageData = null;

// Auto-resize textarea
function autoResizeTextarea() {
  inputPrompt.style.height = 'auto';
  const newHeight = Math.max(52, Math.min(inputPrompt.scrollHeight, 160));
  inputPrompt.style.height = newHeight + 'px';
}

// Add user message to chat
function addUserMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user-message';
  messageDiv.innerHTML = `
    <div class="message-avatar user-avatar">
      <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
    <div class="message-content">
      <div class="message-text">${DOMPurify.sanitize(text)}</div>
      <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    </div>
  `;
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

// Convert links to clickable hyperlinks
function processLinksInText(text) {
  // Configure marked to open links in new tabs
  const renderer = new marked.Renderer();
  renderer.link = function(href, title, text) {
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="ai-link" title="${title || href}">${text}</a>`;
  };
  
  marked.setOptions({
    renderer: renderer,
    breaks: true,
    gfm: true
  });
  
  return marked.parse(text);
}

// Add AI message to chat
function addAIMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ai-message';
  messageDiv.innerHTML = `
    <div class="message-avatar ai-avatar">
      <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 12l2 2 4-4"/>
        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
      </svg>
    </div>
    <div class="message-content">
      <div class="message-text">${DOMPurify.sanitize(processLinksInText(text))}</div>
      <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    </div>
  `;
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

// Clear chat messages
function clearChat() {
  // Keep only the welcome message (first child)
  const welcomeMessage = chatMessages.firstElementChild;
  chatMessages.innerHTML = '';
  chatMessages.appendChild(welcomeMessage);
}

// Scroll to bottom of chat
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function runPrompt(prompt, params) {
  try {
    if (!session) {
      session = await LanguageModel.create(params);
    }
    return session.prompt(prompt);
  } catch (e) {
    console.log('Prompt failed');
    console.error(e);
    console.log('Prompt:', prompt);
    // Reset session
    reset();
    throw e;
  }
}

async function reset() {
  if (session) {
    session.destroy();
  }
  session = null;
}

async function initDefaults() {
  const defaults = await LanguageModel.params();
  console.log('Model default:', defaults);
  if (!('LanguageModel' in self)) {
    showResponse('Model not available');
    return;
  }
  sliderTemperature.value = defaults.defaultTemperature;
  // Pending https://issues.chromium.org/issues/367771112.
  // sliderTemperature.max = defaults.maxTemperature;
  if (defaults.defaultTopK > 3) {
    // limit default topK to 3
    sliderTopK.value = 3;
    labelTopK.textContent = 3;
  } else {
    sliderTopK.value = defaults.defaultTopK;
    labelTopK.textContent = defaults.defaultTopK;
  }
  sliderTopK.max = defaults.maxTopK;
  labelTemperature.textContent = defaults.defaultTemperature;
}

initDefaults();

// Page context functionality
async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch (error) {
    console.error('Error getting current tab:', error);
    return null;
  }
}

async function getPageContent() {
  try {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
    return response;
  } catch (error) {
    console.error('Error getting page content:', error);
    return null;
  }
}

// Page interaction functions
async function findElementsOnPage(text) {
  try {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    const response = await chrome.tabs.sendMessage(tab.id, { 
      action: 'findElements', 
      text: text 
    });
    return response;
  } catch (error) {
    console.error('Error finding elements:', error);
    return null;
  }
}

async function clickElementOnPage(selector) {
  try {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    const response = await chrome.tabs.sendMessage(tab.id, { 
      action: 'clickElement', 
      selector: selector 
    });
    return response;
  } catch (error) {
    console.error('Error clicking element:', error);
    return { success: false, message: error.message };
  }
}

async function clickAllMatchingOnPage(text, maxClicks = 10) {
  try {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    const response = await chrome.tabs.sendMessage(tab.id, { 
      action: 'clickAllMatching', 
      text: text,
      maxClicks: maxClicks
    });
    return response;
  } catch (error) {
    console.error('Error clicking elements:', error);
    return { success: false, message: error.message };
  }
}

// Parse AI response for actions
function parseActionsFromText(text) {
  const actions = [];
  
  // Look for action patterns in the AI response
  const actionPatterns = [
    /(?:click|press|tap)\s+(?:on\s+)?["']?([^"'\n]+)["']?/gi,
    /(?:find|locate|look\s+for)\s+["']?([^"'\n]+)["']?/gi,
    /(?:show\s+all|load\s+all|expand\s+all|click\s+all)\s+["']?([^"'\n]+)["']?/gi
  ];
  
  actionPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        actions.push({
          type: match[0].toLowerCase().includes('all') ? 'clickAll' : 'click',
          target: match[1].trim(),
          original: match[0]
        });
      }
    }
  });
  
  return actions;
}

// Execute actions from AI response
async function executeActions(actions) {
  const results = [];
  
  for (const action of actions) {
    if (action.type === 'clickAll') {
      const result = await clickAllMatchingOnPage(action.target);
      results.push({
        action: action.original,
        result: result.message,
        success: result.success
      });
    } else if (action.type === 'click') {
      const elements = await findElementsOnPage(action.target);
      if (elements && elements.elements && elements.elements.length > 0) {
        const result = await clickElementOnPage(elements.elements[0].selector);
        results.push({
          action: action.original,
          result: result.message,
          success: result.success
        });
      } else {
        results.push({
          action: action.original,
          result: `No elements found matching "${action.target}"`,
          success: false
        });
      }
    }
  }
  
  return results;
}

async function updatePageInfo() {
  const pageData = await getPageContent();
  if (pageData && pageData.success !== false && pageData.content && pageData.content.length > 50) {
    // Successfully got page content - store it and hide any error card
    currentPageData = pageData;
    hide(pageContextCard);
    console.log('Page context loaded:', {
      title: pageData.title,
      contentLength: pageData.content.length,
      source: pageData.contentSource
    });
  } else {
    // Failed to get meaningful page content - show error card
    currentPageData = null;
    let errorMessage = 'Unable to extract content from this page';
    
    if (pageData && pageData.error) {
      errorMessage = pageData.error;
    } else if (!pageData) {
      errorMessage = 'Cannot access this page - content script may not be loaded';
    } else if (pageData.content && pageData.content.length <= 50) {
      errorMessage = 'Page content is too short or appears to be empty';
    }
    
    pageErrorDetails.textContent = errorMessage;
    show(pageContextCard);
    
    console.log('Page context error:', errorMessage, pageData);
  }
}

// Listen for background script notifications about page changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'tabChanged' || message.action === 'pageUpdated') {
    console.log('Page changed, refreshing context...');
    // Small delay to ensure content script is ready
    setTimeout(() => {
      if (pageContextToggle.checked) {
        updatePageInfo();
      }
    }, 500);
  }
});

// Initialize page context
pageContextToggle.addEventListener('change', async () => {
  if (pageContextToggle.checked) {
    await updatePageInfo();
  } else {
    hide(pageContextCard);
    currentPageData = null;
  }
});

// Enable page context by default and update page info when extension is opened
pageContextToggle.checked = true;
updatePageInfo();

buttonReset.addEventListener('click', () => {
  hide(loadingMessage);
  hide(errorToast);
  clearChat();
  reset();
  buttonReset.setAttribute('disabled', '');
});

sliderTemperature.addEventListener('input', (event) => {
  labelTemperature.textContent = event.target.value;
  reset();
});

sliderTopK.addEventListener('input', (event) => {
  labelTopK.textContent = event.target.value;
  reset();
});

inputPrompt.addEventListener('input', () => {
  autoResizeTextarea();
  if (inputPrompt.value.trim()) {
    buttonPrompt.removeAttribute('disabled');
  } else {
    buttonPrompt.setAttribute('disabled', '');
  }
});

// Handle Enter key (Shift+Enter for new line, Enter to send)
inputPrompt.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!buttonPrompt.disabled) {
      sendMessage();
    }
  }
});

// Handle send button and Enter key
async function sendMessage() {
  const prompt = inputPrompt.value.trim();
  if (!prompt) return;
  
  // Add user message to chat
  addUserMessage(prompt);
  
  // Clear input and reset height
  inputPrompt.value = '';
  autoResizeTextarea();
  
  showLoading();
  try {
    let systemPrompt = 'You are a helpful and friendly assistant.';
    
    // Include page context if enabled and available
    if (pageContextToggle.checked) {
      if (currentPageData && currentPageData.success !== false && currentPageData.content) {
        systemPrompt += `

Current webpage context:
Title: ${currentPageData.title}
URL: ${currentPageData.url}
Content: ${currentPageData.content}

AGENT CAPABILITIES: You can interact with this webpage! You have the following powers:
1. Click elements by describing them (e.g., "click the Show More button")
2. Find and click all matching elements (e.g., "show all results" or "load all content")
3. Navigate through paginated content automatically

When the user asks you to interact with the page (like "show all results", "load more", "expand all", etc.), you can perform these actions. Simply include natural language instructions in your response like "I'll click all the 'Show More' buttons" and the system will execute these actions.

Examples of what you can do:
- "I'll click the 'Show More Results' button to load additional content"
- "Let me expand all the collapsed sections by clicking 'Show More'"
- "I'll load all the results by clicking the pagination buttons"

When answering questions, you can reference and analyze the content from this webpage. If the user asks about "this page" or similar references, they are referring to the webpage content provided above.`;
      } else {
        // Page context is enabled but not available
        systemPrompt += `

Note: The user has enabled page context mode, but the current webpage content is not available. This could be because:
1. The page content couldn't be extracted
2. The page uses dynamic content loading
3. The content script couldn't access the page
4. The page is a special browser page (like chrome:// or extension pages)

If the user asks about the current page content, politely explain that you cannot access the page content and suggest they:
1. Try refreshing the page and the extension
2. Check if the page has finished loading
3. Try on a different webpage
4. Disable page context mode for general questions

You can still answer general questions normally without page context.`;
      }
    }
    
    const params = {
      initialPrompts: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: sliderTemperature.value,
      topK: sliderTopK.value
    };
    const response = await runPrompt(prompt, params);
    
    // Check if the response contains actions to execute
    const actions = parseActionsFromText(response);
    if (actions.length > 0) {
      // Show the AI response first
      showResponse(response);
      
      // Then execute actions
      addUserMessage("🤖 Executing actions...");
      const actionResults = await executeActions(actions);
      
      // Show results of actions
      let resultMessage = "Action results:\n";
      actionResults.forEach(result => {
        resultMessage += `• ${result.action}: ${result.result}\n`;
      });
      
      addAIMessage(resultMessage);
    } else {
      showResponse(response);
    }
  } catch (e) {
    showError(e);
  }
}

buttonPrompt.addEventListener('click', sendMessage);

function showLoading() {
  buttonReset.removeAttribute('disabled');
  buttonPrompt.disabled = true;
  show(loadingMessage);
  scrollToBottom();
}

function showResponse(response) {
  hide(loadingMessage);
  buttonPrompt.disabled = false;
  addAIMessage(response);
}

function showError(error) {
  hide(loadingMessage);
  buttonPrompt.disabled = false;
  errorText.textContent = error;
  show(errorToast);
  
  // Auto-hide error toast after 5 seconds
  setTimeout(() => {
    hide(errorToast);
  }, 5000);
}

function show(element) {
  element.removeAttribute('hidden');
}

function hide(element) {
  element.setAttribute('hidden', '');
}

