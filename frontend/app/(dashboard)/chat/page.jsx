'use client';

import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Plus, MessageSquare, Sparkles, Trash2, Copy, Check, ChevronLeft, Menu, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/hooks/useLanguage';
import { useSearchParams } from 'next/navigation';

const AutoResizeTextarea = forwardRef(function AutoResizeTextarea(
  { value, onChange, onKeyDown, placeholder, disabled }, ref
) {
  const innerRef = useRef(null);
  const resolvedRef = ref || innerRef;

  useEffect(() => {
    const el = resolvedRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value, resolvedRef]);

  return (
    <textarea
      ref={resolvedRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      aria-label="Message input"
      className="flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 py-2 px-0 min-h-[36px] max-h-40"
    />
  );
});

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      aria-label="Copy message"
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// Strip ALL reasoning, planning, and meta preamble from AI responses
function cleanAIResponse(raw) {
  if (!raw) return raw;

  // Remove entire blocks that look like internal reasoning wrapped in <think>...</think> or similar
  let text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .trimStart();

  const lines = text.split('\n');
  const metaPatterns = [
    /^\s*[*\-]?\s*(user (query|asks?|language|request)|my persona|goal|persona|drafting|answer|disclaimer|context|planning|thought|reasoning|note to self|internal|analysis|step \d)/i,
    /^\s*(user (query|asks?|language|request)|my persona|goal:|persona:|drafting:|answer:|disclaimer:|context:|planning:|thought:|reasoning:|note:|internal:|ok,|alright,|sure,|let me|i will|i need to|i should|i'll)/i,
  ];

  // Drop all leading lines that match meta patterns or are blank before real content
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (metaPatterns.some((p) => p.test(lines[i]))) {
      startIdx = i + 1;
    } else if (lines[i].trim()) {
      break;
    } else {
      startIdx = i + 1; // skip leading blank lines
    }
  }

  return lines.slice(startIdx).join('\n')
    .replace(/^\*\s*(User (query|asks?|request)|Goal|Persona|Drafting|Disclaimer|Planning|Reasoning)[^\n]*\n/gim, '')
    .trimStart();
}

function AIMessage({ content }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed
      prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
      prose-headings:font-semibold prose-headings:text-foreground
      prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded">
      <ReactMarkdown>{cleanAIResponse(content)}</ReactMarkdown>
    </div>
  );
}

const SUGGESTED_PROMPTS_BY_LANG = {
  hausa: [
    'Faɗa mini tatsuniyar Hausa game da hikima',
    'Waɗanne karin magana na Hausa game da haƙuri?',
    'Bayyana al\'adar Durbar ta Arewacin Najeriya',
    'Menene muhimmancin kola nut a al\'adun Najeriya?',
    'Faɗa mini tarihin Daular Sokoto',
    'Waɗanne al\'adun gargajiya na Hausa game da aure?',
  ],
  english: [
    'Tell me a Hausa folktale about wisdom',
    'What are common Hausa proverbs about patience?',
    'Explain the Durbar festival of Northern Nigeria',
    'What is the significance of kola nut in Nigerian ceremonies?',
    'Tell me about the Sokoto Caliphate history',
    'Compare Yoruba Abiku and Igbo Ogbanje traditions',
  ],
  yoruba: [
    'Sọ ìtàn àtẹnudẹnu Yorùbá kan nípa ọgbọ́n',
    'Kí ni àwọn òwe Yorùbá nípa sùúrù?',
    'Ṣàlàyé ìjọba Ọ̀yọ́ àtijọ́',
    'Kí ni ìjókòó kọ́là nínú àṣà Yorùbá?',
    'Sọ nípa Sàngó, ọlọ́run àárá Yorùbá',
    'Ṣàlàyé ìdánilẹ́kọ̀ọ́ Egúngún',
  ],
  igbo: [
    'Kọọ m akụkọ ifo Igbo banyere amamihe',
    'Gwa m ilu Igbo banyere ndụ',
    'Kọọ m banyere ọchịchọ Nri Kingdom',
    'Gwa m banyere Iri Ji ọhụrụ n\'Igboland',
    'Kọọ m banyere Ogbanje na omenala Igbo',
    'Gwa m banyere ọrụ eze n\'obodo Igbo',
  ],
  pidgin: [
    'Tell me Hausa folktale about wisdom',
    'Wetin be common Hausa proverbs about patience?',
    'Explain Durbar festival for Northern Nigeria',
    'Wetin be the meaning of kola nut for Nigerian culture?',
    'Tell me about Sokoto Caliphate history',
    'Compare Yoruba and Igbo traditions',
  ],
};

function SessionsList({ sessions, sessionsLoading, activeSessionId, onSelect, onDelete, onNew, isPending, t }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/50">
        <Button
          onClick={onNew}
          className="gradient-brand text-white border-0 gap-2 w-full h-9"
          disabled={isPending}
        >
          <Plus className="w-4 h-4" />
          {isPending ? '…' : t('newChat')}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5" role="list">
        {sessionsLoading
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
          : sessions.length === 0
            ? <p className="text-xs text-muted-foreground text-center py-6">No conversations yet</p>
            : sessions.map((session) => (
              <div
                key={session._id}
                role="listitem"
                className={cn(
                  'group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors',
                  activeSessionId === session._id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-muted-foreground'
                )}
                onClick={() => onSelect(session._id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(session._id)}
                tabIndex={0}
                aria-current={activeSessionId === session._id ? 'true' : undefined}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate text-xs">{session.title || 'New Conversation'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => { e.stopPropagation(); onDelete(session._id); }}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))
        }
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const searchParams = useSearchParams();

  // Parse uploadId from query param (set when user clicks "Ask AI" on any document in Knowledge Library)
  const uploadId = searchParams.get('uploadId');
  const uploadTitle = searchParams.get('uploadTitle') ? decodeURIComponent(searchParams.get('uploadTitle')) : null;

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get('/chat').then((r) => r.data.data),
  });

  const { data: sessionData } = useQuery({
    queryKey: ['chat-session', activeSessionId],
    queryFn: () => api.get(`/chat/${activeSessionId}`).then((r) => r.data.data.session),
    enabled: !!activeSessionId,
  });

  useEffect(() => {
    if (sessionData?.messages) setMessages(sessionData.messages);
  }, [sessionData]);

  // Auto-start a session when arriving from Knowledge Library with a document
  useEffect(() => {
    if (uploadId && !activeSessionId && !newSessionMutation.isPending) {
      newSessionMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const newSessionMutation = useMutation({
    mutationFn: () => api.post('/chat').then((r) => r.data.data.session),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      setActiveSessionId(session._id);
      setMessages([]);
      setMobileSidebarOpen(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    onError: () => toast.error('Failed to create session'),
  });

  const sendMutation = useMutation({
    mutationFn: ({ sessionId, message }) =>
      api.post(`/chat/${sessionId}/messages`, {
        message,
        preferredLanguage: lang || user?.preferredLanguage || 'hausa',
        uploadId: uploadId || null,
      }).then((r) => r.data.data),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
    onError: () => {
      setMessages((prev) => prev.slice(0, -1));
      toast.error('Failed to send message');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId) => api.delete(`/chat/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      setActiveSessionId(null);
      setMessages([]);
    },
    onError: () => toast.error('Failed to delete session'),
  });

  const handleSend = useCallback((text) => {
    const msg = (text || input).trim();
    if (!msg || !activeSessionId || sendMutation.isPending) return;
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    sendMutation.mutate({ sessionId: activeSessionId, message: msg });
  }, [input, activeSessionId, sendMutation]);

  const sessions = sessionsData || [];

  const sidebarProps = {
    sessions,
    sessionsLoading,
    activeSessionId,
    onSelect: (id) => { setActiveSessionId(id); setMessages([]); setMobileSidebarOpen(false); },
    onDelete: (id) => deleteMutation.mutate(id),
    onNew: () => newSessionMutation.mutate(),
    isPending: newSessionMutation.isPending,
    t,
  };

  return (
    <div className="page-container">
      {/* Full-height chat layout */}
      <div className="flex gap-3 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-5rem)]">

        {/* Desktop sessions sidebar */}
        <aside className="hidden md:flex w-52 flex-col border border-border/50 rounded-xl bg-card overflow-hidden shrink-0">
          <SessionsList {...sidebarProps} />
        </aside>

        {/* Chat area */}
        <Card className="flex-1 flex flex-col border-border/50 overflow-hidden min-w-0">
          {!activeSessionId ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10">
              <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold mb-2">AI Cultural Chat</h1>
              <p className="text-muted-foreground max-w-xs text-sm mb-2">
                {lang === 'hausa'
                  ? 'Tambaya Gemma AI game da al\'adun Hausa, tatsuniyoyi, karin magana, da hikimar da aka adana.'
                  : 'Ask Gemma AI about Nigerian culture, traditions, proverbs, and preserved wisdom.'}
              </p>
              <div className="flex items-center gap-1.5 mb-6 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-xs font-medium text-primary">🌍 Language is no longer a barrier</span>
              </div>
              <Button
                onClick={() => newSessionMutation.mutate()}
                className="gradient-brand text-white border-0 gap-2 mb-6"
                disabled={newSessionMutation.isPending}
              >
                <Plus className="w-4 h-4" />
                Start Conversation
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm w-full">
                {(SUGGESTED_PROMPTS_BY_LANG[lang] || SUGGESTED_PROMPTS_BY_LANG.hausa).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={async () => {
                      const session = await newSessionMutation.mutateAsync();
                      setMessages([{ role: 'user', content: prompt }]);
                      sendMutation.mutate({ sessionId: session._id, message: prompt });
                    }}
                    className="text-left text-xs p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/50 transition-colors text-muted-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Chat header (mobile) */}
              <div className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-64 p-0">
                    <SessionsList {...sidebarProps} />
                  </SheetContent>
                </Sheet>
                <span className="text-sm font-medium truncate flex-1">
                  {sessions.find((s) => s._id === activeSessionId)?.title || 'Conversation'}
                </span>
              </div>

              {/* Document context banner */}
              {uploadId && (
                <div className="mx-4 mt-3 mb-1 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-primary/8 border border-primary/20">
                  <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">{uploadTitle || 'Uploaded Document'}</p>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'hausa' ? 'Gemma yana amsa tambayoyi game da wannan takarda' : 'Gemma is answering questions about this document'}
                    </p>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
                role="log"
                aria-live="polite"
                aria-label="Conversation messages"
              >
                {messages.length === 0 && !sendMutation.isPending && (
                  <div className="text-center py-8">
                    {uploadId ? (
                      <>
                        <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-sm font-medium mb-1">{uploadTitle || 'Uploaded Document'}</p>
                        <p className="text-xs text-muted-foreground mb-4">
                          {lang === 'hausa' ? 'Zaɓi tambaya ko rubuta naka' : 'Choose a question or type your own'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto">
                          {(lang === 'hausa' ? [
                            'Menene darasi na ɗabi\'a?',
                            'Bayyana wannan a Hausa mai sauƙi',
                            'Taƙaita wannan a Turanci',
                            'Menene ma\'anar al\'adu?',
                            'Menene haɗin kai da al\'adun Hausa?',
                            'Fitar da karin magana daga wannan',
                          ] : [
                            'What is the moral lesson?',
                            'Explain this in simple Hausa',
                            'Summarize this in English',
                            'What is the cultural meaning?',
                            'How does this connect to Hausa traditions?',
                            'Extract proverbs from this document',
                          ]).map((prompt) => (
                            <button
                              key={prompt}
                              onClick={() => handleSend(prompt)}
                              className="text-left text-xs p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/50 transition-colors text-muted-foreground"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground text-sm mb-4">Ask in any language — upload in Hausa, ask in English, switch to Yoruba.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto">
                          {(SUGGESTED_PROMPTS_BY_LANG[lang] || SUGGESTED_PROMPTS_BY_LANG.hausa).map((prompt) => (
                            <button
                              key={prompt}
                              onClick={() => handleSend(prompt)}
                              className="text-left text-xs p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/50 transition-colors text-muted-foreground"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn('flex group', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center shrink-0 mr-2 mt-1">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm',
                        msg.role === 'user'
                          ? 'gradient-brand text-white rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      )}>
                        {msg.role === 'assistant'
                          ? <AIMessage content={msg.content} />
                          : <p className="leading-relaxed">{msg.content}</p>
                        }
                        <div className={cn('flex justify-end mt-1', msg.role === 'user' ? 'text-white/70' : 'text-muted-foreground')}>
                          <CopyButton text={msg.content} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {sendMutation.isPending && (
                  <div className="flex justify-start" aria-label="AI is typing" aria-live="polite">
                    <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center shrink-0 mr-2 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1 items-center h-5">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="p-3 sm:p-4 border-t border-border/50">
                <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 sm:px-4 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
                  <AutoResizeTextarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder={lang === 'hausa' ? 'Tambaya game da al\'adun Najeriya… (Enter don aika)' : 'Ask about Nigerian culture… (Enter to send)'}
                    disabled={sendMutation.isPending}
                  />
                  <Button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || sendMutation.isPending}
                    size="icon"
                    className="gradient-brand text-white border-0 shrink-0 w-8 h-8 rounded-lg"
                    aria-label="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  Powered by Google Gemma 4 · Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
