# Insider NITT website

Insider NITT is a simple, (HTML , CSS , JS ) based institutional knowledge repository and peer-to-peer connection workspace designed using a strict high-contrast, monochrome **brutalist theme**.

The application utilizes a multi-modal AI voice compilation engine, vector embedding generation tracking pipelines, and a direct semantic Retrieval-Augmented Generation (RAG) loop to digitize, archive, query, and contextually synthesize college interview experiences and project structures.

---

## Core Functional Features

### 1. Isolated Secure Access Gateway
* **Registration and Login:** Features a neat, visually isolated login vs. registration toggle portal interface that defaults safely to credential validation screens.
* **Cryptographic Security:** Cleartext passwords are securely processed via native `hashlib` PBKDF2-HMAC-SHA256 hashing loops before database persistence operations.
* **Dynamic Year Calculations:** Selecting a graduation year automatically evaluates and maps an operator's academic status tier labels (`FRESHER`, `SOPHOMORE`, `PREFINAL YEAR`, `FINAL YEAR`).

### 2. Database-Backed Session Token Verification
* **Accidental Logout Resolution:** Eliminates session dropped states by saving unique tracking token hex keys inside the browser's local cache alongside matching database columns.
* **Validation Middleware:** Automated token tracing verify routines crosscheck user profile variables during startup and active Single Page Application (SPA) view rotations.

### 3. Split-Screen Document Desk Interface
* **True Split Window Execution:** The screen layout isolates operations. The left panel manages voice recordings and meta variables; the right panel features a completely unlocked, live-editable canvas tracking manual text updates.
* **Decoupled Action Pipelines:** Includes two completely separate button execution pathways:
  * **Transmit & Process Audio:** Streams raw multi-part in-memory webm audio bytes directly to `gemini-2.5-flash` to transcribe and format clean markdown text document templates.
  * **Commit to Repository:** Evaluates text parameters inside the writing workspace canvas and fires vector index insertions to index the entry under the global ledger database.

### 4. Experiences Explorer (Direct Semantic RAG Search)
* **Asymmetric Coordinate Mapping:** Converts document strings to vector matrices using the modern `gemini-embedding-2` model configuration layout.
* **Top-Bar Control Console:** Replaces legacy sidebar elements with a horizontal, clean top-bar text search field paired with localized category selectors (`ALL STORIES`, `INTERVIEWS`, `PROJECTS`).
* **AI Knowledge Synthesis:** Generates a real-time semantic synthesis brief box at the peak of search result frames by calculating mathematical vector dot-product similarity scores in-memory.

### 5. Mock Interviews Availability Forum
* **Filterable Category Sub-Tabs:** Explicitly segregates matching schedules into two filterable horizontal sub-tab lists:
  * **Available Slots:** Posted by student interviewers ready to conduct evaluations.
  * **Interview Requests:** Posted by candidate targets seeking mock assessments.
* **Interactive Peer Acceptance:** Operators can directly lock a listing row on the board and transmit peer message strings directly to the author.

### 6. Notifications Alerts Ledger Center
* **Drawer Notification Hub:** Integrates an asynchronous notification icon indicator badge directly within the platform's topmost header.
* **Direct Notification Dispatch:** Displays unread message threads from peer mock commitments directly within a floating panel scroller module, completely decoupled from gamified metric distractions.

---

## Pre-Installation Requirements

Ensure you have the following environments configured locally before launching the engine sequence:

1. **Python Runtime Engine:** Python `3.10` installed and FastAPI .
2. **Web Browser Support:** Modern Chromium-based context engines (Google Chrome, Microsoft Edge, Brave) supporting native `getUserMedia` microphone API stream bindings.
3. **Google AI Studio Key:** An active access API token from Google AI Studio to access `gemini-2.5-flash` and `gemini-embedding-2` architectures.

---
