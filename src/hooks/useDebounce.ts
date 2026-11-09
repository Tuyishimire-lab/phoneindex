import { useState, useEffect } from "react";

/**
 * useDebounce hook to delay updating state until delayMs has elapsed
 * since the last value change. Cleans up timeout on unmount and on value change.
 *
 * @param value The fast-changing value (e.g. search input string)
 * @param delayMs Delay in milliseconds (default: 180ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delayMs: number = 180): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
