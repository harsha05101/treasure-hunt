/**
 * Main update function that refreshes both tables
 */
function updateDashboard() {
    // 1. Fetch and Update Game Status & Clue Table
    fetch("/admin/status")
        .then(r => r.json())
        .then(s => {
            document.getElementById("statusDisplay").innerText = `Status: ${s.gameState}`;

            const clueTable = document.getElementById("clueStatusTable");
            let clueHtml = "";
            for (let i = 0; i < s.totalQuestions; i++) {
                const revealed = s.clueCount[i] || 0;
                
                // We generate the HTML with specific IDs so updateAdminClueStatus can find them
                clueHtml += `
                    <tr>
                        <td>Question ${i + 1} (Index ${i})</td>
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
            
            // Immediately trigger the glow logic after building the table
            updateAdminClueStatus();
        })
        .catch(err => console.error("Error fetching admin status:", err));

    // 2. Fetch and Update Player Rankings Table
    fetch("/players")
        .then(r => r.json())
        .then(players => {
            const playerTable = document.getElementById("playerTable");
            // Sort by progress, then by total time (fastest first)
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