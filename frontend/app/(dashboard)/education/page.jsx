'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  GraduationCap, Baby, Sparkles, Mic, Globe,
  Copy, Check, Download, RefreshCw, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/lib/api';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

// ── Sample data ───────────────────────────────────────────────────────────────

const SAMPLE_TEXTS = [
  {
    label: 'Tortoise & Birds (Igbo)',
    language: 'igbo',
    text: `Long ago, Mbe the tortoise heard that the birds were invited to a feast in the sky. He begged each bird for one feather until he had enough to fly. Before they left, he told everyone: "In the sky, we must use new names. My name shall be All of You." When the feast was served and the host said the food was for all of you, Mbe ate everything alone. The angry birds took back their feathers. Mbe fell from the sky and his shell cracked into pieces — which is why the tortoise shell has many lines today. This story teaches that greed and deception lead to one's own downfall.`,
  },
  {
    label: 'Sango God of Thunder (Yoruba)',
    language: 'yoruba',
    text: `Sango was the third Alaafin of the Oyo Empire, a real historical figure who became deified after his death. He was known for his fierce temper, his love of drumming, and his supernatural ability to call down lightning. According to oral tradition, Sango accidentally destroyed his own palace with lightning while experimenting with a powerful charm. Overcome with grief, he walked into the forest and disappeared. His followers declared: "Oba Koso" — the king did not hang. Today, Sango is worshipped across Yorubaland and in the African diaspora as Shango in Trinidad, Cuba, and Brazil. His symbol is the double-headed axe (oshe), and his colours are red and white.`,
  },
  {
    label: 'Hausa Patience Proverbs',
    language: 'hausa',
    text: `Hausa elders say: "Hankali ya fi karfi" — patience is stronger than force. This wisdom comes from the story of the farmer who tried to pull his crops out of the ground to make them grow faster, only to destroy them. His neighbour who waited and tended carefully harvested three times as much. Another proverb says "Mutum ya fi dukiyarsa" — a person is worth more than their wealth. And "Duk wanda ya yi gaba da ruwa, ruwa zai yi gaba da shi" — whoever fights against water, water will fight against them. These proverbs guide community life in northern Nigeria.`,
  },
];

// ── Export helpers ────────────────────────────────────────────────────────────

function buildPlainText(data, type) {
  if (type === 'children') {
    return [
      data.title || "Children's Story",
      '',
      data.story || data.content || '',
      '',
      data.moralLesson ? `Moral Lesson: ${data.moralLesson}` : '',
      ...(data.illustrationSuggestions?.map((s) => `• ${s}`) || []),
    ].filter(Boolean).join('\n');
  }
  if (type === 'podcast') {
    return [
      data.episodeTitle || 'Podcast Script',
      data.duration ? `Duration: ${data.duration}` : '',
      '',
      data.intro || '',
      ...(data.segments?.flatMap((s) => [`\n[${s.title}]`, s.script]) || []),
      '',
      data.outro || '',
      data.showNotes ? `\nShow Notes:\n${data.showNotes}` : '',
    ].filter(Boolean).join('\n');
  }
  return JSON.stringify(data, null, 2);
}

function exportAsDocx(text, filename) {
  // Simple RTF-based .doc that Word/LibreOffice opens correctly
  const rtf = `{\\rtf1\\ansi\\deff0\n{\\fonttbl{\\f0 Times New Roman;}}\n\\f0\\fs24\n${text.replace(/\n/g, '\\par\n').replace(/[\\\\{}]/g, '\\\\$&')}\n}`;
  const blob = new Blob([rtf], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename + '.doc'; a.click();
  URL.revokeObjectURL(url);
  toast.success('Exported as .doc');
}

function exportAsPdf(text, filename) {
  // Open print dialog with formatted content — browser saves as PDF
  const win = window.open('', '_blank');
  if (!win) { toast.error('Allow popups to export PDF'); return; }
  win.document.write(`
    <html><head><title>${filename}</title>
    <style>
      body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; line-height: 1.7; font-size: 14px; color: #1a1a1a; }
      h1 { font-size: 20px; margin-bottom: 8px; }
      pre { white-space: pre-wrap; font-family: inherit; }
    </style></head>
    <body><pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    <script>window.onload=()=>{window.print();window.close();}<\/script>
    </body></html>
  `);
  win.document.close();
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

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

function ExportButtons({ data, type, filename }) {
  const text = buildPlainText(data, type);
  return (
    <div className="flex gap-1.5">
      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
        onClick={() => exportAsPdf(text, filename)}>
        <Download className="w-3 h-3" /> PDF
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
        onClick={() => exportAsDocx(text, filename)}>
        <Download className="w-3 h-3" /> DOCX
      </Button>
    </div>
  );
}

function SLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{children}</p>;
}

// ── Per-tab generate button + output language ─────────────────────────────────

function TabControls({ mutation, onGenerate, disabled, outputLang, setOutputLang, label, icon: Icon }) {
  const hasResult = !!mutation.data;
  const resultRef = useRef(null);

  const handleGenerate = useCallback(() => {
    onGenerate();
    // Scroll to result after a short delay for the data to arrive
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 800);
  }, [onGenerate]);

  return { hasResult, resultRef, handleGenerate };
}

// ── Result panels ─────────────────────────────────────────────────────────────

function LessonResult({ data }) {
  return (
    <div className="space-y-4">
      {data.lessonTitle && <h3 className="font-semibold text-base">{data.lessonTitle}</h3>}
      {data.introduction && (
        <div><SLabel>Introduction</SLabel>
          <p className="text-sm text-muted-foreground">{data.introduction}</p></div>
      )}
      {data.learningObjectives?.length > 0 && (
        <div><SLabel>Learning Objectives</SLabel>
          <ul className="space-y-1">
            {data.learningObjectives.map((obj, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span> {obj}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.keyVocabulary?.length > 0 && (
        <div><SLabel>Key Vocabulary</SLabel>
          <div className="flex flex-wrap gap-2">
            {data.keyVocabulary.map((v) => (
              <div key={v.word} className="bg-muted rounded-lg px-3 py-1.5 text-xs">
                <span className="font-medium">{v.word}</span>
                {v.language && <span className="text-muted-foreground ml-1">({v.language})</span>}
                <span className="text-muted-foreground"> — {v.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.quiz?.length > 0 && (
        <div><SLabel>Quiz Questions</SLabel>
          <div className="space-y-3">
            {data.quiz.map((q, i) => (
              <div key={i} className="bg-muted rounded-xl p-4 text-sm">
                <div className="font-medium mb-2">{i + 1}. {q.question}</div>
                <div className="space-y-1 text-muted-foreground mb-2">
                  {q.options?.map((opt) => <div key={opt}>{opt}</div>)}
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
      {data.discussionQuestions?.length > 0 && (
        <div><SLabel>Discussion Questions</SLabel>
          <ul className="space-y-1">
            {data.discussionQuestions.map((q, i) => (
              <li key={i} className="text-sm text-muted-foreground">• {q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChildrenResult({ data }) {
  return (
    <div className="space-y-4">
      {data.title && <h3 className="font-serif text-xl font-bold">{data.title}</h3>}
      <p className="leading-relaxed whitespace-pre-wrap text-sm">{data.story || data.content}</p>
      {data.moralLesson && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
          <span className="font-semibold">Moral Lesson: </span>{data.moralLesson}
        </div>
      )}
      {data.illustrationSuggestions?.length > 0 && (
        <div><SLabel>Illustration Suggestions</SLabel>
          <ul className="space-y-1">
            {data.illustrationSuggestions.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground">• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PodcastResult({ data }) {
  return (
    <div className="space-y-4 text-sm">
      {data.episodeTitle && (
        <div>
          <p className="font-semibold text-base">{data.episodeTitle}</p>
          {data.duration && <p className="text-xs text-muted-foreground">Duration: {data.duration}</p>}
        </div>
      )}
      {data.intro && (
        <div><SLabel>Intro</SLabel>
          <div className="bg-muted rounded-xl p-4 whitespace-pre-wrap">{data.intro}</div>
        </div>
      )}
      {data.segments?.map((seg, i) => (
        <div key={i} className="border border-border/50 rounded-xl p-4">
          <p className="font-medium mb-1">{seg.title}</p>
          {seg.duration && <p className="text-xs text-muted-foreground mb-2">{seg.duration}</p>}
          <p className="text-muted-foreground whitespace-pre-wrap">{seg.script}</p>
        </div>
      ))}
      {data.outro && (
        <div><SLabel>Outro</SLabel>
          <div className="bg-muted rounded-xl p-4 whitespace-pre-wrap">{data.outro}</div>
        </div>
      )}
      {data.showNotes && (
        <div><SLabel>Show Notes</SLabel>
          <p className="text-muted-foreground">{data.showNotes}</p>
        </div>
      )}
      {data.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.hashtags.map((h) => <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>)}
        </div>
      )}
    </div>
  );
}

function CrossLangResult({ data }) {
  return (
    <div className="space-y-4">
      {data.culturalInsights && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-sm text-muted-foreground">{data.culturalInsights}</p>
        </div>
      )}
      {['hausaConnections', 'yorubaConnections', 'igboConnections'].map((key) => {
        const lang = key.replace('Connections', '');
        const items = data[key];
        if (!items?.length) return null;
        return (
          <div key={key}>
            <SLabel>{lang}</SLabel>
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
  );
}

// ── Tab panel wrapper ─────────────────────────────────────────────────────────

function TabPanel({ mutation, onGenerate, disabled, outputLang, setOutputLang, showAudience, audience, setAudience, resultNode, exportType, exportFilename, copyText }) {
  const resultRef = useRef(null);
  const hasResult = !!mutation.data;

  const handleGenerate = () => {
    onGenerate();
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 1200);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap p-4 rounded-xl border border-border/50 bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Output Language</p>
            <Select value={outputLang} onValueChange={setOutputLang}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l} className="capitalize text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showAudience && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Audience</p>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['primary', 'secondary', 'university', 'adult', 'children'].map((a) => (
                    <SelectItem key={a} value={a} className="capitalize text-xs">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasResult && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
              onClick={() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <Eye className="w-3.5 h-3.5" /> View Result
            </Button>
          )}
          <Button
            size="sm"
            className={`gap-1.5 h-8 text-xs ${hasResult ? 'variant-outline border border-border' : 'gradient-brand text-white border-0'}`}
            onClick={handleGenerate}
            disabled={disabled || mutation.isPending}
          >
            {mutation.isPending
              ? <><Sparkles className="w-3.5 h-3.5 animate-spin" /> Generating…</>
              : hasResult
              ? <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>
              : <><Sparkles className="w-3.5 h-3.5" /> Generate</>
            }
          </Button>
        </div>
      </div>

      {/* Generating state */}
      {mutation.isPending && (
        <div className="flex items-center gap-3 py-6 text-muted-foreground">
          <Sparkles className="w-5 h-5 animate-spin text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Gemma AI is generating…</p>
            <p className="text-xs mt-0.5">This takes 15–40 seconds. Please wait.</p>
          </div>
        </div>
      )}

      {/* Result */}
      {hasResult && !mutation.isPending && (
        <div ref={resultRef}>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm">Result</CardTitle>
                <div className="flex items-center gap-1.5">
                  {copyText && <CopyBtn text={copyText(mutation.data)} />}
                  {exportType && (
                    <ExportButtons data={mutation.data} type={exportType} filename={exportFilename} />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {resultNode(mutation.data)}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EducationPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [inputLang, setInputLang] = useState('english');
  const [audience, setAudience] = useState('secondary');
  const [activeTab, setActiveTab] = useState('lesson');

  // Per-tab output language
  const [lessonLang, setLessonLang] = useState('english');
  const [childrenLang, setChildrenLang] = useState('english');
  const [podcastLang, setPodcastLang] = useState('english');
  const [crossLang, setCrossLang] = useState('english');

  const lessonMutation = useMutation({
    mutationFn: () => api.post('/education/lesson', { content, audience, language: lessonLang }).then((r) => r.data.data.lesson),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate lesson'),
  });
  const childrenMutation = useMutation({
    mutationFn: () => api.post('/education/childrens-story', { content, language: childrenLang }).then((r) => r.data.data.childrensStory),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate story'),
  });
  const podcastMutation = useMutation({
    mutationFn: () => api.post('/education/podcast', { content, language: podcastLang }).then((r) => r.data.data.script),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate podcast'),
  });
  const crossLangMutation = useMutation({
    mutationFn: () => api.post('/education/cross-language', { content, language: crossLang }).then((r) => r.data.data.connections),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to find connections'),
  });

  const disabled = !content.trim();

  const TAB_BADGES = [
    { value: 'lesson',    mutation: lessonMutation },
    { value: 'children',  mutation: childrenMutation },
    { value: 'podcast',   mutation: podcastMutation },
    { value: 'cross',     mutation: crossLangMutation },
  ];

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('educationTitle')}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t('educationDesc')}</p>
      </div>

      {/* Input card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> {t('pasteContent')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sample picker */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Try a sample</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TEXTS.map((sample, i) => (
                <button key={i} type="button"
                  onClick={() => { setContent(sample.text); setInputLang(sample.language); }}
                  className={['filter-chip text-xs', content === sample.text ? 'active' : ''].join(' ')}>
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={t('pastePlaceholder')} rows={6} className="resize-none" />

          <div className="flex items-center gap-2">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Content Language</p>
              <Select value={inputLang} onValueChange={setInputLang}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l} className="capitalize text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!disabled && (
              <p className="text-xs text-muted-foreground mt-4">
                {content.split(' ').length} words · Choose a tab below to generate
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Output tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          {TAB_BADGES.map(({ value, mutation }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5 relative">
              {value === 'lesson'   && <><GraduationCap className="w-3.5 h-3.5" /> Lesson Plan</>}
              {value === 'children' && <><Baby className="w-3.5 h-3.5" /> Children&apos;s Story</>}
              {value === 'podcast'  && <><Mic className="w-3.5 h-3.5" /> Podcast</>}
              {value === 'cross'    && <><Globe className="w-3.5 h-3.5" /> Cross-Language</>}
              {mutation.data && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border-2 border-background" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="lesson" className="mt-4">
          <TabPanel
            mutation={lessonMutation}
            onGenerate={() => lessonMutation.mutate()}
            disabled={disabled}
            outputLang={lessonLang}
            setOutputLang={setLessonLang}
            showAudience
            audience={audience}
            setAudience={setAudience}
            resultNode={(data) => <LessonResult data={data} />}
            copyText={(data) => [data.lessonTitle, data.introduction, data.learningObjectives?.join('\n')].filter(Boolean).join('\n\n')}
          />
        </TabsContent>

        <TabsContent value="children" className="mt-4">
          <TabPanel
            mutation={childrenMutation}
            onGenerate={() => childrenMutation.mutate()}
            disabled={disabled}
            outputLang={childrenLang}
            setOutputLang={setChildrenLang}
            resultNode={(data) => <ChildrenResult data={data} />}
            exportType="children"
            exportFilename="childrens-story"
            copyText={(data) => data.story || data.content || ''}
          />
        </TabsContent>

        <TabsContent value="podcast" className="mt-4">
          <TabPanel
            mutation={podcastMutation}
            onGenerate={() => podcastMutation.mutate()}
            disabled={disabled}
            outputLang={podcastLang}
            setOutputLang={setPodcastLang}
            resultNode={(data) => <PodcastResult data={data} />}
            exportType="podcast"
            exportFilename="podcast-script"
            copyText={(data) => buildPlainText(data, 'podcast')}
          />
        </TabsContent>

        <TabsContent value="cross" className="mt-4">
          <TabPanel
            mutation={crossLangMutation}
            onGenerate={() => crossLangMutation.mutate()}
            disabled={disabled}
            outputLang={crossLang}
            setOutputLang={setCrossLang}
            resultNode={(data) => <CrossLangResult data={data} />}
            copyText={(data) => data.culturalInsights || ''}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
