# CodeAlpha Commercial AI Chatbot (Enterprise Production Edition)

An embeddable, responsive, commercial AI chatbot widget and hybrid conversational platform engineered for **Task 4 of the CodeAlpha Cloud Computing Internship**.

Built with an editorial, human-centered design philosophy, featuring **sub-300ms Server-Sent Events (SSE) streaming**, **Shadow DOM encapsulation**, **sliding-window ephemeral context memory**, and **enterprise security guardrails**.

---

## 🚀 Key Architectural Highlights

### 1. Hybrid Generative & Deterministic Intent Engine
* **Primary Generative Layer**: Fast cloud LLM inference supporting **Google Gemini API**, **Anthropic Claude**, and **OpenAI GPT** with strict temperature control (`0.2–0.4`) and enterprise system prompts.
* **Deterministic Intent & Retrieval Layer**: Zero-cost, sub-10ms exact pattern matching and TF-IDF Cosine Similarity for commercial queries (pricing, product discovery, SLAs, refund policies, operating hours, and human handoff).
* **Fault-Tolerant Fallback**: Gracefully degrades from LLM streaming to grounded local retrieval when offline or when no API keys are present.

### 2. Ephemeral Session Context Memory
* **Sliding-Window Memory**: Thread-safe in-memory session manager (`EphemeralSessionManager`) enforcing conversational turn and token budget bounds.
* **Automatic Truncation**: Prunes older turns chronologically while preserving recent context to manage LLM token budgets.
* **TTL Lifecycle**: Purges inactive sessions after 2 hours.

### 3. Enterprise Safety Guardrails
* **Prompt Injection Defense**: Intercepts jailbreak signatures (DAN mode, delimiter attacks, system prompt leaks).
* **Strict Domain Boundary**: Declines off-topic queries (politics, creative writing, unrelated topics) with polite editorial redirection.
* **Post-Processing Verification**: Inspects generative responses to prevent hallucinated discounts, unapproved promises, or system instruction leaks.

### 4. Zero-Dependency Embeddable Widget
* **Shadow DOM Isolation**: Attached via `attachShadow({ mode: 'open' })` to guarantee zero host CSS bleed or style collision.
* **Server-Sent Events (SSE)**: Streams tokens incrementally with real-time smooth auto-scrolling and optimistic UI updates.
* **Human-Centered Aesthetic**: Warm neutral slates (`#fafaf9`, `#f5f5f4`), dark charcoal typography, quiet 3-dot pulsing typing indicator, and an understated brand accent reserved strictly for active elements.
* **Accessibility (WCAG 2.1 AA)**: Keyboard navigable (Tab focus trap, Escape closes modal), ARIA modal and live regions.

---

## 📁 Repository Structure

```text
CodeAlpha_Chatbot/
├── app.py                     # Production Flask API (SSE streaming, CORS, REST endpoints)
├── engine/                    # Core AI & NLP Pipeline
│   ├── guardrails.py          # Enterprise system instructions & prompt injection shields
│   ├── intent_matcher.py      # Hybrid TF-IDF vectorizer + Cosine scoring + LLM routing
│   ├── llm_fallback.py        # Gemini, Anthropic, & OpenAI inference (temp 0.2–0.4)
│   ├── nlp_engine.py          # TF-IDF, Porter stemmer, tokenization, n-grams
│   └── session_manager.py     # Ephemeral session sliding-window context memory
├── data/
│   ├── intents.json           # Commercial knowledge base (products, pricing, refunds, SLAs)
│   └── intents.yaml           # Structured YAML intent patterns
├── static/
│   ├── widget.js              # Standalone Shadow DOM embeddable streaming widget
│   ├── css/                   # Stylesheets for portal and landing page
│   └── js/                    # Portal logic and widget loader
├── templates/
│   ├── index.html             # NexaCloud commercial showcase with live embedded widget
│   └── chat.html              # Dedicated full-screen chatbot portal
├── docs/
│   └── INTEGRATION_GUIDE.md   # Integration manual (HTML, React, Next.js, API specs)
├── tests/                     # Comprehensive automated test suite (pytest)
│   ├── test_commercial_bot.py # Guardrails, sliding window, intents, SSE streaming
│   ├── test_api.py            # Flask endpoints, CORS, health checks
│   ├── test_intents.py        # Knowledge base validation
│   └── test_nlp_engine.py     # Vectorizer, cosine similarity, tokenization
├── Dockerfile                 # Production multi-stage Docker container
├── docker-compose.yml         # Container orchestration configuration
├── Procfile                   # Cloud PaaS entry point (Gunicorn)
├── requirements.txt           # Minimal, lightweight dependencies
└── README.md                  # Project documentation
```

---

## 🛠️ Quickstart & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/CodeAlpha_Chatbot.git
cd CodeAlpha_Chatbot
```

### 2. Create and Activate Virtual Environment
On Windows (PowerShell):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
On Linux / macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Optional: Configure Generative LLM Keys
The chatbot operates locally out-of-the-box using the TF-IDF retrieval engine. To enable optional cloud LLM fallback, create a `.env` file:
```env
# Optional LLM API Keys
GEMINI_API_KEY=your_gemini_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
LLM_PROVIDER=auto
```

### 5. Start the Application
```bash
python app.py
```
Open **`http://localhost:5000`** in your browser to explore the commercial showcase and embedded AI widget.

---

## 🧪 Automated Testing

Run the full automated test suite covering intent routing, token budget trimming, input sanitization, and SSE streaming:

```bash
python -m pytest -v
```

All 48 tests pass with sub-3s execution time.

---

## 🌐 1-Line Website Integration

Embed the commercial chatbot into **any** website by adding this single script tag before `</body>`:

```html
<script 
  src="https://your-domain.com/static/widget.js" 
  data-api-url="https://your-domain.com">
</script>
```

For full details, including React / Next.js integration components and programmatic API commands, see [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md).

---

## 🐳 Docker & Cloud Deployment

### Run with Docker:
```bash
docker build -t codealpha-chatbot .
docker run -d -p 5000:5000 --name chatbot codealpha-chatbot
```

### Or using Docker Compose:
```bash
docker-compose up -d
```

### Health Check Endpoint:
```bash
curl http://localhost:5000/health
```

---

## 📜 License & Acknowledgments

Developed as part of the **CodeAlpha Cloud Computing Internship** (Task 4: Making an AI Chatbot).
Licensed under the MIT License.
