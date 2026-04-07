# DocuChat AI

**AI-powered PDF & document chat using RAG + Gemini 2.5 Flash**

Upload any PDF or text file and ask questions in natural language. DocuChat answers based strictly on the document content — no hallucinations.

## Features

- **PDF & TXT upload** — Drag & drop or click to upload (max 10MB)
- - **AI chat** — Ask anything about your document in natural language
  - - **Conversation history** — Multi-turn chat with context awareness
    - - **Markdown rendering** — AI responses with syntax highlighting
      - - **Multiple documents** — Switch between documents in the sidebar
        - - **Suggested questions** — Quick-start prompts after upload
          - - **Dark UI** — Clean, professional dark theme
           
            - ## Tech Stack
           
            - | Layer | Technology |
            - |-------|-----------|
            - | Frontend | Next.js 14 (App Router) + TypeScript |
            - | Styling | Tailwind CSS |
            - | AI | Google Gemini 2.5 Flash |
            - | PDF Parsing | pdf-parse |
            - | Deployment | Vercel (free tier) |
           
            - ## Getting Started
           
            - ### 1. Clone the repository
           
            - ```bash
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

              Edit `.env.local` and add your Gemini API key:

              ```
              GEMINI_API_KEY=your_api_key_here
              ```

              Get a free API key at: https://aistudio.google.com/app/apikey

              ### 4. Run the development server

              ```bash
              npm run dev
              ```

              Open http://localhost:3000

              ## Deploy to Vercel

              1. Push to GitHub
              2. 2. Go to https://vercel.com and import the repository
                 3. 3. Add `GEMINI_API_KEY` in Environment Variables
                    4. 4. Deploy
                      
                       5. ## Project Structure
                      
                       6. ```
                          src/
                            app/
                              api/
                                upload/route.ts   # PDF parsing endpoint
                                chat/route.ts     # Gemini AI chat endpoint
                              globals.css         # Global styles
                              layout.tsx          # Root layout
                              page.tsx            # Main chat UI
                            lib/
                              utils.ts            # Utility functions
                          ```

                          ## How It Works

                          1. User uploads a PDF → `pdf-parse` extracts the text
                          2. 2. Text is stored in browser state (no database needed)
                             3. 3. User asks a question → text + question sent to Gemini API
                                4. 4. Gemini answers based only on the document content
                                   5. 5. Response rendered with Markdown + syntax highlighting
                                     
                                      6. ---
                                     
                                      7. Built by [Z200-WEB](https://github.com/Z200-WEB)
