/**
 * Model Downloader Script
 * Downloads and bundles the AI model locally for offline use
 * Run this with Node.js: node scripts/download-model.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Model configuration
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const BASE_URL = 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/';

// Files needed for the quantized model
const MODEL_FILES = [
  'model_quantized.onnx',
  'tokenizer.json',
  'tokenizer_config.json',
  'config.json',
  'special_tokens_map.json'
];

// Create models directory
const modelsDir = path.join(__dirname, '..', 'models', 'all-MiniLM-L6-v2');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Download function
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

// Download all model files
async function downloadModel() {
  console.log('Downloading model files for', MODEL_ID);
  console.log('Target directory:', modelsDir);
  
  for (const filename of MODEL_FILES) {
    const url = BASE_URL + filename;
    const filepath = path.join(modelsDir, filename);
    
    console.log(`Downloading ${filename}...`);
    
    try {
      await downloadFile(url, filepath);
      const stats = fs.statSync(filepath);
      console.log(`✓ ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      console.error(`✗ Failed to download ${filename}:`, error.message);
    }
  }
  
  console.log('\nModel download complete!');
  console.log('Model files saved to:', modelsDir);
  
  // Create a manifest for the model
  const manifest = {
    modelId: MODEL_ID,
    files: MODEL_FILES,
    downloaded: new Date().toISOString(),
    version: '1.0.0'
  };
  
  fs.writeFileSync(
    path.join(modelsDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('✓ Model manifest created');
}

// Run the download
downloadModel().catch(console.error);
