// Listen for the keyboard shortcut command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-blocking') {
    await toggleBlocking();
  }
});

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
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules']
    });
  }
  
  // Show notification badge on icon
  await chrome.action.setBadgeText({ 
    text: newState ? 'ON' : 'OFF' 
  });
  await chrome.action.setBadgeBackgroundColor({ 
    color: newState ? '#4ade80' : '#ef4444' 
  });
  
  // Clear badge after 2 seconds
  setTimeout(async () => {
    await chrome.action.setBadgeText({ text: '' });
  }, 2000);
}

// Initialize badge state on startup
chrome.runtime.onStartup.addListener(async () => {
  const { blockingEnabled } = await chrome.storage.local.get(['blockingEnabled']);
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
  if (blockingEnabled === false) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules']
    });
  }
});
