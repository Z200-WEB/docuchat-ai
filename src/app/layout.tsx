import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'DocuChat AI — Chat with any PDF',
    description:
        'Upload PDFs and ask questions in natural language. Powered by Gemini 2.5 Flash.',
          keywords: ['AI', 'PDF', 'RAG', 'Gemini', 'document chat', 'Next.js'],
            openGraph: {
                title: 'DocuChat AI',
                    description: 'Chat with any PDF using Gemini AI',
                        type: 'website',
                          },
                          };

                          export default function RootLayout({
                            children,
                            }: {
                              children: React.ReactNode;
                              }) {
                                return (
                                    <html lang="en" className={inter.variable}>
                                          <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
                                              </html>
                                                );
                                                }
