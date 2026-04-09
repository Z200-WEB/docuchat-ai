'use client';
// v4

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Send, Upload, Sparkles, ChevronDown, Trash2, AlertCircle, Menu, ArrowLeft, Plus, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UploadedDoc {
  id: string;
  name: string;
  size: number;
  text: string;
  pages?: number;
}

const SUGGESTED_QUESTIONS = [
  'Summarize this document',
  'What are the key points?',
  'List the main topics covered',
  'What conclusions are drawn?',
];

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [view, setView] = useState<'home' | 'chat'>('home');

  const activeDoc = docs.find((d) => d.id === activeDocId) ?? null;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const newDoc: UploadedDoc = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        text: data.text,
        pages: data.pages,
      };
      setDocs((prev) => [newDoc, ...prev]);
      setActiveDocId(newDoc.id);
      setMessages([]);
      setView('chat');
      setShowSidebar(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const getRootPropsData = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });
  const { getRootProps, getInputProps, isDragActive } = getRootPropsData;

  const handleSend = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || !activeDoc || isLoading) return;
    setInput('');
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: q, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          documentText: activeDoc.text,
          documentName: activeDoc.name,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const aiMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: data.answer, timestamp: new Date() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong: ' + (err instanceof Error ? err.message : 'Unknown error'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-[#0f0f13] text-white overflow-hidden flex flex-col" style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {showSidebar && (
        <div className="absolute inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
          <div className="relative z-50 w-[80vw] max-w-xs bg-[#17171f] h-full flex flex-col shadow-2xl">
            <div className="px-5 pt-12 pb-4 border-b border-white/8">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-semibold text-white text-base">DocuChat AI</span>
              </div>
              <p className="text-[11px] text-white/40 ml-11">Your documents</p>
            </div>
            <div className="px-4 py-3">
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium">
                  <Plus size={16} />{isUploading ? 'Uploading...' : 'Upload new PDF'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
              {docs.length === 0 && <p className="text-center text-white/30 text-xs mt-8">No documents yet</p>}
              {docs.map((doc) => (
                <button key={doc.id} onClick={() => { setActiveDocId(doc.id); setMessages([]); setView('chat'); setShowSidebar(false); }}
                  className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left', doc.id === activeDocId ? 'bg-violet-600/20 border border-violet-500/30' : 'bg-white/5 border border-transparent')}>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', doc.id === activeDocId ? 'bg-violet-600/30' : 'bg-white/8')}>
                    <FileText size={16} className={doc.id === activeDocId ? 'text-violet-400' : 'text-white/50'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                    <p className="text-[11px] text-white/40">{formatBytes(doc.size)}{doc.pages ? ' · ' + doc.pages + 'p' : ''}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDocs(p => p.filter(d => d.id !== doc.id)); if (activeDocId === doc.id) { setActiveDocId(null); setMessages([]); setView('home'); } }}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8">
                    <Trash2 size={12} className="text-white/40" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'home' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-14 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Sparkles size={12} className="text-white" />
              </div>
              <span className="font-semibold text-white text-sm">DocuChat AI</span>
            </div>
            <button onClick={() => setShowSidebar(true)} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
              <Menu size={16} className="text-white/70" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 pt-6 pb-4">
              <h1 className="text-[28px] font-bold text-white leading-tight">Chat with any<br /><span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">PDF document</span></h1>
              <p className="text-sm text-white/50 mt-2">Upload a PDF and ask questions in natural language</p>
            </div>
            <div className="px-5 mb-6">
              <div {...getRootProps()} className={cn('relative rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden', isDragActive ? 'border-violet-500 bg-violet-500/10' : 'border-white/15 bg-white/4')}>
                <input {...getInputProps()} />
                <div className="px-6 py-8 flex flex-col items-center gap-4">
                  <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', isDragActive ? 'bg-violet-500/30' : 'bg-white/8')}>
                    {isUploading ? <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={24} className={isDragActive ? 'text-violet-400' : 'text-white/50'} />}
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-base">{isUploading ? 'Uploading...' : isDragActive ? 'Drop to upload' : 'Tap to upload PDF'}</p>
                    <p className="text-white/40 text-xs mt-1">Max 10 MB</p>
                  </div>
                  {!isUploading && <div className="px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold">Choose file</div>}
                </div>
              </div>
              {uploadError && (
                <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/15 border border-red-500/25">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-xs">{uploadError}</p>
                </div>
              )}
            </div>
            {docs.length > 0 && (
              <div className="px-5 mb-6">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">Recent</p>
                <div className="space-y-2">
                  {docs.slice(0, 3).map((doc) => (
                    <button key={doc.id} onClick={() => { setActiveDocId(doc.id); setMessages([]); setView('chat'); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/6 border border-white/8 active:scale-95 transition-transform">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                        <p className="text-[11px] text-white/40">{formatBytes(doc.size)}{doc.pages ? ' · ' + doc.pages + ' pages' : ''}</p>
                      </div>
                      <ChevronDown size={14} className="text-white/30 -rotate-90" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="px-5 mb-8">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">Features</p>
              <div className="grid grid-cols-2 gap-3">
                {[{icon:'⚡',title:'Instant answers',desc:'Get responses in seconds'},{icon:'🎯',title:'Accurate',desc:'Based on your document'},{icon:'💬',title:'Chat history',desc:'Multi-turn conversation'},{icon:'🔒',title:'Private',desc:'Your data stays local'}].map((f) => (
                  <div key={f.title} className="px-4 py-4 rounded-2xl bg-white/5 border border-white/8">
                    <span className="text-xl">{f.icon}</span>
                    <p className="text-sm font-semibold text-white mt-2">{f.title}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-12 pb-3 flex items-center gap-3 border-b border-white/8 bg-[#0f0f13]/90 backdrop-blur-md">
            <button onClick={() => setView('home')} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
              <ArrowLeft size={16} className="text-white/80" />
            </button>
            {activeDoc && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{activeDoc.name}</p>
                <p className="text-[11px] text-white/40">{formatBytes(activeDoc.size)}{activeDoc.pages ? ' · ' + activeDoc.pages + 'p' : ''}</p>
              </div>
            )}
            <button onClick={() => setShowSidebar(true)} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
              <Menu size={16} className="text-white/70" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && activeDoc && (
              <div className="py-6">
                <div className="flex flex-col items-center gap-3 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 flex items-center justify-center">
                    <FileText size={24} className="text-violet-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-base">{activeDoc.name}</p>
                    <p className="text-white/40 text-xs mt-1">Ready to answer your questions</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Suggested</p>
                <div className="space-y-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => handleSend(q)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/6 border border-white/8 text-left active:scale-95 transition-transform">
                      <Sparkles size={14} className="text-violet-400 flex-shrink-0" />
                      <span className="text-sm text-white/80">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles size={12} className="text-white" />
                  </div>
                )}
                <div className={cn('max-w-[82%] rounded-3xl px-4 py-3', msg.role === 'user' ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm' : 'bg-white/8 border border-white/10 text-white/90 rounded-tl-sm')}>
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-white prose-a:text-violet-400 prose-code:text-violet-300 prose-pre:bg-black/30 prose-pre:rounded-xl">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        code({ className, children, ...props }) {
                          const match = /language-(w+)/.exec(className || '');
                          return match ? (
                            <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" className="rounded-xl !text-xs">
                              {String(children).replace(/
$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className="bg-white/10 px-1.5 py-0.5 rounded-md text-xs font-mono" {...props}>{children}</code>
                          );
                        },
                      }}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  <p className={cn('text-[10px] mt-1.5', msg.role === 'user' ? 'text-white/50 text-right' : 'text-white/30')}>{formatTime(msg.timestamp)}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles size={12} className="text-white" />
                </div>
                <div className="bg-white/8 border border-white/10 rounded-3xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center h-5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="px-3 pb-8 pt-3 bg-[#0f0f13]/90 backdrop-blur-md border-t border-white/8">
            {!activeDoc ? (
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-full bg-white/8 border border-white/12">
                  <Paperclip size={16} className="text-violet-400" />
                  <span className="text-sm text-white/40">Upload a document first...</span>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <div className="flex-1 flex items-end gap-2 px-4 py-3 rounded-3xl bg-white/8 border border-white/12 focus-within:border-violet-500/50 transition-colors">
                  <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Ask about the document..." rows={1}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none outline-none leading-relaxed" />
                </div>
                <button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
                  className={cn('w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all', input.trim() && !isLoading ? 'bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30' : 'bg-white/10')}>
                  <Send size={16} className={input.trim() && !isLoading ? 'text-white' : 'text-white/30'} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
