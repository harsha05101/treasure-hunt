function load() {
  fetch("/players")
    .then(r => r.json())
    .then(players => {
      t.innerHTML = `
        <tr>
          <th>Team</th>
          <th>Question</th>
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

setInterval(load, 3000);

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
