# Insider NITT website

Insider NITT is a simple, (HTML , CSS , JS ) based institutional knowledge repository and peer-to-peer connection workspace designed using a strict high-contrast, monochrome **brutalist theme**.

The application utilizes a multi-modal AI voice compilation engine, vector embedding generation tracking pipelines, and a direct semantic Retrieval-Augmented Generation (RAG) loop to digitize, archive, query, and contextually synthesize college interview experiences and project structures.

---

## Core Functional Features

### 1. Clean Auth & Session Lock
* **Isolated UI Portal:** A clean toggle that completely isolates forms, showing only login or registration fields and defaulting to login.
* **PBKDF2 Security:** Cleartext credentials run through safe PBKDF2-HMAC-SHA256 hashing loops before hitting database rows.
* **Persistent Sessions:** Saves unique tracking token hex keys to your browser cache to completely stop accidental logouts.

### 2. Split Workspace Editor
* **Manual Typing Canvas:** Left panel handles inputs and recording triggers while the right side is an unlocked, live-editable typing desk.
* **Decoupled Processing:** Transcribes microphone recordings to markdown using `gemini-2.5-flash` without auto-saving or clearing your current text.
* **SQLite Commits:** The green commit button calculates vector embedding coordinates and permanently writes the log to disk.

### 3. Experiences Explorer (RAG Search)
* **Horizontal Top Bar:** Replaces crowded side panels with a clean horizontal search console and an `ALL`/`INTERVIEWS`/`PROJECTS` dropdown selector.
* **Asymmetric Embeddings:** Indexes your records using the modern, native `gemini-embedding-2` vector layout configurations.
* **AI Context Synthesis:** Compares vector dot-products in-memory to print a condensed **AI Insight** summary brief right above search results.

### 4. Mock Interviews & Live Alerts
* **Dual Filter Tabs:** Separates the mock board into dedicated horizontal sub-tabs for **Available Slots** (interviewers) and **Interview Requests**.
* **Lock & Connect:** Claim a peer's slot, attach a custom contact message (like a Discord handle), and lock the database row instantly.
* **Notification Center:** Functional, polling alert bell that flashes a real-time badge for fresh peer messages.

---

## Pre-Installation Requirements

Ensure you have the following environments configured locally before launching the engine sequence:

1. **Python Runtime Engine:** Python `3.10` installed.
2. **Web Browser Support:** Modern Chromium-based context engines (Google Chrome, Microsoft Edge, Brave) supporting native `getUserMedia` microphone API stream bindings.
3. **Google AI Studio Key:** An active access API token from Google AI Studio to access `gemini-2.5-flash` and `gemini-embedding-2` architectures.
4. **Install These** Install 'Fastapi' , 'google-genai'

---

## Installation requisites

1. Install Fastapi , google-genai
