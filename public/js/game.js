const id = localStorage.getItem("id");
let qIndex = Number(localStorage.getItem("qIndex")) || 0;
let lastGameVersion = -1;
let lastClueVersion = -1;
let lastGameState = null; // Tracks previous state to play sounds only once

// Initialize Audio Objects - Matching your folder extensions exactly
const clueSound = new Audio("/sounds/clue.wav"); 
const breakSound = new Audio("/sounds/break.mp3");
const resumeSound = new Audio("/sounds/resume.mp3");
const finishSound = new Audio("/sounds/finish.wav"); // Matches your .wav file

/**
 * Helper to play sounds safely and prevent looping
 */
function playSound(audioObject) {
    audioObject.currentTime = 0; 
    audioObject.play().catch(e => console.log("Audio blocked: Interaction required."));
}

/**
 * Polls server for state, version, and clue updates
 */
function poll() {
    fetch("/state").then(r => r.json()).then(s => {
        const area = document.getElementById("gameArea");
        const msgBox = document.getElementById("msg");

        // 1. Handle HARD RESET (Redirect if version changes)
        if (lastGameVersion !== -1 && s.gameVersion !== lastGameVersion) {
            localStorage.clear();
            location.href = "index.html";
            return;
        }
        lastGameVersion = s.gameVersion;

        // 2. Trigger sounds on Admin State changes (Play ONCE per change)
        if (s.state !== lastGameState) {
            if (lastGameState !== null) {
                if (s.state === "BREAK") playSound(breakSound);
                else if (s.state === "PLAYING" && lastGameState === "BREAK") playSound(resumeSound);
                else if (s.state === "FINISHED") playSound(finishSound); 
            }
            lastGameState = s.state; 
        }

        // 3. UI Logic for Game States
        if (s.state === "BREAK") {
            area.style.display = "none";
            msgBox.innerText = "⏸ GAME PAUSED - TIME IS FROZEN";
            return;
        }

        if (s.state === "FINISHED") {
            area.style.display = "none";
            msgBox.innerText = "🏆 CHAMPIONS! YOU FINISHED!";
            return;
        }

        area.style.display = "block";
        msgBox.innerText = "";

        // 4. Clue Refreshing & Sound
        const currentClueVer = s.clueVersion[qIndex] || 0;
        if (currentClueVer !== lastClueVersion) {
            if (lastClueVersion !== -1 && currentClueVer > lastClueVersion) playSound(clueSound);
            lastClueVersion = currentClueVer;
            loadQuestion();
        }
    });
}

/**
 * Loads current question and lights up bulbs
 */
function loadQuestion() {
    fetch(`/question/${qIndex}`).then(r => r.json()).then(d => {
        // Handle individual completion
        if (!d.q) {
            document.getElementById("gameArea").style.display = "none";
            document.getElementById("msg").innerText = "🏆 ALL QUESTIONS COMPLETED!";
            playSound(finishSound); 
            return;
        }
        
        document.getElementById("qno").innerText = `Question ${qIndex + 1}`;
        document.getElementById("qText").innerText = d.q;
        
        // Update Bulb visuals
        for (let i = 0; i < 3; i++) {
            const bulb = document.getElementById(`bulb${i}`);
            if (bulb) {
                bulb.style.opacity = (d.clues && d.clues[i]) ? "1" : "0.2";
                bulb.style.textShadow = (d.clues && d.clues[i]) ? "0 0 10px #ffeb3b" : "none";
            }
        }
        
        // Display clues on new lines
        const clueContainer = document.getElementById("clueText");
        if (clueContainer) {
            clueContainer.innerHTML = d.clues ? d.clues.join("<br>") : "";
        }
    });
}

/**
 * Submits answer in Uppercase
 */
function submitAnswer() {
    const inputField = document.getElementById("answerInput");
    const word = inputField.value.trim().toUpperCase(); 
    if(!word) return;
    
    fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, word })
    }).then(r => r.json()).then(d => {
        if (d.ok) {
            qIndex++;
            localStorage.setItem("qIndex", qIndex);
            inputField.value = "";
            lastClueVersion = -1;
            loadQuestion();
        } else {
            alert(d.msg || "❌ Incorrect!");
        }
    });
}

// Initialization
setInterval(poll, 2500);
loadQuestion();
poll();