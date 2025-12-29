const express = require("express");
const bodyParser = require("body-parser");
const questions = require("./data");

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static("public"));

let players = [];
let clueCount = {};
let gameState = "PLAYING"; 
// PLAYING | BREAK | FINISHED

function formatTime(ms) {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ---------------- REGISTER ----------------
app.post("/register", (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({});

  const player = {
    id: Date.now(),
    name,
    qIndex: 0,
    start: Date.now(),
    end: null,
    questionTimes: []
  };
  players.push(player);
  res.json(player);
});

// ---------------- GAME STATE ----------------
app.get("/state", (req, res) => {
  res.json({ state: gameState });
});

app.post("/state", (req, res) => {
  gameState = req.body.state;
  res.sendStatus(200);
});

// ---------------- QUESTION ----------------
app.get("/question/:i", (req, res) => {
  if (gameState !== "PLAYING") {
    return res.json({ paused: true, state: gameState });
  }

  const i = Number(req.params.i);
  if (!questions[i]) return res.json({});

  res.json({
    q: questions[i].q,
    clues: questions[i].clues.slice(0, clueCount[i] || 0)
  });
});

// ---------------- SUBMIT ----------------
app.post("/submit", (req, res) => {
  if (gameState !== "PLAYING") return res.json({ ok: false });

  const { id, word } = req.body;
  const p = players.find(x => x.id == id);
  if (!p) return res.json({ ok: false });

  if (word.toUpperCase() !== questions[p.qIndex].answer) {
    return res.json({ ok: false });
  }

  const now = Date.now();
  const prev = p.questionTimes.reduce((a, b) => a + b, 0);
  p.questionTimes.push(now - (p.start + prev));
  p.qIndex++;

  if (p.qIndex >= questions.length) {
    p.end = now;
  }

  res.json({ ok: true });
});

// ---------------- ADMIN ----------------
app.post("/reveal", (req, res) => {
  const { qIndex } = req.body;
  clueCount[qIndex] = (clueCount[qIndex] || 0) + 1;
  res.sendStatus(200);
});

app.get("/players", (req, res) => {
  res.json(players);
});

// ---------------- EXPORT ----------------
app.get("/export", (req, res) => {
  let csv = "Team";
  for (let i = 1; i <= questions.length; i++) {
    csv += `,Q${i}(mm:ss)`;
  }
  csv += ",Total(mm:ss),Status\n";

  players.forEach(p => {
    let row = p.name;
    let total = 0;
    for (let i = 0; i < questions.length; i++) {
      if (p.questionTimes[i]) {
        row += `,${formatTime(p.questionTimes[i])}`;
        total += p.questionTimes[i];
      } else row += ",";
    }
    row += `,${formatTime(total)},${p.end ? "Finished" : "Playing"}`;
    csv += row + "\n";
  });

  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
