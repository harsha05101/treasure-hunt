const id = localStorage.getItem("id");
let qIndex = Number(localStorage.getItem("qIndex")) || 0;
let lastGameVersion = -1;
let lastClueVersion = -1;
let lastGameState = null; 
let hasFinished = false; // New flag to stop the game loop

const clueSound = new Audio("/sounds/clue.wav");
const breakSound = new Audio("/sounds/break.mp3");
const resumeSound = new Audio("/sounds/resume.mp3");
const finishSound = new Audio("/sounds/finish.wav");

function playSound(audioObject) {
    audioObject.currentTime = 0;
    audioObject.play().catch(e => console.log("Audio blocked: Interaction required."));
}

function poll() {
    if (hasFinished) return; // Stop polling if the player is done

    fetch("/state").then(r => r.json()).then(s => {
        const area = document.getElementById("gameArea");
        const msgBox = document.getElementById("msg");

        if (lastGameVersion !== -1 && s.gameVersion !== lastGameVersion) {
            localStorage.clear();
            location.href = "index.html";
            return;
        }
        lastGameVersion = s.gameVersion;

        if (s.state !== lastGameState) {
            if (lastGameState !== null) {
                if (s.state === "BREAK") playSound(breakSound);
                else if (s.state === "PLAYING" && lastGameState === "BREAK") playSound(resumeSound);
                else if (s.state === "FINISHED") {
                    handleFinishUI("🏆 THE HUNT IS OVER!"); // Admin ended game
                }
            }
            lastGameState = s.state; 
        }

        if (s.state === "BREAK") {
            area.style.display = "none";
            msgBox.innerText = "⏸ GAME PAUSED - TIME IS FROZEN";
            return;
        }

        area.style.display = "block";
        msgBox.innerText = "";

        const currentClueVer = s.clueVersion[qIndex] || 0;
        if (currentClueVer !== lastClueVersion) {
            if (lastClueVersion !== -1 && currentClueVer > lastClueVersion) playSound(clueSound);
            lastClueVersion = currentClueVer;
            loadQuestion();
        }
    });
}

function handleFinishUI(message) {
    hasFinished = true; // Lock the state
    document.getElementById("gameArea").style.display = "none";
    document.getElementById("msg").innerText = message;
    playSound(finishSound);
}

function loadQuestion() {
    if (hasFinished) return;

    fetch(`/question/${qIndex}`).then(r => r.json()).then(d => {
        if (!d.q) {
            handleFinishUI("🏆 CHAMPIONS! YOU FINISHED ALL QUESTIONS!");
            return;
        }
        
        document.getElementById("qno").innerText = `Question ${qIndex + 1}`;
        document.getElementById("qText").innerText = d.q;
        
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

setInterval(poll, 2500);
loadQuestion();
poll();