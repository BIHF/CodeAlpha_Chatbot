/**
 * Simple, Clean Frontend Logic for CodeAlpha Chatbot
 * Supports Server-Sent Events (SSE) streaming and graceful REST fallback.
 */

document.addEventListener("DOMContentLoaded", function () {
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const messagesContainer = document.getElementById("chat-messages");

  // Ephemeral session tracking
  let sessionId = sessionStorage.getItem("ca_web_session_id");
  if (!sessionId) {
    sessionId = "web_" + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem("ca_web_session_id", sessionId);
  }

  // Keep message area scrolled to the bottom
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Format simple markdown (bold, italic, code) while preventing XSS
  function formatMessageText(rawText) {
    if (!rawText) return "";

    let safeText = rawText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace markdown bold **text**
    safeText = safeText.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Replace markdown inline code `code`
    safeText = safeText.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Replace markdown links [text](url)
    safeText = safeText.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    return safeText;
  }

  // Append a message bubble to the chat container
  function appendMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;

    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = "bubble";
    bubbleDiv.innerHTML = formatMessageText(text);

    messageDiv.appendChild(bubbleDiv);
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    return bubbleDiv;
  }

  // Show subtle typing indicator
  function showTyping() {
    const typingDiv = document.createElement("div");
    typingDiv.className = "message bot";
    typingDiv.id = "typing-placeholder";

    typingDiv.innerHTML = `
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;

    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
  }

  // Remove typing indicator
  function removeTyping() {
    const typingDiv = document.getElementById("typing-placeholder");
    if (typingDiv) {
      typingDiv.remove();
    }
  }

  // Handle message sending with SSE streaming
  async function handleSendMessage(event) {
    event.preventDefault();

    const text = userInput.value.trim();
    if (!text) return; // Prevent empty or whitespace-only messages

    // 1. Display user message
    appendMessage(text, "user");

    // 2. Clear input field and set UI loading state
    userInput.value = "";
    userInput.disabled = true;
    sendButton.disabled = true;

    showTyping();

    let botBubble = null;
    let accumulatedText = "";

    try {
      // 3. Try Server-Sent Events (SSE) streaming endpoint
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId
        },
        body: JSON.stringify({ message: text, session_id: sessionId })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let firstTokenReceived = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.substring(5).trim();
            if (!dataStr) continue;

            try {
              const chunk = JSON.parse(dataStr);
              if (!firstTokenReceived) {
                removeTyping();
                botBubble = appendMessage("", "bot");
                firstTokenReceived = true;
              }

              if (chunk.token) {
                accumulatedText += chunk.token;
                botBubble.innerHTML = formatMessageText(accumulatedText);
                scrollToBottom();
              }
            } catch (e) {
              // Ignore non-json chunks
            }
          }
        }
      }

      removeTyping();
    } catch (streamError) {
      console.warn("SSE stream failed, falling back to standard API:", streamError);
      removeTyping();

      // Graceful fallback to standard REST endpoint
      try {
        const fallbackRes = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": sessionId
          },
          body: JSON.stringify({ message: text, session_id: sessionId })
        });
        const fallbackData = await fallbackRes.json();
        appendMessage(fallbackData.reply || "Sorry, I did not understand that.", "bot");
      } catch (err) {
        appendMessage("Unable to connect to the server. Please try again.", "bot");
      }
    } finally {
      // 4. Re-enable input and return focus
      userInput.disabled = false;
      sendButton.disabled = false;
      userInput.focus();
    }
  }

  // Form submit handler
  chatForm.addEventListener("submit", handleSendMessage);

  // Focus input on load
  userInput.focus();
});
