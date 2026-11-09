"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface PersistentStateOptions<T> {
  /** Schema version number for handling data structure evolution */
  version?: number;
  /** Migration function to upgrade legacy data formats to current schema */
  migrate?: (savedData: unknown, savedVersion: number) => T;
  /** Optional runtime validator / type guard */
  validator?: (data: unknown) => data is T;
  /** Custom storage backend (defaults to window.localStorage) */
  storage?: Storage;
}

export interface StorageEnvelope<T> {
  version: number;
  __version: number;
  timestamp: number;
  data: T;
}

export const STORAGE_SYNC_EVENT = "phoneindex-storage-sync";
export const STORAGE_SYNC_EVENT_LEGACY = "phoneindex:persistent-state-sync";

export interface SyncEventDetail<T = unknown> {
  key: string;
  value: T;
  data?: T;
  envelope?: StorageEnvelope<T>;
  senderId?: string;
}

// In-memory fallback storage for private browsing / SecurityError / disabled localStorage
const memoryStorageMap = new Map<string, string>();

const memoryStorageShim: Storage = {
  getItem: (key: string): string | null => memoryStorageMap.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    memoryStorageMap.set(key, String(value));
  },
  removeItem: (key: string): void => {
    memoryStorageMap.delete(key);
  },
  clear: (): void => {
    memoryStorageMap.clear();
  },
  key: (index: number): string | null => {
    const keys = Array.from(memoryStorageMap.keys());
    return keys[index] ?? null;
  },
  get length(): number {
    return memoryStorageMap.size;
  },
};

/**
 * React 19 & Next.js App Router Hydration-Safe Persistent State Hook.
 * Eliminates Hydration Mismatch (Errors #418/#423), supports schema migrations,
 * and synchronizes state intra-tab and cross-tab with graceful in-memory fallback.
 */
let hookInstanceSeq = 0;

export function usePersistentState<T>(
  key: string,
  initialValue: T | (() => T),
  options: PersistentStateOptions<T> = {}
): [T, (value: T | ((prev: T) => T)) => void, boolean] & {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  isHydrated: boolean;
  reset: () => void;
} {
  const { version = 1, migrate, validator } = options;

  // 1. Initialize strictly with initialValue to guarantee 100% SSR-to-client hydration match
  const [state, setState] = useState<T>(() =>
    typeof initialValue === "function" ? (initialValue as () => T)() : initialValue
  );
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const stateRef = useRef<T>(state);
  const instanceIdRef = useRef<string>("");
  const migrateRef = useRef(migrate);
  const validatorRef = useRef(validator);

  useEffect(() => {
    if (!instanceIdRef.current) {
      hookInstanceSeq += 1;
      instanceIdRef.current = `inst_${hookInstanceSeq}`;
    }
  }, []);

  useEffect(() => {
    stateRef.current = state;
    migrateRef.current = migrate;
    validatorRef.current = validator;
  }, [state, migrate, validator]);

  // 2. Safe storage access helper with graceful memory fallback
  const getStorage = useCallback((): Storage => {
    if (options.storage) {
      return options.storage;
    }
    if (typeof window === "undefined") {
      return memoryStorageShim;
    }
    try {
      const storage = window.localStorage;
      // Test read/write in case of SecurityError in strict private browsing
      const testKey = "__phoneindex_storage_test__";
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return storage;
    } catch {
      return memoryStorageShim;
    }
  }, [options.storage]);

  // 3. Post-hydration synchronization effect (runs strictly on client after DOM is mounted)
  useEffect(() => {
    let isMounted = true;
    const storage = getStorage();

    // Use microtask queue to decouple from synchronous render cycle (React 19 hydration safe)
    queueMicrotask(() => {
      if (!isMounted) return;

      try {
        const raw = storage.getItem(key);
        if (raw !== null) {
          const parsed = JSON.parse(raw);

          // Check if data is wrapped in a version envelope
          if (
            parsed &&
            typeof parsed === "object" &&
            ("version" in parsed || "__version" in parsed) &&
            "data" in parsed
          ) {
            const envelope = parsed as StorageEnvelope<unknown>;
            const storedVersion =
              typeof envelope.version === "number"
                ? envelope.version
                : typeof envelope.__version === "number"
                ? envelope.__version
                : 0;

            let finalData: unknown = envelope.data;

            // Execute schema migration if stored version is older than current version
            if (storedVersion < version && migrateRef.current) {
              try {
                finalData = migrateRef.current(envelope.data, storedVersion);
                const updatedEnvelope: StorageEnvelope<unknown> = {
                  version,
                  __version: version,
                  timestamp: Date.now(),
                  data: finalData,
                };
                storage.setItem(key, JSON.stringify(updatedEnvelope));
              } catch (migrationErr) {
                console.warn(
                  `[usePersistentState] Migration failed for "${key}". Using raw data.`,
                  migrationErr
                );
              }
            }

            // Validate schema if validator is provided
            if (!validatorRef.current || validatorRef.current(finalData)) {
              if (isMounted) {
                stateRef.current = finalData as T;
                setState(finalData as T);
              }
            } else {
              console.warn(
                `[usePersistentState] Stored data for "${key}" failed validation. Falling back to initial value.`
              );
            }
          } else {
            // Legacy raw format (version 0 un-enveloped data)
            let finalData: unknown = parsed;
            if (migrateRef.current) {
              try {
                finalData = migrateRef.current(parsed, 0);
              } catch (migrationErr) {
                console.warn(
                  `[usePersistentState] Migration failed for legacy "${key}".`,
                  migrationErr
                );
              }
            }
            if (!validatorRef.current || validatorRef.current(finalData)) {
              if (isMounted) {
                stateRef.current = finalData as T;
                setState(finalData as T);
              }
              const newEnvelope: StorageEnvelope<unknown> = {
                version,
                __version: version,
                timestamp: Date.now(),
                data: finalData,
              };
              try {
                storage.setItem(key, JSON.stringify(newEnvelope));
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn(`[usePersistentState] Failed to read or parse "${key}" from storage`, err);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    });

    // 4. Listen for cross-tab storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        const parsed = JSON.parse(e.newValue);
        const incomingData =
          parsed && typeof parsed === "object" && "data" in parsed ? parsed.data : parsed;
        if (incomingData === stateRef.current) return;
        if (!validatorRef.current || validatorRef.current(incomingData)) {
          stateRef.current = incomingData as T;
          setState(incomingData as T);
        }
      } catch {}
    };

    // 5. Listen for intra-tab (same-page) synchronization events
    const handleCustomSync = (e: Event) => {
      const customEvent = e as CustomEvent<SyncEventDetail<T>>;
      if (customEvent.detail && customEvent.detail.key === key) {
        // Self-echo prevention: ignore events dispatched by this hook instance
        if (customEvent.detail.senderId && customEvent.detail.senderId === instanceIdRef.current) {
          return;
        }
        const incoming =
          customEvent.detail.data !== undefined
            ? customEvent.detail.data
            : customEvent.detail.value;
        if (incoming === stateRef.current) {
          return;
        }
        if (!validatorRef.current || validatorRef.current(incoming)) {
          stateRef.current = incoming as T;
          setState(incoming as T);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener(STORAGE_SYNC_EVENT, handleCustomSync);
      window.addEventListener(STORAGE_SYNC_EVENT_LEGACY, handleCustomSync);
    }

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener(STORAGE_SYNC_EVENT, handleCustomSync);
        window.removeEventListener(STORAGE_SYNC_EVENT_LEGACY, handleCustomSync);
      }
    };
  }, [key, version, getStorage]);

  // 6. Resilient state updater
  const setPersistentState = useCallback(
    (action: T | ((prev: T) => T)) => {
      const nextValue =
        typeof action === "function"
          ? (action as (prev: T) => T)(stateRef.current)
          : action;

      // Concurrency & Rapid Sequential Writes Fix: synchronously assign stateRef.current immediately
      stateRef.current = nextValue;
      setState(nextValue);

      const storage = getStorage();

      try {
        const envelope: StorageEnvelope<T> = {
          version,
          __version: version,
          timestamp: Date.now(),
          data: nextValue,
        };
        storage.setItem(key, JSON.stringify(envelope));

        // Dispatch intra-tab events so other components on this page update synchronously
        if (typeof window !== "undefined") {
          if (!instanceIdRef.current) {
            hookInstanceSeq += 1;
            instanceIdRef.current = `inst_${hookInstanceSeq}`;
          }
          const detail: SyncEventDetail<T> = {
            key,
            value: nextValue,
            data: nextValue,
            envelope,
            senderId: instanceIdRef.current,
          };
          window.dispatchEvent(
            new CustomEvent<SyncEventDetail<T>>(STORAGE_SYNC_EVENT, { detail })
          );
          window.dispatchEvent(
            new CustomEvent<SyncEventDetail<T>>(STORAGE_SYNC_EVENT_LEGACY, { detail })
          );
        }
      } catch (err) {
        if (
          err instanceof DOMException &&
          (err.name === "QuotaExceededError" || err.code === 22)
        ) {
          console.error(
            `[usePersistentState] QuotaExceededError: LocalStorage quota reached for "${key}". Falling back to in-memory state.`
          );
        } else {
          console.warn(`[usePersistentState] Failed to persist key "${key}"`, err);
        }
        // Save to in-memory storage fallback if localStorage threw
        memoryStorageShim.setItem(
          key,
          JSON.stringify({
            version,
            __version: version,
            timestamp: Date.now(),
            data: nextValue,
          })
        );
      }
    },
    [key, version, getStorage]
  );

  const reset = useCallback(() => {
    const defaultVal =
      typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
    setPersistentState(defaultVal);
  }, [initialValue, setPersistentState]);

  const tuple = [state, setPersistentState, isHydrated] as [
    T,
    (value: T | ((prev: T) => T)) => void,
    boolean
  ] & {
    value: T;
    setValue: (value: T | ((prev: T) => T)) => void;
    isHydrated: boolean;
    reset: () => void;
  };

  tuple.value = state;
  tuple.setValue = setPersistentState;
  tuple.isHydrated = isHydrated;
  tuple.reset = reset;

  return tuple;
}
