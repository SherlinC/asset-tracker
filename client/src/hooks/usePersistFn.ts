import { useRef } from "react";

type PersistFn = (...args: never[]) => unknown;

/**
 * usePersistFn instead of useCallback to reduce cognitive load
 */
export function usePersistFn<T extends PersistFn>(fn: T) {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T | null>(null);
  if (!persistFn.current) {
    persistFn.current = ((...args: Parameters<T>) =>
      fnRef.current(...args)) as T;
  }

  return persistFn.current;
}
