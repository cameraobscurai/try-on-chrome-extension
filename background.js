const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';

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

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'uploadImage') {
    const { dataURL, apiKey } = request;
    
    // Create form data
    const formData = new FormData();
    formData.append('file', dataURLtoBlob(dataURL));

    // Make the upload request
    fetch(`${RUNWAY_API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({ success: true, url: data.url });
    })
    .catch(error => {
      console.error('Upload error:', error);
      sendResponse({ success: false, error: error.message });
    });

    // Return true to indicate we will send a response asynchronously
    return true;
  }

  if (request.action === 'generateImage') {
    const { profileUrl, garmentUrl, apiKey } = request;

    fetch(`${RUNWAY_API_URL}/text_to_image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({ success: true, taskId: data.id });
    })
    .catch(error => {
      console.error('Generation error:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true;
  }

  if (request.action === 'pollTask') {
    const { taskId, apiKey } = request;

    fetch(`${RUNWAY_API_URL}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-09-13'
      }
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({ success: true, result: data });
    })
    .catch(error => {
      console.error('Polling error:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true;
  }
});