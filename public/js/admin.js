/**
 * Main update function that refreshes both tables
 */
function updateDashboard() {
    // 1. Fetch and Update Game Status & Clue Table
    fetch("/admin/status")
        .then(r => r.json())
        .then(s => {
            // Update the top status text
            document.getElementById("statusDisplay").innerText = `Status: ${s.gameState}`;

            // Update the Clue Status Table
            const clueTable = document.getElementById("clueStatusTable");
            let clueHtml = "";
            for (let i = 0; i < s.totalQuestions; i++) {
                const revealed = s.clueCount[i] || 0;
                clueHtml += `
                    <tr>
                        <td>Question ${i + 1} (Index ${i})</td>
                        <td style="font-size: 18px;">
                            ${"💡".repeat(revealed)}${"⚪".repeat(3 - revealed)}
                            <span style="font-size: 12px; margin-left: 5px;">(${revealed}/3)</span>
                        </td>
                    </tr>
                `;
            }
            clueTable.innerHTML = clueHtml;
        })
        .catch(err => console.error("Error fetching admin status:", err));

    // 2. Fetch and Update Player Rankings Table
    fetch("/players")
        .then(r => r.json())
        .then(players => {
            const playerTable = document.getElementById("playerTable");
            // Sort players by their question progress (highest question first)
            const sorted = [...players].sort((a, b) => b.qIndex - a.qIndex);
            
            playerTable.innerHTML = sorted.map((p, i) => `
                <tr>
                    <td>#${i + 1}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>Q${p.qIndex + 1}</td>
                    <td style="color: ${p.end ? '#2196f3' : '#4caf50'}">
                        ${p.end ? 'FINISHED' : 'PLAYING'}
                    </td>
                </tr>
            `).join('');
        })
        .catch(err => console.error("Error fetching players:", err));
}

// ACTION FUNCTIONS
function setState(state) {
    fetch("/state", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ state }) 
    });
}

function revealClue() {
    const qIndexInput = document.getElementById("qIdx");
    fetch("/reveal", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ qIndex: Number(qIndexInput.value) }) 
    });
}
function updateAdminClueStatus() {
    fetch("/state").then(r => r.json()).then(s => {
        // Loop through every question shown on the admin panel
        for (let qIdx = 0; qIdx < s.clueVersion.length; qIdx++) {
            const revealedCount = s.clueVersion[qIdx];
            
            // Update bulbs for this specific question index
            for (let i = 0; i < 3; i++) {
                const bulb = document.getElementById(`bulb-${qIdx}-${i}`);
                if (bulb) {
                    if (i < revealedCount) {
                        bulb.style.opacity = "1";
                        bulb.style.filter = "drop-shadow(0 0 5px #ffeb3b)";
                    } else {
                        bulb.style.opacity = "0.2";
                        bulb.style.filter = "none";
                    }
                }
            }
            
            // Update the text counter (e.g., 1/3)
            const countLabel = document.getElementById(`count-${qIdx}`);
            if (countLabel) {
                countLabel.innerText = `(${revealedCount}/3)`;
            }
        }
    });
}

// Add this to your existing setInterval loop in admin.js
setInterval(updateAdminClueStatus, 2000);

function restartGame() {
    if (confirm("DANGER: This will delete ALL players and their progress. Continue?")) {
        fetch("/restart", { method: "POST" });
    }
}

// Start the 3-second auto-refresh cycle
setInterval(updateDashboard, 3000);
// Initial load
updateDashboard();