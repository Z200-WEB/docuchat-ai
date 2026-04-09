'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileText, Send, Upload, Sparkles,
  Trash2, AlertCircle, Menu, ArrowLeft, Plus, Paperclip, X,
} from 'lucide-react';
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

const FEATURES = [
  { icon: '⚡', title: 'Instant answers', desc: 'Get responses in seconds' },
  { icon: '🎯', title: 'Accurate',        desc: 'Based on your document'  },
  { icon: '💬', title: 'Chat history',    desc: 'Multi-turn conversation' },
  { icon: '🔒', title: 'Private',         desc: 'Your data stays local'   },
];

const formatBytes = (b: number) =>
  b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

const formatTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function HomePage() {
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [docs,        setDocs]        = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [mobileView,  setMobileView]  = useState<'home' | 'chat'>('home');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  const activeDoc = docs.find((d) => d.id === activeDocId) ?? null;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
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
      const res  = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const newDoc: UploadedDoc = {
        id: crypto.randomUUID(), name: file.name, size: file.size,
        text: data.text, pages: data.pages,
      };
      setDocs((prev) => [newDoc, ...prev]);
      setActiveDocId(newDoc.id);
      setMessages([]);
      setMobileView('chat');
      setShowSidebar(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const handleSend = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || !activeDoc || isLoading) return;
    setInput('');
    const userMsg: Message = {
      id: crypto.randomUUID(), role: 'user', content: q, timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q, documentText: activeDoc.text, documentName: activeDoc.name,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const aiMsg: Message = {
        id: crypto.randomUUID(), role: 'assistant', content: data.answer, timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: crypto.randomUUID(), role: 'assistant', timestamp: new Date(),
        content: 'Sorry, something went wrong: ' + (err instanceof Error ? err.message : 'Unknown error'),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const deleteDoc = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setDocs((p) => p.filter((d) => d.id !== docId));
    if (activeDocId === docId) { setActiveDocId(null); setMessages([]); setMobileView('home'); }
  };

  const DropZone = ({ compact = false }: { compact?: boolean }) => (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all cursor-pointer',
          isDragActive
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-white/10 bg-white/[0.03] hover:border-violet-500/40 hover:bg-white/[0.05]',
          compact ? 'p-4' : 'p-8'
        )}
      >
        <input {...getInputProps()} />
        <div className={cn('flex flex-col items-center gap-3', compact && 'gap-2')}>
          <div className={cn(
            'rounded-2xl flex items-center justify-center',
            isDragActive ? 'bg-violet-500/20' : 'bg-white/[0.06]',
            compact ? 'w-10 h-10' : 'w-16 h-16'
          )}>
            {isUploading
              ? <div className={cn('border-2 border-violet-400 border-t-transparent rounded-full animate-spin', compact ? 'w-4 h-4' : 'w-6 h-6')} />
              : <Upload size={compact ? 18 : 24} className={isDragActive ? 'text-violet-400' : 'text-white/40'} />}
          </div>
          <div className="text-center">
            <p className={cn('font-semibold text-white', compact ? 'text-sm' : 'text-base')}>
              {isUploading ? 'Uploading…' : isDragActive ? 'Drop to upload' : compact ? 'Upload PDF' : 'Tap to upload PDF'}
            </p>
            <p className="text-white/40 text-xs mt-0.5">Max 10 MB</p>
          </div>
          {!isUploading && (
            <div className={cn(
              'rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold',
              compact ? 'px-4 py-1.5 text-xs' : 'px-6 py-2.5 text-sm'
            )}>
              Choose file
            </div>
          )}
        </div>
      </div>
      {uploadError && (
        <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-xs">{uploadError}</p>
        </div>
      )}
    </div>
  );

  const ChatPanel = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && activeDoc && (
          <div className="flex flex-col items-center pt-4 pb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center mb-4">
              <FileText size={28} className="text-violet-400" />
            </div>
            <p className="text-white font-semibold text-base">{activeDoc.name}</p>
            <p className="text-white/40 text-xs mt-1 mb-8">Ready to answer your questions</p>
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3 self-start w-full">
              Suggested
            </p>
            <div className="w-full space-y-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-left hover:bg-white/[0.07] hover:border-violet-500/30 active:scale-[0.98] transition-all"
                >
                  <Sparkles size={13} className="text-violet-400 flex-shrink-0" />
                  <span className="text-sm text-white/75">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-violet-500/20">
                <Sparkles size={12} className="text-white" />
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-3',
              msg.role === 'user'
                ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm shadow-lg shadow-violet-500/20'
                : 'bg-white/[0.06] border border-white/[0.08] text-white/90 rounded-tl-sm'
            )}>
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-white prose-a:text-violet-400 prose-code:text-violet-300 prose-pre:bg-black/30 prose-pre:rounded-xl">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return match ? (
                          <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" className="rounded-xl !text-xs">
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                        );
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
              <p className={cn('text-[10px] mt-1.5 select-none', msg.role === 'user' ? 'text-white/50 text-right' : 'text-white/30')}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-violet-500/20">
              <Sparkles size={12} className="text-white" />
            </div>
            <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-5">
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: delay + 'ms' }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pb-6 pt-3 border-t border-white/[0.06]">
        {!activeDoc ? (
          <div {...getRootProps()} className="cursor-pointer">
            <input {...getInputProps()} />
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-violet-500/30 transition-colors">
              <Paperclip size={16} className="text-violet-400" />
              <span className="text-sm text-white/30">Upload a document to start chatting…</span>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 flex items-end gap-2 px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] focus-within:border-violet-500/50 focus-within:bg-white/[0.07] transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the document…"
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 resize-none outline-none leading-relaxed"
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all',
                input.trim() && !isLoading
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 active:scale-95'
                  : 'bg-white/[0.06] cursor-not-allowed'
              )}
            >
              <Send size={16} className={input.trim() && !isLoading ? 'text-white' : 'text-white/25'} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">DocuChat AI</p>
              <p className="text-[10px] text-white/35 mt-0.5">Powered by Gemini 2.0 Flash</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
            >
              <X size={14} className="text-white/60" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-violet-500/20"
            disabled={isUploading}
          >
            {isUploading ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Uploading…</>
            ) : (
              <><Plus size={15} />New document</>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
              <FileText size={18} className="text-white/20" />
            </div>
            <p className="text-xs text-white/25 text-center">No documents yet.<br />Upload a PDF to start.</p>
          </div>
        ) : (
          docs.map((doc) => {
            const isActive = doc.id === activeDocId;
            return (
              <button
                key={doc.id}
                onClick={() => { setActiveDocId(doc.id); setMessages([]); setMobileView('chat'); setShowSidebar(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group',
                  isActive ? 'bg-violet-600/15 border border-violet-500/25' : 'hover:bg-white/[0.05] border border-transparent'
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', isActive ? 'bg-violet-600/25' : 'bg-white/[0.06]')}>
                  <FileText size={14} className={isActive ? 'text-violet-400' : 'text-white/40'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{doc.name}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{formatBytes(doc.size)}{doc.pages ? ' · ' + doc.pages + 'p' : ''}</p>
                </div>
                <button
                  onClick={(e) => deleteDoc(e, doc.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={10} className="text-white/40 hover:text-red-400" />
                </button>
              </button>
            );
          })
        )}
      </div>

      <div className="px-5 py-4 border-t border-white/[0.06]">
        <p className="text-[10px] text-white/20 text-center">Built with Next.js + Gemini API</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#0c0c10] text-white overflow-hidden" style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* DESKTOP (md+) */}
      <div className="hidden md:flex h-full">
        <div className="w-64 flex-shrink-0 bg-[#13131a] border-r border-white/[0.06] flex flex-col">
          <SidebarContent />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeDoc ? (
            <>
              <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0c0c10]/80 backdrop-blur-md flex items-center gap-4 flex-shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center">
                  <FileText size={16} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{activeDoc.name}</p>
                  <p className="text-[11px] text-white/35">{formatBytes(activeDoc.size)}{activeDoc.pages ? ' · ' + activeDoc.pages + ' pages' : ''}</p>
                </div>
                <button
                  onClick={() => setMessages([])}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white/50 hover:text-white hover:bg-white/[0.09] transition-all"
                >
                  Clear chat
                </button>
              </div>
              <ChatPanel />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">
              <div className="max-w-md w-full">
                <div className="mb-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-violet-500/10">
                    <Sparkles size={28} className="text-violet-400" />
                  </div>
                  <h1 className="text-3xl font-bold text-white leading-tight">
                    Chat with any<br />
                    <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">PDF document</span>
                  </h1>
                  <p className="text-sm text-white/40 mt-3">Upload a PDF and ask questions in natural language</p>
                </div>
                <DropZone />
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {FEATURES.map((f) => (
                    <div key={f.title} className="px-4 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 transition-colors">
                      <span className="text-xl">{f.icon}</span>
                      <p className="text-sm font-semibold text-white mt-2">{f.title}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE (< md) */}
      <div className="flex md:hidden flex-col h-full">
        {showSidebar && (
          <div className="absolute inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
            <div className="relative z-10 w-[78vw] max-w-[300px] bg-[#13131a] h-full flex flex-col shadow-2xl">
              <div className="pt-12 flex-1 flex flex-col overflow-hidden">
                <SidebarContent onClose={() => setShowSidebar(false)} />
              </div>
            </div>
          </div>
        )}

        {mobileView === 'home' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-14 pb-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles size={12} className="text-white" />
                </div>
                <span className="font-bold text-white text-sm">DocuChat AI</span>
              </div>
              <button onClick={() => setShowSidebar(true)} className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center">
                <Menu size={16} className="text-white/70" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-5 pt-4 pb-5">
                <h1 className="text-[26px] font-bold text-white leading-tight">
                  Chat with any<br />
                  <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">PDF document</span>
                </h1>
                <p className="text-sm text-white/40 mt-2">Upload a PDF and ask questions in natural language</p>
              </div>

              <div className="px-5 mb-6"><DropZone /></div>

              {docs.length > 0 && (
                <div className="px-5 mb-6">
                  <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">Recent</p>
                  <div className="space-y-2">
                    {docs.slice(0, 3).map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => { setActiveDocId(doc.id); setMessages([]); setMobileView('chat'); }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] active:scale-[0.98] transition-all hover:border-violet-500/30"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                          <p className="text-[11px] text-white/35">{formatBytes(doc.size)}{doc.pages ? ' · ' + doc.pages + ' pages' : ''}</p>
                        </div>
                        <ArrowLeft size={14} className="text-white/25 rotate-180 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-5 mb-10">
                <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">Features</p>
                <div className="grid grid-cols-2 gap-3">
                  {FEATURES.map((f) => (
                    <div key={f.title} className="px-4 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-xl">{f.icon}</span>
                      <p className="text-sm font-semibold text-white mt-2">{f.title}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {mobileView === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-12 pb-3 flex items-center gap-3 border-b border-white/[0.06] bg-[#0c0c10]/90 backdrop-blur-md flex-shrink-0">
              <button onClick={() => setMobileView('home')} className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center">
                <ArrowLeft size={16} className="text-white/80" />
              </button>
              {activeDoc ? (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{activeDoc.name}</p>
                  <p className="text-[11px] text-white/35">{formatBytes(activeDoc.size)}{activeDoc.pages ? ' · ' + activeDoc.pages + 'p' : ''}</p>
                </div>
              ) : (
                <div className="flex-1"><p className="text-sm font-semibold text-white">DocuChat AI</p></div>
              )}
              <button onClick={() => setShowSidebar(true)} className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center">
                <Menu size={16} className="text-white/70" />
              </button>
            </div>
            <ChatPanel />
          </div>
        )}
      </div>
    </div>
  );
}
