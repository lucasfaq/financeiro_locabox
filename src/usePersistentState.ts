import { useCallback, useState } from "react";

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = window.localStorage.getItem(key);
      return saved ? JSON.parse(saved) as T : initialValue;
    } catch { return initialValue; }
  });
  const update = useCallback<typeof setValue>((next) => setValue((current) => {
    const resolved = typeof next === "function" ? (next as (previous: T) => T)(current) : next;
    try { window.localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* armazenamento indisponível */ }
    return resolved;
  }), [key]);
  return [value, update] as const;
}
