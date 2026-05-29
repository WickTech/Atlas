const express = require("express");

const { subscribe } = require("../services/metricsCache");

const router = express.Router();

// Server-Sent Events endpoint: pushes live metrics to the client over a single
// long-lived connection instead of relying on client polling.
router.get("/", async (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  res.flushHeaders?.();

  // Tell EventSource how long to wait before reconnecting (ms).
  res.write("retry: 5000\n\n");

  const unsubscribe = await subscribe(res);

  // Heartbeat comment keeps proxies/load balancers from idling the connection.
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

module.exports = router;
