/**
 * Centralized messaging system for the extension
 */

// Message type constants
export const MessageTypes = {
  // Core sorting actions
  SORT_TABS: 'SORT_TABS',
  SORT_COMPLETE: 'SORT_COMPLETE',
  SORT_ERROR: 'SORT_ERROR',
  
  // Tab data operations
  GET_TAB_DATA: 'GET_TAB_DATA',
  TAB_DATA_RESPONSE: 'TAB_DATA_RESPONSE',
  EXTRACT_CONTENT: 'EXTRACT_CONTENT',
  CONTENT_EXTRACTED: 'CONTENT_EXTRACTED',
  
  // Settings operations
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  GET_SETTINGS: 'GET_SETTINGS',
  SETTINGS_RESPONSE: 'SETTINGS_RESPONSE',
  
  // Statistics
  GET_STATS: 'GET_STATS',
  STATS_RESPONSE: 'STATS_RESPONSE',
  UPDATE_STATS: 'UPDATE_STATS',
  
  // Status updates
  STATUS_UPDATE: 'STATUS_UPDATE',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE'
};

// Error types
export const ErrorTypes = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TAB_ACCESS_ERROR: 'TAB_ACCESS_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  TIMEOUT: 'TIMEOUT'
};

/**
 * Send a message and wait for response
 * @param {string} type - Message type from MessageTypes
 * @param {object} data - Message payload
 * @param {object} options - Additional options
 * @returns {Promise} Response from the message handler
 */
export async function sendMessage(type, data = {}, options = {}) {
  const { timeout = 5000, tabId = null } = options;
  
  const message = {
    type,
    data,
    timestamp: Date.now(),
    id: generateMessageId()
  };
  
  try {
    // If tabId is specified, send to specific tab
    if (tabId !== null) {
      return await sendToTab(tabId, message, timeout);
    }
    
    // Otherwise send to runtime (background script)
    return await sendToRuntime(message, timeout);
  } catch (error) {
    console.error(`Message send error (${type}):`, error);
    throw new MessageError(error.message, ErrorTypes.INVALID_MESSAGE);
  }
}

/**
 * Send message to background script
 */
async function sendToRuntime(message, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new MessageError('Message timeout', ErrorTypes.TIMEOUT));
    }, timeout);
    
    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timeoutId);
      
      if (chrome.runtime.lastError) {
        reject(new MessageError(chrome.runtime.lastError.message));
        return;
      }
      
      if (response && response.error) {
        reject(new MessageError(response.error.message, response.error.type));
        return;
      }
      
      resolve(response);
    });
  });
}

/**
 * Send message to a specific tab
 */
async function sendToTab(tabId, message, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new MessageError('Message timeout', ErrorTypes.TIMEOUT));
    }, timeout);
    
    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timeoutId);
      
      if (chrome.runtime.lastError) {
        reject(new MessageError(chrome.runtime.lastError.message, ErrorTypes.TAB_ACCESS_ERROR));
        return;
      }
      
      if (response && response.error) {
        reject(new MessageError(response.error.message, response.error.type));
        return;
      }
      
      resolve(response);
    });
  });
}

/**
 * Register a message listener
 * @param {function} handler - Message handler function
 * @returns {function} Cleanup function to remove listener
 */
export function addMessageListener(handler) {
  const wrappedHandler = async (message, sender, sendResponse) => {
    // Validate message structure
    if (!message || !message.type) {
      sendResponse({
        error: {
          message: 'Invalid message format',
          type: ErrorTypes.INVALID_MESSAGE
        }
      });
      return true;
    }
    
    try {
      const result = await handler(message, sender);
      sendResponse({
        success: true,
        data: result,
        messageId: message.id
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: {
          message: error.message,
          type: error.type || ErrorTypes.INVALID_MESSAGE
        },
        messageId: message.id
      });
    }
    
    return true; // Keep channel open for async response
  };
  
  chrome.runtime.onMessage.addListener(wrappedHandler);
  
  // Return cleanup function
  return () => {
    chrome.runtime.onMessage.removeListener(wrappedHandler);
  };
}

/**
 * Custom error class for messaging errors
 */
export class MessageError extends Error {
  constructor(message, type = ErrorTypes.INVALID_MESSAGE) {
    super(message);
    this.name = 'MessageError';
    this.type = type;
  }
}

/**
 * Generate unique message ID
 */
function generateMessageId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Broadcast a message to all tabs
 * @param {string} type - Message type
 * @param {object} data - Message data
 */
export async function broadcastToTabs(type, data = {}) {
  const tabs = await chrome.tabs.query({});
  const promises = tabs.map(tab => 
    sendMessage(type, data, { tabId: tab.id }).catch(() => null)
  );
  return Promise.all(promises);
}

/**
 * Helper to create a response handler
 */
export function createResponseHandler(successCallback, errorCallback) {
  return (response) => {
    if (!response) {
      errorCallback(new MessageError('No response received'));
      return;
    }
    
    if (response.error) {
      errorCallback(new MessageError(response.error.message, response.error.type));
      return;
    }
    
    successCallback(response.data);
  };
}
