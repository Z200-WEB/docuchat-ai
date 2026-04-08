import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface HistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

const SYSTEM_PROMPT = `You are DocuChat AI, an expert document analysis assistant.
You answer questions based ONLY on the provided document content.
Rules:
- Base every answer strictly on the document text provided
- If the answer is not in the document, say so clearly
- Be concise but thorough
- Use markdown formatting for better readability (headers, lists, bold, code blocks)
- When quoting, use > blockquote syntax
- Never make up information not present in the document`;

// Multiple API keys for rotation when one hits quota/overload/invalid
function getApiKeys(): string[] {
    const keys: string[] = [];
    // Primary key from env
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    // Additional fallback keys
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
    if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);
    if (process.env.GEMINI_API_KEY_4) keys.push(process.env.GEMINI_API_KEY_4);
    return keys;
}

async function callGemini(apiKey: string, body: object): Promise<Response> {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    return fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
    });
}

export async function POST(req: NextRequest) {
    try {
          const keys = getApiKeys();
          if (keys.length === 0) {
                  return NextResponse.json(
                    { error: 'Gemini API key not configured. Please set GEMINI_API_KEY in your environment.' },
                    { status: 500 }
                          );
          }

      const body = await req.json();
          const { question, documentText, documentName, history } = body as {
                  question: string;
                  documentText: string;
                  documentName: string;
                  history: HistoryItem[];
          };

      if (!question?.trim()) {
              return NextResponse.json({ error: 'Question is required' }, { status: 400 });
      }
          if (!documentText?.trim()) {
                  return NextResponse.json({ error: 'Document text is required' }, { status: 400 });
          }

      const prompt = `DOCUMENT NAME: ${documentName}

      DOCUMENT CONTENT:
      ---
      ${documentText}
      ---

      USER QUESTION: ${question}`;

      const contents = [
              ...history.map((h) => ({
                        role: h.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: h.content }],
              })),
        {
                  role: 'user',
                  parts: [{ text: prompt }],
        },
            ];

      const requestBody = {
              systemInstruction: {
                        parts: [{ text: SYSTEM_PROMPT }],
              },
              contents,
              generationConfig: {
                        temperature: 0.2,
                        topP: 0.95,
                        maxOutputTokens: 2048,
              },
      };

      let lastError = 'Unknown error';

      // Try each key in rotation (including for auth errors)
      for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              let geminiResponse: Response;
              try {
                        geminiResponse = await callGemini(key, requestBody);
              } catch (fetchErr) {
                        lastError = String(fetchErr);
                        console.warn(`[chat] Key ${i + 1}/${keys.length} fetch error: ${lastError}`);
                        continue;
              }

            if (geminiResponse.ok) {
                      const data = await geminiResponse.json() as {
                                  candidates?: Array<{
                                                content?: { parts?: Array<{ text?: string }> };
                                  }>;
                      };
                      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (answer) {
                                  return NextResponse.json({ answer });
                      }
                      lastError = 'Empty response from API';
                      console.warn(`[chat] Key ${i + 1}/${keys.length} returned empty response`);
                      continue;
            }

            // On any error status, try next key
            let errMsg: string;
              try {
                        const errBody = await geminiResponse.json();
                        errMsg = (errBody?.error?.message as string) || geminiResponse.statusText;
              } catch {
                        errMsg = geminiResponse.statusText;
              }
              lastError = `HTTP ${geminiResponse.status}: ${errMsg}`;
              console.warn(`[chat] Key ${i + 1}/${keys.length} failed (${geminiResponse.status}): ${errMsg}`);
              // continue to next key regardless of status code
      }

      // All keys exhausted
      return NextResponse.json(
        { error: `Sorry, something went wrong: ${lastError}` },
        { status: 503 }
            );
    } catch (error: unknown) {
          console.error('[chat] Error:', error);
          return NextResponse.json(
            { error: 'Failed to get AI response. Please try again.' },
            { status: 500 }
                );
    }
}
