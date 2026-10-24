# CodeAlpha Commercial AI Chatbot — Integration & Deployment Guide

This guide details how to architect, integrate, and configure the embeddable commercial AI chatbot widget across any web architecture (vanilla HTML, React, Next.js, Vue, Angular, or headless CMS).

---

## 1. Architectural Highlights

* **Shadow DOM Isolation**: The widget renders inside an encapsulated Shadow Root (`attachShadow({ mode: 'open' })`), guaranteeing zero style collisions with host pages.
* **Server-Sent Events (SSE) Streaming**: Delivers streaming token generation with a Time-to-First-Token (TTFT) under 300ms.
* **Hybrid Generative & Deterministic Intent Engine**: High-speed retrieval for commercial FAQs, pricing, SLAs, and operating hours, combined with LLM generative fallback when configured (Google Gemini, Anthropic Claude, OpenAI).
* **Strict Temperature Control (`0.2–0.4`)**: Governs LLM generation to prevent hallucinations and enforce business policy consistency.
* **Ephemeral Sliding-Window Memory**: Manages conversational history within configurable token budgets, automatically pruning older turns while keeping recent context intact.
* **Enterprise Guardrails**: Blocks prompt injection, jailbreaks, and enforces strict commercial domain boundaries.

---

## 2. Zero-Dependency 1-Line HTML Integration

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
| `data-api-url` | URL | `window.location.origin` | Base URL of the backend server hosting the `/api/chat/stream` endpoint. |

---

## 3. React / Next.js Integration Component

For modern React and Next.js applications, use the following zero-dependency wrapper component:

```tsx
// components/ChatbotWidget.tsx
import React, { useEffect } from 'react';

interface ChatbotWidgetProps {
  apiUrl?: string;
  scriptSrc?: string;
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  apiUrl = 'https://your-cloud-domain.com',
  scriptSrc = 'https://your-cloud-domain.com/static/widget.js',
}) => {
  useEffect(() => {
    // Avoid duplicate script injection in StrictMode
    if (document.getElementById('codealpha-widget-script')) return;

    const script = document.createElement('script');
    script.id = 'codealpha-widget-script';
    script.src = scriptSrc;
    script.async = true;
    script.setAttribute('data-api-url', apiUrl);

    document.body.appendChild(script);

    return () => {
      // Optional cleanup on unmount
      const existingScript = document.getElementById('codealpha-widget-script');
      if (existingScript) existingScript.remove();
      const existingRoot = document.getElementById('codealpha-chatbot-root');
      if (existingRoot) existingRoot.remove();
    };
  }, [apiUrl, scriptSrc]);

  return null;
};

export default ChatbotWidget;
```

### Usage in Next.js (`app/layout.tsx` or `pages/_app.tsx`):
```tsx
import { ChatbotWidget } from '@/components/ChatbotWidget';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatbotWidget apiUrl="https://api.yourcloud.com" />
      </body>
    </html>
  );
}
```

---

## 4. Programmatic JavaScript API

Once loaded, the widget exposes a global `CodeAlphaChatbot` controller on `window`:

```javascript
// Open the chat modal window
window.CodeAlphaChatbot.open();

// Close the chat modal window
window.CodeAlphaChatbot.close();

// Toggle chat window open/closed
window.CodeAlphaChatbot.toggle();

// Open the chat window and automatically send a pre-filled prompt
window.CodeAlphaChatbot.ask("What is your refund policy?");
```

### Interactive Call-To-Action (CTA) Example:
```html
<button 
  class="btn-pricing" 
  onclick="window.CodeAlphaChatbot.ask('What is included in the Cloud Pro plan?')">
  Inquire About Pro Tier
</button>
```

---

## 5. Backend API Endpoints

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

### 3. Support Ticket Escalation: `POST /api/ticket`
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

## 6. Security, CORS, and Content Security Policy (CSP)

### CORS Whitelisting
The backend API configures `@app.after_request` headers allowing cross-origin requests from host domains:
```python
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Session-ID"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response
```

### Host CSP Configuration
If the host site implements strict Content Security Policies, whitelist the script and connect endpoints:
```http
Content-Security-Policy: 
  script-src 'self' https://your-cloud-domain.com;
  connect-src 'self' https://your-cloud-domain.com;
```

---

## 7. Accessibility & Keyboard Navigation (WCAG 2.1 AA)

* **Screen Readers**: Employs `aria-live="polite"`, `role="dialog"`, `aria-modal="true"`, and clear labels.
* **Keyboard Navigation**:
  * **Tab / Shift+Tab**: Traps keyboard focus inside the active chat modal.
  * **Enter**: Submits the current message input.
  * **Escape**: Closes the active chat modal and immediately returns focus to the floating launcher button.
