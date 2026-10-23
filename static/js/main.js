/**
 * Simple, Clean Frontend Logic for CodeAlpha Chatbot
 * Handles message sending, backend communication, and UI updates.
 */

document.addEventListener("DOMContentLoaded", function () {
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const messagesContainer = document.getElementById("chat-messages");

  // Keep message area scrolled to the bottom
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Format simple markdown (bold, italic, code) while preventing XSS
  function formatMessageText(rawText) {
    if (!rawText) return "";

    // Escape HTML special characters
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

  // Append a message to the chat container
  function appendMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;

    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = "bubble";
    bubbleDiv.innerHTML = formatMessageText(text);

    messageDiv.appendChild(bubbleDiv);
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
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

  // Handle message sending
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

    // 3. Send request to existing Flask backend
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: text })
      });

      removeTyping();

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || "Sorry, I did not understand that.";
      appendMessage(reply, "bot");
    } catch (error) {
      console.error("Chat request failed:", error);
      removeTyping();
      appendMessage("Unable to connect to the server. Please try again.", "bot");
    } finally {
      // 4. Re-enable input and return focus
      userInput.disabled = false;
      sendButton.disabled = false;
      userInput.focus();
    }
  }

  // Form submit handler (triggers on Send button click or Enter key)
  chatForm.addEventListener("submit", handleSendMessage);

  // Focus input on load
  userInput.focus();
});
