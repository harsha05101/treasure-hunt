let id = Number(localStorage.getItem("id"));
let qIndex = Number(localStorage.getItem("qIndex"));

// 🚨 SAFETY CHECK
if (!id) {
  alert("Please start the game from the registration page.");
  window.location.href = "index.html";
}

function loadQuestion() {
  fetch(`/question/${qIndex}`)
    .then(res => res.json())
    .then(data => {
      if (!data.q) return;
      status.innerText = `Question ${qIndex + 1}`;
      question.innerText = data.q;
      clues.innerHTML = "";
      data.clues.forEach(c => {
        const li = document.createElement("li");
        li.innerText = c;
        clues.appendChild(li);
      });
    });
}

function submitWord() {
  fetch("/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, word: word.value })
  })
  .then(res => res.json())
  .then(result => {
    if (!result.ok) {
      msg.innerText = "❌ Wrong word";
      return;
    }

    msg.innerText = "✅ Correct!";
    qIndex = result.next;
    localStorage.setItem("qIndex", qIndex);
    word.value = "";

    if (qIndex >= 10) {
      location.href = "leaderboard.html";
    } else {
      loadQuestion();
    }
  });
}

loadQuestion();
setInterval(loadQuestion, 3000);
