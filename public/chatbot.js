/* ═══════════════════════════════════════════════════
   Lumina Solar Chatbot Logic
   ═══════════════════════════════════════════════════ */

const API_BASE = window.location.origin;

let sessionId = null;
let leadId = null;
let isOpen = false;

// ─── Toggle Functions ─────────────────────────────────────────────────────────

function toggleChat() {
  isOpen = !isOpen;
  const panel = document.getElementById("chatPanel");
  const launcherClose = document.querySelector(".close-icon");
  const launcherOpen = document.querySelector(".open-icon");

  if (isOpen) {
    panel.classList.add("open");
    launcherOpen.style.display = "none";
    launcherClose.style.display = "flex";
  } else {
    panel.classList.remove("open");
    launcherOpen.style.display = "flex";
    launcherClose.style.display = "none";
  }
}

function openChat() {
  if (!isOpen) toggleChat();
  setTimeout(() => {
    document.getElementById("leadName")?.focus();
  }, 300);
}

function toggleMenu() {
  document.getElementById("mobileMenu").classList.toggle("open");
}

// ─── Start Chat from Hero Widget ──────────────────────────────────────────────

async function startChatFromWidget() {
  const nameInput = document.getElementById("sideName");
  const emailInput = document.getElementById("sideEmail");
  
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();

  if (!name || !email) {
    alert("Please fill in both name and email.");
    return;
  }

  // Pre-fill the chatbot form and start
  document.getElementById("leadName").value = name;
  document.getElementById("leadEmail").value = email;
  
  openChat();
  startChat();
}

// ─── Start Chat (Lead Capture) ────────────────────────────────────────────────

async function startChat() {
  const name = document.getElementById("leadName").value.trim();
  const email = document.getElementById("leadEmail").value.trim();
  const errorEl = document.getElementById("formError");
  const startBtn = document.querySelector(".start-chat-btn");

  if (!name || !email) {
    errorEl.textContent = "Please fill in all fields.";
    return;
  }

  startBtn.disabled = true;
  startBtn.textContent = "Connecting...";

  try {
    const res = await fetch(`${API_BASE}/api/chat/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error);

    sessionId = data.session_id;
    leadId = data.lead_id;

    // Transition UI
    document.getElementById("leadForm").style.display = "none";
    document.getElementById("chatContent").style.display = "block";
    document.getElementById("chatInputArea").style.display = "flex";

    // Show initial message
    appendBotMessage(data.bot.message, data.bot.quickReplies);

  } catch (err) {
    errorEl.textContent = "Error connecting. Try again.";
    console.error(err);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = "Start Conversation";
  }
}

// ─── Messaging ────────────────────────────────────────────────────────────────

async function sendMessage(text) {
  const input = document.getElementById("messageInput");
  const message = text || input.value.trim();
  if (!message || !sessionId) return;

  if (!text) input.value = "";

  appendUserMessage(message);
  showTyping();

  try {
    const res = await fetch(`${API_BASE}/api/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message }),
    });
    const data = await res.json();

    hideTyping();
    if (data.success) {
      appendBotMessage(data.bot.message, data.bot.quickReplies);
    }
  } catch (err) {
    hideTyping();
    appendBotMessage("Connection to Lumina Cloud lost. Please try again.");
  }
}

function handleKeyDown(e) {
  if (e.key === "Enter") sendMessage();
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function appendBotMessage(text, quickReplies = []) {
  const area = document.getElementById("messagesArea");
  
  // Clean up any existing quick replies from previous messages
  document.querySelectorAll(".quick-replies").forEach(el => el.remove());

  const msgDiv = document.createElement("div");
  msgDiv.className = "message bot";
  msgDiv.innerHTML = formatText(text);
  area.appendChild(msgDiv);

  if (quickReplies && quickReplies.length > 0) {
    const qrContainer = document.createElement("div");
    qrContainer.className = "quick-replies";
    quickReplies.forEach(qr => {
      const btn = document.createElement("button");
      btn.className = "qr-btn";
      btn.textContent = qr;
      btn.onclick = () => {
        qrContainer.style.opacity = "0.5";
        qrContainer.style.pointerEvents = "none";
        sendMessage(qr);
      };
      qrContainer.appendChild(btn);
    });
    area.appendChild(qrContainer);
  }
  
  scrollToBottom();
}

function appendUserMessage(text) {
  const area = document.getElementById("messagesArea");
  const msgDiv = document.createElement("div");
  msgDiv.className = "message user";
  msgDiv.textContent = text;
  area.appendChild(msgDiv);
  scrollToBottom();
}

function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

function showTyping() {
  document.getElementById("typingIndicator").style.display = "block";
  scrollToBottom();
}

function hideTyping() {
  document.getElementById("typingIndicator").style.display = "none";
}

function scrollToBottom() {
  const area = document.getElementById("messagesArea");
  area.scrollTop = area.scrollHeight;
}
