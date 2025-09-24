// Quick diagnostic to test model file loading
// Paste this in the service worker console

async function testModelPaths() {
    console.log('=== Testing Model File Paths ===');
    
    // Test the correct path
    const correctPath = chrome.runtime.getURL('ai/models/Xenova/all-MiniLM-L6-v2/');
    console.log('Model path:', correctPath);
    
    const files = [
        'config.json',
        'tokenizer.json', 
        'tokenizer_config.json',
        'special_tokens_map.json',
        'model_quantized.onnx'
    ];
    
    console.log('\nChecking files:');
    let allGood = true;
    
    for (const file of files) {
        try {
            const url = correctPath + file;
            const response = await fetch(url);
            if (response.ok) {
                const size = response.headers.get('content-length');
                console.log(`✓ ${file} - ${size ? (size/1024).toFixed(1) + 'KB' : 'loaded'}`);
            } else {
                console.log(`✗ ${file} - HTTP ${response.status}`);
                allGood = false;
            }
        } catch (error) {
            console.log(`✗ ${file} - ${error.message}`);
            allGood = false;
        }
    }
    
    console.log('\n' + (allGood ? '✅ All model files accessible!' : '❌ Some files failed to load'));
    
    // Try to load the model data like background.js does
    if (allGood) {
        console.log('\nTrying full load like background.js...');
        try {
            if (typeof tabManager !== 'undefined' && tabManager.loadModelData) {
                const data = await tabManager.loadModelData();
                console.log('✅ Model data loaded successfully!');
                console.log('- Config model type:', data.config.model_type);
                console.log('- Tokenizer vocab size:', Object.keys(data.tokenizer.model.vocab).length);
            } else {
                console.log('TabManager not available, testing fetch directly...');
                const configRes = await fetch(correctPath + 'config.json');
                const config = await configRes.json();
                console.log('✅ Direct fetch successful!');
                console.log('- Model type:', config.model_type);
            }
        } catch (error) {
            console.log('❌ Load failed:', error.message);
        }
    }
    
    console.log('\n=== End Test ===');
}

// Run the test
testModelPaths();
