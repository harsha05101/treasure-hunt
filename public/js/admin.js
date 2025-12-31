/**
 * Main update function that refreshes both tables
 */
function updateDashboard() {
    // 1. Fetch Game Status and Clue Counts from the admin-specific route
    fetch("/admin/status")
        .then(r => r.json())
        .then(s => {
            document.getElementById("statusDisplay").innerText = `Status: ${s.gameState}`;

            const clueTable = document.getElementById("clueStatusTable");
            
            // Build the table rows only if the table is currently empty
            if (clueTable.innerHTML.trim() === "" && s.totalQuestions > 0) {
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
            }
            
            // Apply the glow and opacity to the bulbs using the server's clueCount array
            if (s.clueCount) {
                syncBulbVisuals(s.clueCount); 
            }
        })
        .catch(err => console.error("Admin status fetch failed. Ensure /admin/status route exists.", err));

    // 2. Fetch and Update Player Rankings
    fetch("/players")
        .then(r => r.json())
        .then(players => {
            const playerTable = document.getElementById("playerTable");
            // Sort by progress (Q#), then by time taken
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
        });
}

/**
 * Helper to sync bulb opacity and drop-shadow glow
 */
function syncBulbVisuals(clueCountArray) {
    clueCountArray.forEach((revealedCount, qIdx) => {
        for (let i = 0; i < 3; i++) {
            const bulb = document.getElementById(`bulb-${qIdx}-${i}`);
            if (bulb) {
                if (i < revealedCount) {
                    bulb.style.opacity = "1";
                    bulb.style.filter = "drop-shadow(0 0 8px #ffeb3b)"; // Glowing effect
                } else {
                    bulb.style.opacity = "0.2";
                    bulb.style.filter = "none";
                }
            }
        }
        const label = document.getElementById(`count-${qIdx}`);
        if (label) label.innerText = `(${revealedCount}/3)`;
    });
}

// --- Action Functions ---

function setState(state) {
    fetch("/state", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ state }) 
    }).then(() => updateDashboard());
}

function revealClue() {
    const qIndexInput = document.getElementById("qIdx");
    const qVal = Number(qIndexInput.value);
    
    fetch("/reveal", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ qIndex: qVal }) 
    }).then(() => updateDashboard());
}

function restartGame() {
    if (confirm("DANGER: Delete ALL progress?")) {
        fetch("/restart", { method: "POST" }).then(() => {
            document.getElementById("clueStatusTable").innerHTML = ""; // Force rebuild
            location.reload();
        });
    }
}

// --- Initialization ---

setInterval(updateDashboard, 3000); //
updateDashboard();