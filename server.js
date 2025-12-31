const express = require("express");
const questions = require("./data");
const app = express();

app.use(express.json());
app.use(express.static("public"));

let players = [];
let clueCount = {}; 
let gameState = "PLAYING";
let gameVersion = 0;
let clueVersion = {}; 
let breakStartTime = null; 

// ---------- STATE MANAGEMENT ----------
app.get("/state", (req, res) => {
    res.json({ state: gameState, gameVersion, clueVersion });
});

app.post("/state", (req, res) => {
    const newState = req.body.state;
    if (newState === "BREAK" && gameState !== "BREAK") {
        breakStartTime = Date.now(); 
    } else if (newState === "PLAYING" && gameState === "BREAK") {
        if (breakStartTime) {
            const breakDuration = Date.now() - breakStartTime;
            players.forEach(p => { if (!p.end) p.lastTime += breakDuration; });
        }
        breakStartTime = null;
    }
    gameState = newState;
    res.sendStatus(200);
});

app.post("/restart", (req, res) => {
    players = [];
    clueCount = {};
    clueVersion = {};
    gameState = "PLAYING";
    gameVersion++; 
    breakStartTime = null;
    res.sendStatus(200);
});

// ---------- PLAYER REGISTRATION ----------
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

// ---------- GAMEPLAY ----------
app.get("/question/:i", (req, res) => {
    const i = Number(req.params.i);
    if (!questions[i]) return res.json({});
    res.json({
        q: questions[i].q,
        clues: questions[i].clues.slice(0, clueCount[i] || 0)
    });
});

app.post("/submit", (req, res) => {
    const { id, word } = req.body;
    const p = players.find(x => x.id === id);
    if (!p || gameState !== "PLAYING" || p.end) return res.json({ ok: false });

    // Force Uppercase Validation
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

// ---------- ADMIN ACTIONS ----------
app.post("/reveal", (req, res) => {
    const { qIndex } = req.body;
    clueCount[qIndex] = (clueCount[qIndex] || 0) + 1;
    clueVersion[qIndex] = (clueVersion[qIndex] || 0) + 1;
    res.sendStatus(200);
});

app.get("/players", (req, res) => res.json(players));

app.get("/admin/status", (req, res) => {
    // Convert object to array for frontend bulb sync
    const clueArray = [];
    for (let i = 0; i < questions.length; i++) {
        clueArray.push(clueCount[i] || 0);
    }
    res.json({ gameState, clueCount: clueArray, totalQuestions: questions.length });
});

app.get("/export", (req, res) => {
    const ranked = [...players].map(p => {
        const totalSeconds = p.times.reduce((a, b) => a + b, 0);
        return { ...p, totalSeconds };
    }).sort((a, b) => {
        if (a.end && !b.end) return -1;
        if (!a.end && b.end) return 1;
        return a.totalSeconds - b.totalSeconds;
    });

    let csv = "Place,Team Name";
    for (let i = 1; i <= questions.length; i++) csv += `,Question ${i}`;
    csv += ",Total Time,Status\n";

    ranked.forEach((p, index) => {
        let row = `${index + 1},${p.name}`;
        for (let j = 0; j < questions.length; j++) {
            row += `,${p.times[j] || "N/A"}`;
        }
        row += `,${p.totalSeconds},${p.end ? "Finished" : "Playing"}\n`;
        csv += row;
    });
    res.setHeader("Content-Disposition", "attachment; filename=results.csv");
    res.send(csv);
});

app.listen(3000, () => console.log("Server active on port 3000"));