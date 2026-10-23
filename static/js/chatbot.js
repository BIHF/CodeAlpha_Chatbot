/**
 * CodeAlpha Cloud AI Chatbot Client Engine
 * Handles message lifecycle, markdown rendering, suggestions, speech recognition,
 * confidence telemetry, CSAT feedback, and session persistence.
 */

(function () {
  "use strict";

  // Elements
  const container = document.getElementById("ca-chat-container");
  const messagesArea = document.getElementById("ca-chat-messages");
  const inputForm = document.getElementById("ca-chat-form");
  const messageInput = document.getElementById("ca-message-input");
  const launcherBtn = document.getElementById("ca-launcher-btn");
  const closeBtn = document.getElementById("ca-close-btn");
  const clearBtn = document.getElementById("ca-clear-btn");
  const micBtn = document.getElementById("ca-mic-btn");
  const soundToggleBtn = document.getElementById("ca-sound-toggle");
  const exportBtn = document.getElementById("ca-export-btn");

  let soundEnabled = false;
  let recognition = null;
  const chatHistory = [];

  // Initialize Speech Recognition if supported
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = function () {
      if (micBtn) micBtn.classList.add("listening");
    };

    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      if (messageInput) {
        messageInput.value = transcript;
        handleSendMessage(transcript);
      }
    };

    recognition.onend = function () {
      if (micBtn) micBtn.classList.remove("listening");
    };

    recognition.onerror = function () {
      if (micBtn) micBtn.classList.remove("listening");
    };
  }

  // Markdown parsing helper
  function parseMarkdown(text) {
    if (!text) return "";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks
    html = html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return '<pre><code>' + code.trim() + '</code></pre>';
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Bold & Italics
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Markdown links [text](url)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bullet lists
    const lines = html.split("\n");
    let inList = false;
    let processed = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        if (!inList) {
          processed.push("<ul>");
          inList = true;
        }
        processed.push("<li>" + trimmed.substring(2) + "</li>");
      } else if (/^\d+\.\s/.test(trimmed)) {
        if (!inList) {
          processed.push("<ol>");
          inList = true;
        }
        processed.push("<li>" + trimmed.replace(/^\d+\.\s/, "") + "</li>");
      } else {
        if (inList) {
          processed.push("</ul>");
          inList = false;
        }
        if (trimmed.length > 0) {
          processed.push("<p>" + trimmed + "</p>");
        }
      }
    }
    if (inList) processed.push("</ul>");

    return processed.join("");
  }

  // Audio chime
  function playChime() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // AudioContext not allowed before user gesture
    }
  }

  // Scroll to bottom
  function scrollToBottom() {
    if (messagesArea) {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
  }

  // Add message bubble
  function appendMessage(text, sender, meta = null) {
    if (!messagesArea) return;

    const msgDiv = document.createElement("div");
    msgDiv.className = `ca-msg ${sender}`;

    const bubble = document.createElement("div");
    bubble.className = "ca-bubble";
    bubble.innerHTML = parseMarkdown(text);
    msgDiv.appendChild(bubble);

    // Meta bar for bot responses
    if (sender === "bot" && meta) {
      const metaBar = document.createElement("div");
      metaBar.className = "ca-meta-bar";

      // Confidence badge
      if (meta.confidence !== undefined) {
        const confBadge = document.createElement("span");
        confBadge.className = "ca-badge-confidence";
        const percent = Math.round(meta.confidence * 100);
        confBadge.textContent = `${percent}% match • ${meta.latency_ms || 1}ms`;
        metaBar.appendChild(confBadge);
      }

      // Feedback buttons
      const feedbackGroup = document.createElement("div");
      feedbackGroup.className = "ca-feedback-group";

      const thumbUp = document.createElement("button");
      thumbUp.className = "ca-feedback-btn";
      thumbUp.title = "Helpful";
      thumbUp.innerHTML = "👍";
      thumbUp.onclick = function () {
        submitFeedback("helpful", meta.intent, thumbUp);
      };

      const thumbDown = document.createElement("button");
      thumbDown.className = "ca-feedback-btn";
      thumbDown.title = "Unhelpful";
      thumbDown.innerHTML = "👎";
      thumbDown.onclick = function () {
        submitFeedback("unhelpful", meta.intent, thumbDown);
      };

      feedbackGroup.appendChild(thumbUp);
      feedbackGroup.appendChild(thumbDown);
      metaBar.appendChild(feedbackGroup);
      msgDiv.appendChild(metaBar);

      // Suggestions chips
      if (meta.suggestions && meta.suggestions.length > 0) {
        const chipsContainer = document.createElement("div");
        chipsContainer.className = "ca-suggestions";

        meta.suggestions.forEach(suggestion => {
          const chip = document.createElement("button");
          chip.className = "ca-chip";
          chip.type = "button";
          chip.textContent = suggestion;
          chip.onclick = function () {
            if (suggestion === "Create Ticket Now") {
              handleSendMessage("ticket: Need assistance with cloud configuration");
            } else {
              handleSendMessage(suggestion);
            }
          };
          chipsContainer.appendChild(chip);
        });

        msgDiv.appendChild(chipsContainer);
      }
    }

    messagesArea.appendChild(msgDiv);
    scrollToBottom();

    // Store in history
    chatHistory.push({ sender, text, meta, timestamp: new Date().toISOString() });
  }

  // Show typing indicator
  function showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.className = "ca-msg bot ca-typing-wrapper";
    typingDiv.id = "ca-typing-indicator";
    typingDiv.innerHTML = `
      <div class="ca-typing">
        <span class="ca-dot"></span>
        <span class="ca-dot"></span>
        <span class="ca-dot"></span>
      </div>
    `;
    messagesArea.appendChild(typingDiv);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById("ca-typing-indicator");
    if (indicator) indicator.remove();
  }

  // Send feedback
  async function submitFeedback(rating, intent, btn) {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, intent })
      });
      btn.parentElement.innerHTML = '<span style="color:#10b981;font-size:11px;">Thanks!</span>';
    } catch (e) {
      console.warn("Feedback error:", e);
    }
  }

  // Primary send handler
  async function handleSendMessage(messageText) {
    const text = (messageText || "").trim();
    if (!text) return;

    if (messageInput) messageInput.value = "";
    appendMessage(text, "user");
    playChime();
    showTypingIndicator();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();
      removeTypingIndicator();

      if (!response.ok) {
        appendMessage(data.error || "Unable to process request.", "bot");
        return;
      }

      appendMessage(data.reply, "bot", data);
      playChime();
    } catch (error) {
      removeTypingIndicator();
      appendMessage("Network connection error. Please ensure the server is running.", "bot");
    }
  }

  // Form submit
  if (inputForm) {
    inputForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (messageInput) handleSendMessage(messageInput.value);
    });
  }

  // Launcher Toggle
  if (launcherBtn && container) {
    launcherBtn.addEventListener("click", function () {
      const isActive = container.classList.toggle("active");
      if (isActive && messageInput) {
        setTimeout(() => messageInput.focus(), 200);
      }
    });
  }

  // Close Button
  if (closeBtn && container) {
    closeBtn.addEventListener("click", function () {
      container.classList.remove("active");
    });
  }

  // Microphone Button
  if (micBtn && recognition) {
    micBtn.addEventListener("click", function () {
      try {
        recognition.start();
      } catch (e) {
        recognition.stop();
      }
    });
  }

  // Sound Toggle
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener("click", function () {
      soundEnabled = !soundEnabled;
      soundToggleBtn.textContent = soundEnabled ? "🔊" : "🔇";
      soundToggleBtn.title = soundEnabled ? "Mute Sound" : "Enable Sound";
    });
  }

  // Clear Chat
  if (clearBtn && messagesArea) {
    clearBtn.addEventListener("click", function () {
      if (confirm("Clear conversation history?")) {
        messagesArea.innerHTML = "";
        chatHistory.length = 0;
        appendMessage(
          "Hello! I am your CodeAlpha Cloud AI Chatbot. Ask me about internship tasks, AWS deployment, or SaaS pricing.",
          "bot",
          {
            suggestions: ["Task 4: Making a Chatbot", "AWS Cloud Services", "GitHub Requirements", "Pricing Plans"],
            confidence: 1.0,
            latency_ms: 1
          }
        );
      }
    });
  }

  // Export Transcript
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      const markdown = chatHistory
        .map(msg => `**${msg.sender.toUpperCase()}**: ${msg.text}`)
        .join("\n\n");
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `codealpha-chat-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Expose global helper for trigger buttons on the landing page
  window.openCodeAlphaChat = function (query) {
    if (container) container.classList.add("active");
    if (query) {
      setTimeout(() => handleSendMessage(query), 300);
    }
  };
})();
