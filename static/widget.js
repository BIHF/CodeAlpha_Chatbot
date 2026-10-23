/**
 * CodeAlpha Commercial AI Chatbot Widget (Enterprise Edition)
 * Zero-dependency, Shadow-DOM encapsulated, accessible, streaming web component.
 * Features:
 *  - Shadow DOM style isolation (zero host CSS bleed)
 *  - Server-Sent Events (SSE) streaming with TTFT < 300ms
 *  - Ephemeral session memory & sliding context window
 *  - Editorial, warm-neutral human-centered design
 *  - ARIA compliance & keyboard navigation (Esc to close, Enter to send)
 */

(function () {
  "use strict";

  // Check if widget already registered
  if (window.CodeAlphaWidgetLoaded) return;
  window.CodeAlphaWidgetLoaded = true;

  // Determine API endpoint from script tag or fallback to current origin
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  const API_BASE = (currentScript && currentScript.getAttribute("data-api-url")) || window.location.origin;

  // Session ID generation (ephemeral per browser session)
  let sessionId = sessionStorage.getItem("ca_chat_session_id");
  if (!sessionId) {
    sessionId = "sess_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
    sessionStorage.setItem("ca_chat_session_id", sessionId);
  }

  // Create host container for Shadow DOM
  const hostElement = document.createElement("div");
  hostElement.id = "codealpha-chatbot-root";
  document.body.appendChild(hostElement);

  // Attach Shadow DOM for complete CSS isolation
  const shadow = hostElement.attachShadow({ mode: "open" });

  // Component Styles
  const style = document.createElement("style");
  style.textContent = `
    :host {
      --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      --bg-surface: #ffffff;
      --bg-canvas: #fafaf9;
      --text-main: #1f2937;
      --text-muted: #6b7280;
      --text-light: #9ca3af;
      --border-color: #e5e7eb;
      --border-focus: #16a34a;
      
      /* Understated brand accent */
      --accent-color: #16a34a;
      --accent-hover: #15803d;
      --accent-soft: rgba(22, 163, 74, 0.12);
      
      /* Message Bubbles */
      --bubble-bot-bg: #f4f4f5;
      --bubble-bot-text: #1f2937;
      --bubble-user-bg: #dcfce7;
      --bubble-user-text: #14532d;
      
      --shadow-modal: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      --shadow-launcher: 0 4px 14px rgba(0, 0, 0, 0.1);
      
      font-family: var(--font-family);
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Floating Launcher Button */
    .ca-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: var(--bg-surface);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-launcher);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      outline: none;
    }

    .ca-launcher:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
    }

    .ca-launcher:focus-visible {
      box-shadow: 0 0 0 3px var(--accent-soft);
      border-color: var(--accent-color);
    }

    .ca-launcher svg {
      width: 24px;
      height: 24px;
      stroke: var(--text-main);
      fill: none;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .ca-unread-dot {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--accent-color);
    }

    /* Chat Modal Window */
    .ca-modal {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: 388px;
      height: 580px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 120px);
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      box-shadow: var(--shadow-modal);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483646;
      opacity: 0;
      visibility: hidden;
      transform: translateY(14px) scale(0.98);
      transition: opacity 0.18s ease-out, transform 0.18s ease-out, visibility 0.18s;
    }

    .ca-modal.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    /* Header */
    .ca-header {
      padding: 14px 18px;
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .ca-header-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ca-avatar-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background-color: var(--bg-canvas);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-color);
    }

    .ca-avatar-icon svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
    }

    .ca-header-text h3 {
      font-size: 14.5px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.2;
    }

    .ca-status-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .ca-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--accent-color);
    }

    .ca-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ca-icon-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .ca-icon-btn:hover {
      background-color: var(--bg-canvas);
      color: var(--text-main);
    }

    .ca-icon-btn svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
    }

    /* Message Thread Area */
    .ca-messages {
      flex: 1;
      overflow-y: auto;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background-color: var(--bg-canvas);
    }

    .ca-msg {
      display: flex;
      flex-direction: column;
      width: 100%;
      animation: caFadeIn 0.18s ease-out;
    }

    @keyframes caFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ca-msg.bot {
      align-items: flex-start;
    }

    .ca-msg.user {
      align-items: flex-end;
    }

    .ca-bubble {
      max-width: 84%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.55;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .ca-msg.bot .ca-bubble {
      background-color: var(--bubble-bot-bg);
      color: var(--bubble-bot-text);
      border-top-left-radius: 3px;
    }

    .ca-msg.user .ca-bubble {
      background-color: var(--bubble-user-bg);
      color: var(--bubble-user-text);
      border-top-right-radius: 3px;
    }

    /* Markdown styling inside bubbles */
    .ca-bubble p {
      margin-bottom: 6px;
    }
    .ca-bubble p:last-child {
      margin-bottom: 0;
    }

    .ca-bubble strong {
      font-weight: 600;
    }

    .ca-bubble ul, .ca-bubble ol {
      margin: 4px 0 6px 18px;
    }

    .ca-bubble li {
      margin-bottom: 3px;
    }

    .ca-bubble code {
      font-family: Consolas, Monaco, monospace;
      font-size: 12px;
      background: rgba(0, 0, 0, 0.06);
      padding: 2px 4px;
      border-radius: 4px;
    }

    .ca-bubble a {
      color: var(--accent-color);
      text-decoration: underline;
    }

    /* Suggestions Chips */
    .ca-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .ca-chip {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 5px 10px;
      border-radius: 16px;
      font-size: 12px;
      cursor: pointer;
      transition: border-color 0.15s, background-color 0.15s;
    }

    .ca-chip:hover {
      border-color: var(--accent-color);
      color: var(--accent-color);
      background-color: var(--accent-soft);
    }

    /* Typing State */
    .ca-typing {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background-color: var(--bubble-bot-bg);
      border-radius: 12px;
      border-top-left-radius: 3px;
      width: fit-content;
    }

    .ca-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background-color: var(--text-muted);
      opacity: 0.4;
      animation: caBlink 1.2s infinite ease-in-out;
    }

    .ca-dot:nth-child(2) { animation-delay: 0.2s; }
    .ca-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes caBlink {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.9); }
      40% { opacity: 1; transform: scale(1.1); }
    }

    /* Input Footer */
    .ca-footer {
      padding: 12px 14px;
      background-color: var(--bg-surface);
      border-top: 1px solid var(--border-color);
    }

    .ca-form {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .ca-input {
      flex: 1;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13.5px;
      color: var(--text-main);
      background-color: var(--bg-surface);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit;
    }

    .ca-input:focus {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 2px var(--accent-soft);
    }

    .ca-send-btn {
      background-color: var(--accent-color);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s;
    }

    .ca-send-btn:hover {
      background-color: var(--accent-hover);
    }

    .ca-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .ca-sub-footer {
      text-align: center;
      font-size: 10.5px;
      color: var(--text-light);
      margin-top: 6px;
    }

    /* Mobile Media Query */
    @media (max-width: 480px) {
      .ca-modal {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        max-height: 100vh;
        border-radius: 0;
      }
      .ca-launcher {
        bottom: 16px;
        right: 16px;
      }
    }
  `;

  shadow.appendChild(style);

  // Widget Markup
  const container = document.createElement("div");
  container.innerHTML = `
    <!-- Floating Launcher -->
    <button class="ca-launcher" id="ca-launcher" aria-label="Open Customer Chat" title="Chat with Us">
      <span class="ca-unread-dot" id="ca-dot"></span>
      <svg viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>

    <!-- Chat Modal Window -->
    <div class="ca-modal" id="ca-modal" role="dialog" aria-label="CodeAlpha Assistant" aria-modal="true">
      <div class="ca-header">
        <div class="ca-header-title-group">
          <div class="ca-avatar-icon">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="ca-header-text">
            <h3>Support Assistant</h3>
            <div class="ca-status-line">
              <span class="ca-status-dot"></span>
              <span>Online • CodeAlpha Cloud</span>
            </div>
          </div>
        </div>
        <div class="ca-header-actions">
          <button class="ca-icon-btn" id="ca-clear-btn" title="Clear conversation" aria-label="Clear chat">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
          <button class="ca-icon-btn" id="ca-close-btn" title="Close" aria-label="Close chat window">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div class="ca-messages" id="ca-messages" aria-live="polite">
        <div class="ca-msg bot">
          <div class="ca-bubble">Hello! How can I help you today?</div>
          <div class="ca-suggestions">
            <button class="ca-chip" data-query="What products and services do you offer?">Products & Services</button>
            <button class="ca-chip" data-query="What are your pricing plans?">Pricing & Tiers</button>
            <button class="ca-chip" data-query="What is your return and refund policy?">Refunds & SLA</button>
            <button class="ca-chip" data-query="I want to speak with a human agent">Human Support</button>
          </div>
        </div>
      </div>

      <div class="ca-footer">
        <form class="ca-form" id="ca-form">
          <input
            type="text"
            class="ca-input"
            id="ca-input"
            placeholder="Type your message..."
            autocomplete="off"
            required
            aria-label="Chat input message"
          />
          <button type="submit" class="ca-send-btn" id="ca-send-btn">Send</button>
        </form>
        <div class="ca-sub-footer">CodeAlpha Cloud Assistant • Sub-300ms Streaming</div>
      </div>
    </div>
  `;

  shadow.appendChild(container);

  // Element Selectors inside Shadow Root
  const launcher = shadow.getElementById("ca-launcher");
  const modal = shadow.getElementById("ca-modal");
  const closeBtn = shadow.getElementById("ca-close-btn");
  const clearBtn = shadow.getElementById("ca-clear-btn");
  const form = shadow.getElementById("ca-form");
  const input = shadow.getElementById("ca-input");
  const sendBtn = shadow.getElementById("ca-send-btn");
  const messagesArea = shadow.getElementById("ca-messages");
  const unreadDot = shadow.getElementById("ca-dot");

  let isOpen = false;

  // Toggle Modal
  function toggleModal(open) {
    isOpen = typeof open === "boolean" ? open : !isOpen;
    if (isOpen) {
      modal.classList.add("open");
      if (unreadDot) unreadDot.style.display = "none";
      setTimeout(() => input.focus(), 120);
    } else {
      modal.classList.remove("open");
      launcher.focus();
    }
  }

  launcher.addEventListener("click", () => toggleModal(true));
  closeBtn.addEventListener("click", () => toggleModal(false));

  // Keyboard navigation: Escape closes modal
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      toggleModal(false);
    }
  });

  // Scroll to bottom
  function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  // Format simple markdown into safe HTML
  function formatMarkdown(text) {
    if (!text) return "";
    let safe = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold **text**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Code `text`
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Markdown link [title](url)
    safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    return safe;
  }

  // Append user or bot message
  function appendMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = `ca-msg ${sender}`;

    const bubble = document.createElement("div");
    bubble.className = "ca-bubble";
    bubble.innerHTML = formatMarkdown(text);

    msg.appendChild(bubble);
    messagesArea.appendChild(msg);
    scrollToBottom();
    return bubble;
  }

  // Render typing indicator
  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "ca-msg bot";
    typing.id = "ca-typing-indicator";
    typing.innerHTML = `
      <div class="ca-typing">
        <span class="ca-dot"></span>
        <span class="ca-dot"></span>
        <span class="ca-dot"></span>
      </div>
    `;
    messagesArea.appendChild(typing);
    scrollToBottom();
  }

  function removeTyping() {
    const el = shadow.getElementById("ca-typing-indicator");
    if (el) el.remove();
  }

  // Render suggestions chips
  function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) return;
    const chipsDiv = document.createElement("div");
    chipsDiv.className = "ca-suggestions";

    suggestions.forEach(query => {
      const chip = document.createElement("button");
      chip.className = "ca-chip";
      chip.textContent = query;
      chip.onclick = () => sendMessage(query);
      chipsDiv.appendChild(chip);
    });

    messagesArea.appendChild(chipsDiv);
    scrollToBottom();
  }

  // Delegate initial chip clicks
  messagesArea.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("ca-chip")) {
      const query = e.target.getAttribute("data-query") || e.target.textContent;
      if (query) sendMessage(query);
    }
  });

  // Handle SSE streaming or fallback
  async function sendMessage(userText) {
    const text = (userText || "").trim();
    if (!text) return;

    input.value = "";
    appendMessage(text, "user");

    input.disabled = true;
    sendBtn.disabled = true;
    showTyping();

    let assistantBubble = null;
    let accumulatedText = "";

    try {
      // 1. Try Server-Sent Events (SSE) streaming endpoint
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId
        },
        body: JSON.stringify({ message: text, session_id: sessionId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      // Check for streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let hasReceivedFirstToken = false;
      let finalMeta = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // keep trailing incomplete piece

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.substring(5).trim();
            if (!dataStr) continue;

            try {
              const chunk = JSON.parse(dataStr);

              if (!hasReceivedFirstToken) {
                removeTyping();
                assistantBubble = appendMessage("", "bot");
                hasReceivedFirstToken = true;
              }

              if (chunk.token) {
                accumulatedText += chunk.token;
                assistantBubble.innerHTML = formatMarkdown(accumulatedText);
                scrollToBottom();
              }

              if (chunk.done) {
                finalMeta = chunk;
              }
            } catch (err) {
              // Ignore non-json chunks
            }
          }
        }
      }

      removeTyping();

      if (finalMeta && finalMeta.suggestions) {
        renderSuggestions(finalMeta.suggestions);
      }

    } catch (streamError) {
      console.warn("Streaming error, falling back to standard API:", streamError);
      removeTyping();

      // Fallback: standard non-streaming endpoint
      try {
        const fallbackRes = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": sessionId
          },
          body: JSON.stringify({ message: text, session_id: sessionId })
        });
        const fallbackData = await fallbackRes.json();
        appendMessage(fallbackData.reply || "Sorry, I could not process your request.", "bot");
        if (fallbackData.suggestions) {
          renderSuggestions(fallbackData.suggestions);
        }
      } catch (fallbackError) {
        appendMessage("Unable to connect to support. Please verify your connection or try again later.", "bot");
      }
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // Form Submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(input.value);
  });

  // Clear Chat History
  clearBtn.addEventListener("click", () => {
    if (confirm("Reset conversation history?")) {
      messagesArea.innerHTML = `
        <div class="ca-msg bot">
          <div class="ca-bubble">Hello! How can I help you today?</div>
          <div class="ca-suggestions">
            <button class="ca-chip" data-query="What products and services do you offer?">Products & Services</button>
            <button class="ca-chip" data-query="What are your pricing plans?">Pricing & Tiers</button>
            <button class="ca-chip" data-query="What is your return and refund policy?">Refunds & SLA</button>
            <button class="ca-chip" data-query="I want to speak with a human agent">Human Support</button>
          </div>
        </div>
      `;
      // Clear session ID to start fresh token window
      sessionId = "sess_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      sessionStorage.setItem("ca_chat_session_id", sessionId);
    }
  });

  // Public API on window
  window.CodeAlphaChatbot = {
    open: () => toggleModal(true),
    close: () => toggleModal(false),
    toggle: () => toggleModal(),
    ask: (q) => {
      toggleModal(true);
      setTimeout(() => sendMessage(q), 200);
    }
  };
})();
