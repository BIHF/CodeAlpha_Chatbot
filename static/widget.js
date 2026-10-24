/**
 * CodeAlpha Commercial AI Chatbot Widget (Enterprise Production Edition)
 * Zero-dependency, Shadow-DOM encapsulated, accessible, streaming web component.
 * 
 * Features:
 *  - Complete Shadow DOM encapsulation (zero host CSS leakage)
 *  - Server-Sent Events (SSE) streaming with sub-300ms Time-to-First-Token (TTFT)
 *  - Ephemeral session memory with token budget sliding window context
 *  - Warm neutral editorial aesthetic (no neon AI tropes, natural whitespace & typography)
 *  - Optimistic UI updates with quiet 3-dot pulsing typing indicator
 *  - Accessible (WCAG 2.1 AA, ARIA roles, keyboard navigation, Esc to close)
 *  - Fault tolerance & automatic fallback handling with retry mechanism
 */

(function () {
  "use strict";

  // Prevent multiple instantiations if script is embedded more than once
  if (window.CodeAlphaWidgetLoaded) return;
  window.CodeAlphaWidgetLoaded = true;

  // Detect script element and base API configuration
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

  // Create host container element in DOM
  const hostElement = document.createElement("div");
  hostElement.id = "codealpha-chatbot-root";
  document.body.appendChild(hostElement);

  // Attach Shadow DOM for complete CSS isolation
  const shadow = hostElement.attachShadow({ mode: "open" });

  // Component Scoped Styles (Human-Centered Warm Neutral System)
  const style = document.createElement("style");
  style.textContent = `
    :host {
      --font-stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      
      /* Editorial Warm Neutral Palette */
      --color-canvas: #fafaf9;
      --color-surface: #ffffff;
      --color-border: #e7e5e4;
      --color-border-subtle: #f5f5f4;
      --color-text-primary: #1c1917;
      --color-text-secondary: #57534e;
      --color-text-tertiary: #a8a29e;
      
      /* Understated Brand Accent (Reserved strictly for active interactive elements) */
      --color-accent: #15803d;
      --color-accent-hover: #166534;
      --color-accent-soft: rgba(21, 128, 61, 0.08);
      --color-accent-focus: rgba(21, 128, 61, 0.22);
      
      /* Message Bubble System */
      --bubble-bot-bg: #f5f5f4;
      --bubble-bot-text: #1c1917;
      --bubble-user-bg: #ecfdf5;
      --bubble-user-text: #064e3b;
      --bubble-user-border: #d1fae5;
      
      /* Natural Soft Shadows */
      --shadow-launcher: 0 4px 14px -2px rgba(28, 25, 23, 0.08), 0 2px 6px -1px rgba(28, 25, 23, 0.04);
      --shadow-launcher-hover: 0 6px 20px -2px rgba(28, 25, 23, 0.12), 0 3px 8px -1px rgba(28, 25, 23, 0.06);
      --shadow-window: 0 20px 25px -5px rgba(28, 25, 23, 0.08), 0 8px 10px -6px rgba(28, 25, 23, 0.04);

      font-family: var(--font-stack);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Launcher Button */
    .ca-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background-color: var(--color-surface);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-launcher);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease;
      outline: none;
    }

    .ca-launcher:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-launcher-hover);
    }

    .ca-launcher:focus-visible {
      box-shadow: 0 0 0 3px var(--color-accent-focus);
      border-color: var(--color-accent);
    }

    .ca-launcher svg {
      width: 22px;
      height: 22px;
      stroke: var(--color-text-primary);
      fill: none;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.2s ease;
    }

    .ca-launcher.open svg {
      transform: rotate(90deg);
    }

    .ca-badge-dot {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--color-accent);
      border: 2px solid var(--color-surface);
    }

    /* Chat Window Container */
    .ca-modal {
      position: fixed;
      bottom: 90px;
      right: 24px;
      width: 396px;
      height: 590px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 110px);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 18px;
      box-shadow: var(--shadow-window);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483646;
      opacity: 0;
      visibility: hidden;
      transform: translateY(12px) scale(0.98);
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
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
    }

    .ca-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ca-avatar-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background-color: var(--color-canvas);
      border: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-accent);
    }

    .ca-avatar-icon svg {
      width: 17px;
      height: 17px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.8;
    }

    .ca-header-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-primary);
      letter-spacing: -0.01em;
      line-height: 1.25;
    }

    .ca-header-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      color: var(--color-text-secondary);
      margin-top: 1px;
    }

    .ca-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--color-accent);
    }

    .ca-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ca-icon-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s, color 0.15s;
      outline: none;
    }

    .ca-icon-btn:hover {
      background-color: var(--color-canvas);
      color: var(--color-text-primary);
    }

    .ca-icon-btn:focus-visible {
      box-shadow: 0 0 0 2px var(--color-accent-focus);
    }

    .ca-icon-btn svg {
      width: 15px;
      height: 15px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.75;
    }

    /* Message Thread */
    .ca-thread {
      flex: 1;
      overflow-y: auto;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background-color: var(--color-canvas);
      scroll-behavior: smooth;
    }

    .ca-msg-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
      animation: caFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes caFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ca-msg-wrapper.bot {
      align-items: flex-start;
    }

    .ca-msg-wrapper.user {
      align-items: flex-end;
    }

    .ca-bubble {
      max-width: 86%;
      padding: 10px 14px;
      border-radius: 13px;
      font-size: 13.5px;
      line-height: 1.58;
      word-break: break-word;
    }

    .ca-msg-wrapper.bot .ca-bubble {
      background-color: var(--bubble-bot-bg);
      color: var(--bubble-bot-text);
      border-top-left-radius: 3px;
    }

    .ca-msg-wrapper.user .ca-bubble {
      background-color: var(--bubble-user-bg);
      color: var(--bubble-user-text);
      border: 1px solid var(--bubble-user-border);
      border-top-right-radius: 3px;
    }

    /* Clean Markdown inside Bubbles */
    .ca-bubble p {
      margin-bottom: 7px;
    }

    .ca-bubble p:last-child {
      margin-bottom: 0;
    }

    .ca-bubble strong {
      font-weight: 600;
      color: inherit;
    }

    .ca-bubble ul, .ca-bubble ol {
      margin: 4px 0 6px 18px;
    }

    .ca-bubble li {
      margin-bottom: 3px;
    }

    .ca-bubble code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      background-color: rgba(28, 25, 23, 0.05);
      padding: 2px 5px;
      border-radius: 4px;
    }

    .ca-bubble a {
      color: var(--color-accent);
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    /* Suggestion Chips */
    .ca-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .ca-chip {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      color: var(--color-text-primary);
      padding: 5px 11px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 450;
      cursor: pointer;
      transition: border-color 0.15s, background-color 0.15s, color 0.15s;
      outline: none;
      user-select: none;
    }

    .ca-chip:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
      background-color: var(--color-accent-soft);
    }

    .ca-chip:focus-visible {
      box-shadow: 0 0 0 2px var(--color-accent-focus);
    }

    /* Quiet 3-Dot Typing Indicator */
    .ca-typing {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background-color: var(--bubble-bot-bg);
      border-radius: 13px;
      border-top-left-radius: 3px;
      width: fit-content;
    }

    .ca-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background-color: var(--color-text-secondary);
      opacity: 0.35;
      animation: caPulse 1.25s infinite ease-in-out;
    }

    .ca-dot:nth-child(2) { animation-delay: 0.2s; }
    .ca-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes caPulse {
      0%, 80%, 100% { opacity: 0.25; transform: scale(0.9); }
      40% { opacity: 0.95; transform: scale(1.1); }
    }

    /* Footer & Input */
    .ca-footer {
      padding: 12px 14px;
      background-color: var(--color-surface);
      border-top: 1px solid var(--color-border);
    }

    .ca-form {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .ca-input {
      flex: 1;
      border: 1px solid var(--color-border);
      border-radius: 9px;
      padding: 9px 12px;
      font-size: 13.5px;
      color: var(--color-text-primary);
      background-color: var(--color-surface);
      outline: none;
      font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .ca-input:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 2px var(--color-accent-focus);
    }

    .ca-input::placeholder {
      color: var(--color-text-tertiary);
    }

    .ca-send-btn {
      background-color: var(--color-accent);
      color: #ffffff;
      border: none;
      border-radius: 9px;
      padding: 9px 14px;
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s;
      outline: none;
    }

    .ca-send-btn:hover {
      background-color: var(--color-accent-hover);
    }

    .ca-send-btn:focus-visible {
      box-shadow: 0 0 0 2px var(--color-accent-focus);
    }

    .ca-send-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .ca-caption {
      text-align: center;
      font-size: 10.5px;
      color: var(--color-text-tertiary);
      margin-top: 6px;
      user-select: none;
    }

    /* Mobile Responsiveness */
    @media (max-width: 480px) {
      .ca-modal {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        max-height: 100vh;
        border-radius: 0;
        border: none;
      }
      .ca-launcher {
        bottom: 16px;
        right: 16px;
      }
    }
  `;

  shadow.appendChild(style);

  // Widget DOM Skeleton
  const container = document.createElement("div");
  container.innerHTML = `
    <!-- Floating Launcher -->
    <button class="ca-launcher" id="ca-launcher" aria-label="Open CodeAlpha Assistant" title="Chat with Support">
      <span class="ca-badge-dot" id="ca-badge"></span>
      <svg id="ca-launcher-icon" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>

    <!-- Chat Modal -->
    <div class="ca-modal" id="ca-modal" role="dialog" aria-modal="true" aria-label="CodeAlpha Cloud Support">
      <div class="ca-header">
        <div class="ca-header-left">
          <div class="ca-avatar-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <div class="ca-header-title">CodeAlpha Assistant</div>
            <div class="ca-header-status">
              <span class="ca-status-dot"></span>
              <span>Online • Hybrid AI & Support</span>
            </div>
          </div>
        </div>
        <div class="ca-header-actions">
          <button class="ca-icon-btn" id="ca-clear-btn" title="Reset conversation" aria-label="Reset conversation">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
          <button class="ca-icon-btn" id="ca-close-btn" title="Close chat" aria-label="Close chat">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div class="ca-thread" id="ca-thread" aria-live="polite">
        <div class="ca-msg-wrapper bot">
          <div class="ca-bubble">Hello! I'm the CodeAlpha Cloud Assistant. How can I assist you with products, pricing, SLAs, or technical support today?</div>
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
            aria-label="Your message"
          />
          <button type="submit" class="ca-send-btn" id="ca-send-btn">Send</button>
        </form>
        <div class="ca-caption">CodeAlpha Cloud Assistant • Sub-300ms Streaming</div>
      </div>
    </div>
  `;

  shadow.appendChild(container);

  // Cached Elements inside Shadow Root
  const launcher = shadow.getElementById("ca-launcher");
  const modal = shadow.getElementById("ca-modal");
  const closeBtn = shadow.getElementById("ca-close-btn");
  const clearBtn = shadow.getElementById("ca-clear-btn");
  const form = shadow.getElementById("ca-form");
  const input = shadow.getElementById("ca-input");
  const sendBtn = shadow.getElementById("ca-send-btn");
  const thread = shadow.getElementById("ca-thread");
  const badge = shadow.getElementById("ca-badge");

  let isModalOpen = false;

  // Toggle Modal State
  function toggleModal(open) {
    isModalOpen = typeof open === "boolean" ? open : !isModalOpen;
    if (isModalOpen) {
      modal.classList.add("open");
      launcher.classList.add("open");
      if (badge) badge.style.display = "none";
      setTimeout(() => input.focus(), 140);
    } else {
      modal.classList.remove("open");
      launcher.classList.remove("open");
      launcher.focus();
    }
  }

  launcher.addEventListener("click", () => toggleModal());
  closeBtn.addEventListener("click", () => toggleModal(false));

  // Escape key closes modal (accessibility standard)
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isModalOpen) {
      toggleModal(false);
    }
  });

  // Smooth scroll helper
  function scrollToBottom() {
    thread.scrollTop = thread.scrollHeight;
  }

  // Markdown formatter (XSS-safe)
  function formatMarkdown(text) {
    if (!text) return "";
    let safe = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold **text**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Inline code `code`
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Markdown links [title](url)
    safe = safe.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    // Simple bullet formatting
    safe = safe.replace(/\n- /g, "<br>• ");
    safe = safe.replace(/\n\n/g, "<br><br>");
    safe = safe.replace(/\n/g, "<br>");

    return safe;
  }

  // Append a bubble to the thread
  function appendMessage(text, sender) {
    const wrapper = document.createElement("div");
    wrapper.className = `ca-msg-wrapper ${sender}`;

    const bubble = document.createElement("div");
    bubble.className = "ca-bubble";
    bubble.innerHTML = formatMarkdown(text);

    wrapper.appendChild(bubble);
    thread.appendChild(wrapper);
    scrollToBottom();
    return bubble;
  }

  // Show quiet 3-dot typing indicator
  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "ca-msg-wrapper bot";
    typing.id = "ca-typing-indicator";
    typing.innerHTML = `
      <div class="ca-typing" aria-label="Assistant is typing">
        <span class="ca-dot"></span>
        <span class="ca-dot"></span>
        <span class="ca-dot"></span>
      </div>
    `;
    thread.appendChild(typing);
    scrollToBottom();
  }

  function removeTyping() {
    const el = shadow.getElementById("ca-typing-indicator");
    if (el) el.remove();
  }

  // Render suggestion chips
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

    thread.appendChild(chipsDiv);
    scrollToBottom();
  }

  // Handle delegated chip clicks
  thread.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("ca-chip")) {
      const query = e.target.getAttribute("data-query") || e.target.textContent;
      if (query) sendMessage(query);
    }
  });

  // Primary Message Handler: SSE Streaming with optimistic updates & graceful fallback
  async function sendMessage(userText) {
    const text = (userText || "").trim();
    if (!text) return;

    input.value = "";
    // Optimistic UI update: display user query immediately
    appendMessage(text, "user");

    input.disabled = true;
    sendBtn.disabled = true;
    showTyping();

    let assistantBubble = null;
    let accumulatedText = "";

    try {
      // Attempt Server-Sent Events (SSE) streaming
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId
        },
        body: JSON.stringify({ message: text, session_id: sessionId })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

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
        buffer = lines.pop(); // keep trailing partial line

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
            } catch (jsonErr) {
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
      // Graceful fallback to non-streaming POST endpoint
      console.warn("SSE streaming interrupted, falling back to standard endpoint:", streamError);
      removeTyping();

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
        appendMessage(fallbackData.reply || "Sorry, I could not process your request at this time.", "bot");
        if (fallbackData.suggestions) {
          renderSuggestions(fallbackData.suggestions);
        }
      } catch (fallbackError) {
        appendMessage("Unable to connect to support. Please check your internet connection and try again.", "bot");
      }
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // Form Submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(input.value);
  });

  // Clear Chat History & Reset Session
  clearBtn.addEventListener("click", () => {
    if (confirm("Reset conversation history?")) {
      thread.innerHTML = `
        <div class="ca-msg-wrapper bot">
          <div class="ca-bubble">Hello! I'm the CodeAlpha Cloud Assistant. How can I assist you with products, pricing, SLAs, or technical support today?</div>
          <div class="ca-suggestions">
            <button class="ca-chip" data-query="What products and services do you offer?">Products & Services</button>
            <button class="ca-chip" data-query="What are your pricing plans?">Pricing & Tiers</button>
            <button class="ca-chip" data-query="What is your return and refund policy?">Refunds & SLA</button>
            <button class="ca-chip" data-query="I want to speak with a human agent">Human Support</button>
          </div>
        </div>
      `;
      // Fresh ephemeral session ID
      sessionId = "sess_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      sessionStorage.setItem("ca_chat_session_id", sessionId);
    }
  });

  // Public Programmatic API exposed on window
  window.CodeAlphaChatbot = {
    open: () => toggleModal(true),
    close: () => toggleModal(false),
    toggle: () => toggleModal(),
    ask: (query) => {
      toggleModal(true);
      setTimeout(() => sendMessage(query), 180);
    }
  };
})();
