'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  GraduationCap, Baby, Sparkles, Mic, Globe,
  ChevronDown, ChevronUp, Copy, Check, Download, Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

const LANG_LABELS = {
  hausa: '🟢 Hausa', yoruba: '🔵 Yoruba', igbo: '🟣 Igbo',
  english: '⚪ English', pidgin: '🟠 Pidgin',
};

const AUDIENCE_LABELS = {
  primary: 'Primary School', secondary: 'Secondary School',
  university: 'University', adult: 'Adult Learners', children: 'Children (5–10)',
};

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function ExportBtn({ data, filename }) {
  return (
    <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
      onClick={() => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        toast.success('Exported!');
      }}>
      <Download className="w-3 h-3" /> Export
    </Button>
  );
}

function ResultSection({ title, children, copyText, exportData, exportFilename }) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2 cursor-pointer flex-1 min-w-0"
            onClick={() => setOpen((v) => !v)}>
            <span className="truncate">{title}</span>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
          </CardTitle>
          {open && (
            <div className="flex items-center gap-1.5 shrink-0">
              {copyText && <CopyBtn text={copyText} />}
              {exportData && <ExportBtn data={exportData} filename={exportFilename || 'export.json'} />}
            </div>
          )}
        </div>
      </CardHeader>
      {open && <CardContent className="space-y-4 pt-0">{children}</CardContent>}
    </Card>
  );
}

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{children}</p>;
}

function AILoading({ message }) {
  return (
    <div className="flex items-center gap-3 py-4 text-muted-foreground">
      <Sparkles className="w-4 h-4 animate-spin text-primary shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs mt-0.5">This takes 15–40 seconds. Please wait…</p>
      </div>
    </div>
  );
}

export default function EducationPage() {
  const [content, setContent] = useState('');
  const [inputLanguage, setInputLanguage] = useState('english');
  const [outputLanguage, setOutputLanguage] = useState('english');
  const [audience, setAudience] = useState('secondary');

  const lessonMutation = useMutation({
    mutationFn: () => api.post('/education/lesson', {
      content, language: inputLanguage, outputLanguage, audience,
    }).then((r) => r.data.data.lesson),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate lesson'),
  });

  const childrenMutation = useMutation({
    mutationFn: () => api.post('/education/childrens-story', {
      content, language: inputLanguage, outputLanguage,
    }).then((r) => r.data.data.childrensStory),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate story'),
  });

  const podcastMutation = useMutation({
    mutationFn: () => api.post('/education/podcast', {
      content, language: inputLanguage, outputLanguage,
    }).then((r) => r.data.data.script),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate podcast'),
  });

  const crossLangMutation = useMutation({
    mutationFn: () => api.post('/education/cross-language', {
      content, language: inputLanguage,
    }).then((r) => r.data.data.connections),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to find connections'),
  });

  const disabled = !content.trim();
  const anyPending = lessonMutation.isPending || childrenMutation.isPending || podcastMutation.isPending || crossLangMutation.isPending;

  const ACTION_BUTTONS = [
    { label: 'Lesson Plan', loadingLabel: 'Generating…', icon: GraduationCap, mutation: lessonMutation, gradient: true },
    { label: "Children's Story", loadingLabel: 'Generating…', icon: Baby, mutation: childrenMutation },
    { label: 'Podcast Script', loadingLabel: 'Generating…', icon: Mic, mutation: podcastMutation },
    { label: 'Cross-Language', loadingLabel: 'Analyzing…', icon: Globe, mutation: crossLangMutation },
  ];

  return (
    <div className="page-container space-y-5">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">AI Content Engine</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Transform indigenous knowledge into lessons, stories, podcasts &amp; cultural connections
        </p>
      </div>

      {/* Input card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Paste Indigenous Knowledge Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste a folktale, proverb, oral history, or any indigenous knowledge content here…"
            rows={5}
            className="resize-none"
          />

          {/* Language controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content Language</label>
              <Select value={inputLanguage} onValueChange={setInputLanguage}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>{LANG_LABELS[l] || l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Languages className="w-3 h-3" /> Output Language
              </label>
              <Select value={outputLanguage} onValueChange={setOutputLanguage}>
                <SelectTrigger className="h-9 border-primary/40 ring-1 ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>{LANG_LABELS[l] || l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Audience</label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIENCE_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Output language notice */}
          {outputLanguage !== 'english' && (
            <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <Languages className="w-3.5 h-3.5 shrink-0" />
              Gemma will generate all content in <strong className="capitalize">{outputLanguage}</strong>
            </div>
          )}

          {/* Action buttons — 2×2 on mobile, 4 across on sm+ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ACTION_BUTTONS.map(({ label, loadingLabel, icon: Icon, mutation, gradient }) => (
              <button
                key={label}
                onClick={() => mutation.mutate()}
                disabled={disabled || anyPending}
                className={[
                  'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  gradient
                    ? 'gradient-brand text-white border-transparent'
                    : 'border-border bg-background hover:bg-muted hover:border-primary/40 text-foreground',
                ].join(' ')}
              >
                <Icon className="w-5 h-5" />
                {mutation.isPending ? loadingLabel : label}
              </button>
            ))}
          </div>

          {anyPending && (
            <p className="text-xs text-muted-foreground flex items-center gap-2 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Gemma AI is generating in <strong className="capitalize">{outputLanguage}</strong>… 15–40 seconds.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lesson Plan Result */}
      {lessonMutation.isPending && <AILoading message="Generating lesson plan…" />}
      {lessonMutation.data && (
        <ResultSection
          title={`📚 Lesson Plan: ${lessonMutation.data.lessonTitle || ''}`}
          exportData={lessonMutation.data}
          exportFilename="lesson-plan.json"
          copyText={[
            lessonMutation.data.lessonTitle,
            lessonMutation.data.introduction,
            lessonMutation.data.learningObjectives?.join('\n'),
          ].filter(Boolean).join('\n\n')}
        >
          {lessonMutation.data.learningObjectives?.length > 0 && (
            <div>
              <SectionLabel>Learning Objectives</SectionLabel>
              <ul className="space-y-1">
                {lessonMutation.data.learningObjectives.map((obj, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span> {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lessonMutation.data.introduction && (
            <div>
              <SectionLabel>Introduction</SectionLabel>
              <p className="text-sm text-muted-foreground">{lessonMutation.data.introduction}</p>
            </div>
          )}
          {lessonMutation.data.keyVocabulary?.length > 0 && (
            <div>
              <SectionLabel>Key Vocabulary</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {lessonMutation.data.keyVocabulary.map((v, i) => (
                  <div key={i} className="bg-muted rounded-lg px-3 py-1.5 text-xs">
                    <span className="font-medium">{v.word}</span>
                    {v.language && <span className="text-muted-foreground ml-1">({v.language})</span>}
                    <span className="text-muted-foreground"> — {v.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lessonMutation.data.quiz?.length > 0 && (
            <div>
              <SectionLabel>Quiz Questions</SectionLabel>
              <div className="space-y-3">
                {lessonMutation.data.quiz.map((q, i) => (
                  <div key={i} className="bg-muted rounded-xl p-4 text-sm">
                    <div className="font-medium mb-2">{i + 1}. {q.question}</div>
                    <div className="space-y-1 text-muted-foreground mb-2">
                      {q.options?.map((opt, j) => <div key={j}>{opt}</div>)}
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">
                      Answer: {q.correctAnswer}
                    </Badge>
                    {q.explanation && <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {lessonMutation.data.discussionQuestions?.length > 0 && (
            <div>
              <SectionLabel>Discussion Questions</SectionLabel>
              <ul className="space-y-1">
                {lessonMutation.data.discussionQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {q}</li>
                ))}
              </ul>
            </div>
          )}
        </ResultSection>
      )}

      {/* Children's Story Result */}
      {childrenMutation.isPending && <AILoading message="Writing children's story…" />}
      {childrenMutation.data && (
        <ResultSection
          title={`🧒 Children's Story: ${childrenMutation.data.title || ''}`}
          copyText={childrenMutation.data.story}
          exportData={childrenMutation.data}
          exportFilename="childrens-story.json"
        >
          <p className="leading-relaxed whitespace-pre-wrap text-sm">{childrenMutation.data.story}</p>
          {childrenMutation.data.moralLesson && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
              <span className="font-semibold">Moral Lesson: </span>
              {childrenMutation.data.moralLesson}
            </div>
          )}
          {childrenMutation.data.illustrationSuggestions?.length > 0 && (
            <div>
              <SectionLabel>Illustration Suggestions</SectionLabel>
              <ul className="space-y-1">
                {childrenMutation.data.illustrationSuggestions.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                ))}
              </ul>
            </div>
          )}
        </ResultSection>
      )}

      {/* Podcast Script Result */}
      {podcastMutation.isPending && <AILoading message="Writing podcast script…" />}
      {podcastMutation.data && (
        <ResultSection
          title={`🎙️ Podcast: ${podcastMutation.data.episodeTitle || ''}`}
          exportData={podcastMutation.data}
          exportFilename="podcast-script.json"
          copyText={[
            podcastMutation.data.episodeTitle,
            podcastMutation.data.intro,
            ...(podcastMutation.data.segments?.map((s) => `${s.title}\n${s.script}`) || []),
            podcastMutation.data.outro,
          ].filter(Boolean).join('\n\n')}
        >
          {podcastMutation.data.duration && (
            <p className="text-xs text-muted-foreground">Estimated duration: {podcastMutation.data.duration}</p>
          )}
          {podcastMutation.data.intro && (
            <div>
              <SectionLabel>Intro</SectionLabel>
              <div className="bg-muted rounded-xl p-4 text-sm whitespace-pre-wrap">{podcastMutation.data.intro}</div>
            </div>
          )}
          {podcastMutation.data.segments?.map((seg, i) => (
            <div key={i} className="border border-border/50 rounded-xl p-4">
              <p className="font-medium text-sm mb-1">{seg.title}</p>
              {seg.duration && <p className="text-xs text-muted-foreground mb-2">{seg.duration}</p>}
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{seg.script}</p>
            </div>
          ))}
          {podcastMutation.data.outro && (
            <div>
              <SectionLabel>Outro</SectionLabel>
              <div className="bg-muted rounded-xl p-4 text-sm whitespace-pre-wrap">{podcastMutation.data.outro}</div>
            </div>
          )}
          {podcastMutation.data.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {podcastMutation.data.hashtags.map((h) => (
                <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
              ))}
            </div>
          )}
        </ResultSection>
      )}

      {/* Cross-Language Connections Result */}
      {crossLangMutation.isPending && <AILoading message="Finding cultural connections…" />}
      {crossLangMutation.data && (
        <ResultSection
          title="🌍 Cross-Language Cultural Connections"
          exportData={crossLangMutation.data}
          exportFilename="cross-language.json"
        >
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
                <SectionLabel>{lang}</SectionLabel>
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
        </ResultSection>
      )}
    </div>
  );
}
