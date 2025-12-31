const id = localStorage.getItem("id");
let qIndex = Number(localStorage.getItem("qIndex")) || 0;
let lastGameVersion = -1;
let lastClueVersion = -1;
let lastGameState = "PLAYING"; // Tracks state changes for sounds

// Initialize Audio Objects
const clueSound = new Audio("/sounds/clue.mp3");
const breakSound = new Audio("/sounds/break.mp3");
const resumeSound = new Audio("/sounds/resume.mp3");
const finishSound = new Audio("/sounds/finish.mp3");

/**
 * Polls the server for game state, version, and clue updates
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

        // 2. State Change Sounds (Break, Resume, Finish)
        if (s.state !== lastGameState) {
            if (s.state === "BREAK") {
                breakSound.play().catch(e => console.log("Audio blocked"));
            } else if (s.state === "PLAYING" && lastGameState === "BREAK") {
                resumeSound.play().catch(e => console.log("Audio blocked"));
            } else if (s.state === "FINISHED") {
                finishSound.play().catch(e => console.log("Audio blocked"));
            }
            lastGameState = s.state; 
        }

        // 3. Handle BREAK UI (Pause state)
        if (s.state === "BREAK") {
            area.style.display = "none";
            msgBox.innerText = "⏸ GAME PAUSED - TIME IS FROZEN";
            msgBox.style.display = "block";
            return;
        }

        // 4. Handle FINISH UI
        if (s.state === "FINISHED") {
            area.style.display = "none";
            msgBox.innerText = "🏆 CHAMPIONS! YOU FINISHED!";
            msgBox.style.display = "block";
            return;
        }

        // 5. PLAYING UI (Resume normal play)
        area.style.display = "block";
        msgBox.innerText = "";

        // Check for Clue Version updates to play sound and reload
        const currentClueVer = s.clueVersion[qIndex] || 0;
        if (currentClueVer !== lastClueVersion) {
            if (lastClueVersion !== -1 && currentClueVer > lastClueVersion) {
                clueSound.play().catch(e => console.log("Audio blocked"));
            }
            lastClueVersion = currentClueVer;
            loadQuestion();
        }
    });
}

/**
 * Loads the current question and clue list from the server
 */
function loadQuestion() {
    fetch(`/question/${qIndex}`).then(r => r.json()).then(d => {
        if (d.q) {
            document.getElementById("qno").innerText = `Question ${qIndex + 1}`;
            document.getElementById("qText").innerText = d.q;
            
            // Update the 3-Bulb Status visuals
            for (let i = 0; i < 3; i++) {
                const bulb = document.getElementById(`bulb${i}`);
                if (d.clues && d.clues[i]) {
                    bulb.style.opacity = "1";
                    bulb.style.textShadow = "0 0 10px #ffeb3b";
                } else {
                    bulb.style.opacity = "0.2";
                    bulb.style.textShadow = "none";
                }
            }
            
            // Display each revealed clue on a new line
            const clueContainer = document.getElementById("clueText");
            if (d.clues && d.clues.length > 0) {
                clueContainer.innerHTML = d.clues.join("<br>"); 
            } else {
                clueContainer.innerHTML = "";
            }
        }
    });
}

/**
 * Handles answer submission
 */
function submitAnswer() {
    const inputField = document.getElementById("answerInput");
    const word = inputField.value.trim();
    if(!word) return;
    
    fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, word })
    }).then(r => r.json()).then(d => {
        if (d.ok) {
            // Success logic
            qIndex++;
            localStorage.setItem("qIndex", qIndex);
            inputField.value = "";
            lastClueVersion = -1; // Force a fresh clue check for the next question
            loadQuestion();
        } else {
            // Wrong answer alert
            alert(d.msg || "❌ Incorrect. Try again!");
        }
    });
}
// Add a helper to play sounds safely
function playSound(audioObject) {
    audioObject.currentTime = 0; // Reset to start
    audioObject.play().catch(error => {
        console.log("Autoplay prevented. User must click the page first.", error);
    });
}

// Then replace your .play() calls with the helper:
// Example for Clue Reveal:
if (lastClueVersion !== -1 && currentClueVer > lastClueVersion) {
    playSound(clueSound);
}

// Start the polling loop and initial load
setInterval(poll, 2500);
loadQuestion();
poll();