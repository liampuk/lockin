document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleBlocking');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  // Load saved state
  chrome.storage.local.get(['blockingEnabled'], (result) => {
    const enabled = result.blockingEnabled !== false; // Default to true
    toggle.checked = enabled;
    updateUI(enabled);
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
