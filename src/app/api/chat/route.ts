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

export async function POST(req: NextRequest) {
        try {
                const apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) {
                        return NextResponse.json(
                                { error: 'Gemini API key not configured. Please set GEMINI_API_KEY in your environment.' },
                                { status: 500 }
                        );
                }

                const body = await req.json();
                const { question, documentText, documentName, history = [] } = body as {
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

                // Build conversation history for Gemini REST API format
                const contents = [
                        ...history.map((h) => ({
                                role: h.role === 'assistant' ? 'model' : 'user',
                                parts: [{ text: h.content }],
                        })),
                        { role: 'user', parts: [{ text: prompt }] },
                ];

                // Use Google Generative AI REST API v1 directly (supports gemini-1.5-flash)
                const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

                const geminiResponse = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                                system_instruction: {
                                        parts: [{ text: SYSTEM_PROMPT }],
                                },
                                contents,
                                generationConfig: {
                                        temperature: 0.2,
                                        topP: 0.95,
                                        maxOutputTokens: 2048,
                                },
                        }),
                });

                if (!geminiResponse.ok) {
                        const errBody = await geminiResponse.json().catch(() => ({}));
                        const errMsg = (errBody as { error?: { message?: string } })?.error?.message || geminiResponse.statusText;
                        console.error('[chat] Gemini API error:', geminiResponse.status, errMsg);

                        if (geminiResponse.status === 429) {
                                return NextResponse.json(
                                        { error: 'API quota exceeded. Please try again later.' },
                                        { status: 429 }
                                );
                        }
                        if (geminiResponse.status === 401 || geminiResponse.status === 403) {
                                return NextResponse.json(
                                        { error: 'Invalid Gemini API key. Please check your configuration.' },
                                        { status: 401 }
                                );
                        }
                        return NextResponse.json(
                                { error: `Gemini API error: ${errMsg}` },
                                { status: 500 }
                        );
                }

                const data = await geminiResponse.json() as {
                        candidates?: Array<{
                                content?: { parts?: Array<{ text?: string }> };
                        }>;
                };

                const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

                return NextResponse.json({ answer });
        } catch (error: unknown) {
                console.error('[chat] Error:', error);

                return NextResponse.json(
                        { error: 'Failed to get AI response. Please try again.' },
                        { status: 500 }
                );
        }
}