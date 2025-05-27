const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';
const API_KEY = 'key_3f196a35aef9f226e8deef988f936e7109b7ae729b98f02fbec8c9df582551f29a1eb4b41d16cd23940e8f5ea03bb06ae9aecc8145b718c91c2a1127f58d7c6a';

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
    const { dataURL } = request;
    
    // Create form data
    const formData = new FormData();
    formData.append('file', dataURLtoBlob(dataURL));

    // Make the upload request
    fetch(`${RUNWAY_API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
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
    const { profileUrl, garmentUrl } = request;

    fetch(`${RUNWAY_API_URL}/text_to_image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
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
    const { taskId } = request;

    fetch(`${RUNWAY_API_URL}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
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