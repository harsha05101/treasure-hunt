const id = localStorage.getItem("id");
let qIndex = Number(localStorage.getItem("qIndex")) || 0;
let lastGameVersion = -1;
let lastClueVersion = -1;

const clueSound = new Audio("/sounds/clue.mp3");

function poll() {
    fetch("/state").then(r => r.json()).then(s => {
        const area = document.getElementById("gameArea");
        const msg = document.getElementById("msg");

        // 1. Handle Hard Reset (Redirect to start if gameVersion changes)
        if (s.gameVersion !== lastGameVersion && lastGameVersion !== -1) {
            localStorage.clear();
            location.href = "index.html";
            return;
        }
        lastGameVersion = s.gameVersion;

        // 2. Handle Break State
        if (s.state === "BREAK") {
            area.style.display = "none";
            msg.innerText = "⏸ GAME PAUSED - TIME IS FROZEN";
            return;
        }

        // 3. Handle Finish State
        if (s.state === "FINISHED") {
            area.style.display = "none";
            msg.innerText = "🏆 CHAMPIONS! YOU FINISHED!";
            return;
        }

        // 4. Playing State
        area.style.display = "block";
        msg.innerText = "";

        // Check for new clues
        const currentClueVer = s.clueVersion[qIndex] || 0;
        if (currentClueVer !== lastClueVersion) {
            if (lastClueVersion !== -1 && currentClueVer > lastClueVersion) clueSound.play();
            lastClueVersion = currentClueVer;
            loadQuestion();
        }
    });
}

function loadQuestion() {
    fetch(`/question/${qIndex}`).then(r => r.json()).then(d => {
        if (d.q) {
            document.getElementById("qno").innerText = `Question ${qIndex + 1}`;
            document.getElementById("qText").innerText = d.q;
            
            // Update Bulbs and Clue Text
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
            document.getElementById("clueText").innerText = d.clues.length ? d.clues.join(" | ") : "";
        }
    });
}

function submitAnswer() {
    const word = document.getElementById("answerInput").value;
    if(!word) return;
    
    fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, word })
    }).then(r => r.json()).then(d => {
        if (d.ok) {
            qIndex++;
            localStorage.setItem("qIndex", qIndex);
            document.getElementById("answerInput").value = "";
            lastClueVersion = -1; 
            loadQuestion();
        } else {
            alert("❌ Incorrect. Try again!");
        }
    });
}

// Start polling
setInterval(poll, 2500);
loadQuestion();
poll();