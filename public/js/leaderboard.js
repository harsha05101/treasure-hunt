/**
 * Converts seconds to mm:ss format
 */
function formatTime(seconds) {
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
                if (b.qIndex !== a.qIndex) return b.qIndex - a.qIndex;
                return a.totalSeconds - b.totalSeconds;
            });

            // 2. Generate HTML
            tableBody.innerHTML = ranked.map((p, i) => `
                <tr style="${p.end ? 'background: rgba(76, 175, 80, 0.2);' : ''}">
                    <td>#${i + 1}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>Question ${p.qIndex}</td>
                    <td>${formatTime(p.totalSeconds)}</td>
                    <td>${p.end ? "🏆 FINISHED" : "🏃 HUNTING"}</td>
                </tr>
            `).join('');
        })
        .catch(err => console.error("Leaderboard error:", err));
}

// Faster refresh for live feedback during the hunt
setInterval(updateLeaderboard, 2000);
updateLeaderboard();