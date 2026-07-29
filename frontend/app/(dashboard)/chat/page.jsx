'use client';

import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Plus, MessageSquare, Sparkles, Trash2, Copy, Check, ChevronLeft, Menu } from 'lucide-react';
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

function AIMessage({ content }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed
      prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
      prose-headings:font-semibold prose-headings:text-foreground
      prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  'Tell me a Yoruba folktale about wisdom and trickery',
  'What are common Hausa proverbs about patience?',
  'Explain the Igbo Ogbanje spirit child tradition',
  'What is the significance of kola nut in Nigerian ceremonies?',
  'Compare Yoruba Abiku and Igbo Ogbanje traditions',
  'Tell me about the ancient Nri Kingdom of Igboland',
];

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
        preferredLanguage: user?.preferredLanguage || 'english',
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
                Ask Gemma AI about Nigerian culture, traditions, proverbs, and preserved wisdom.
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
                {SUGGESTED_PROMPTS.map((prompt) => (
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

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
                role="log"
                aria-live="polite"
                aria-label="Conversation messages"
              >
                {messages.length === 0 && !sendMutation.isPending && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm mb-4">Ask in any language — upload in Hausa, ask in English, switch to Yoruba.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto">
                      {SUGGESTED_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSend(prompt)}
                          className="text-left text-xs p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/50 transition-colors text-muted-foreground"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
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
                    placeholder="Ask about Nigerian culture… (Enter to send)"
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
