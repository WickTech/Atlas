const express = require("express");

const { getMetrics } = require("../services/metricsCache");

const router = express.Router();

// REST snapshot. Used for the initial load and as a fallback when the client's
// SSE connection is unavailable. Served from the shared TTL cache so it never
// triggers a fresh upstream call per request.
router.get("/", async (_req, res) => {
  try {
    const data = await getMetrics();
    res.json(data);
  } catch (_error) {
    res.status(503).json({ error: "Metrics temporarily unavailable" });
  }
});

module.exports = router;
