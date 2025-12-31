/**
 * Main update function that refreshes both tables
 */
function updateDashboard() {
    // 1. Fetch Game Status and Clue Counts
    fetch("/admin/status")
        .then(r => r.json())
        .then(s => {
            document.getElementById("statusDisplay").innerText = `Status: ${s.gameState}`;

            const clueTable = document.getElementById("clueStatusTable");
            
            // Generate the HTML rows ONLY if the table is empty
            if (clueTable.innerHTML.trim() === "" && s.totalQuestions > 0) {
                let clueHtml = "";
                for (let i = 0; i < s.totalQuestions; i++) {
                    clueHtml += `
                        <tr>
                            <td>Question ${i + 1}</td>
                            <td style="font-size: 24px;">
                                <span id="bulb-${i}-0" style="opacity: 0.2; transition: 0.3s;">💡</span>
                                <span id="bulb-${i}-1" style="opacity: 0.2; transition: 0.3s;">💡</span>
                                <span id="bulb-${i}-2" style="opacity: 0.2; transition: 0.3s;">💡</span>
                                <span id="count-${i}" style="font-size: 14px; margin-left: 10px;">(0/3)</span>
                            </td>
                        </tr>
                    `;
                }
                clueTable.innerHTML = clueHtml;
            }
            
            // Apply the glowing effect to the bulbs based on server data
            if (s.clueCount) {
                s.clueCount.forEach((revealedCount, qIdx) => {
                    for (let i = 0; i < 3; i++) {
                        const bulb = document.getElementById(`bulb-${qIdx}-${i}`);
                        if (bulb) {
                            if (i < revealedCount) {
                                bulb.style.opacity = "1";
                                bulb.style.filter = "drop-shadow(0 0 8px #ffeb3b)"; // Glow effect
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
        })
        .catch(err => console.error("Admin status fetch failed:", err));

    // 2. Update Player Rankings Table
    fetch("/players")
        .then(r => r.json())
        .then(players => {
            const playerTable = document.getElementById("playerTable");
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
    const qVal = Number(qIndexInput.value);
    fetch("/reveal", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ qIndex: qVal }) 
    }).then(() => updateDashboard());
}

function restartGame() {
    if (confirm("DANGER: Delete ALL progress?")) {
        fetch("/restart", { method: "POST" }).then(() => location.reload());
    }
}

// Initialization
setInterval(updateDashboard, 3000);
updateDashboard();