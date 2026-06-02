import { useEffect, useRef, useState } from "react";

import { fetchMetrics, subscribeToMetrics } from "../api/api";

// Owns the live-metrics lifecycle: subscribes to the SSE stream and falls back to
// REST polling when EventSource is unavailable or the stream never delivers a
// first frame. Returns { metrics, status, error }. Extracted from Dashboard so the
// view stays presentational.
export function useMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("connecting");
  // Avoid a stale-closure read of `metrics` inside the grace timeout.
  const hasDataRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let pollTimer = null;

    const applyData = (data) => {
      if (!isMounted) return;
      hasDataRef.current = true;
      setMetrics(data);
      setError("");
    };

    const startPolling = async () => {
      if (pollTimer) return;
      setStatus("polling");
      const poll = async () => {
        try {
          applyData(await fetchMetrics());
        } catch (_requestError) {
          if (isMounted) setError("Unable to load metrics. Start backend on port 5000.");
        }
      };
      await poll();
      pollTimer = setInterval(poll, 60000);
    };

    if (typeof EventSource === "undefined") {
      startPolling();
      return () => {
        isMounted = false;
        if (pollTimer) clearInterval(pollTimer);
      };
    }

    const unsubscribe = subscribeToMetrics({
      onData: applyData,
      onStatus: (next) => isMounted && setStatus(next)
    });

    const grace = setTimeout(() => {
      if (isMounted && !hasDataRef.current) startPolling();
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(grace);
      if (pollTimer) clearInterval(pollTimer);
      unsubscribe();
    };
  }, []);

  return { metrics, status, error };
}
