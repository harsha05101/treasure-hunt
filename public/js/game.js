const id = localStorage.getItem("id");
let qIndex = Number(localStorage.getItem("qIndex")) || 0;

function load() {
  fetch(`/question/${qIndex}`)
    .then(r => r.json())
    .then(d => {
      if (!d.q) {
        msg.innerText = "🏁 Finished! Return to base.";
        return;
      }
      qno.innerText = `Question ${qIndex + 1}`;
      q.innerText = d.q;
      clues.innerText = "Clues: " + (d.clues || []).join(", ");
    });
}

function submit() {
  fetch("/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, word: word.value })
  })
  .then(r => r.json())
  .then(d => {
    if (d.ok) {
      qIndex++;
      localStorage.setItem("qIndex", qIndex);
      word.value = "";
      load();
    } else {
      msg.innerText = "Wrong answer!";
    }
  });
}

load();
