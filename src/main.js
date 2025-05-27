// File upload handling
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const removeImageBtn = document.getElementById('remove-image-btn');
const apiKeyInput = document.getElementById('api-key-input');
const tryOnBtn = document.getElementById('try-on-btn');

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

// Initialize button state
updateTryOnButton();