const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const metrics = require("./routes/metrics");
const stream = require("./routes/stream");

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/metrics", metrics);
app.use("/api/stream", stream);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
