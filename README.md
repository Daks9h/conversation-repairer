# Conversation Repairer

Conversation Repairer turns your exported WhatsApp chat history into evidence-backed relationship context to help resolve misunderstandings. When tensions arise, it uses past promises, recurring patterns, and communication preferences to suggest thoughtful, grounded ways to respond.

---

## Screenshots

<!-- Screenshot: Upload and sender selection screen -->
*(Screenshot placeholder: Upload exported WhatsApp chat and select participants)*

<!-- Screenshot: Extracted relationship memories dashboard -->
*(Screenshot placeholder: Extracted relationship memories dashboard with evidence quotes)*

<!-- Screenshot: Conversation repair suggestions and analysis -->
*(Screenshot placeholder: Repair suggestions with soft, casual, and direct options)*

---

## How It Works

1. **Parse in Browser:** You upload a standard exported WhatsApp chat (`.txt`). All text parsing (timestamps, senders, multiline messages, and system line filtering) happens entirely in your browser.
2. **Chunking:** The conversation is divided into message chunks of up to ~1,500 messages from recent history.
3. **Extraction with Evidence:** Gemma analyzes each chunk and extracts key relationship memories across four categories: promises, recurring issues, preferences, and important shared events. Every memory must cite an exact verbatim quote from the chat as evidence.
4. **Deduplication & Local Storage:** Near-duplicate memories are merged and stored directly in your browser's `localStorage` (`cr:memories`). You can edit or delete any memory at any time.
5. **Keyword Retrieval:** When you paste a tense conversation snippet to repair, the app tokenizes the text, drops common English and Hinglish stop words, and scores memories using keyword overlap, category relevance, and recency.
6. **Repair Analysis & Suggestions:** Gemma analyzes the situation alongside the retrieved context and generates 3 tailored response options (Soft, Casual, and Direct), points out things to avoid, and notes uncertainties.

### Architecture Flow

```text
  WhatsApp Export (.txt)
            │
            ▼
  ┌──────────────────┐
  │  Browser Parser  │  (Runs client-side)
  └─────────┬────────┘
            │
            ▼
  ┌──────────────────┐
  │ Message Chunker  │  (Recent ~1,500 messages)
  └─────────┬────────┘
            │
            ▼
  ┌──────────────────┐
  │ Gemma Extraction │  (Extracts memories with exact quotes)
  └─────────┬────────┘
            │
            ▼
  ┌──────────────────┐
  │   LocalStorage   │  (cr:memories stored only in browser)
  └─────────┬────────┘
            │
  Tense chat to repair
            │
            ▼
  ┌──────────────────┐
  │ Keyword Retrieve │  (Scores overlap, category & recency)
  └─────────┬────────┘
            │
            ▼
  ┌──────────────────┐
  │   Gemma Repair   │  (Analyzes issue + retrieved context)
  └─────────┬────────┘
            │
            ▼
   3 Response Options: Soft, Casual, Direct
```

---

## Why Gemma and Open Models?

Gemma is Google's family of lightweight, state-of-the-art open models built from the same research and technology used for Gemini.

Using open models offers crucial advantages:
- **No Vendor Lock-In:** You are not tied to a single proprietary cloud API. You can switch providers or run locally anytime.
- **Run Anywhere:** Gemma models can be deployed via hosted cloud APIs or executed locally on your own machine using tools like Ollama.
- **Privacy Freedom:** Running Gemma locally ensures your personal conversation data stays on your own hardware without transmitting text to third-party cloud servers.

---

## Setup

### Requirements
- **Node.js**: Version 18 or higher (Node 20+ recommended)
- **npm**: Version 9 or higher
- **Gemma Access**: Either a Google AI Studio API key (for hosted mode) or a local Ollama installation

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/Daks9h/conversation-repairer.git
cd conversation-repairer
npm run build
```

### Environment Variables
Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | The port the Express backend server listens on. | `8787` |
| `LLM_PROVIDER` | LLM backend to use: `hosted` (Google AI Studio) or `ollama` (local). | `hosted` |
| `GEMMA_API_KEY` | Your Google AI Studio API key. Required when `LLM_PROVIDER=hosted`. | *(Required for hosted)* |
| `GEMMA_MODEL` | The model name (e.g. `gemma-4-26b-a4b-it` for hosted, or `gemma2:9b` for Ollama). | `gemma-4-26b-a4b-it` |
| `OLLAMA_BASE_URL` | Base URL for your local Ollama instance (only used when `LLM_PROVIDER=ollama`). | `http://localhost:11434` |

### Running the App

#### Windows

**Development Mode** (Runs backend with live reload and Vite dev server):
```powershell
# Terminal 1: Backend
npm run backend

# Terminal 2: Frontend
npm run frontend
```
Visit `http://localhost:5173`.

**Production Mode** (Single-service Express app serving built frontend):
```powershell
npm run build
npm start
```
Visit `http://localhost:8787`.

#### Mac / Linux

**Development Mode**:
```bash
# Terminal 1: Backend
npm run backend

# Terminal 2: Frontend
npm run frontend
```
Visit `http://localhost:5173`.

**Production Mode**:
```bash
npm run build
npm start
```
Visit `http://localhost:8787`.

---

## Running with Ollama (Local Option)

If you prefer to run entirely on your own computer without using cloud APIs:

1. Download and install Ollama from [ollama.com](https://ollama.com).
2. Pull a Gemma model:
   ```bash
   ollama pull gemma2:9b
   ```
   *(Or `ollama pull gemma2:27b` if you have sufficient VRAM/RAM).*
3. Update your `.env` file:
   ```env
   LLM_PROVIDER=ollama
   GEMMA_MODEL=gemma2:9b
   OLLAMA_BASE_URL=http://localhost:11434
   ```
4. Start the app:
   ```bash
   npm start
   ```

All chat analysis and suggestion generation will now run completely offline through Ollama on your local machine.

---

## Deployment (Render)

This repository is configured for single-service deployment where Express serves the static frontend and handles `/api` routes on the same port.

A `render.yaml` blueprint is included. To deploy on Render manually:
1. Create a new **Web Service** connected to your repository.
2. Set the following settings:
   - **Environment**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
3. Add the following **Environment Variables**:
   - `NODE_ENV`: `production`
   - `LLM_PROVIDER`: `hosted`
   - `GEMMA_API_KEY`: *(Your Google AI Studio API key)*
   - `GEMMA_MODEL`: `gemma-4-26b-a4b-it`

---

## Privacy

- **Hosted Gemma Mode**: When using `LLM_PROVIDER=hosted`, chat text is sent to Google's hosted Gemma API endpoint for extraction and repair suggestions.
- **Server Storage**: The Express backend is completely stateless. It stores **nothing** on disk or database. No chat text, memories, or API keys are logged or saved to the server.
- **Browser-Only Storage**: Extracted memories are saved strictly inside your browser's local storage (`localStorage`).
- **Data Control**: You can edit or delete individual memories directly from the dashboard, or click **"Delete Everything"** to immediately erase all stored relationship memories and participant names from your browser.

*(Note: Data is transmitted to the configured LLM API provider during analysis requests. For completely private, air-gapped usage, use the local Ollama option.)*

---

## Limitations

- **Not a Therapist or Mind Reader**: Suggestions are possibilities to help communicate more constructively, not definitive facts about what someone is thinking or feeling.
- **Recent Window**: Only the most recent ~1,500 messages of long conversations are processed to respect token boundaries and prioritize current relationship context.
- **Supported Formats**: Tested on standard Android and iPhone WhatsApp `.txt` exports (without media). Other formats, third-party messaging apps, or media attachments are not supported.

---

## Sample Data

Synthetic WhatsApp chats are provided in the `samples/` directory for testing:
- `samples/android_sample.txt`: Android export format between Rohan and Pooja.
- `samples/ios_sample.txt`: iOS export format between Kabir and Ananya.
- `samples/hinglish_sample.txt`: Hinglish conversation covering recurring cancellations and promises.

To try them out:
1. Open the app in your browser.
2. In the upload card, click to select an exported `.txt` file and choose any file from `samples/`.
3. Select which participant represents "Me".
4. Click **Analyze & Extract Memories** to test extraction on realistic synthetic data.

---

## Built With

- **Frontend**: React, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express
- **Model**: Google Gemma 4 (via Google AI Studio / Generative Language API) and Ollama
- **Development**: AI coding assistants (Google Antigravity)

---

## License

MIT License. See [LICENSE](LICENSE) for details.