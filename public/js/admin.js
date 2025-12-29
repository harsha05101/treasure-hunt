function load() {
  fetch("/players")
    .then(res => res.json())
    .then(players => {
      const table = document.getElementById("t");
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

setInterval(load, 3000);

function reveal() {
  const qIndex = Number(document.getElementById("qIndex").value);
  fetch("/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qIndex })
  });
}

function exportCSV() {
  window.open("/export");
}
