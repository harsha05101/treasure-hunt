/**
 * Converts seconds to mm:ss format
 */
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Fetches players and populates the ranked table
 */
function updateLeaderboard() {
    fetch("/players")
        .then(r => r.json())
        .then(players => {
            const tableBody = document.getElementById("leaderboardBody");
            if (!tableBody) return;

            // 1. Map total time and sort
            // Rank: Higher Question Index first, then fastest total time
            const ranked = [...players].map(p => {
                const totalSeconds = (p.times || []).reduce((a, b) => a + b, 0);
                return { ...p, totalSeconds };
            }).sort((a, b) => {
                // First, sort by question progress (Descending)
                if (b.qIndex !== a.qIndex) return b.qIndex - a.qIndex;
                // Second, sort by time (Ascending - faster is better)
                return a.totalSeconds - b.totalSeconds;
            });

            // 2. Generate HTML
            if (ranked.length === 0) {
                tableBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Waiting for teams to join...</td></tr>";
                return;
            }

            tableBody.innerHTML = ranked.map((p, i) => `
                <tr style="${p.end ? 'background: rgba(76, 175, 80, 0.2);' : ''}">
                    <td>#${i + 1}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>Question ${p.qIndex + 1}</td>
                    <td>${formatTime(p.totalSeconds)}</td>
                    <td>${p.end ? "🏆 FINISHED" : "🏃 HUNTING"}</td>
                </tr>
            `).join('');
        })
        .catch(err => console.error("Leaderboard fetch error:", err));
}

// Refresh every 2 seconds for live feedback
setInterval(updateLeaderboard, 2000);
updateLeaderboard();