// Constants
const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';

// Elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const removeImageBtn = document.getElementById('remove-image-btn');
const garmentDropArea = document.getElementById('garment-drop-area');
const garmentFileInput = document.getElementById('garment-file-input');
const garmentPreviewContainer = document.getElementById('garment-preview-container');
const garmentPreviewImage = document.getElementById('garment-preview-image');
const removeGarmentBtn = document.getElementById('remove-garment-btn');
const wardrobeContainer = document.getElementById('wardrobe-container');
const apiKeyInput = document.getElementById('api-key-input');
const tryOnBtn = document.getElementById('try-on-btn');

// Prevent default drag behaviors for both drop areas
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
  garmentDropArea.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

// Highlight drop zones when item is dragged over
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false);
  garmentDropArea.addEventListener(eventName, highlightGarment, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false);
  garmentDropArea.addEventListener(eventName, unhighlightGarment, false);
});

// Handle dropped files for both areas
dropArea.addEventListener('drop', handleDrop, false);
garmentDropArea.addEventListener('drop', handleGarmentDrop, false);

// Handle click on drop areas
dropArea.addEventListener('click', () => {
  fileInput.click();
});

garmentDropArea.addEventListener('click', () => {
  garmentFileInput.click();
});

// Handle file selection for both inputs
fileInput.addEventListener('change', handleFiles);
garmentFileInput.addEventListener('change', handleGarmentFiles);

// Remove image buttons click
removeImageBtn.addEventListener('click', removeImage);
removeGarmentBtn.addEventListener('click', removeGarmentImage);

// API key input change
apiKeyInput.addEventListener('input', updateTryOnButton);

// Try on button click
tryOnBtn.addEventListener('click', handleTryOn);

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight() {
  dropArea.classList.add('highlight');
}

function unhighlight() {
  dropArea.classList.remove('highlight');
}

function highlightGarment() {
  garmentDropArea.classList.add('highlight');
}

function unhighlightGarment() {
  garmentDropArea.classList.remove('highlight');
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles({ target: { files } });
}

function handleGarmentDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleGarmentFiles({ target: { files } });
}

function handleFiles(e) {
  const files = e.target.files;

  if (files && files.length) {
    const file = files[0];

    if (!file.type.match('image.*')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
      previewImage.src = e.target.result;
      previewContainer.style.display = 'block';
      dropArea.style.display = 'none';
      updateTryOnButton();
    };

    reader.readAsDataURL(file);
  }
}

function handleGarmentFiles(e) {
  const files = e.target.files;

  if (files && files.length) {
    const file = files[0];

    if (!file.type.match('image.*')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
      garmentPreviewImage.src = e.target.result;
      garmentPreviewContainer.style.display = 'block';
      garmentDropArea.style.display = 'none';
      updateTryOnButton();
    };

    reader.readAsDataURL(file);
  }
}

function removeImage() {
  previewImage.src = '';
  previewContainer.style.display = 'none';
  dropArea.style.display = 'block';
  fileInput.value = '';
  updateTryOnButton();
}

function removeGarmentImage() {
  garmentPreviewImage.src = '';
  garmentPreviewContainer.style.display = 'none';
  garmentDropArea.style.display = 'block';
  garmentFileInput.value = '';
  updateTryOnButton();
}

function updateTryOnButton() {
  const hasImage = previewImage.src !== '';
  const hasGarment = garmentPreviewImage.src !== '';
  const hasApiKey = apiKeyInput.value.trim() !== '';
  tryOnBtn.disabled = !(hasImage && hasGarment && hasApiKey);
}

// Helper function to upload image and get URL
async function uploadImage(dataURL) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'uploadImage',
      dataURL,
      apiKey: apiKeyInput.value.trim()
    }, response => {
      if (response.success) {
        resolve(response.url);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

async function handleTryOn() {
  try {
    // Validate inputs
    if (!previewImage.src || !garmentPreviewImage.src) {
      throw new Error('Please upload both a profile picture and a garment image');
    }

    if (!apiKeyInput.value.trim()) {
      throw new Error('Please enter your Runway API key');
    }

    // Update button state
    tryOnBtn.disabled = true;
    tryOnBtn.innerHTML = '<div class="spinner"></div>';

    // Upload both images first
    const [profileUrl, garmentUrl] = await Promise.all([
      uploadImage(previewImage.src),
      uploadImage(garmentPreviewImage.src)
    ]);

    // Start generation
    const generationResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'generateImage',
        profileUrl,
        garmentUrl,
        apiKey: apiKeyInput.value.trim()
      }, response => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });

    console.log('Generation started:', generationResponse);

    // Poll for results
    const result = await pollForCompletion(generationResponse.taskId);
    console.log('Generation completed:', result);

    // Display the result
    showResult(result.output[0]);

  } catch (error) {
    console.error('Error:', error);
    alert('Error generating image: ' + error.message);
  } finally {
    tryOnBtn.disabled = false;
    tryOnBtn.textContent = 'Try On';
  }
}

async function pollForCompletion(taskId) {
  const maxAttempts = 30;
  const interval = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'pollTask',
        taskId,
        apiKey: apiKeyInput.value.trim()
      }, response => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      });
    });

    if (response.status === 'SUCCEEDED') {
      return response;
    } else if (response.status === 'FAILED') {
      throw new Error('Generation failed');
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for generation');
}

function showResult(imageUrl) {
  const resultContainer = document.createElement('div');
  resultContainer.className = 'result-container';
  resultContainer.innerHTML = `
    <div class="result-overlay">
      <div class="result-content">
        <img src="${imageUrl}" alt="Generated outfit" class="result-image">
        <button class="btn" onclick="this.closest('.result-overlay').remove()">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(resultContainer);
}

// Initialize button state
updateTryOnButton();