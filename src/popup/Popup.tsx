import { useState, useCallback } from "react";
import { useChromeStorage } from "../hooks/useChromeStorage";
import {
  getDisplayName,
  getDomainFromUrl,
  DEFAULT_BLOCKED_SITES,
} from "../utils/sites";

export function Popup() {
  const [blockingEnabled] = useChromeStorage("blockingEnabled", true);
  const [blockedSites, setBlockedSites] = useChromeStorage<string[]>(
    "blockedSites",
    DEFAULT_BLOCKED_SITES
  );
  const [addButtonText, setAddButtonText] = useState("Add Current Site");
  const [addButtonDisabled, setAddButtonDisabled] = useState(false);

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

  return (
    <>
      <div className="text-[3rem] font-vt323 text-center mb-4">
        <h1>LockIn</h1>
      </div>

      <div className="text-md text-center mb-4 flex items-center justify-center gap-2 text-gray-500">
        <div
          className={`w-2 h-2 rounded-full ${
            blockingEnabled ? "bg-green-400" : "bg-gray-400"
          }`}
        />
        <span>{blockingEnabled ? "Blocking Active" : "Blocking Paused"}</span>
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
