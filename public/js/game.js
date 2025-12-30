const id = localStorage.getItem("id");
let qIndex = Number(localStorage.getItem("qIndex")) || 0;
let lastGameVersion = -1;
let lastClueVersion = -1;

const clueSound = new Audio("/sounds/clue.mp3");

function poll() {
    fetch("/state").then(r => r.json()).then(s => {
        // Handle Global Reset
        if (s.gameVersion !== lastGameVersion && lastGameVersion !== -1) {
            localStorage.clear();
            location.href = "index.html";
            return;
        }
        lastGameVersion = s.gameVersion;

        const msgBox = document.getElementById("msg");
        const area = document.getElementById("gameArea");

        if (s.state === "BREAK") {
            area.style.display = "none";
            msgBox.innerText = "⏸ BREAK TIME - HEAD TO BASE";
            return;
        }

        if (s.state === "FINISHED") {
            area.style.display = "none";
            msgBox.innerText = "🏆 CHAMPIONS! YOU FINISHED!";
            return;
        }

        area.style.display = "block";
        msgBox.innerText = "";

        // AUTO-REFRESH CLUES: If clue version changes, reload question immediately
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
            document.getElementById("clueText").innerText = d.clues.length ? "💡 " + d.clues.join(" | ") : "";
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
            lastClueVersion = -1; // Reset to force new clue fetch for next Q
            loadQuestion();
        } else {
            alert("❌ Incorrect. Try again!");
        }
    });
}

setInterval(poll, 2500); // Fast polling for clues
loadQuestion();
poll();