"use client";

import { useEffect, useRef, useState } from "react";
import { ApiRequestError, getHealth } from "./api";
import type { Health } from "./types";

export type Resource<T> =
  | { status: "loading"; data: null; error: null }
  /** The API is cold or unreachable; we keep retrying with backoff. */
  | { status: "waking"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: ApiRequestError };

const RETRY_DELAYS_MS = [1500, 3000, 5000, 8000, 12000, 15000];
/** A cold free-tier host often holds the first request open; call it "waking" after this. */
const SLOW_AFTER_MS = 2500;

/**
 * Load once per `key`; retry quietly with backoff while the API is waking up.
 * Non-retryable errors (404, 4xx) end in `status: "error"`.
 */
export function useResource<T>(key: string | null, load: () => Promise<T>): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ status: "loading", data: null, error: null });
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    setState({ status: "loading", data: null, error: null });

    const slowTimer = setTimeout(() => {
      if (!cancelled) setState((s) => (s.status === "loading" ? { status: "waking", data: null, error: null } : s));
    }, SLOW_AFTER_MS);

    const tryLoad = async () => {
      try {
        const data = await loadRef.current();
        if (cancelled) return;
        clearTimeout(slowTimer);
        setState({ status: "ready", data, error: null });
      } catch (err) {
        if (cancelled) return;
        const apiError =
          err instanceof ApiRequestError
            ? err
            : new ApiRequestError("client", "Something went wrong while loading this page. Try reloading.", 0);
        if (!apiError.retryable) {
          clearTimeout(slowTimer);
          setState({ status: "error", data: null, error: apiError });
          return;
        }
        setState({ status: "waking", data: null, error: null });
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
        attempt += 1;
        retryTimer = setTimeout(tryLoad, delay);
      }
    };

    void tryLoad();
    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      clearTimeout(retryTimer);
    };
  }, [key]);

  return state;
}

export function useHealth(): Resource<Health> {
  return useResource("health", getHealth);
}
