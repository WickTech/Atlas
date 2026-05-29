import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:5000" : "");

export const fetchMetrics = async () => {
  const response = await axios.get(`${API_URL}/api/metrics`);
  return response.data;
};

// Opens a Server-Sent Events connection for live metric pushes.
// onData(metrics) fires on every update; onStatus("live"|"reconnecting") tracks
// connection state. Returns a cleanup function that closes the stream.
export const subscribeToMetrics = ({ onData, onStatus }) => {
  const source = new EventSource(`${API_URL}/api/stream`);

  source.onopen = () => onStatus?.("live");

  source.onmessage = (event) => {
    try {
      onData?.(JSON.parse(event.data));
      onStatus?.("live");
    } catch (_parseError) {
      // ignore malformed frame; next push will recover
    }
  };

  // EventSource auto-reconnects; surface the gap to the UI meanwhile.
  source.onerror = () => onStatus?.("reconnecting");

  return () => source.close();
};
