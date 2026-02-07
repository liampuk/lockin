import { DEFAULT_BLOCKED_SITES, getDomainFromUrl } from '../utils/sites';

// Helper function to check if a URL matches any blocked site
function isUrlBlocked(url: string, blockedSites: string[]): boolean {
  const domain = getDomainFromUrl(url);
  if (!domain) return false;

  // Check if domain matches any blocked site (exact match or subdomain)
  return blockedSites.some((blockedDomain) => {
    if (domain === blockedDomain) return true;
    // Check if domain is a subdomain of blocked domain (e.g., www.facebook.com matches facebook.com)
    return domain.endsWith(`.${blockedDomain}`);
  });
}

// Check and block the currently active tab if it's on a blocked site
async function checkAndBlockActiveTab() {
  try {
    const { blockingEnabled, blockedSites = [] } =
      await chrome.storage.local.get(['blockingEnabled', 'blockedSites']);

    // Only check if blocking is enabled
    if (blockingEnabled !== true || blockedSites.length === 0) {
      return;
    }

    // Get the currently active tab
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!activeTab || !activeTab.url) {
      return;
    }

    // Skip chrome://, chrome-extension://, and other internal URLs
    if (
      activeTab.url.startsWith('chrome://') ||
      activeTab.url.startsWith('chrome-extension://') ||
      activeTab.url.startsWith('edge://') ||
      activeTab.url.startsWith('about:')
    ) {
      return;
    }

    // Check if the active tab is on a blocked site
    if (isUrlBlocked(activeTab.url, blockedSites)) {
      // Redirect to blocked page
      const blockedPageUrl = chrome.runtime.getURL('/src/blocked/index.html');
      await chrome.tabs.update(activeTab.id!, { url: blockedPageUrl });
    }
  } catch (error) {
    console.error('Error checking active tab:', error);
  }
}

// Helper function to create a rule for a domain
// Using rule IDs starting from 1000 to avoid conflicts with static rules
function createRuleForDomain(
  domain: string,
  ruleId: number
): chrome.declarativeNetRequest.Rule {
  // Handle special case for x.com (needs regex)
  if (domain === 'x.com') {
    return {
      id: ruleId,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: {
          extensionPath: '/src/blocked/index.html',
        },
      },
      condition: {
        regexFilter: '^https?://([^/]*\\.)?x\\.com',
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      },
    };
  }

  // Standard domain blocking
  return {
    id: ruleId,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        extensionPath: '/src/blocked/index.html',
      },
    },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
  };
}

// Update dynamic rules based on blocked sites
async function updateDynamicRules(blockedSites: string[]) {
  try {
    // Get existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);

    // Remove all existing dynamic rules
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
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
        addRules: newRules,
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
  const { blockedSites, blockingEnabled } = await chrome.storage.local.get([
    'blockedSites',
    'blockingEnabled',
  ]);

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
      disableRulesetIds: ['block_rules'],
    });
  } catch (error) {
    // Ignore if ruleset doesn't exist or is already disabled
    console.log('Static ruleset already disabled or not found');
  }
}

// Helper function to update icon based on blocking state
async function updateIcon(enabled: boolean) {
  const iconPath = enabled
    ? {
        16: 'icons/locked16.png',
        48: 'icons/locked48.png',
        128: 'icons/locked128.png',
      }
    : {
        16: 'icons/unlocked16.png',
        48: 'icons/unlocked48.png',
        128: 'icons/unlocked128.png',
      };

  await chrome.action.setIcon({ path: iconPath });
}

/** YYYY-MM-DD for today (local time) */
function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Ensure lockTimeTodayMs and lockTimeDate are for today; reset if new day. */
async function ensureDailyTotalForToday(): Promise<void> {
  const today = getTodayDateString();
  const { lockTimeDate, lockTimeTodayMs } = await chrome.storage.local.get([
    'lockTimeDate',
    'lockTimeTodayMs',
  ]);
  if (lockTimeDate !== today) {
    await chrome.storage.local.set({
      lockTimeTodayMs: 0,
      lockTimeDate: today,
    });
  } else if (lockTimeTodayMs === undefined) {
    await chrome.storage.local.set({ lockTimeTodayMs: 0 });
  }
}

/** Add a session (sessionStartMs..sessionEndMs) to today's total. Only counts time within today. */
async function addSessionToDailyTotal(
  sessionStartMs: number,
  sessionEndMs: number
): Promise<void> {
  await ensureDailyTotalForToday();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const overlapStart = Math.max(sessionStartMs, todayStartMs);
  const overlapEnd = sessionEndMs;
  const durationMs = Math.max(0, overlapEnd - overlapStart);
  if (durationMs === 0) return;
  const { lockTimeTodayMs = 0 } = await chrome.storage.local.get([
    'lockTimeTodayMs',
  ]);
  await chrome.storage.local.set({
    lockTimeTodayMs: lockTimeTodayMs + durationMs,
  });
  await chrome.storage.local.remove(['lastLockInTimestamp']);
}

/** Set last lock-in timestamp (call when enabling blocking). */
async function setLockInTimestamp(): Promise<void> {
  await ensureDailyTotalForToday();
  await chrome.storage.local.set({ lastLockInTimestamp: Date.now() });
}

async function enableBlocking() {
  // Check if already enabled
  const { blockingEnabled } = await chrome.storage.local.get([
    'blockingEnabled',
  ]);
  if (blockingEnabled === true) {
    return; // Already enabled, do nothing
  }

  // Save new state and set lock-in timestamp for daily total
  await chrome.storage.local.set({ blockingEnabled: true });
  await setLockInTimestamp();

  // Update rules
  const { blockedSites = [] } = await chrome.storage.local.get([
    'blockedSites',
  ]);

  // Re-add dynamic rules
  await updateDynamicRules(blockedSites);

  // Clear cache and service workers for sites that aggressively cache
  // This ensures blocking works immediately after being enabled
  const origins = blockedSites.flatMap((domain: string) => [
    `https://${domain}`,
    `https://www.${domain}`,
    `http://${domain}`,
    `http://www.${domain}`,
  ]);

  await chrome.browsingData.remove(
    {
      origins: origins,
    },
    {
      cacheStorage: true,
      serviceWorkers: true,
    }
  );

  // Update icon based on state
  await updateIcon(true);

  // Show notification badge on icon
  await chrome.action.setBadgeText({ text: 'ON' });
  await chrome.action.setBadgeBackgroundColor({ color: '#7cd67f' });

  // Clear badge after 2 seconds
  setTimeout(async () => {
    await chrome.action.setBadgeText({ text: '' });
  }, 2000);

  // Check and block the currently active tab if it's on a blocked site
  await checkAndBlockActiveTab();
}

async function disableBlocking() {
  // Check if already disabled
  const { blockingEnabled, lastLockInTimestamp } =
    await chrome.storage.local.get(['blockingEnabled', 'lastLockInTimestamp']);
  if (blockingEnabled === false) {
    return; // Already disabled, do nothing
  }

  // Add this session to today's total before clearing state
  if (typeof lastLockInTimestamp === 'number') {
    await addSessionToDailyTotal(lastLockInTimestamp, Date.now());
  }

  // Save new state
  await chrome.storage.local.set({ blockingEnabled: false });

  // Remove all dynamic rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map((rule) => rule.id);
  if (existingRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.action === 'updateRules') {
      try {
        const { blockingEnabled } = await chrome.storage.local.get([
          'blockingEnabled',
        ]);

        // Only update rules if blocking is enabled
        if (blockingEnabled !== false) {
          await updateDynamicRules(message.blockedSites);
        }

        sendResponse({ success: true });
      } catch (error) {
        console.error('Error in updateRules:', error);
        sendResponse({ success: false, error: (error as Error).message });
      }
    } else if (message.action === 'toggleBlocking') {
      try {
        const { enabled, blockedSites = [] } = message;

        if (enabled) {
          await setLockInTimestamp();
          // Re-add dynamic rules
          await updateDynamicRules(blockedSites);
        } else {
          const { lastLockInTimestamp } = await chrome.storage.local.get([
            'lastLockInTimestamp',
          ]);
          if (typeof lastLockInTimestamp === 'number') {
            await addSessionToDailyTotal(lastLockInTimestamp, Date.now());
          }
          // Remove all dynamic rules
          const existingRules =
            await chrome.declarativeNetRequest.getDynamicRules();
          const existingRuleIds = existingRules.map((rule) => rule.id);
          if (existingRuleIds.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
              removeRuleIds: existingRuleIds,
            });
          }
        }

        sendResponse({ success: true });
      } catch (error) {
        console.error('Error in toggleBlocking:', error);
        sendResponse({ success: false, error: (error as Error).message });
      }
    }
  })();
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

// Listen for tab activation - check if newly active tab is blocked
chrome.tabs.onActivated.addListener(async () => {
  await checkAndBlockActiveTab();
});

// Listen for tab updates - check if updated tab is now active and blocked
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  // Only check when the URL changes and the tab is active
  if (changeInfo.url && tab.active) {
    await checkAndBlockActiveTab();
  }
});

// Initialize badge state on startup
chrome.runtime.onStartup.addListener(async () => {
  await initializeBlockedSites();
  const { blockingEnabled, blockedSites = [] } = await chrome.storage.local.get(
    ['blockingEnabled', 'blockedSites']
  );
  await updateIcon(blockingEnabled);
  if (blockingEnabled === false) {
    // Remove dynamic rules if blocking is disabled
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
      });
    }
  } else {
    // Ensure dynamic rules are in place
    await updateDynamicRules(blockedSites);
  }

  // Disable static ruleset since we're using dynamic rules
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules'],
    });
  } catch (error) {
    console.log('Static ruleset already disabled or not found');
  }
});

// Also run on install
chrome.runtime.onInstalled.addListener(async () => {
  await initializeBlockedSites();
  const { blockingEnabled, blockedSites = [] } = await chrome.storage.local.get(
    ['blockingEnabled', 'blockedSites']
  );
  await updateIcon(blockingEnabled);

  if (blockingEnabled === false) {
    // Remove dynamic rules if blocking is disabled
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
      });
    }
  } else {
    // Ensure dynamic rules are in place
    await updateDynamicRules(blockedSites);
  }

  // Disable static ruleset since we're using dynamic rules
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules'],
    });
  } catch (error) {
    console.log('Static ruleset already disabled or not found');
  }
});
