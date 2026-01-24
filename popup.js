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

// Helper function to get domain from URL
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

// Helper function to get display name from domain
function getDisplayName(domain) {
  const nameMap = {
    'facebook.com': { name: 'Facebook', icon: '📘' },
    'twitter.com': { name: 'Twitter / X', icon: '🐦' },
    'x.com': { name: 'Twitter / X', icon: '🐦' },
    'instagram.com': { name: 'Instagram', icon: '📷' },
    'tiktok.com': { name: 'TikTok', icon: '🎵' },
    'reddit.com': { name: 'Reddit', icon: '🤖' },
    'youtube.com': { name: 'YouTube', icon: '▶️' },
    'snapchat.com': { name: 'Snapchat', icon: '👻' },
    'linkedin.com': { name: 'LinkedIn', icon: '💼' },
    'pinterest.com': { name: 'Pinterest', icon: '📌' },
    'tumblr.com': { name: 'Tumblr', icon: '📝' },
    'discord.com': { name: 'Discord', icon: '💬' }
  };
  
  const info = nameMap[domain];
  if (info) {
    return info;
  }
  
  // Default: use domain name with first letter capitalized
  return {
    name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
    icon: '🌐'
  };
}

// Render blocked sites list
async function renderBlockedSites() {
  const sitesList = document.getElementById('sitesList');
  const { blockedSites = [] } = await chrome.storage.local.get(['blockedSites']);
  
  sitesList.innerHTML = '';
  
  if (blockedSites.length === 0) {
    sitesList.innerHTML = '<div style="text-align: center; color: #a0a0a0; padding: 20px;">No blocked sites</div>';
    return;
  }
  
  blockedSites.forEach((domain, index) => {
    const displayInfo = getDisplayName(domain);
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    siteItem.innerHTML = `
      <span class="site-icon">${displayInfo.icon}</span>
      <span class="site-name">${displayInfo.name}</span>
      <span class="blocked-badge">Blocked</span>
      <button class="remove-btn" data-domain="${domain}" data-index="${index}">Remove</button>
    `;
    sitesList.appendChild(siteItem);
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const domain = e.target.getAttribute('data-domain');
      await removeBlockedSite(domain);
    });
  });
}

// Remove a blocked site
async function removeBlockedSite(domain) {
  const { blockedSites = [] } = await chrome.storage.local.get(['blockedSites']);
  const updatedSites = blockedSites.filter(site => site !== domain);
  
  await chrome.storage.local.set({ blockedSites: updatedSites });
  await renderBlockedSites();
  
  // Update rules in background
  await chrome.runtime.sendMessage({
    action: 'updateRules',
    blockedSites: updatedSites
  });
}

// Add current site to blocked list
async function addCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      alert('Unable to get current tab URL');
      return;
    }
    
    const domain = getDomainFromUrl(tab.url);
    if (!domain) {
      alert('Invalid URL');
      return;
    }
    
    // Check if already blocked
    const { blockedSites = [] } = await chrome.storage.local.get(['blockedSites']);
    if (blockedSites.includes(domain)) {
      alert(`${domain} is already blocked`);
      return;
    }
    
    // Add to blocked sites
    const updatedSites = [...blockedSites, domain];
    await chrome.storage.local.set({ blockedSites: updatedSites });
    await renderBlockedSites();
    
    // Update rules in background
    await chrome.runtime.sendMessage({
      action: 'updateRules',
      blockedSites: updatedSites
    });
    
    // Show feedback
    const btn = document.getElementById('addCurrentSiteBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Added!';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1500);
  } catch (error) {
    console.error('Error adding current site:', error);
    alert('Error adding site: ' + error.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('toggleBlocking');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const addCurrentSiteBtn = document.getElementById('addCurrentSiteBtn');

  // Load saved state
  chrome.storage.local.get(['blockingEnabled'], async (result) => {
    const enabled = result.blockingEnabled !== false; // Default to true
    toggle.checked = enabled;
    updateUI(enabled);
    await updateIcon(enabled);
  });

  // Load and render blocked sites
  await renderBlockedSites();

  // Handle toggle change
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    
    // Save state
    chrome.storage.local.set({ blockingEnabled: enabled });
    
    // Update rules via background script
    const { blockedSites = [] } = await chrome.storage.local.get(['blockedSites']);
    await chrome.runtime.sendMessage({
      action: 'toggleBlocking',
      enabled: enabled,
      blockedSites: blockedSites
    });
    
    // Update icon
    await updateIcon(enabled);
    
    updateUI(enabled);
  });

  // Handle add current site button
  addCurrentSiteBtn.addEventListener('click', addCurrentSite);

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
