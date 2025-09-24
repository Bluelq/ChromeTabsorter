// TabSorter AI - Diagnostic Script
// Run this in the service worker console to diagnose issues

async function diagnoseAI() {
    console.log('=== TabSorter AI Diagnostics ===');
    console.log('');
    
    // Check if offscreen document exists
    try {
        const hasDoc = await chrome.offscreen.hasDocument();
        console.log('✓ Offscreen document exists:', hasDoc);
    } catch (error) {
        console.log('✗ Error checking offscreen document:', error.message);
    }
    
    // Check if model files are accessible
    const modelFiles = [
        'ai/models/config.json',
        'ai/models/tokenizer.json',
        'ai/models/tokenizer_config.json',
        'ai/models/special_tokens_map.json',
        'ai/models/model_quantized.onnx'
    ];
    
    console.log('\nChecking model files:');
    for (const file of modelFiles) {
        try {
            const url = chrome.runtime.getURL(file);
            const response = await fetch(url);
            if (response.ok) {
                const size = response.headers.get('content-length');
                console.log(`✓ ${file} (${size ? Math.round(size/1024) + 'KB' : 'size unknown'})`);
            } else {
                console.log(`✗ ${file} - HTTP ${response.status}`);
            }
        } catch (error) {
            console.log(`✗ ${file} - ${error.message}`);
        }
    }
    
    // Check TabManager state
    if (typeof tabManager !== 'undefined') {
        console.log('\nTabManager state:');
        console.log('- AI Mode:', tabManager.aiMode);
        console.log('- Offscreen Ready:', tabManager.offscreenReady);
        console.log('- Model Data Loaded:', !!tabManager.modelData);
    }
    
    // Try to send a test message
    console.log('\nTesting message to offscreen:');
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'GENERATE_EMBEDDING',
            text: 'test'
        });
        if (response.success) {
            console.log('✓ Offscreen responded successfully');
            console.log('- Embedding length:', response.embedding?.length);
        } else {
            console.log('✗ Offscreen error:', response.error);
        }
    } catch (error) {
        console.log('✗ Could not communicate with offscreen:', error.message);
    }
    
    console.log('\n=== End Diagnostics ===');
}

// Run diagnostics
diagnoseAI();
