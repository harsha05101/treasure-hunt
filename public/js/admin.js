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

            // Update the Clue Status Table with unique IDs for bulbs
            const clueTable = document.getElementById("clueStatusTable");
            let clueHtml = "";
            for (let i = 0; i < s.totalQuestions; i++) {
                clueHtml += `
                    <tr>
                        <td>Question ${i + 1} (Index ${i})</td>
                        <td style="font-size: 24px;">
                            <span id="bulb-${i}-0" style="opacity: 0.2; transition: 0.3s; cursor: default;">💡</span>
                            <span id="bulb-${i}-1" style="opacity: 0.2; transition: 0.3s; cursor: default;">💡</span>
                            <span id="bulb-${i}-2" style="opacity: 0.2; transition: 0.3s; cursor: default;">💡</span>
                            <span id="count-${i}" style="font-size: 14px; margin-left: 10px;">(0/3)</span>
                        </td>
                    </tr>
                `;
            }
            clueTable.innerHTML = clueHtml;
            
            // Immediately sync the bulb visuals with current server state
            updateAdminClueStatus();
        })
        .catch(err => console.error("Error fetching admin status:", err));

    // 2. Fetch and Update Player Rankings Table
    fetch("/players")
        .then(r => r.json())
        .then(players => {
            const playerTable = document.getElementById("playerTable");
            
            // Sort players: Most questions first, then fastest total time
            const sorted = [...players].sort((a, b) => {
                if (b.qIndex !== a.qIndex) return b.qIndex - a.qIndex;
                const timeA = (a.times || []).reduce((sum, t) => sum + t, 0);
                const timeB = (b.times || []).reduce((sum, t) => sum + t, 0);
                return timeA - timeB;
            });
            
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

/**
 * Syncs the bulb opacity and drop-shadows based on revealed clues
 */
function updateAdminClueStatus() {
    fetch("/state").then(r => r.json()).then(s => {
        // clueVersion array contains the count of revealed clues per question index
        for (let qIdx = 0; qIdx < s.clueVersion.length; qIdx++) {
            const revealedCount = s.clueVersion[qIdx];
            
            // Update the 3 bulbs for this question index
            for (let i = 0; i < 3; i++) {
                const bulb = document.getElementById(`bulb-${qIdx}-${i}`);
                if (bulb) {
                    if (i < revealedCount) {
                        bulb.style.opacity = "1";
                        bulb.style.filter = "drop-shadow(0 0 8px #ffeb3b)";
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

// ACTION FUNCTIONS

function setState(state) {
    fetch("/state", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ state }) 
    }).then(() => updateDashboard());
}

function revealClue() {
    const qIndexInput = document.getElementById("qIdx");
    const qIndexValue = Number(qIndexInput.value);
    
    fetch("/reveal", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ qIndex: qIndexValue }) 
    }).then(() => {
        // Refresh visuals immediately after revealing
        updateAdminClueStatus();
    });
}

function restartGame() {
    if (confirm("DANGER: This will delete ALL players and their progress. Continue?")) {
        fetch("/restart", { method: "POST" }).then(() => {
            location.reload();
        });
    }
}

// AUTO-REFRESH CYCLES

// Refresh the dashboard every 3 seconds
setInterval(updateDashboard, 3000);

// Sync clue bulb visuals every 2 seconds
setInterval(updateAdminClueStatus, 2000);

// Initial load on page startup
updateDashboard();