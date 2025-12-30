const express = require("express");
const questions = require("./data");
const app = express();

app.use(express.json());
app.use(express.static("public"));

let players = [];
let clueCount = {}; // { qIndex: count }
let gameState = "PLAYING";
let gameVersion = 0;
let clueVersion = {}; // { qIndex: version }

// REGISTER
app.post("/register", (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: "Name required" });

  const player = {
    id: "ID-" + Date.now() + Math.floor(Math.random() * 1000),
    name,
    qIndex: 0,
    lastTime: Date.now(),
    times: [],
    end: null
  };
  players.push(player);
  res.json(player);
});
// Add these variables to the top of server.js
let breakStartTime = null;

app.post("/state", (req, res) => {
    const newState = req.body.state;
    
    if (newState === "BREAK" && gameState !== "BREAK") {
        breakStartTime = Date.now(); // Record when break started
    } else if (newState === "PLAYING" && gameState === "BREAK") {
        const breakDuration = Date.now() - breakStartTime;
        // Shift every active player's 'lastTime' forward by the break duration
        players.forEach(p => {
            if (!p.end) p.lastTime += breakDuration;
        });
        breakStartTime = null;
    }
    
    gameState = newState;
    gameVersion++;
    res.sendStatus(200);
});

// STATE POLLING
app.get("/state", (req, res) => {
  res.json({ state: gameState, gameVersion, clueVersion });
});

app.post("/state", (req, res) => {
  gameState = req.body.state;
  gameVersion++;
  res.sendStatus(200);
});

app.post("/restart", (req, res) => {
  players = [];
  clueCount = {};
  clueVersion = {};
  gameState = "PLAYING";
  gameVersion++;
  res.sendStatus(200);
});

// QUESTIONS
app.get("/question/:i", (req, res) => {
  const i = Number(req.params.i);
  if (!questions[i]) return res.json({});
  
  res.json({
    q: questions[i].q,
    clues: questions[i].clues.slice(0, clueCount[i] || 0)
  });
});

// SUBMIT ANSWER
app.post("/submit", (req, res) => {
  const { id, word } = req.body;
  const p = players.find(x => x.id === id);
  if (!p || gameState !== "PLAYING" || p.end) return res.json({ ok: false });

  if (word.trim().toUpperCase() === questions[p.qIndex].answer.toUpperCase()) {
    const now = Date.now();
    p.times.push(Math.floor((now - p.lastTime) / 1000));
    p.lastTime = now;
    p.qIndex++;

    if (p.qIndex >= questions.length) p.end = now;
    return res.json({ ok: true });
  }
  res.json({ ok: false, msg: "Wrong Answer!" });
});

// ADMIN
app.post("/reveal", (req, res) => {
  const { qIndex } = req.body;
  clueCount[qIndex] = (clueCount[qIndex] || 0) + 1;
  clueVersion[qIndex] = (clueVersion[qIndex] || 0) + 1;
  res.sendStatus(200);
});

app.get("/players", (req, res) => res.json(players));

app.get("/admin/status", (req, res) => {
  res.json({ gameState, clueCount, totalQuestions: questions.length });
});

app.get("/export", (req, res) => {
  const ranked = [...players].sort((a, b) => (a.end || Infinity) - (b.end || Infinity));
  let csv = "Rank,Team,Total_Time(s),Status\n";
  ranked.forEach((p, i) => {
    const total = p.times.reduce((a, b) => a + b, 0);
    csv += `${i + 1},${p.name},${total},${p.end ? "Finished" : "Playing"}\n`;
  });
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});

app.listen(3000, () => console.log("Server active on http://localhost:3000"));