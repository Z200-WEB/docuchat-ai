import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
          const formData = await req.formData();
          const file = formData.get('file') as File | null;

          if (!file) {
                  return NextResponse.json({ error: 'No file provided' }, { status: 400 });
                }

          const MAX_SIZE = 10 * 1024 * 1024; // 10MB
          if (file.size > MAX_SIZE) {
                  return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
                }

          const buffer = Buffer.from(await file.arrayBuffer());
          let text = '';
          let pages: number | undefined;

          if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                  const parsed = await pdfParse(buffer);
                  text = parsed.text;
                  pages = parsed.numpages;

                  if (!text.trim()) {
                            return NextResponse.json(
                                        { error: 'Could not extract text from this PDF. It may be scanned or image-based.' },
                                        { status: 422 }
                                      );
                          }
                } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                  text = buffer.toString('utf-8');
                } else {
                  return NextResponse.json(
                            { error: 'Unsupported file type. Please upload a PDF or TXT file.' },
                            { status: 400 }
                          );
                }

          // Truncate if too long (Gemini has context limits)
          const MAX_CHARS = 800_000;
          if (text.length > MAX_CHARS) {
                  text = text.slice(0, MAX_CHARS) + '\n\n[Document truncated due to length]';
                }

          return NextResponse.json({ text, pages, charCount: text.length });
        } catch (error) {
          console.error('[upload] Error:', error);
          return NextResponse.json(
                  { error: 'Failed to process file. Please try again.' },
                  { status: 500 }
                );
        }
  }
