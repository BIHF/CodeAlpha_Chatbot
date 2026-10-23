# CodeAlpha Commercial AI Chatbot — Integration & Deployment Guide

This guide details how to integrate and configure the embeddable commercial AI chatbot widget on any web platform.

---

## 1. Architectural Highlights

* **Shadow DOM Isolation**: The widget renders inside an encapsulated Shadow Root (`attachShadow({ mode: 'open' })`), guaranteeing zero style collisions with host pages.
* **Server-Sent Events (SSE) Streaming**: Delivers streaming token generation with a Time-to-First-Token (TTFT) under 300ms.
* **Hybrid Generative & Deterministic Intent Engine**: High-speed retrieval for commercial FAQs, pricing, SLAs, and operating hours, combined with LLM generative fallback when configured.
* **Ephemeral Sliding-Window Memory**: Manages conversational history within configurable token budgets, automatically pruning older turns while keeping recent context intact.
* **Enterprise Guardrails**: Blocks prompt injection, jailbreaks, and enforces strict domain boundaries.

---

## 2. 1-Line HTML Integration

Paste this single `<script>` snippet immediately before the closing `</body>` tag of any HTML page:

```html
<!-- CodeAlpha Commercial AI Chatbot Widget -->
<script 
  src="https://your-domain.com/static/widget.js" 
  data-api-url="https://your-domain.com">
</script>
```

### Configuration Attributes
| Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `src` | URL | *(Required)* | Location of the `widget.js` script bundle. |
| `data-api-url` | URL | `window.location.origin` | Base URL of the backend Flask server hosting the `/api/chat/stream` endpoint. |

---

## 3. Programmatic JavaScript API

Once loaded, the widget exposes a global `CodeAlphaChatbot` controller on `window`:

```javascript
// Open the chat window
window.CodeAlphaChatbot.open();

// Close the chat window
window.CodeAlphaChatbot.close();

// Toggle chat window open/closed
window.CodeAlphaChatbot.toggle();

// Open the chat window and automatically send a pre-filled prompt
window.CodeAlphaChatbot.ask("What is your refund policy?");
```

### Example: Custom CTA Button on Host Page
```html
<button onclick="window.CodeAlphaChatbot.ask('Tell me about the Cloud Pro plan')">
  Ask AI about Pro Tier
</button>
```

---

## 4. Backend API Endpoints

### 1. Streaming Endpoint: `POST /api/chat/stream`
* **Content-Type**: `application/json`
* **Response**: `text/event-stream` (Server-Sent Events)
* **Headers**: `X-Session-ID: <optional-session-id>`
* **Request Body**:
```json
{
  "message": "What products and services do you offer?",
  "session_id": "sess_abc123"
}
```
* **Streaming Chunks**:
```text
data: {"token": "CodeAlpha ", "done": false}

data: {"token": "NexaCloud ", "done": false}

data: {"token": "Solutions:\n", "done": false}

data: {"done": true, "intent": "product_service_discovery", "confidence": 0.95, "suggestions": ["Pricing Plans", "SLA and Uptime"]}
```

### 2. Standard Endpoint: `POST /api/chat`
* **Content-Type**: `application/json`
* **Request Body**:
```json
{
  "message": "What are your operating hours?"
}
```
* **Response**:
```json
{
  "confidence": 1.0,
  "intent": "operating_hours",
  "latency_ms": 1.2,
  "reply": "**Support & Operating Hours**:\n- **AI Chatbot**: Operates 24/7/365.\n- **Live Engineering**: Monday-Friday, 8:00 AM – 8:00 PM EST.",
  "suggestions": ["Talk to Human Agent", "Raise Support Ticket"],
  "tier": "exact"
}
```

### 3. Support Ticket Creation: `POST /api/ticket`
* **Request Body**:
```json
{
  "email": "customer@company.com",
  "issue": "Cannot provision additional serverless containers in eu-west"
}
```
* **Response**:
```json
{
  "success": true,
  "ticket_id": "CA-1042",
  "message": "Support ticket successfully filed. A cloud mentor will contact you shortly."
}
```

---

## 5. Security & Content Security Policy (CSP)

If the host site implements strict Content Security Policies, whitelist the following directives:

```http
Content-Security-Policy: 
  script-src 'self' https://your-domain.com;
  connect-src 'self' https://your-domain.com;
```

---

## 6. Accessibility & Keyboard Shortcuts

* **Screen Readers**: Supports `aria-live="polite"`, `role="dialog"`, and `aria-label` descriptions.
* **Keyboard Navigation**:
  * **Tab / Shift+Tab**: Traps focus inside the active chat modal.
  * **Enter**: Submits the current message input.
  * **Escape**: Closes the active chat modal and returns focus to the floating launcher button.
