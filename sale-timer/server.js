const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const FILE = path.join(__dirname, "data.json");
const HOUR = 60 * 60 * 1000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function save(d) { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); }

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    const now = Date.now();
    const d = { startTime: now, endTime: now + 72 * HOUR, code: "SAVE40", claims: 128 };
    save(d);
    return d;
  }
}

// Offer details for the page
app.get("/api/offer", (req, res) => {
  const d = load();
  res.json({
    startTime: d.startTime || d.endTime - 72 * HOUR,
    endTime: d.endTime,
    serverTime: Date.now(),
    code: d.code,
    claims: d.claims
  });
});

// "Shop now" click: count the claim and return the code
app.post("/api/claim", (req, res) => {
  const d = load();
  if (Date.now() >= d.endTime) {
    return res.status(410).json({ message: "Sorry, this sale has ended." });
  }
  d.claims += 1;
  save(d);
  res.json({ code: d.code, claims: d.claims });
});

// Restart the sale (demo/admin)
app.post("/api/restart", (req, res) => {
  const hours = Number(req.body.hours) || 72;
  const now = Date.now();
  const d = load();
  d.startTime = now;
  d.endTime = now + hours * HOUR;
  d.claims = 128;
  save(d);
  res.json({ endTime: d.endTime });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));