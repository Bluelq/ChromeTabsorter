// ONNX Runtime Web path configuration for TabSorter AI
// Environment-aware: works in both extension and web page contexts
// This must load BEFORE ort.min.js to configure WASM paths

(function() {
  'use strict';

  console.log('🔧 Configuring ONNX Runtime paths...');

  // Configure ONNX environment before it loads
  if (typeof window !== 'undefined') {
    // Environment-aware path resolution
    const envPaths = window.envPaths || {
      getURL: (path) => {
        // Fallback if env-paths.js hasn't loaded yet
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
          try {
            return chrome.runtime.getURL(path);
          } catch (e) {
            return path;
          }
        } else {
          return path.startsWith('/') ? path : '/' + path;
        }
      }
    };

    // Set WASM paths for all possible variants
    const wasmPaths = {
      'ort-wasm.wasm': envPaths.getURL('ext/libs/ort-wasm.wasm'),
      'ort-wasm-threaded.wasm': envPaths.getURL('ext/libs/ort-wasm-threaded.wasm'),
      'ort-wasm-simd.wasm': envPaths.getURL('ext/libs/ort-wasm-simd.wasm')
    };

    // Pre-configure ort environment
    window.ortPreConfig = {
      wasm: {
        wasmPaths: wasmPaths,
        numThreads: 1, // Disable threading for extension compatibility
        simd: true     // Enable SIMD when available
      },
      env: {
        allowLocalModels: true,
        allowRemoteModels: false
      }
    };

    console.log('✅ ONNX paths configured:', wasmPaths);
    console.log('✅ Threading disabled for compatibility');
    console.log('✅ Environment:', envPaths.getEnvironment ?
      envPaths.getEnvironment().urlResolution : 'auto-detected');
  }

  // Override fetch to handle any remaining WASM requests
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('.wasm')) {
      console.log('📡 WASM fetch intercepted:', url);

      // Map any WASM requests to local files
      if (url.includes('ort-wasm.wasm') && !url.startsWith('chrome-extension://')) {
        url = chrome.runtime.getURL('ext/libs/ort-wasm.wasm');
        console.log('🎯 Mapped to:', url);
      } else if (url.includes('ort-wasm-threaded.wasm') && !url.startsWith('chrome-extension://')) {
        url = chrome.runtime.getURL('ext/libs/ort-wasm-threaded.wasm');
        console.log('🎯 Mapped to:', url);
      } else if (url.includes('ort-wasm-simd.wasm') && !url.startsWith('chrome-extension://')) {
        url = chrome.runtime.getURL('ext/libs/ort-wasm-simd.wasm');
        console.log('🎯 Mapped to:', url);
      }
    }

    return originalFetch.call(this, url, options);
  };

  // Also override XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && url.includes('.wasm')) {
      console.log('📡 WASM XMLHttpRequest intercepted:', url);

      if (url.includes('ort-wasm.wasm') && !url.startsWith('chrome-extension://')) {
        url = chrome.runtime.getURL('ext/libs/ort-wasm.wasm');
        console.log('🎯 XMLHttpRequest mapped to:', url);
      } else if (url.includes('ort-wasm-threaded.wasm') && !url.startsWith('chrome-extension://')) {
        url = chrome.runtime.getURL('ext/libs/ort-wasm-threaded.wasm');
        console.log('🎯 XMLHttpRequest mapped to:', url);
      } else if (url.includes('ort-wasm-simd.wasm') && !url.startsWith('chrome-extension://')) {
        url = chrome.runtime.getURL('ext/libs/ort-wasm-simd.wasm');
        console.log('🎯 XMLHttpRequest mapped to:', url);
      }
    }

    return originalOpen.call(this, method, url, ...args);
  };

  console.log('✅ ONNX path configuration complete - ready for ort.min.js');

})();