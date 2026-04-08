import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
- Never make up information not present in the document`

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

        const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1' } as never);                    const model = genAI.getGenerativeModel({
                    model: 'gemini-1.5-flash',
                    systemInstruction: SYSTEM_PROMPT,
                    });

            // Build conversation history for context
            const historyForGemini = history.map((h) => ({
                            role: h.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: h.content }],
            }));

            const chat = model.startChat({
                            history: historyForGemini,
                            generationConfig: {
                                                temperature: 0.2,
                                                topP: 0.95,
                                                maxOutputTokens: 2048,
                            },
            });

            const prompt = `DOCUMENT NAME: ${documentName}

                    DOCUMENT CONTENT:
                            ---
                                    ${documentText}
                                            ---

                                                    USER QUESTION: ${question}`;

            const result = await chat.sendMessage(prompt);
                    const answer = result.response.text();

            return NextResponse.json({ answer });
        } catch (error: unknown) {
                    console.error('[chat] Error:', error);

            if (error instanceof Error) {
                            if (error.message.includes('API_KEY_INVALID')) {
                                                return NextResponse.json(
                                                    { error: 'Invalid Gemini API key. Please check your configuration.' },
                                                    { status: 401 }
                                                                    );
                            }
                            if (error.message.includes('QUOTA_EXCEEDED')) {
                                                return NextResponse.json(
                                                    { error: 'API quota exceeded. Please try again later.' },
                                                    { status: 429 }
                                                                    );
                            }
            }

            return NextResponse.json(
                { error: 'Failed to get AI response. Please try again.' },
                { status: 500 }
                        );
        }
}
