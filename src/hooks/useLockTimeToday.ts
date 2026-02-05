import { useState, useEffect } from "react";

export interface LockTimeToday {
  /** Total ms blocking has been enabled today */
  lockTimeTodayMs: number;
  /** Timestamp when blocking was last enabled (undefined if not currently locked in) */
  lastLockInTimestamp: number | undefined;
}

/**
 * Reads lock time from chrome.storage. Safe to use in the blocked page (extension context).
 * Listens to storage changes so the UI updates when the user locks in/out elsewhere.
 */
export function useLockTimeToday(): LockTimeToday {
  const [state, setState] = useState<LockTimeToday>({
    lockTimeTodayMs: 0,
    lastLockInTimestamp: undefined,
  });

  useEffect(() => {
    const read = () => {
      chrome.storage.local.get(
        ["lockTimeTodayMs", "lastLockInTimestamp"],
        (result) => {
          setState({
            lockTimeTodayMs:
              typeof result.lockTimeTodayMs === "number"
                ? result.lockTimeTodayMs
                : 0,
            lastLockInTimestamp:
              typeof result.lastLockInTimestamp === "number"
                ? result.lastLockInTimestamp
                : undefined,
          });
        }
      );
    };

    read();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (
        areaName === "local" &&
        (changes.lockTimeTodayMs || changes.lastLockInTimestamp)
      ) {
        read();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return state;
}

/** Format ms as e.g. "2h 15m" or "45m" or "30s" */
export function formatLockTimeMs(ms: number): string {
  if (ms < 60_000) {
    const sec = Math.round(ms / 1000);
    return sec <= 0 ? "0m" : `${sec}s`;
  }
  const totalMins = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}
