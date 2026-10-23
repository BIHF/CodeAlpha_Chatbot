/**
 * CodeAlpha Embeddable Chatbot Widget Loader
 * Single-line script to embed the AI chatbot on ANY external website.
 * Usage:
 * <script src="https://your-cloud-domain.com/static/js/widget.js" data-api-url="https://your-cloud-domain.com"></script>
 */

(function () {
  "use strict";

  // Identify host script and API endpoint
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  const apiUrl = (currentScript && currentScript.getAttribute("data-api-url")) || window.location.origin;

  // Inject Stylesheet
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `${apiUrl}/static/css/chatbot.css`;
  document.head.appendChild(link);

  // Inject HTML Markup
  const widgetWrapper = document.createElement("div");
  widgetWrapper.id = "ca-embeddable-chatbot-root";
  widgetWrapper.innerHTML = `
    <!-- Launcher Button -->
    <button id="ca-launcher-btn" class="ca-widget-launcher" title="Chat with CodeAlpha Cloud AI" aria-label="Open Chat">
      <span class="ca-badge"></span>
      <svg viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
    </button>

    <!-- Floating Chat Window -->
    <div id="ca-chat-container" class="ca-widget-container" role="dialog" aria-modal="true" aria-label="CodeAlpha AI Assistant">
      <div class="ca-chat-header">
        <div class="ca-header-info">
          <div class="ca-avatar">CA</div>
          <div class="ca-title-group">
            <h3>CodeAlpha Assistant</h3>
            <div class="ca-status">
              <span class="ca-status-dot"></span>
              <span>Online • Cloud AI</span>
            </div>
          </div>
        </div>
        <div class="ca-header-actions">
          <button id="ca-sound-toggle" class="ca-icon-btn" title="Toggle Sound">🔇</button>
          <button id="ca-clear-btn" class="ca-icon-btn" title="Clear Chat">🗑️</button>
          <button id="ca-close-btn" class="ca-icon-btn" title="Close">✕</button>
        </div>
      </div>

      <div id="ca-chat-messages" class="ca-chat-messages" aria-live="polite">
        <div class="ca-msg bot">
          <div class="ca-bubble">
            <p><strong>Hello! 👋 Welcome to CodeAlpha Cloud AI.</strong></p>
            <p>I can answer questions regarding Cloud Computing internships, AWS deployment, task requirements, and commercial solutions.</p>
          </div>
          <div class="ca-suggestions">
            <button class="ca-chip" onclick="window.openCodeAlphaChat('Internship Tasks')">Internship Tasks</button>
            <button class="ca-chip" onclick="window.openCodeAlphaChat('Task 4: Making a Chatbot')">Task 4 Chatbot</button>
            <button class="ca-chip" onclick="window.openCodeAlphaChat('AWS Cloud Services')">AWS Deployment</button>
            <button class="ca-chip" onclick="window.openCodeAlphaChat('Raise Support Ticket')">Support Ticket</button>
          </div>
        </div>
      </div>

      <div class="ca-chat-footer">
        <form id="ca-chat-form" class="ca-input-form">
          <input
            id="ca-message-input"
            class="ca-input-field"
            type="text"
            placeholder="Ask about tasks, AWS, or cloud..."
            maxlength="1000"
            autocomplete="off"
            required
          />
          <button type="button" id="ca-mic-btn" class="ca-mic-btn" title="Voice Input">🎤</button>
          <button type="submit" class="ca-send-btn" title="Send Message">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
        <div class="ca-footer-credit">Powered by CodeAlpha Cloud AI • Sub-10ms Latency</div>
      </div>
    </div>
  `;
  document.body.appendChild(widgetWrapper);

  // Inject Chatbot Logic Script
  const script = document.createElement("script");
  script.src = `${apiUrl}/static/js/chatbot.js`;
  document.body.appendChild(script);
})();
