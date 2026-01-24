// Helper function to update icon based on blocking state
async function updateIcon(enabled) {
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

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleBlocking');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  // Load saved state
  chrome.storage.local.get(['blockingEnabled'], async (result) => {
    const enabled = result.blockingEnabled !== false; // Default to true
    toggle.checked = enabled;
    updateUI(enabled);
    await updateIcon(enabled);
  });

  // Handle toggle change
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    
    // Save state
    chrome.storage.local.set({ blockingEnabled: enabled });
    
    // Update rules
    if (enabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ['block_rules']
      });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ['block_rules']
      });
    }
    
    // Update icon
    await updateIcon(enabled);
    
    updateUI(enabled);
  });

  function updateUI(enabled) {
    if (enabled) {
      statusDot.classList.remove('inactive');
      statusText.textContent = 'Blocking Active';
    } else {
      statusDot.classList.add('inactive');
      statusText.textContent = 'Blocking Paused';
    }
  }
});