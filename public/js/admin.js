function loadPlayers() {
  fetch("/players")
    .then(r => r.json())
    .then(players => {
      t.innerHTML = `
        <tr>
          <th>Team</th>
          <th>Current Question</th>
          <th>Status</th>
        </tr>
      `;
      players.forEach(p => {
        const r = t.insertRow();
        r.insertCell(0).innerText = p.name;
        r.insertCell(1).innerText = p.qIndex + 1;
        r.insertCell(2).innerText = p.end ? "Finished" : "Playing";
      });
    });
}

function loadAdminStatus() {
  fetch("/admin/status")
    .then(r => r.json())
    .then(s => {
      const qi = Number(qIndex.value || 0);
      const clues = s.clueCount[qi] || 0;

      status.innerText =
        s.gameState === "PLAYING" ? "GAME RUNNING" :
        s.gameState === "BREAK" ? "BREAK" :
        "GAME FINISHED";

      status.className = "status " +
        (s.gameState === "PLAYING" ? "live" :
         s.gameState === "BREAK" ? "break" :
         "finished");

      document.getElementById("qStatus").innerText =
        `Question ${qi + 1} / ${s.totalQuestions}`;

      document.getElementById("clueStatus").innerText =
        `Clues Revealed: ${clues} / 3`;
    });
}

function setState(state) {
  fetch("/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state })
  });
}

function restart() {
  if (!confirm("Restart game and clear all clues?")) return;
  fetch("/restart", { method: "POST" });
}

function reveal() {
  fetch("/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qIndex: Number(qIndex.value) })
  });
}

function exportCSV() {
  window.open("/export");
}

setInterval(() => {
  loadPlayers();
  loadAdminStatus();
}, 3000);

loadPlayers();
loadAdminStatus();
