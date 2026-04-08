# DocuChat AI

**AI-powered PDF chat app — Upload any PDF and ask questions in natural language.**

🔗 **Live Demo**: [https://docuchat-ai-xi.vercel.app/](https://docuchat-ai-xi.vercel.app/)

---

## Overview

DocuChat AI lets you upload a PDF and have a conversation with it. Powered by Google Gemini 2.5 Flash, it answers questions strictly based on the document content — no hallucinations, no guessing.

---

## Features

- **PDF & TXT upload** — Drag & drop or click to upload (max 10MB)
- **AI chat** — Ask anything about your document in natural language
- **Conversation history** — Multi-turn chat with context awareness
- **Markdown rendering** — AI responses with syntax highlighting
- **Multiple documents** — Switch between documents in the sidebar
- **Suggested questions** — Quick-start prompts after upload
- **Dark UI** — Clean, professional dark theme

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| AI | Google Gemini 2.5 Flash |
| PDF Parsing | pdf-parse |
| Deployment | Vercel (free tier) |

---

## Engineering Highlights

### 1. Multi-Key API Rotation for Free Tier Stability

One of the key challenges of running this app on the **free tier of Google Gemini API** is hitting rate limits (RPM/RPD) quickly — especially under concurrent usage or repeated requests.

**Solution**: Implemented a **multi-key rotation system** in the API route (`src/app/api/chat/route.ts`):

- Multiple Gemini API keys are loaded from environment variables (`GEMINI_API_KEY`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, `GEMINI_API_KEY_4`)
- When a request fails with a `429 Too Many Requests`, `500`, or `503` (quota exceeded / high demand), the system **automatically retries with the next available key**
- If all keys are exhausted, it returns a clear `503` error to the client
- Auth errors (`401`/`403`) short-circuit immediately without retrying

This makes the app significantly more resilient under free-tier constraints without any paid plan.

```typescript
// Key rotation logic (simplified)
const apiKeys = getApiKeys(); // loads GEMINI_API_KEY, _2, _3, _4
for (const key of apiKeys) {
  const res = await callGemini(key, prompt);
    if (res.ok) return res; // success — return immediately
      if (res.status === 429 || res.status >= 500) continue; // try next key
        break; // auth error — stop
        }
        ```

        ### 2. Model Selection: gemini-2.5-flash over gemini-2.0-flash

        During development, `gemini-2.0-flash` consistently returned `limit: 0` even with fresh API keys on the free tier. After testing available models via the Gemini REST API, **`gemini-2.5-flash`** was found to be reliably available on free-tier accounts, with higher throughput and better response quality.

        ### 3. Stateless Architecture (No Database)

        PDF text is extracted on upload and stored in **browser state** (React `useState`). This means:

        - Zero backend storage costs
        - No database setup needed
        - Works entirely within Vercel's free serverless functions

        Each chat request sends the full document text + conversation history to Gemini, which handles context management.

        ### 4. Strict Grounding — No Hallucinations

        The system prompt explicitly instructs Gemini to **only answer based on the provided document content**. If the answer isn't in the document, it says so — preventing AI from making up information.

        ---

        ## How It Works

        ```
        User uploads PDF
            → pdf-parse extracts text
                → Text stored in React state (browser only)

                User asks a question
                    → Document text + question sent to /api/chat
                        → API route tries Gemini keys (rotation)
                            → Gemini answers based strictly on the document
                                → Response rendered with Markdown
                                ```

                                ---

                                ## Getting Started

                                ### 1. Clone the repository

                                ```bash
                                git clone https://github.com/Z200-WEB/docuchat-ai.git
                                cd docuchat-ai
                                ```

                                ### 2. Install dependencies

                                ```bash
                                npm install
                                ```

                                ### 3. Set up environment variables

                                ```bash
                                cp .env.example .env.local
                                ```

                                Edit `.env.local`:

                                ```
                                GEMINI_API_KEY=your_api_key_here
                                GEMINI_API_KEY_2=your_second_key_here   # optional, for rotation
                                GEMINI_API_KEY_3=your_third_key_here    # optional
                                GEMINI_API_KEY_4=your_fourth_key_here   # optional
                                ```

                                Get free API keys at: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

                                ### 4. Run the development server

                                ```bash
                                npm run dev
                                ```

                                Open [http://localhost:3000](http://localhost:3000)

                                ---

                                ## Deploy to Vercel

                                1. Push to GitHub
                                2. Go to [https://vercel.com](https://vercel.com) and import the repository
                                3. Add `GEMINI_API_KEY` (and optionally `_2`, `_3`, `_4`) in Environment Variables
                                4. Deploy

                                ---

                                ## Project Structure

                                ```
                                src/
                                  app/
                                      api/
                                            upload/route.ts   # PDF parsing endpoint
                                                  chat/route.ts     # Gemini AI chat endpoint (with key rotation)
                                                      globals.css         # Global styles
                                                          layout.tsx          # Root layout
                                                              page.tsx            # Main chat UI
                                                                lib/
                                                                    utils.ts            # Utility functions
                                                                    ```

                                                                    ---

                                                                    Built by [Z200-WEB](https://github.com/Z200-WEB)