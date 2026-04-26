const BASE = "http://127.0.0.1:7788";

// Try Web Speech API but fall back to server-side
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let useServerSpeech = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  console.log("Browser Speech Recognition available");
} else {
  console.log("Browser Speech API not available, using server-side recognition");
  useServerSpeech = true;
}

const ui = {
  nameVal: document.getElementById("nameVal"),
  brainVal: document.getElementById("brainVal"),
  fileVal: document.getElementById("fileVal"),
  taskCountVal: document.getElementById("taskCountVal"),
  statusOut: document.getElementById("statusOut"),
  commandOut: document.getElementById("commandOut"),
  selfOut: document.getElementById("selfOut"),
  chatLog: document.getElementById("chatLog"),
  chatInput: document.getElementById("chatInput"),
  commandInput: document.getElementById("commandInput"),
  patchOld: document.getElementById("patchOld"),
  patchNew: document.getElementById("patchNew"),
  micBtn: document.getElementById("micBtn"),
  listeningIndicator: document.getElementById("listeningIndicator")
};

async function postCommand(command) {
  const r = await fetch(`${BASE}/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command })
  });
  const data = await r.json();
  return data.result || data.error || JSON.stringify(data);
}

async function getState() {
  const r = await fetch(`${BASE}/state`);
  return r.json();
}

function addMsg(kind, text) {
  const div = document.createElement("div");
  div.className = `msg ${kind}`;
  div.textContent = text;
  ui.chatLog.appendChild(div);
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
}

async function refreshState() {
  try {
    const state = await getState();
    ui.nameVal.textContent = state.name || "-";
    ui.fileVal.textContent = (state.context && state.context.filePath) ? state.context.filePath : "-";
    ui.taskCountVal.textContent = Array.isArray(state.tasks)
      ? state.tasks.filter(t => t.status !== "done").length
      : 0;

    const brain = await postCommand("brain show");
    ui.brainVal.textContent = parseBrainProvider(brain);

    const status = await postCommand("status");
    ui.statusOut.textContent = `${status}`;
  } catch (e) {
    ui.statusOut.textContent = `Connection error: ${e.message}`;
  }
}

function parseBrainProvider(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed.Provider || "-";
  } catch {
    return "-";
  }
}

async function sendChat() {
  const text = ui.chatInput.value.trim();
  if (!text) return;
  ui.chatInput.value = "";
  addMsg("user", text);
  try {
    const out = await postCommand(`brain ask ${text}`);
    addMsg("bot", out);
  } catch (e) {
    addMsg("bot", `Error: ${e.message}`);
    console.error("Chat error:", e);
  }
}

async function runArbitraryCommand() {
  const cmd = ui.commandInput.value.trim();
  if (!cmd) return;
  const out = await postCommand(cmd);
  ui.commandOut.textContent = `${out}`;
}

async function selfCheck() {
  const out = await postCommand("self check");
  ui.selfOut.textContent = `${out}`;
}

async function selfRollback() {
  const out = await postCommand("self rollback");
  ui.selfOut.textContent = `${out}`;
}

async function selfPatch() {
  const oldText = ui.patchOld.value.trim();
  const newText = ui.patchNew.value.trim();
  if (!oldText) {
    ui.selfOut.textContent = "old text required";
    return;
  }
  const out = await postCommand(`self patch ${oldText} => ${newText}`);
  ui.selfOut.textContent = `${out}`;
}

function startMicInput() {
  if (useServerSpeech) {
    startServerSpeech();
  } else if (recognition) {
    ui.listeningIndicator.classList.remove("hidden");
    ui.micBtn.classList.add("listening");
    recognition.start();
  } else {
    alert("Speech input not available");
  }
}

async function startServerSpeech() {
  ui.listeningIndicator.classList.remove("hidden");
  ui.micBtn.classList.add("listening");
  console.log("Listening (server-side)...");

  try {
    const r = await fetch(`${BASE}/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await r.json();

    if (data.transcript && data.transcript.trim()) {
      ui.chatInput.value = data.transcript.trim();
      console.log("Transcript:", data.transcript.trim());
    } else {
      console.log("No speech detected");
    }
  } catch (e) {
    console.error("Speech error:", e);
  } finally {
    stopMicInput();
  }
}

function stopMicInput() {
  if (!useServerSpeech && recognition) {
    recognition.abort();
  }
  ui.listeningIndicator.classList.add("hidden");
  ui.micBtn.classList.remove("listening");
}

if (recognition) {
  recognition.onstart = () => {
    ui.listeningIndicator.classList.remove("hidden");
    ui.micBtn.classList.add("listening");
    console.log("Listening (browser)...");
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        ui.chatInput.value = transcript.trim();
        console.log("Transcript (browser):", transcript.trim());
      }
    }
  };

  recognition.onerror = (event) => {
    console.error("Browser speech error:", event.error);
    stopMicInput();
  };

  recognition.onend = () => {
    console.log("Listening ended");
    stopMicInput();
  };
}

document.getElementById("refreshBtn").addEventListener("click", refreshState);
document.getElementById("pingBtn").addEventListener("click", async () => {
  const out = await postCommand("status");
  ui.statusOut.textContent = `${out}`;
});
document.getElementById("sendChatBtn").addEventListener("click", sendChat);
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});
document.getElementById("runCommandBtn").addEventListener("click", runArbitraryCommand);
document.getElementById("selfCheckBtn").addEventListener("click", selfCheck);
document.getElementById("selfRollbackBtn").addEventListener("click", selfRollback);
document.getElementById("selfPatchBtn").addEventListener("click", selfPatch);
document.getElementById("micBtn").addEventListener("click", startMicInput);

console.log("Dashboard loaded. Status: Ready");
refreshState();
setInterval(refreshState, 8000);
