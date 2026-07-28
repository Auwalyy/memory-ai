'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Globe, Copy, Check, Download, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import api from '@/lib/api';
import { SUPPORTED_LANGUAGES, LANGUAGE_COLORS } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

const schema = z.object({
  original: z.string().min(2, 'Proverb text is required'),
  englishTranslation: z.string().min(2, 'English translation is required'),
  meaning: z.string().min(10, 'Meaning is required'),
  language: z.string().min(1, 'Language is required'),
  usage: z.string().optional(),
  tribe: z.string().optional(),
});

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.04 } }),
};

const LANG_EMOJI = { hausa: '🟢', yoruba: '🔵', igbo: '🟣', english: '⚪', pidgin: '🟠' };

const SAMPLE_EXTRACT_TEXT = `In Yoruba culture, elders say "Ọmọ tí a kò kọ́ ni yóò ta ilé tì" — a child that is not taught will sell the family home. This reflects the deep belief that education and moral upbringing are the foundation of a stable society. Another common saying is "Bi a bá fẹ́ mọ ẹni, a wo ọ̀rẹ́ rẹ̀" — if you want to know a person, look at their friends. The Hausa also have a powerful proverb: "Hankali ya fi ƙarfi" meaning patience is stronger than force. And the Igbo say "Onye wetara oji wetara ndụ" — he who brings kola nut brings life, emphasising the sacred nature of hospitality and welcome.`;

const SAMPLE_PROVERBS = [
  {
    original: 'Ọmọ tí a kò kọ́ ni yóò ta ilé tì',
    englishTranslation: 'A child that is not taught will sell the family home',
    meaning: 'Children who are not properly educated and instilled with values will eventually destroy what their parents built.',
    language: 'yoruba',
    tribe: 'Yoruba',
    usage: 'Used to emphasise the importance of education and moral upbringing.',
  },
  {
    original: 'Hankali ya fi ƙarfi',
    englishTranslation: 'Patience is stronger than force',
    meaning: 'Calm, patient action achieves more than aggressive force. Wisdom and timing matter more than raw power.',
    language: 'hausa',
    tribe: 'Hausa',
    usage: 'Used to counsel against rushing or using aggression when patience would yield better results.',
  },
  {
    original: 'Onye wetara oji wetara ndụ',
    englishTranslation: 'He who brings kola nut brings life',
    meaning: 'Hospitality and the act of welcoming guests with kola nut is a sacred, life-affirming act in Igbo culture.',
    language: 'igbo',
    tribe: 'Igbo',
    usage: 'Said at the beginning of ceremonies when kola nut is presented.',
  },
];

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); }}
      className="icon-btn"
      aria-label="Copy proverb"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function ShareBtn({ proverb }) {
  const share = async () => {
    const text = `"${proverb.original}" — ${proverb.englishTranslation}\n\nMeaning: ${proverb.meaning}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (_) {}
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard for sharing!');
    }
  };
  return (
    <button onClick={share} className="icon-btn" aria-label="Share proverb">
      <Share2 className="w-3.5 h-3.5" />
    </button>
  );
}

export default function ProverbsPage() {
  const [open, setOpen] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [extractLang, setExtractLang] = useState('hausa');
  const [langFilter, setLangFilter] = useState('');
  const [extractedProverbs, setExtractedProverbs] = useState([]);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['proverbs', langFilter],
    queryFn: () =>
      api.get(`/proverbs${langFilter ? `?language=${langFilter}` : ''}`).then((r) => r.data),
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/proverbs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proverbs'] });
      toast.success('Proverb added successfully');
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add proverb'),
  });

  const extractMutation = useMutation({
    mutationFn: () => api.post('/proverbs/extract', { text: extractText, language: extractLang }),
    onSuccess: async (res) => {
      const proverbs = res.data.data.proverbs || [];
      setExtractedProverbs(proverbs);
      if (proverbs.length === 0) { toast.info('No proverbs found in that text.'); return; }
      let saved = 0;
      for (const p of proverbs) {
        if (!p.original || !p.englishTranslation || !p.meaning) continue;
        try {
          await api.post('/proverbs', {
            original: p.original, englishTranslation: p.englishTranslation,
            meaning: p.meaning, language: (p.language || extractLang).toLowerCase(),
            usage: p.usage || '', tribe: p.tribe || '',
          });
          saved++;
        } catch (_) {}
      }
      queryClient.invalidateQueries({ queryKey: ['proverbs'] });
      toast.success(`Extracted ${proverbs.length} proverb${proverbs.length !== 1 ? 's' : ''} — ${saved} saved`);
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Extraction failed'),
  });

  const exportCSV = () => {
    const proverbs = data?.data || [];
    if (!proverbs.length) return toast.info('No proverbs to export');
    const header = 'Original,English Translation,Meaning,Language,Tribe,Usage';
    const rows = proverbs.map((p) =>
      [p.original, p.englishTranslation, p.meaning, p.language, p.tribe || '', p.usage || '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `proverbs${langFilter ? `-${langFilter}` : ''}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as CSV');
  };

  const exportJSON = () => {
    const proverbs = data?.data || [];
    if (!proverbs.length) return toast.info('No proverbs to export');
    const blob = new Blob([JSON.stringify(proverbs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `proverbs${langFilter ? `-${langFilter}` : ''}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as JSON');
  };

  const proverbs = data?.data || [];

  return (
    <div className="page-container space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('proverbs')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Indigenous wisdom preserved in words</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline" size="sm" className="gap-1.5 h-9 hidden sm:flex"
            onClick={() => { reset(SAMPLE_PROVERBS[0]); setOpen(true); }}
          >
            ✨ Try Sample
          </Button>
          <Button onClick={() => setOpen(true)} className="gradient-brand text-white border-0 gap-2 h-9 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('addProverb')}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="browse">
        {/* Tab bar + export actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="h-9">
            <TabsTrigger value="browse" className="text-xs sm:text-sm">Browse</TabsTrigger>
            <TabsTrigger value="extract" className="text-xs sm:text-sm gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Extract with AI
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={exportJSON}
              className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
        </div>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-4 mt-4">
          {/* Filter panel */}
          <div className="filter-panel">
            <div className="flex items-center gap-3 min-w-0">
              <span className="section-label w-16 shrink-0">Language</span>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
                {['', ...SUPPORTED_LANGUAGES].map((lang) => (
                  <button
                    key={lang}
                    className={`filter-chip shrink-0 ${langFilter === lang ? 'active' : ''}`}
                    onClick={() => setLangFilter(lang)}
                  >
                    {lang
                      ? `${LANG_EMOJI[lang] || ''} ${lang.charAt(0).toUpperCase() + lang.slice(1)}`
                      : 'All'}
                  </button>
                ))}
              </div>
              {langFilter && (
                <button
                  className="icon-btn shrink-0"
                  onClick={() => setLangFilter('')}
                  aria-label="Clear language filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {!isLoading && (
              <>
                <div className="filter-divider" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{proverbs.length}</span>
                  {' '}proverb{proverbs.length !== 1 ? 's' : ''}
                  {langFilter && ` in ${langFilter}`}
                </p>
              </>
            )}
          </div>

          {/* Proverb cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {isLoading
              ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
              : proverbs.length === 0
                ? (
                  <div className="col-span-2 text-center py-20 text-muted-foreground">
                    <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-semibold text-base mb-1">No proverbs yet</p>
                    <p className="text-sm">Add one manually or extract from text using AI.</p>
                  </div>
                )
                : proverbs.map((proverb, i) => (
                  <motion.div key={proverb._id} variants={fadeUp} initial="hidden" animate="visible" custom={i}>
                    <Card className="border-border/50 h-full hover:border-primary/30 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4 space-y-2.5">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-serif text-sm font-semibold italic leading-snug flex-1">
                            &ldquo;{proverb.original}&rdquo;
                          </p>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <CopyBtn text={`"${proverb.original}" — ${proverb.englishTranslation}. ${proverb.meaning}`} />
                            <ShareBtn proverb={proverb} />
                            <Badge className={`text-xs ml-1 ${LANGUAGE_COLORS[proverb.language] || ''}`}>
                              {proverb.language}
                            </Badge>
                          </div>
                        </div>

                        {/* Translation */}
                        <p className="text-xs text-muted-foreground italic">{proverb.englishTranslation}</p>

                        {/* Meaning */}
                        <div className="border-t border-border/40 pt-2 space-y-1">
                          <p className="text-xs leading-relaxed">
                            <span className="font-medium text-foreground">Meaning: </span>
                            <span className="text-muted-foreground">{proverb.meaning}</span>
                          </p>
                          {proverb.usage && (
                            <p className="text-xs">
                              <span className="font-medium text-foreground">Usage: </span>
                              <span className="text-muted-foreground">{proverb.usage}</span>
                            </p>
                          )}
                        </div>

                        {proverb.tribe && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="w-3 h-3" />
                            {proverb.tribe}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
            }
          </div>
        </TabsContent>

        {/* Extract Tab */}
        <TabsContent value="extract" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Extract Proverbs from Text
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Paste any indigenous text and Gemma AI will identify and extract all proverbs, sayings, and wisdom phrases.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sample text button */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Try sample:</span>
                <button
                  type="button"
                  onClick={() => setExtractText(SAMPLE_EXTRACT_TEXT)}
                  className="filter-chip text-xs"
                >
                  Nigerian proverbs text
                </button>
              </div>
              <Textarea
                value={extractText}
                onChange={(e) => setExtractText(e.target.value)}
                placeholder="Paste a story, speech, or any text containing proverbs…"
                rows={6}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={extractLang} onValueChange={setExtractLang}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => extractMutation.mutate()}
                  disabled={!extractText.trim() || extractMutation.isPending}
                  className="gradient-brand text-white border-0 gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {extractMutation.isPending ? 'Extracting…' : 'Extract Proverbs'}
                </Button>
              </div>

              {extractMutation.isPending && (
                <p className="text-sm text-muted-foreground animate-pulse flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-spin" />
                  Gemma is extracting proverbs… please wait.
                </p>
              )}

              {extractedProverbs.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Found {extractedProverbs.length} proverb{extractedProverbs.length !== 1 ? 's' : ''} — saved to library
                    </p>
                    <Button
                      variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(extractedProverbs, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'extracted-proverbs.json'; a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Exported extracted proverbs');
                      }}
                    >
                      <Download className="w-3 h-3" /> Export
                    </Button>
                  </div>
                  {extractedProverbs.map((p, i) => (
                    <div key={i} className="surface p-4 space-y-1.5 animate-fade-up">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-serif italic font-semibold text-sm">&ldquo;{p.original}&rdquo;</p>
                        <CopyBtn text={`"${p.original}" — ${p.englishTranslation}. ${p.meaning}`} />
                      </div>
                      <p className="text-xs text-muted-foreground italic">{p.englishTranslation}</p>
                      <p className="text-xs">
                        <span className="font-medium text-foreground">Meaning: </span>
                        <span className="text-muted-foreground">{p.meaning}</span>
                      </p>
                      {p.usage && (
                        <p className="text-xs">
                          <span className="font-medium text-foreground">Usage: </span>
                          <span className="text-muted-foreground">{p.usage}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Proverb Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Add a Proverb</DialogTitle>
          </DialogHeader>
          {/* Sample picker */}
          <div className="flex items-center gap-2 flex-wrap pt-1 pb-2 border-b border-border/50">
            <span className="text-xs text-muted-foreground shrink-0">Try a sample:</span>
            {SAMPLE_PROVERBS.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => reset(s)}
                className="filter-chip text-xs"
              >
                {s.language} proverb {i + 1}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Proverb (original language)</label>
              <Input {...register('original')} placeholder="e.g. Ọmọ tí a kò kọ ni yóò ta ilé tì" />
              {errors.original && <p className="text-destructive text-xs">{errors.original.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">English Translation</label>
              <Input {...register('englishTranslation')} placeholder="Literal English translation" />
              {errors.englishTranslation && <p className="text-destructive text-xs">{errors.englishTranslation.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Meaning</label>
              <Textarea {...register('meaning')} placeholder="What does this proverb mean culturally?" rows={3} />
              {errors.meaning && <p className="text-destructive text-xs">{errors.meaning.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Language</label>
                <Controller name="language" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.language && <p className="text-destructive text-xs">{errors.language.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Tribe <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input {...register('tribe')} placeholder="e.g. Yoruba" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Usage <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input {...register('usage')} placeholder="When is this proverb used?" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
              <Button
                type="submit"
                className="flex-1 gradient-brand text-white border-0"
                disabled={isSubmitting || createMutation.isPending}
              >
                {createMutation.isPending ? 'Adding…' : 'Add Proverb'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
