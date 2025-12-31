function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateLeaderboard() {
    fetch("/players")
        .then(r => r.json())
        .then(players => {
            const tableBody = document.getElementById("leaderboardBody");
            if (!tableBody) return;

            const ranked = [...players].map(p => {
                const totalSeconds = (p.times || []).reduce((a, b) => a + b, 0);
                return { ...p, totalSeconds };
            }).sort((a, b) => {
                if (b.qIndex !== a.qIndex) return b.qIndex - a.qIndex;
                return a.totalSeconds - b.totalSeconds;
            });

            if (ranked.length === 0) {
                tableBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Waiting for teams...</td></tr>";
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
        });
}

setInterval(updateLeaderboard, 2000);
updateLeaderboard();