// Default blocked sites
const DEFAULT_BLOCKED_SITES = [
  'facebook.com',
  'x.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'youtube.com',
  'pinterest.com',
];

// Helper function to create a rule for a domain
// Using rule IDs starting from 1000 to avoid conflicts with static rules
function createRuleForDomain(domain, ruleId) {
  // Handle special case for x.com (needs regex)
  if (domain === 'x.com') {
    return {
      id: ruleId,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          extensionPath: '/blocked.html'
        }
      },
      condition: {
        regexFilter: '^https?://([^/]*\\.)?x\\.com',
        resourceTypes: ['main_frame']
      }
    };
  }
  
  // Standard domain blocking
  return {
    id: ruleId,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        extensionPath: '/blocked.html'
      }
    },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: ['main_frame']
    }
  };
}

// Update dynamic rules based on blocked sites
async function updateDynamicRules(blockedSites) {
  try {
    // Get existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(rule => rule.id);
    
    // Remove all existing dynamic rules
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      });
    }
    
    // Create new rules for each blocked site
    // Use rule IDs starting from 1000 to avoid conflicts with static rules
    const newRules = blockedSites.map((domain, index) => 
      createRuleForDomain(domain, 1000 + index)
    );
    
    // Add new rules
    if (newRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
      });
      console.log(`Updated ${newRules.length} dynamic rules`);
    } else {
      console.log('No rules to add');
    }
  } catch (error) {
    console.error('Error updating dynamic rules:', error);
    throw error;
  }
}

// Initialize default blocked sites if not already set
async function initializeBlockedSites() {
  const { blockedSites, blockingEnabled } = await chrome.storage.local.get(['blockedSites', 'blockingEnabled']);
  
  if (!blockedSites || blockedSites.length === 0) {
    // Set default blocked sites
    await chrome.storage.local.set({ blockedSites: DEFAULT_BLOCKED_SITES });
    // Update rules only if blocking is enabled
    if (blockingEnabled !== false) {
      await updateDynamicRules(DEFAULT_BLOCKED_SITES);
    }
  } else {
    // Ensure rules are up to date only if blocking is enabled
    if (blockingEnabled !== false) {
      await updateDynamicRules(blockedSites);
    }
  }
  
  // Disable static ruleset since we're using dynamic rules
  // This prevents conflicts between static and dynamic rules
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules']
    });
  } catch (error) {
    // Ignore if ruleset doesn't exist or is already disabled
    console.log('Static ruleset already disabled or not found');
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'updateRules') {
    try {
      const { blockingEnabled } = await chrome.storage.local.get(['blockingEnabled']);
      
      // Only update rules if blocking is enabled
      if (blockingEnabled !== false) {
        await updateDynamicRules(message.blockedSites);
        // Static ruleset is disabled, we only use dynamic rules
      }
      // If blocking is disabled, we don't update rules (they should already be removed)
      // The rules will be updated when blocking is re-enabled
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error in updateRules:', error);
      sendResponse({ success: false, error: error.message });
    }
  } else if (message.action === 'toggleBlocking') {
    try {
      const { enabled, blockedSites = [] } = message;
      
      if (enabled) {
        // Re-add dynamic rules
        await updateDynamicRules(blockedSites);
        // Static ruleset is disabled, we only use dynamic rules
      } else {
        // Remove all dynamic rules
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const existingRuleIds = existingRules.map(rule => rule.id);
        if (existingRuleIds.length > 0) {
          await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds
          });
        }
      }
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error in toggleBlocking:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep the message channel open for async response
});

// Listen for keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'enable-blocking') {
    await enableBlocking();
  } else if (command === 'disable-blocking') {
    await disableBlocking();
  }
});

// Helper function to update icon based on blocking state
async function updateIcon(enabled) {
  const iconPath = enabled 
    ? {
        16: 'icons/locked16.png',
        48: 'icons/locked48.png',
        128: 'icons/locked128.png'
      }
    : {
        16: 'icons/unlocked16.png',
        48: 'icons/unlocked48.png',
        128: 'icons/unlocked128.png'
      };
  
  await chrome.action.setIcon({ path: iconPath });
}

async function enableBlocking() {
  // Check if already enabled
  const { blockingEnabled } = await chrome.storage.local.get(['blockingEnabled']);
  if (blockingEnabled === true) {
    return; // Already enabled, do nothing
  }
  
  // Save new state
  await chrome.storage.local.set({ blockingEnabled: true });
  
  // Update rules
  const { blockedSites = [] } = await chrome.storage.local.get(['blockedSites']);
  
  // Re-add dynamic rules
  await updateDynamicRules(blockedSites);
  
  // Clear cache and service workers for sites that aggressively cache
  // This ensures blocking works immediately after being enabled
  const origins = blockedSites.flatMap(domain => [
    `https://${domain}`,
    `https://www.${domain}`,
    `http://${domain}`,
    `http://www.${domain}`
  ]);
  
  await chrome.browsingData.remove({
    origins: origins
  }, {
    cacheStorage: true,
    serviceWorkers: true
  });

  // Update icon based on state
  await updateIcon(true);
  
  // Show notification badge on icon
  await chrome.action.setBadgeText({ text: 'ON' });
  await chrome.action.setBadgeBackgroundColor({ color: '#7cd67f' });
  
  // Clear badge after 2 seconds
  setTimeout(async () => {
    await chrome.action.setBadgeText({ text: '' });
  }, 2000);
}

async function disableBlocking() {
  // Check if already disabled
  const { blockingEnabled } = await chrome.storage.local.get(['blockingEnabled']);
  if (blockingEnabled === false) {
    return; // Already disabled, do nothing
  }
  
  // Save new state
  await chrome.storage.local.set({ blockingEnabled: false });
  
  // Remove all dynamic rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map(rule => rule.id);
  if (existingRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds
    });
  }

  // Update icon based on state
  await updateIcon(false);
  
  // Show notification badge on icon
  await chrome.action.setBadgeText({ text: 'OFF' });
  await chrome.action.setBadgeBackgroundColor({ color: '#ddd' });
  
  // Clear badge after 2 seconds
  setTimeout(async () => {
    await chrome.action.setBadgeText({ text: '' });
  }, 2000);
}

// Initialize badge state on startup
chrome.runtime.onStartup.addListener(async () => {
  await initializeBlockedSites();
  const { blockingEnabled, blockedSites = [] } = await chrome.storage.local.get(['blockingEnabled', 'blockedSites']);
  await updateIcon(blockingEnabled);
  if (blockingEnabled === false) {
    // Remove dynamic rules if blocking is disabled
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(rule => rule.id);
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      });
    }
  } else {
    // Ensure dynamic rules are in place
    await updateDynamicRules(blockedSites);
  }
  
  // Disable static ruleset since we're using dynamic rules
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules']
    });
  } catch (error) {
    console.log('Static ruleset already disabled or not found');
  }
});

// Also run on install
chrome.runtime.onInstalled.addListener(async () => {
  await initializeBlockedSites();
  const { blockingEnabled, blockedSites = [] } = await chrome.storage.local.get(['blockingEnabled', 'blockedSites']);
  await updateIcon(blockingEnabled);

  if (blockingEnabled === false) {
    // Remove dynamic rules if blocking is disabled
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(rule => rule.id);
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      });
    }
  } else {
    // Ensure dynamic rules are in place
    await updateDynamicRules(blockedSites);
  }
  
  // Disable static ruleset since we're using dynamic rules
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules']
    });
  } catch (error) {
    console.log('Static ruleset already disabled or not found');
  }
});
