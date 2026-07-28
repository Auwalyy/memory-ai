'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { GraduationCap, Baby, Sparkles, Mic, Globe, ChevronDown, ChevronUp, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

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
    label: 'Hausa Patience Proverb',
    language: 'hausa',
    text: `Hausa elders say: "Hankali ya fi karfi" — patience is stronger than force. This wisdom comes from the story of the farmer who tried to pull his crops out of the ground to make them grow faster, only to destroy them. His neighbour who waited and tended carefully harvested three times as much. Another proverb says "Mutum ya fi dukiyarsa" — a person is worth more than their wealth. And "Duk wanda ya yi gaba da ruwa, ruwa zai yi gaba da shi" — whoever fights against water, water will fight against them. These proverbs guide community life in northern Nigeria.`,
  },
];


  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 h-7 text-xs"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied!');
        setTimeout(() => setCopied(false), 2000);
      }}
      aria-label={label}
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function ExportBtn({ data, filename }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 h-7 text-xs"
      onClick={() => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        toast.success('Exported!');
      }}
    >
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
          <CardTitle
            className="text-sm sm:text-base flex items-center gap-2 cursor-pointer flex-1"
            onClick={() => setOpen((v) => !v)}
          >
            {title}
            {open
              ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
            }
          </CardTitle>
          {open && (
            <div className="flex items-center gap-1.5">
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

export default function EducationPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('english');
  const [audience, setAudience] = useState('secondary');

  const lessonMutation = useMutation({
    mutationFn: () => api.post('/education/lesson', { content, audience, language }).then((r) => r.data.data.lesson),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate lesson'),
  });

  const childrenMutation = useMutation({
    mutationFn: () => api.post('/education/childrens-story', { content, language }).then((r) => r.data.data.childrensStory),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate story'),
  });

  const podcastMutation = useMutation({
    mutationFn: () => api.post('/education/podcast', { content, language }).then((r) => r.data.data.script),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate podcast'),
  });

  const crossLangMutation = useMutation({
    mutationFn: () => api.post('/education/cross-language', { content, language }).then((r) => r.data.data.connections),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to find connections'),
  });

  const disabled = !content.trim();

  const ACTION_BUTTONS = [
    { labelKey: 'lessonPlan',      loadingKey: 'generating', icon: GraduationCap, mutation: lessonMutation,    variant: 'gradient' },
    { labelKey: 'childrensStory',  loadingKey: 'generating', icon: Baby,          mutation: childrenMutation,  variant: 'outline' },
    { labelKey: 'podcastScript',   loadingKey: 'generating', icon: Mic,           mutation: podcastMutation,   variant: 'outline' },
    { labelKey: 'crossLanguage',   loadingKey: 'analyzing',  icon: Globe,         mutation: crossLangMutation, variant: 'outline' },
  ];

  const hasAnyResult = lessonMutation.data || childrenMutation.data || podcastMutation.data || crossLangMutation.data;

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
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('pastePlaceholder')}
            rows={6}
            className="resize-none"
          />

          {/* Controls row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder={t('languageLabel')} />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder={t('audienceLabel')} />
              </SelectTrigger>
              <SelectContent>
                {['primary', 'secondary', 'university', 'adult', 'children'].map((a) => (
                  <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ACTION_BUTTONS.map(({ labelKey, loadingKey, icon: Icon, mutation, variant }) => {
              const hasResult = !!mutation.data;
              return (
                <button
                  key={labelKey}
                  onClick={() => mutation.mutate()}
                  disabled={disabled || mutation.isPending}
                  className={[
                    'relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    mutation.isPending
                      ? 'border-primary/40 bg-primary/5 text-primary'
                      : variant === 'gradient'
                      ? 'gradient-brand text-white border-transparent'
                      : hasResult
                      ? 'border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400 hover:bg-green-500/10'
                      : 'border-border bg-background hover:bg-muted hover:border-primary/40 text-foreground',
                  ].join(' ')}
                >
                  {hasResult && !mutation.isPending && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                  <Icon className={`w-5 h-5 ${mutation.isPending ? 'animate-spin' : ''}`} />
                  {mutation.isPending ? t(loadingKey) : t(labelKey)}
                </button>
              );
            })}
          </div>

          {/* Status row */}
          <div className="flex items-center gap-2 flex-wrap">
            {ACTION_BUTTONS.some((b) => b.mutation.isPending) ? (
              <p className="text-xs text-muted-foreground flex items-center gap-2 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                {t('gemmaGenerating')}
              </p>
            ) : hasAnyResult ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {t('resultsReady')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('pasteFirst')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lesson Plan Result */}
      {lessonMutation.data && (
        <ResultSection
          title={`📚 ${t('lessonPlan')}: ${lessonMutation.data.lessonTitle || ''}`}
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
              <SectionLabel>{t('learningObjectives')}</SectionLabel>
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
              <SectionLabel>{t('introduction')}</SectionLabel>
              <p className="text-sm text-muted-foreground">{lessonMutation.data.introduction}</p>
            </div>
          )}
          {lessonMutation.data.keyVocabulary?.length > 0 && (
            <div>
              <SectionLabel>{t('keyVocabulary')}</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {lessonMutation.data.keyVocabulary.map((v) => (
                  <div key={v.word} className="bg-muted rounded-lg px-3 py-1.5 text-xs">
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
              <SectionLabel>{t('quizQuestions')}</SectionLabel>
              <div className="space-y-3">
                {lessonMutation.data.quiz.map((q, i) => (
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
          {lessonMutation.data.discussionQuestions?.length > 0 && (
            <div>
              <SectionLabel>{t('discussionQuestions')}</SectionLabel>
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
      {childrenMutation.data && (
        <ResultSection
          title={`🧒 ${t('childrensStory')}: ${childrenMutation.data.title || ''}`}
          copyText={childrenMutation.data.story}
          exportData={childrenMutation.data}
          exportFilename="childrens-story.json"
        >
          <p className="leading-relaxed whitespace-pre-wrap text-sm">{childrenMutation.data.story}</p>
          {childrenMutation.data.moralLesson && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
              <span className="font-semibold">{t('moralLesson')}: </span>
              {childrenMutation.data.moralLesson}
            </div>
          )}
          {childrenMutation.data.illustrationSuggestions?.length > 0 && (
            <div>
              <SectionLabel>{t('illustrationSuggestions')}</SectionLabel>
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
      {podcastMutation.data && (
        <ResultSection
          title={`🎙️ ${t('podcastScript')}: ${podcastMutation.data.episodeTitle || ''}`}
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
            <p className="text-xs text-muted-foreground">{t('estimatedDuration')}: {podcastMutation.data.duration}</p>
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
          {podcastMutation.data.showNotes && (
            <div>
              <SectionLabel>{t('showNotes')}</SectionLabel>
              <p className="text-sm text-muted-foreground">{podcastMutation.data.showNotes}</p>
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
      {crossLangMutation.data && (
        <ResultSection
          title={`🌍 ${t('crossLanguage')}`}
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
