// Constants
const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';
const API_KEY = 'key_3f196a35aef9f226e8deef988f936e7109b7ae729b98f02fbec8c9df582551f29a1eb4b41d16cd23940e8f5ea03bb06ae9aecc8145b718c91c2a1127f58d7c6a';

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

// Set API key in input
apiKeyInput.value = API_KEY;

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

// Helper function to convert data URL to Blob
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Helper function to upload image and get URL
async function uploadImage(dataURL) {
  const formData = new FormData();
  formData.append('file', dataURLtoBlob(dataURL));

  const response = await fetch(`${RUNWAY_API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKeyInput.value.trim()}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data.url;
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

    // Make the API request
    const response = await fetch(`${RUNWAY_API_URL}/text_to_image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyInput.value.trim()}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify({
        promptText: "IMG_1 wearing IMG_2",
        model: "gen4_image",
        ratio: "1080:1440",
        referenceImages: [
          { uri: profileUrl },
          { uri: garmentUrl }
        ]
      })
    });

    // Handle non-200 responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Generation started:', data);

    // Poll for results
    const result = await pollForCompletion(data.id);
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
    const response = await fetch(`${RUNWAY_API_URL}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKeyInput.value.trim()}`,
        'X-Runway-Version': '2024-09-13'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === 'SUCCEEDED') {
      return result;
    } else if (result.status === 'FAILED') {
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