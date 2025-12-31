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
            players.forEach(p => {
                if (!p.end) p.lastTime += breakDuration;
            });
        }
        breakStartTime = null;
    }
    
    gameState = newState;
    // NOTE: We DO NOT increment gameVersion here. 
    // Incrementing gameVersion tells clients the game was RESTARTED (Wiped).
    res.sendStatus(200);
});

// HARD RESET - Use this only to wipe all players
app.post("/restart", (req, res) => {
    players = [];
    clueCount = {};
    clueVersion = {};
    gameState = "PLAYING";
    gameVersion++; // This signals a wipe, forcing players to index.html
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
    res.json({ gameState, clueCount, totalQuestions: questions.length });
});
// Helper function to convert seconds to mm:ss format
function formatTime(seconds) {
    if (!seconds && seconds !== 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
// ... existing server setup ...

app.post("/submit", (req, res) => {
    const { id, word } = req.body;
    const p = players.find(x => x.id === id);
    if (!p || gameState !== "PLAYING" || p.end) return res.json({ ok: false });

    // Force player input to UPPERCASE and trim whitespace
    const playerAnswer = word.trim().toUpperCase();
    const correctAnswer = questions[p.qIndex].answer.toUpperCase();

    if (playerAnswer === correctAnswer) {
        const now = Date.now();
        p.times.push(Math.floor((now - p.lastTime) / 1000));
        p.lastTime = now;
        p.qIndex++;
        
        if (p.qIndex >= questions.length) p.end = now;
        return res.json({ ok: true });
    }
    res.json({ ok: false, msg: "Wrong Answer!" });
});

// ... rest of server code ...

app.get("/export", (req, res) => {
    // 1. Calculate totals and Sort by fastest total time to determine "Place"
    const ranked = [...players].map(p => {
        const totalSeconds = p.times.reduce((a, b) => a + b, 0);
        return { ...p, totalSeconds };
    }).sort((a, b) => {
        // Teams that finished go first, then sorted by fastest time
        if (a.end && !b.end) return -1;
        if (!a.end && b.end) return 1;
        return a.totalSeconds - b.totalSeconds;
    });

    // 2. Build CSV Header
    let csv = "Place,Team Name";
    for (let i = 1; i <= questions.length; i++) {
        csv += `,Question ${i} (mm:ss)`;
    }
    csv += ",Total Time (mm:ss),Status\n";

    // 3. Build CSV Rows
    ranked.forEach((p, index) => {
        // Place is the index + 1
        let row = `${index + 1},${p.name}`;
        
        // Individual Question Times
        for (let j = 0; j < questions.length; j++) {
            row += `,${p.times[j] ? formatTime(p.times[j]) : "N/A"}`;
        }
        
        // Total Time and Status
        row += `,${formatTime(p.totalSeconds)},${p.end ? "Finished" : "Playing"}\n`;
        csv += row;
    });

    // 4. Send File
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=treasure_hunt_results.csv");
    res.send(csv);
});

app.listen(3000, () => console.log("Server active on http://localhost:3000"));