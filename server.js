const express = require("express");
const bodyParser = require("body-parser");
const questions = require("./data");

const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static("public"));

// In-memory storage
let players = [];
let clueCount = {}; // questionIndex -> clues revealed

// Utility: format milliseconds → MM:SS
function formatTime(ms) {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// -------------------- PLAYER REGISTRATION --------------------
app.post("/register", (req, res) => {
  const name = req.body.name?.trim();
  if (!name) {
    return res.status(400).json({ error: "Invalid team name" });
  }

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

// -------------------- GET QUESTION + CLUES --------------------
app.get("/question/:index", (req, res) => {
  const i = Number(req.params.index);
  if (!questions[i]) return res.json({});

  res.json({
    q: questions[i].q,
    clues: questions[i].clues.slice(0, clueCount[i] || 0)
  });
});

// -------------------- SUBMIT ANSWER --------------------
app.post("/submit", (req, res) => {
  const { id, word } = req.body;
  const player = players.find(p => p.id == id);
  if (!player) return res.json({ ok: false });

  const correct = questions[player.qIndex].answer;
  if (word.toUpperCase() !== correct) {
    return res.json({ ok: false });
  }

  const now = Date.now();
  const prevTotal = player.questionTimes.reduce((a, b) => a + b, 0);
  player.questionTimes.push(now - (player.start + prevTotal));

  player.qIndex++;

  if (player.qIndex >= questions.length) {
    player.end = now;
  }

  res.json({ ok: true, next: player.qIndex });
});

// -------------------- ADMIN: REVEAL CLUE --------------------
app.post("/reveal", (req, res) => {
  const { qIndex } = req.body;
  clueCount[qIndex] = (clueCount[qIndex] || 0) + 1;
  res.sendStatus(200);
});

// -------------------- ADMIN: TRACK PLAYERS --------------------
app.get("/players", (req, res) => {
  res.json(players);
});

// -------------------- EXPORT EXCEL (CSV) --------------------
app.get("/export", (req, res) => {
  let header = "Team";
  for (let i = 1; i <= questions.length; i++) {
    header += `,Q${i}(mm:ss)`;
  }
  header += ",Total(mm:ss),Status\n";

  let rows = "";

  players.forEach(p => {
    let row = p.name;
    let total = 0;

    for (let i = 0; i < questions.length; i++) {
      if (p.questionTimes[i]) {
        row += `,${formatTime(p.questionTimes[i])}`;
        total += p.questionTimes[i];
      } else {
        row += ",";
      }
    }

    row += `,${formatTime(total)},${p.end ? "Finished" : "Playing"}`;
    rows += row + "\n";
  });

  res.setHeader("Content-Type", "text/csv");
  res.send(header + rows);
});

// -------------------- START SERVER --------------------
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
