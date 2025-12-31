function load(){
  fetch("/players").then(r=>r.json()).then(players=>{
    t.innerHTML="<tr><th>Team</th><th>Q</th><th>Status</th></tr>";
    players.forEach(p=>{
      const r=t.insertRow();
      r.insertCell(0).innerText=p.name;
      r.insertCell(1).innerText=p.qIndex+1;
      r.insertCell(2).innerText=p.end?"Finished":"Playing";
    });
  });
}
setInterval(load,3000);
load();
/**
 * Helper to convert seconds into mm:ss format
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateLeaderboard() {
    fetch("/players")
        .then(r => r.json())
        .then(players => {
            const tableBody = document.getElementById("leaderboardBody");
            
            // 1. Calculate Total Time and Sort Players
            const ranked = [...players].map(p => {
                const totalSeconds = p.times.reduce((a, b) => a + b, 0);
                return { ...p, totalSeconds };
            }).sort((a, b) => {
                // Primary Sort: Number of questions answered (Descending)
                if (b.qIndex !== a.qIndex) return b.qIndex - a.qIndex;
                // Secondary Sort: Fastest total time (Ascending)
                return a.totalSeconds - b.totalSeconds;
            });

            // 2. Generate Table HTML
            tableBody.innerHTML = ranked.map((p, i) => `
                <tr class="${p.end ? 'finished-row' : ''}">
                    <td>#${i + 1}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>Question ${p.qIndex}</td>
                    <td>${formatTime(p.totalSeconds)}</td>
                    <td>${p.end ? "🏆 FINISHED" : "🏃 HUNTING"}</td>
                </tr>
            `).join('');
        })
        .catch(err => console.error("Error loading leaderboard:", err));
}

// Auto-refresh every 5 seconds
setInterval(updateLeaderboard, 1000);
updateLeaderboard();