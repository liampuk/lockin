import { DEFAULT_BLOCKED_SITES, getDomainFromUrl } from '../utils/sites';

function isUrlBlocked(url: string, blockedSites: string[]): boolean {
  const domain = getDomainFromUrl(url);
  if (!domain) return false;

  return blockedSites.some((blockedDomain) => {
    if (domain === blockedDomain) return true;
    return domain.endsWith(`.${blockedDomain}`);
  });
}

async function checkAndBlockActiveTab() {
  try {
    const { blockingEnabled, blockedSites = [] } =
      await chrome.storage.local.get(['blockingEnabled', 'blockedSites']);

    if (blockingEnabled !== true || blockedSites.length === 0) {
      return;
    }

    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!activeTab || !activeTab.url) {
      return;
    }

    if (
      activeTab.url.startsWith('chrome://') ||
      activeTab.url.startsWith('chrome-extension://') ||
      activeTab.url.startsWith('edge://') ||
      activeTab.url.startsWith('about:')
    ) {
      return;
    }

    if (isUrlBlocked(activeTab.url, blockedSites)) {
      const blockedPageUrl = chrome.runtime.getURL('/src/blocked/index.html');
      await chrome.tabs.update(activeTab.id!, { url: blockedPageUrl });
    }
  } catch (error) {
    console.error('Error checking active tab:', error);
  }
}

function createRuleForDomain(
  domain: string,
  ruleId: number
): chrome.declarativeNetRequest.Rule {
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

async function updateDynamicRules(blockedSites: string[]) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);

    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
      });
    }

    const newRules = blockedSites.map((domain, index) =>
      createRuleForDomain(domain, 1000 + index)
    );

    if (newRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules,
      });
    }
  } catch (error) {
    console.error('Error updating dynamic rules:', error);
    throw error;
  }
}

async function initializeBlockedSites() {
  const { blockedSites, blockingEnabled } = await chrome.storage.local.get([
    'blockedSites',
    'blockingEnabled',
  ]);

  if (!blockedSites || blockedSites.length === 0) {
    await chrome.storage.local.set({ blockedSites: DEFAULT_BLOCKED_SITES });
    if (blockingEnabled !== false) {
      await updateDynamicRules(DEFAULT_BLOCKED_SITES);
    }
  } else {
    if (blockingEnabled !== false) {
      await updateDynamicRules(blockedSites);
    }
  }

  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules'],
    });
  } catch {
    // ignore
  }
}

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

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

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

async function setLockInTimestamp(): Promise<void> {
  await ensureDailyTotalForToday();
  await chrome.storage.local.set({ lastLockInTimestamp: Date.now() });
}

async function enableBlocking() {
  const { blockingEnabled } = await chrome.storage.local.get([
    'blockingEnabled',
  ]);
  if (blockingEnabled === true) {
    return;
  }

  await chrome.storage.local.set({ blockingEnabled: true });
  await setLockInTimestamp();

  const { blockedSites = [] } = await chrome.storage.local.get([
    'blockedSites',
  ]);

  await updateDynamicRules(blockedSites);

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

  await updateIcon(true);
  await chrome.action.setBadgeText({ text: 'ON' });
  await chrome.action.setBadgeBackgroundColor({ color: '#7cd67f' });

  setTimeout(async () => {
    await chrome.action.setBadgeText({ text: '' });
  }, 2000);

  await checkAndBlockActiveTab();
}

async function disableBlocking() {
  const { blockingEnabled, lastLockInTimestamp } =
    await chrome.storage.local.get(['blockingEnabled', 'lastLockInTimestamp']);
  if (blockingEnabled === false) {
    return;
  }

  if (typeof lastLockInTimestamp === 'number') {
    await addSessionToDailyTotal(lastLockInTimestamp, Date.now());
  }

  await chrome.storage.local.set({ blockingEnabled: false });

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map((rule) => rule.id);
  if (existingRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
    });
  }

  await updateIcon(false);
  await chrome.action.setBadgeText({ text: 'OFF' });
  await chrome.action.setBadgeBackgroundColor({ color: '#ddd' });

  setTimeout(async () => {
    await chrome.action.setBadgeText({ text: '' });
  }, 2000);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.action === 'updateRules') {
      try {
        const { blockingEnabled } = await chrome.storage.local.get([
          'blockingEnabled',
        ]);

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
          await updateDynamicRules(blockedSites);
        } else {
          const { lastLockInTimestamp } = await chrome.storage.local.get([
            'lastLockInTimestamp',
          ]);
          if (typeof lastLockInTimestamp === 'number') {
            await addSessionToDailyTotal(lastLockInTimestamp, Date.now());
          }
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
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'enable-blocking') {
    await enableBlocking();
  } else if (command === 'disable-blocking') {
    await disableBlocking();
  }
});

chrome.tabs.onActivated.addListener(async () => {
  await checkAndBlockActiveTab();
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    await checkAndBlockActiveTab();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeBlockedSites();
  const { blockingEnabled, blockedSites = [] } = await chrome.storage.local.get(
    ['blockingEnabled', 'blockedSites']
  );
  await updateIcon(blockingEnabled);
  if (blockingEnabled === false) {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
      });
    }
  } else {
    await updateDynamicRules(blockedSites);
  }

  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules'],
    });
  } catch {
    // ignore
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await initializeBlockedSites();
  const { blockingEnabled, blockedSites = [] } = await chrome.storage.local.get(
    ['blockingEnabled', 'blockedSites']
  );
  await updateIcon(blockingEnabled);

  if (blockingEnabled === false) {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
      });
    }
  } else {
    await updateDynamicRules(blockedSites);
  }

  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['block_rules'],
    });
  } catch {
    // ignore
  }
});
