// Listen for the keyboard shortcut command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-blocking') {
    await toggleBlocking();
  }
});

// Helper function to update icon based on blocking state
async function updateIcon(enabled) {
  // You can use different icons for enabled/disabled states
  // For now, using the same icons - you can create icon16-disabled.png, etc. later
  const iconPath = enabled 
    ? {
        16: 'icons/locked16.png',
        48: 'icons/locked48.png',
        128: 'icons/locked128.png'
      }
    : {
        16: 'icons/unlocked16.png',  // Replace with icon16-disabled.png if you create variants
        48: 'icons/unlocked48.png',  // Replace with icon48-disabled.png if you create variants
        128: 'icons/unlocked128.png' // Replace with icon128-disabled.png if you create variants
      };
  
  await chrome.action.setIcon({ path: iconPath });
}

async function toggleBlocking() {
  // Get current state
  const { blockingEnabled } = await chrome.storage.local.get(['blockingEnabled']);
  const currentlyEnabled = blockingEnabled !== false; // Default to true
  const newState = !currentlyEnabled;
  
  // Save new state
  await chrome.storage.local.set({ blockingEnabled: newState });
  
  // Update rules
  if (newState) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['block_rules']
    });
    
    // Clear cache and service workers for sites that aggressively cache (like x.com)
    // This ensures blocking works immediately after being toggled on
    await chrome.browsingData.remove({
      "origins": [
        "https://x.com",
        "https://twitter.com",
        "https://www.x.com",
        "https://www.twitter.com"
      ]
    }, {
      "cacheStorage": true,
      "serviceWorkers": true
    });
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules']
    });
  }

  // Update icon based on state
  await updateIcon(newState);
  
  // Show notification badge on icon
  await chrome.action.setBadgeText({ 
    text: newState ? 'ON' : 'OFF' 
  });
  await chrome.action.setBadgeBackgroundColor({ 
    color: newState ? '#7cd67f' : '#ddd' 
  });
  
  // Clear badge after 2 seconds
  setTimeout(async () => {
    await chrome.action.setBadgeText({ text: '' });
  }, 2000);
}

// Initialize badge state on startup
chrome.runtime.onStartup.addListener(async () => {
  const { blockingEnabled } = await chrome.storage.local.get(['blockingEnabled']);
  await updateIcon(blockingEnabled);
  if (blockingEnabled === false) {
    // Ensure rules are disabled if blocking was turned off
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules']
    });
  }
});

// Also run on install
chrome.runtime.onInstalled.addListener(async () => {
  const { blockingEnabled } = await chrome.storage.local.get(['blockingEnabled']);
  await updateIcon(blockingEnabled);

  if (blockingEnabled === false) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules']
    });
  }
});
