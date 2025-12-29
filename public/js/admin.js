function load() {
  fetch("/players")
    .then(res => res.json())
    .then(players => {
      const table = document.getElementById("t");

      // Keep header row, remove old data rows
      table.innerHTML = `
        <tr>
          <th>Team</th>
          <th>Current Question</th>
          <th>Status</th>
        </tr>
      `;

      players.forEach(p => {
        const row = table.insertRow();
        row.insertCell(0).innerText = p.name;
        row.insertCell(1).innerText = p.qIndex + 1;
        row.insertCell(2).innerText = p.end ? "Finished" : "Playing";
      });
    });
}

// refresh every 3 seconds
setInterval(load, 3000);
load();

function reveal() {
  fetch("/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qIndex: Number(qIndex.value) })
  });
}

function setState(state) {
  fetch("/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state })
  });
}

function exportCSV() {
  window.open("/export");
}
