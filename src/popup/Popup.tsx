import { useState, useEffect, useCallback } from "react";
import { useChromeStorage } from "../hooks/useChromeStorage";
import {
  getDisplayName,
  getDomainFromUrl,
  DEFAULT_BLOCKED_SITES,
} from "../utils/sites";

async function updateIcon(enabled: boolean) {
  const iconPath = enabled
    ? {
        16: "icons/locked16.png",
        48: "icons/locked48.png",
        128: "icons/locked128.png",
      }
    : {
        16: "icons/unlocked16.png",
        48: "icons/unlocked48.png",
        128: "icons/unlocked128.png",
      };

  await chrome.action.setIcon({ path: iconPath });
}

export function Popup() {
  const [blockingEnabled, setBlockingEnabled, loadingEnabled] =
    useChromeStorage("blockingEnabled", true);
  const [blockedSites, setBlockedSites, loadingSites] = useChromeStorage<
    string[]
  >("blockedSites", DEFAULT_BLOCKED_SITES);
  const [addButtonText, setAddButtonText] = useState("Add Current Site");
  const [addButtonDisabled, setAddButtonDisabled] = useState(false);

  const loading = loadingEnabled || loadingSites;

  // Update icon when blocking state changes
  useEffect(() => {
    if (!loading) {
      updateIcon(blockingEnabled);
    }
  }, [blockingEnabled, loading]);

  const handleToggle = useCallback(async () => {
    const newEnabled = !blockingEnabled;
    await setBlockingEnabled(newEnabled);
    await updateIcon(newEnabled);

    // Update rules via background script
    await chrome.runtime.sendMessage({
      action: "toggleBlocking",
      enabled: newEnabled,
      blockedSites: blockedSites,
    });
  }, [blockingEnabled, blockedSites, setBlockingEnabled]);

  const handleRemoveSite = useCallback(
    async (domain: string) => {
      const updatedSites = blockedSites.filter((site) => site !== domain);
      await setBlockedSites(updatedSites);

      // Update rules in background
      await chrome.runtime.sendMessage({
        action: "updateRules",
        blockedSites: updatedSites,
      });
    },
    [blockedSites, setBlockedSites]
  );

  const handleAddCurrentSite = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab || !tab.url) {
        alert("Unable to get current tab URL");
        return;
      }

      const domain = getDomainFromUrl(tab.url);
      if (!domain) {
        alert("Invalid URL");
        return;
      }

      // Check if already blocked
      if (blockedSites.includes(domain)) {
        alert(`${domain} is already blocked`);
        return;
      }

      // Add to blocked sites
      const updatedSites = [...blockedSites, domain];
      await setBlockedSites(updatedSites);

      // Update rules in background
      await chrome.runtime.sendMessage({
        action: "updateRules",
        blockedSites: updatedSites,
      });

      // Show feedback
      setAddButtonText("Added!");
      setAddButtonDisabled(true);
      setTimeout(() => {
        setAddButtonText("Add Current Site");
        setAddButtonDisabled(false);
      }, 1500);
    } catch (error) {
      console.error("Error adding current site:", error);
      alert("Error adding site: " + (error as Error).message);
    }
  }, [blockedSites, setBlockedSites]);

  if (loading) {
    return (
      <div className="header">
        <h1>🔒 LockIn</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="header">
        <h1>LockIn</h1>
      </div>

      <div className="status">
        <div className="status-text">
          <div className={`status-dot ${!blockingEnabled ? "inactive" : ""}`} />
          <span>{blockingEnabled ? "Blocking Active" : "Blocking Paused"}</span>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={blockingEnabled}
            onChange={handleToggle}
          />
          <span className="slider" />
        </label>
      </div>

      <div className="sites-header">Blocked Sites</div>
      <div className="sites-list">
        {blockedSites.length === 0 ? (
          <div className="empty-state">No blocked sites</div>
        ) : (
          blockedSites.map((domain) => {
            const displayInfo = getDisplayName(domain);
            return (
              <div key={domain} className="site-item">
                <span className="site-icon">{displayInfo.icon}</span>
                <span className="site-name">{displayInfo.name}</span>
                <span className="blocked-badge">Blocked</span>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveSite(domain)}
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="add-site-section">
        <button
          className="add-site-btn"
          onClick={handleAddCurrentSite}
          disabled={addButtonDisabled}
        >
          {addButtonText}
        </button>
      </div>
    </>
  );
}
