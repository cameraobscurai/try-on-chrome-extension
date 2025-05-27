// Constants
const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1/text_to_image';
const API_KEY = 'key_3f196a35aef9f226e8deef988f936e7109b7ae729b98f02fbec8c9df582551f29a1eb4b41d16cd23940e8f5ea03bb06ae9aecc8145b718c91c2a1127f58d7c6a';

// Elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const removeImageBtn = document.getElementById('remove-image-btn');
const wardrobeContainer = document.getElementById('wardrobe-container');
const apiKeyInput = document.getElementById('api-key-input');
const tryOnBtn = document.getElementById('try-on-btn');

// Set API key in input
apiKeyInput.value = API_KEY;

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

// Highlight drop zone when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false);
});

// Handle dropped files
dropArea.addEventListener('drop', handleDrop, false);

// Handle click on drop area
dropArea.addEventListener('click', () => {
  fileInput.click();
});

// Handle file selection
fileInput.addEventListener('change', handleFiles);

// Remove image button click
removeImageBtn.addEventListener('click', removeImage);

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

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  handleFiles({ target: { files } });
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

function removeImage() {
  previewImage.src = '';
  previewContainer.style.display = 'none';
  dropArea.style.display = 'block';
  fileInput.value = '';
  updateTryOnButton();
}

function updateTryOnButton() {
  const hasImage = previewImage.src !== '';
  const hasApiKey = apiKeyInput.value.trim() !== '';
  tryOnBtn.disabled = !(hasImage && hasApiKey);
}

async function handleTryOn() {
  try {
    tryOnBtn.disabled = true;
    tryOnBtn.innerHTML = '<div class="spinner"></div>';

    const response = await fetch(RUNWAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyInput.value.trim()}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify({
        promptText: "A person wearing fashionable clothing",
        model: "gen4_image",
        ratio: "1080:1440",
        referenceImages: [
          {
            uri: previewImage.src
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKeyInput.value.trim()}`,
        'X-Runway-Version': '2024-09-13'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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