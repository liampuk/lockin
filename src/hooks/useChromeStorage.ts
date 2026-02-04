import { useState, useEffect, useCallback } from 'react';

export function useChromeStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get([key], (result) => {
      if (result[key] !== undefined) {
        setValue(result[key]);
      }
      setLoading(false);
    });
  }, [key]);

  const updateValue = useCallback(
    async (newValue: T) => {
      await chrome.storage.local.set({ [key]: newValue });
      setValue(newValue);
    },
    [key]
  );

  return [value, updateValue, loading];
}
