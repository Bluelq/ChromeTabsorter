// Fetch override to redirect ONNX WASM requests to local files
// This must load BEFORE ort.min.js to intercept WASM loading

console.log('🚀 FETCH OVERRIDE SCRIPT LOADED - Starting initialization...');

(function() {
  'use strict';

  console.log('🔧 Setting up fetch override for ONNX WASM files...');

  // Store original fetch function
  const originalFetch = window.fetch;

  // Override fetch to redirect WASM requests
  window.fetch = function(url, options) {
    console.log('📡 Fetch intercepted:', url);

    // Intercept WASM file requests and redirect to local files
    if (typeof url === 'string') {
      if (url.includes('ort-wasm.wasm') && !url.startsWith('chrome-extension://')) {
        console.log('🎯 Redirecting ort-wasm.wasm request to local file');
        const localUrl = chrome.runtime.getURL('ext/libs/ort-wasm.wasm');
        console.log('📍 Local URL:', localUrl);
        url = localUrl;
      } else if (url.includes('ort-wasm-threaded.wasm') && !url.startsWith('chrome-extension://')) {
        console.log('🎯 Redirecting ort-wasm-threaded.wasm request to local file');
        const localUrl = chrome.runtime.getURL('ext/libs/ort-wasm-threaded.wasm');
        console.log('📍 Local URL:', localUrl);
        url = localUrl;
      } else if (url.includes('ort-webgl.wasm') && !url.startsWith('chrome-extension://')) {
        console.log('🎯 Redirecting ort-webgl.wasm request to local file');
        const localUrl = chrome.runtime.getURL('ext/libs/ort-webgl.wasm');
        console.log('📍 Local URL:', localUrl);
        url = localUrl;
      }
    }

    console.log('🚀 Final fetch URL:', url);
    return originalFetch.call(this, url, options);
  };

  console.log('✅ Fetch override active - ONNX WASM requests will be redirected to local files');

  // Also override XMLHttpRequest for compatibility
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    console.log('📡 XMLHttpRequest intercepted:', url);

    if (typeof url === 'string') {
      if (url.includes('ort-wasm.wasm') && !url.startsWith('chrome-extension://')) {
        console.log('🎯 Redirecting ort-wasm.wasm XMLHttpRequest to local file');
        url = chrome.runtime.getURL('ext/libs/ort-wasm.wasm');
        console.log('📍 XMLHttpRequest Local URL:', url);
      } else if (url.includes('ort-wasm-threaded.wasm') && !url.startsWith('chrome-extension://')) {
        console.log('🎯 Redirecting ort-wasm-threaded.wasm XMLHttpRequest to local file');
        url = chrome.runtime.getURL('ext/libs/ort-wasm-threaded.wasm');
        console.log('📍 XMLHttpRequest Local URL:', url);
      } else if (url.includes('ort-webgl.wasm') && !url.startsWith('chrome-extension://')) {
        console.log('🎯 Redirecting ort-webgl.wasm XMLHttpRequest to local file');
        url = chrome.runtime.getURL('ext/libs/ort-webgl.wasm');
        console.log('📍 XMLHttpRequest Local URL:', url);
      }
    }

    return originalOpen.call(this, method, url, ...args);
  };

  console.log('✅ XMLHttpRequest override also active');

  // Test WASM file accessibility
  console.log('🧪 Testing WASM file accessibility...');
  const testWasmUrl = chrome.runtime.getURL('ext/libs/ort-wasm.wasm');
  console.log('Test WASM URL:', testWasmUrl);

  // Try to fetch the WASM file to test accessibility
  fetch(testWasmUrl).then(response => {
    console.log('✅ WASM file fetch test - Status:', response.status);
    console.log('✅ WASM file fetch test - Content-Type:', response.headers.get('content-type'));
    console.log('✅ WASM file fetch test - Content-Length:', response.headers.get('content-length'));
  }).catch(error => {
    console.error('❌ WASM file fetch test failed:', error);
  });

  // Test that chrome.runtime is available
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('✅ Chrome runtime available');
  } else {
    console.error('❌ Chrome runtime not available');
  }
})();