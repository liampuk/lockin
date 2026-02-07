import { useState, useEffect } from 'react';

export function useSyncLockedIn(): boolean {
  const [state, setState] = useState(true);

  useEffect(() => {
    const read = () => {
      chrome.storage.local.get(
        ['blockingEnabled'],
        (result) => {
          setState(result.blockingEnabled === true);
        }
      );
    };

    read();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && (changes.blockingEnabled)) {
        read();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return state;
}
