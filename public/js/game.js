const id = localStorage.getItem("id");
let qIndex = Number(localStorage.getItem("qIndex")) || 0;
let lastGameVersion = -1;
let lastClueVersion = -1;
let lastGameState = null; 
let hasFinished = false; // Prevents the game from resetting or looping

// Initialize Audio Objects - Ensure these match your actual filenames
const clueSound = new Audio("/sounds/clue.wav");
const breakSound = new Audio("/sounds/break.mp3");
const resumeSound = new Audio("/sounds/resume.mp3");
const finishSound = new Audio("/sounds/finish.wav");

/**
 * Helper to play sounds safely
 */
function playSound(audioObject) {
    audioObject.currentTime = 0;
    audioObject.play().catch(e => console.log("Audio blocked: Interaction required."));
}

/**
 * Updates UI to the Finish/Trophy screen and locks the game state
 */
function handleFinishUI(message) {
    if (hasFinished) return; // Only execute once
    hasFinished = true; 
    document.getElementById("gameArea").style.display = "none"; 
    const msgBox = document.getElementById("msg");
    msgBox.innerText = message;
    msgBox.style.display = "block";
    playSound(finishSound);
}

/**
 * Polls the server for game state updates
 */
function poll() {
    if (hasFinished) return; // Stop polling if player is already finished

    fetch("/state").then(r => r.json()).then(s => {
        const area = document.getElementById("gameArea");
        const msgBox = document.getElementById("msg");

        // 1. Handle HARD RESET
        if (lastGameVersion !== -1 && s.gameVersion !== lastGameVersion) {
            localStorage.clear();
            location.href = "index.html";
            return;
        }
        lastGameVersion = s.gameVersion;

        // 2. State Change Sound & UI Logic
        if (s.state !== lastGameState) {
            if (lastGameState !== null) {
                if (s.state === "BREAK") {
                    playSound(breakSound);
                } else if (s.state === "PLAYING" && lastGameState === "BREAK") {
                    playSound(resumeSound);
                } else if (s.state === "FINISHED") {
                    // This ensures the UI develops when Admin clicks FINISH
                    handleFinishUI("🏆 THE HUNT HAS BEEN ENDED BY ADMIN!");
                    return;
                }
            }
            lastGameState = s.state; 
        }

        // 3. UI Logic for BREAK
        if (s.state === "BREAK") {
            area.style.display = "none";
            msgBox.innerText = "⏸ GAME PAUSED - TIME IS FROZEN";
            msgBox.style.display = "block";
            return;
        }

        // 4. UI Logic for FINISHED
        if (s.state === "FINISHED") {
            handleFinishUI("🏆 THE HUNT IS OVER!");
            return;
        }

        // 5. PLAYING UI
        area.style.display = "block";
        msgBox.innerText = "";

        // Clue Refreshing
        const currentClueVer = s.clueVersion[qIndex] || 0;
        if (currentClueVer !== lastClueVersion) {
            if (lastClueVersion !== -1 && currentClueVer > lastClueVersion) playSound(clueSound);
            lastClueVersion = currentClueVer;
            loadQuestion();
        }
    });
}

/**
 * Loads question and clue data
 */
function loadQuestion() {
    if (hasFinished) return;

    fetch(`/question/${qIndex}`).then(r => r.json()).then(d => {
        if (!d.q) {
            // Trigger finish UI when player completes all questions
            handleFinishUI("🏆 Congratulations! YOU FINISHED THE HUNT!");
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
        
        const clueContainer = document.getElementById("clueText");
        if (clueContainer) {
            clueContainer.innerHTML = d.clues ? d.clues.join("<br>") : "";
        }
    });
}

/**
 * Submits answer to server
 */
function submitAnswer() {
    if (hasFinished) return;

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

// Start polling
setInterval(poll, 2500);
loadQuestion();
poll();