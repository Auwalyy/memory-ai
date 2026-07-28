'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Sparkles, Globe, Mic, GraduationCap, Baby, ArrowLeft, Bookmark, Copy, Check, Volume2, Download, Share2, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { SUPPORTED_LANGUAGES, LANGUAGE_COLORS } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-1.5" aria-label={label}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function GenerateButton({ onClick, isPending, idleLabel, loadingLabel }) {
  return (
    <Button
      onClick={onClick}
      disabled={isPending}
      className="gradient-brand text-white border-0"
      aria-busy={isPending}
    >
      {isPending ? (
        <><Sparkles className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />{loadingLabel}</>
      ) : idleLabel}
    </Button>
  );
}

function AILoadingState({ message = 'Gemma AI is generating...' }) {
  return (
    <div className="flex items-center gap-3 py-6 text-muted-foreground">
      <Sparkles className="w-5 h-5 animate-spin text-primary shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs mt-0.5">This takes 15–40 seconds. Please wait…</p>
      </div>
    </div>
  );
}

export default function StoryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [translateTo, setTranslateTo] = useState('english');
  const [speaking, setSpeaking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const speakText = (text) => {
    if (!window.speechSynthesis) return toast.error('Text-to-speech not supported in this browser');
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };

  const { data: story, isLoading } = useQuery({
    queryKey: ['story', id],
    queryFn: () => api.get(`/stories/${id}`).then((r) => r.data.data.story),
  });

  // Educational: backend returns data.content
  const educationMutation = useMutation({
    mutationFn: (audience) =>
      api.get(`/stories/${id}/educational`).then((r) => r.data.data.content),
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Failed to generate. Please try again.'),
  });

  // Children's version: backend returns data.version
  const childrenMutation = useMutation({
    mutationFn: () =>
      api.get(`/stories/${id}/childrens-version`).then((r) => r.data.data.version),
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Failed to generate. Please try again.'),
  });

  // Cross-language: backend returns data.connections
  const crossLangMutation = useMutation({
    mutationFn: () =>
      api.get(`/stories/${id}/cross-language`).then((r) => r.data.data.connections),
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Failed to analyze. Please try again.'),
  });

  // Translate: backend expects targetLanguage, returns data.translation
  const translateMutation = useMutation({
    mutationFn: (lang) =>
      api.post(`/stories/${id}/translate`, { targetLanguage: lang }).then((r) => r.data.data.translation),
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Translation failed. Please try again.'),
  });

  // Podcast: backend returns data.script
  const podcastMutation = useMutation({
    mutationFn: () =>
      api.get(`/stories/${id}/podcast`).then((r) => r.data.data.script),
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Failed to generate. Please try again.'),
  });

  // Recommendations
  const { data: recommendations } = useQuery({
    queryKey: ['story-recommendations', id],
    queryFn: () => api.get(`/stories/${id}/recommendations`).then((r) => r.data.data.recommendations),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  // Bookmark: backend route is POST /bookmarks/:storyId (toggle)
  const bookmarkMutation = useMutation({
    mutationFn: () => api.post(`/bookmarks/${id}`),
    onSuccess: (res) => {
      toast.success(res.data.data.bookmarked ? 'Bookmarked!' : 'Bookmark removed');
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to bookmark'),
  });

  // Re-analyze: triggers Gemma to re-process the story
  const reanalyzeMutation = useMutation({
    mutationFn: () => api.post(`/stories/${id}/analyze`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story', id] });
      toast.success('Re-analysis started — Gemma AI is processing…');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Re-analysis failed'),
  });

  // Delete story
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/stories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story deleted');
      router.push('/stories');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete story'),
  });

  const exportStory = () => {
    const lines = [
      story.title,
      `Language: ${story.language} | Type: ${story.knowledgeType}`,
      '',
      story.content,
    ];
    if (story.analysis?.summary) lines.push('', '--- AI Summary ---', story.analysis.summary);
    if (story.analysis?.moralLesson) lines.push('', 'Moral Lesson:', story.analysis.moralLesson);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Story exported as text file');
  };

  const shareStory = async () => {
    const text = `${story.title}\n\n${story.content.slice(0, 300)}${story.content.length > 300 ? '…' : ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: story.title, text }); } catch (_) {}
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard for sharing!');
    }
  };

  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  if (!story) return <div className="text-muted-foreground p-8">Story not found.</div>;

  // Show analysis if any analysis data exists — don't gate on status field
  const analysisReady = !!(story.analysis?.summary || story.analysis?.moralLesson || story.analysis?.themes?.length || story.analysis?.culturalContext);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Link href="/stories">
            <Button variant="ghost" size="sm" className="gap-1 mb-3 -ml-2 text-muted-foreground">
              <ArrowLeft className="w-3.5 h-3.5" /> Stories
            </Button>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{story.title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {story.knowledgeType && <Badge variant="secondary">{story.knowledgeType}</Badge>}
            <Badge className={LANGUAGE_COLORS[story.language] || ''}>{story.language}</Badge>
            {story.isFeatured && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Featured</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => bookmarkMutation.mutate()}
            disabled={bookmarkMutation.isPending}
            className="gap-1.5"
          >
            <Bookmark className="w-4 h-4" />
            Bookmark
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={shareStory}>
            <Share2 className="w-4 h-4" /> Share
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportStory}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => reanalyzeMutation.mutate()}
            disabled={reanalyzeMutation.isPending}
            title="Re-run Gemma AI analysis"
          >
            <RefreshCw className={`w-4 h-4 ${reanalyzeMutation.isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{reanalyzeMutation.isPending ? 'Analyzing…' : 'Re-analyze'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:border-destructive/40"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold">Delete this story?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  &ldquo;{story.title}&rdquo; will be permanently deleted. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="story">
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
          <TabsList className="inline-flex w-max h-9 gap-0.5">
            <TabsTrigger value="story" className="text-xs px-3 h-7">Story</TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs px-3 h-7">AI Analysis</TabsTrigger>
            <TabsTrigger value="education" className="text-xs px-3 h-7">Education</TabsTrigger>
            <TabsTrigger value="children" className="text-xs px-3 h-7">Children&apos;s</TabsTrigger>
            <TabsTrigger value="connections" className="text-xs px-3 h-7">Cross-Language</TabsTrigger>
            <TabsTrigger value="translate" className="text-xs px-3 h-7">Translate</TabsTrigger>
            <TabsTrigger value="podcast" className="text-xs px-3 h-7">Podcast</TabsTrigger>
          </TabsList>
        </div>

        {/* Story Content */}
        <TabsContent value="story" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex justify-end gap-2 mb-3">
                <CopyButton text={story.content} label="Copy story text" />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => speakText(story.content)}
                  aria-label={speaking ? 'Stop reading' : 'Read aloud'}
                >
                  <Volume2 className={`w-3.5 h-3.5 ${speaking ? 'text-primary animate-pulse' : ''}`} />
                  {speaking ? 'Stop' : 'Read Aloud'}
                </Button>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-base">{story.content}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gemma Analysis */}
        <TabsContent value="analysis" className="mt-4">
          {analysisReady ? (
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Gemma AI Analysis
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-xs"
                    onClick={() => reanalyzeMutation.mutate()}
                    disabled={reanalyzeMutation.isPending}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reanalyzeMutation.isPending ? 'animate-spin' : ''}`} />
                    {reanalyzeMutation.isPending ? 'Analyzing…' : 'Re-analyze'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {story.analysis.summary && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Summary</p>
                    <p className="text-sm leading-relaxed">{story.analysis.summary}</p>
                  </div>
                )}
                {story.analysis.moralLesson && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Moral Lesson</p>
                    <p className="text-sm">{story.analysis.moralLesson}</p>
                  </div>
                )}
                {story.analysis.culturalContext && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Cultural Context</p>
                    <p className="text-sm leading-relaxed">{story.analysis.culturalContext}</p>
                  </div>
                )}
                {story.analysis.themes?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Themes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {story.analysis.themes.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                    </div>
                  </div>
                )}
                {story.analysis.characters?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Characters</p>
                    <div className="space-y-2">
                      {story.analysis.characters.map((c) => (
                        <div key={c.name} className="text-sm bg-muted rounded-lg p-3">
                          <span className="font-medium">{c.name}</span>
                          {c.role && <span className="text-muted-foreground"> — {c.role}</span>}
                          {c.significance && <p className="text-muted-foreground mt-0.5 text-xs">{c.significance}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {story.analysis.difficultTerms?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Key Terms</p>
                    <div className="space-y-1.5">
                      {story.analysis.difficultTerms.map((t) => (
                        <div key={t.term} className="text-sm flex gap-2">
                          <span className="font-medium text-primary shrink-0">{t.term}</span>
                          <span className="text-muted-foreground">— {t.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-10 text-center text-muted-foreground">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="font-medium mb-1">
                  {story.analysis?.status === 'processing' ? 'Analysis in progress' : 'Analysis pending'}
                </p>
                <p className="text-sm mb-4">Gemma AI is processing this story. Check back in a moment.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => reanalyzeMutation.mutate()}
                  disabled={reanalyzeMutation.isPending}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reanalyzeMutation.isPending ? 'animate-spin' : ''}`} />
                  {reanalyzeMutation.isPending ? 'Starting…' : 'Trigger Analysis'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Educational Content */}
        <TabsContent value="education" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" aria-hidden="true" /> Generate Educational Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap" role="group" aria-label="Select education level">
                {['primary', 'secondary', 'university'].map((level) => (
                  <Button
                    key={level}
                    variant="outline"
                    size="sm"
                    onClick={() => educationMutation.mutate(level)}
                    disabled={educationMutation.isPending}
                    className="capitalize"
                    aria-busy={educationMutation.isPending}
                  >
                    {level}
                  </Button>
                ))}
              </div>
              {educationMutation.isPending && <AILoadingState message="Generating lesson plan..." />}
              {educationMutation.data && (
                <div className="space-y-4">
                  {educationMutation.data.lessonTitle && (
                    <h3 className="font-semibold text-base">{educationMutation.data.lessonTitle}</h3>
                  )}
                  {educationMutation.data.introduction && (
                    <p className="text-sm text-muted-foreground">{educationMutation.data.introduction}</p>
                  )}
                  {educationMutation.data.learningObjectives?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Learning Objectives</p>
                      <ul className="space-y-1">
                        {educationMutation.data.learningObjectives.map((obj, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-primary font-bold shrink-0">{i + 1}.</span> {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {educationMutation.data.quiz?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Quiz</p>
                      <div className="space-y-3">
                        {educationMutation.data.quiz.map((q, i) => (
                          <div key={i} className="bg-muted rounded-xl p-4 text-sm">
                            <p className="font-medium mb-2">{i + 1}. {q.question}</p>
                            <div className="space-y-0.5 text-muted-foreground mb-2">
                              {q.options?.map((opt) => <div key={opt}>{opt}</div>)}
                            </div>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">
                              Answer: {q.correctAnswer}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Children's Version */}
        <TabsContent value="children" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Baby className="w-4 h-4 text-primary" aria-hidden="true" /> Children&apos;s Version
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GenerateButton
                onClick={() => childrenMutation.mutate()}
                isPending={childrenMutation.isPending}
                idleLabel="Generate Children's Story"
                loadingLabel="Generating..."
              />
              {childrenMutation.isPending && <AILoadingState message="Writing children's story..." />}
              {childrenMutation.data && (
                <div className="space-y-3">
                  {childrenMutation.data.title && (
                    <h3 className="font-serif text-xl font-bold">{childrenMutation.data.title}</h3>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {childrenMutation.data.story || childrenMutation.data.content}
                  </p>
                  {childrenMutation.data.moralLesson && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
                      <span className="font-semibold">Moral: </span>{childrenMutation.data.moralLesson}
                    </div>
                  )}
                  <CopyButton text={childrenMutation.data.story || childrenMutation.data.content || ''} label="Copy children's story" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cross-Language Connections */}
        <TabsContent value="connections" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" aria-hidden="true" /> Cross-Language Connections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GenerateButton
                onClick={() => crossLangMutation.mutate()}
                isPending={crossLangMutation.isPending}
                idleLabel="Find Cultural Connections"
                loadingLabel="Analyzing..."
              />
              {crossLangMutation.data && (
                <div className="space-y-4">
                  {crossLangMutation.data.culturalInsights && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <p className="text-sm text-muted-foreground">{crossLangMutation.data.culturalInsights}</p>
                    </div>
                  )}
                  {['hausaConnections', 'yorubaConnections', 'igboConnections'].map((key) => {
                    const lang = key.replace('Connections', '');
                    const items = crossLangMutation.data[key];
                    if (!items?.length) return null;
                    return (
                      <div key={key}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 capitalize">{lang}</p>
                        <div className="space-y-2">
                          {items.map((item, i) => (
                            <div key={i} className="bg-muted rounded-lg p-3 text-sm">
                              <p className="font-medium">{item.title}</p>
                              <p className="text-muted-foreground text-xs mt-0.5">{item.similarity}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Translation */}
        <TabsContent value="translate" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Translate with Cultural Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <Select value={translateTo} onValueChange={setTranslateTo}>
                  <SelectTrigger className="w-44" aria-label="Target language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <GenerateButton
                  onClick={() => translateMutation.mutate(translateTo)}
                  isPending={translateMutation.isPending}
                  idleLabel="Translate"
                  loadingLabel="Translating..."
                />
              </div>
              {translateMutation.isPending && <AILoadingState message="Translating with cultural context..." />}
              {translateMutation.data && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Translation</p>
                    <CopyButton text={translateMutation.data.translation || translateMutation.data.translatedText || ''} label="Copy translation" />
                  </div>
                  <div className="bg-muted rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {translateMutation.data.translation || translateMutation.data.translatedText || translateMutation.data}
                  </div>
                  {translateMutation.data.culturalNotes?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Cultural Notes</p>
                      <ul className="space-y-1.5">
                        {translateMutation.data.culturalNotes.map((note, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            {typeof note === 'string' ? note : (
                              <><span className="text-primary font-medium">{note.originalTerm}</span>{' → '}{note.translation}: {note.culturalNote}</>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {translateMutation.data.untranslatableTerms?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Untranslatable Terms</p>
                      <div className="space-y-1.5">
                        {translateMutation.data.untranslatableTerms.map((t, i) => (
                          <div key={i} className="bg-muted rounded-lg p-3 text-sm">
                            <span className="font-medium text-primary">{t.term}</span>
                            <span className="text-muted-foreground"> — {t.explanation}</span>
                            {t.approximation && <span className="text-muted-foreground"> (approx: {t.approximation})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Podcast Script */}
        <TabsContent value="podcast" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" aria-hidden="true" /> Podcast Script
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GenerateButton
                onClick={() => podcastMutation.mutate()}
                isPending={podcastMutation.isPending}
                idleLabel="Generate Podcast Script"
                loadingLabel="Generating..."
              />
              {podcastMutation.data && (
                <div className="space-y-4 text-sm">
                  {podcastMutation.data.episodeTitle && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-base">{podcastMutation.data.episodeTitle}</p>
                        {podcastMutation.data.duration && (
                          <p className="text-muted-foreground text-xs">Estimated duration: {podcastMutation.data.duration}</p>
                        )}
                      </div>
                      <CopyButton
                        label="Copy full script"
                        text={[
                          podcastMutation.data.episodeTitle,
                          podcastMutation.data.intro,
                          ...(podcastMutation.data.segments?.map((s) => `${s.title}\n${s.script}`) || []),
                          podcastMutation.data.outro,
                        ].filter(Boolean).join('\n\n')}
                      />
                    </div>
                  )}
                  {podcastMutation.data.intro && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Intro</p>
                      <div className="bg-muted rounded-xl p-4 whitespace-pre-wrap leading-relaxed">
                        {podcastMutation.data.intro}
                      </div>
                    </div>
                  )}
                  {podcastMutation.data.segments?.map((seg, i) => (
                    <div key={i} className="border border-border/50 rounded-xl p-4">
                      <p className="font-medium mb-1">{seg.title}</p>
                      {seg.duration && <p className="text-xs text-muted-foreground mb-2">{seg.duration}</p>}
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{seg.script}</p>
                    </div>
                  ))}
                  {podcastMutation.data.outro && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Outro</p>
                      <div className="bg-muted rounded-xl p-4 whitespace-pre-wrap leading-relaxed">
                        {podcastMutation.data.outro}
                      </div>
                    </div>
                  )}
                  {podcastMutation.data.showNotes && (
                    <div className="border border-border/50 rounded-xl p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Show Notes</p>
                      <p className="text-muted-foreground">{podcastMutation.data.showNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Recommendations */}
      {recommendations?.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3">Related Knowledge</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {recommendations.map((rec) => (
              <Link key={rec._id} href={`/stories/${rec._id}`}>
                <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-1">
                      <h3 className="font-medium text-sm flex-1 line-clamp-2">{rec.title}</h3>
                      <Badge className={`text-xs shrink-0 ${LANGUAGE_COLORS[rec.language] || ''}`}>{rec.language}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {rec.analysis?.summary || rec.analysis?.moralLesson || ''}
                    </p>
                    {rec.analysis?.themes?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rec.analysis.themes.slice(0, 2).map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
