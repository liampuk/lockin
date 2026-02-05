import { useState, useCallback } from "react";
import { useChromeStorage } from "../hooks/useChromeStorage";
import {
  getDisplayName,
  getDomainFromUrl,
  DEFAULT_BLOCKED_SITES,
} from "../utils/sites";
import { useSyncLockedIn } from "../hooks/useSyncLockedIn";

export function Popup() {
  const blockingEnabled = useSyncLockedIn();
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
      <div className="text-[3rem] font-vt323 text-center mb-6">
        <h1>LockedIn</h1>
      </div>

      <div className="text-md text-center flex items-center justify-center gap-2 text-gray-500">
        <div
          className={`w-2 h-2 rounded-full ${
            blockingEnabled ? "bg-green-400" : "bg-gray-400"
          }`}
        />
        <span>{blockingEnabled ? "Blocking Active" : "Blocking Paused"}</span>
      </div>

      <div className="h-4 shrink-0" aria-hidden="true" />

      <div className="text-2xl text-center text-gray-900 uppercase tracking-[1px] font-vt323 mb-4">
        Blocked Sites
      </div>
      <div className="sites-list-scroll bg-white/5 rounded-xl p-2.5 max-h-[200px] overflow-y-auto">
        {blockedSites.length === 0 ? (
          <div className="text-center text-gray-400 py-5">No blocked sites</div>
        ) : (
          blockedSites.map((domain) => {
            const displayInfo = getDisplayName(domain);
            return (
              <div
                key={domain}
                className="flex items-center py-2 px-2.5 rounded-lg transition-colors duration-200 hover:bg-white/5"
              >
                <span className="flex-1 text-xl font-vt323">
                  {displayInfo.name}
                </span>
                <button
                  type="button"
                  className="bg-none border-none text-gray-700 font-vt323 cursor-pointer py-1 px-2 text-xl ml-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={blockingEnabled}
                  onClick={() => handleRemoveSite(domain)}
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="h-4 shrink-0" aria-hidden="true" />

      <div className="mt-4 mb-2.5">
        <button
          type="button"
          className="w-full bg-none border-2 mt-4 border-black text-black font-vt323 py-2.5 text-xl hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleAddCurrentSite}
          disabled={addButtonDisabled}
        >
          {addButtonText}
        </button>
      </div>
    </>
  );
}
