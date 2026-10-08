'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BookOpen, Globe, Music, Landmark, Flame, Scroll, Heart,
  Search, Upload, X, Languages, Sparkles, FileText, Mic, Image, Filter, Quote, MessageSquare,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { LANGUAGE_COLORS, SUPPORTED_LANGUAGES } from '@/lib/constants';
import { useLanguage } from '@/hooks/useLanguage';

// ── Constants ─────────────────────────────────────────────────────────────────

// Values must match the knowledgeType enum stored in MongoDB
const CATEGORIES = [
  { value: 'all',              label: 'All',         icon: BookOpen  },
  { value: 'folktale',         label: 'Folktales',   icon: Scroll    },
  { value: 'proverb',          label: 'Proverbs',    icon: Quote     },
  { value: 'oral_history',     label: 'History',     icon: Landmark  },
  { value: 'community_history',label: 'Community',   icon: Landmark  },
  { value: 'ceremony',         label: 'Ceremonies',  icon: Flame     },
  { value: 'song',             label: 'Songs',       icon: Music     },
  { value: 'tradition',        label: 'Traditions',  icon: Heart     },
  { value: 'medicine',         label: 'Medicine',    icon: BookOpen  },
];

const LANGUAGES = ['all', 'hausa', 'yoruba', 'igbo', 'english', 'pidgin'];

const KEYWORD_GROUPS = [
  {
    label: 'Topics',
    keywords: ['wisdom', 'courage', 'patience', 'love', 'justice', 'community'],
  },
  {
    label: 'Traditions',
    keywords: ['Egungun', 'Sango', 'Ifa', 'kola nut', 'masquerade', 'initiation'],
  },
  {
    label: 'Animals',
    keywords: ['tortoise', 'spider', 'lion', 'river', 'harvest'],
  },
  {
    label: 'History',
    keywords: ['Oyo Empire', 'Benin Kingdom', 'Sokoto Caliphate', 'Nri Kingdom'],
  },
];

const UPLOAD_TYPE_ICONS = { image: Image, audio: Mic, document: FileText, text: FileText };

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.04 } }),
};

// ── Inline Translate ──────────────────────────────────────────────────────────

function TranslateInline({ storyId }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState('hausa');

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/stories/${storyId}/translate`, { targetLanguage: lang }).then((r) => r.data.data.translation),
    onError: () => toast.error('Translation failed'),
  });

  if (!open) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
      >
        <Languages className="w-3 h-3" /> Translate
      </button>
    );
  }

  return (
    <div onClick={(e) => e.preventDefault()} className="space-y-2 border-t border-border/40 pt-2 mt-2">
      <div className="flex items-center gap-2">
        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((l) => (
              <SelectItem key={l} value={l} className="text-xs capitalize">{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-7 text-xs gradient-brand text-white border-0 px-3"
          onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Sparkles className="w-3 h-3 animate-spin" /> : 'Go'}
        </Button>
        <button onClick={() => { setOpen(false); mutation.reset(); }} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {mutation.isPending && (
        <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" /> Gemma is translating…
        </p>
      )}
      {mutation.data && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 text-xs leading-relaxed">
          <p className="font-medium text-primary mb-1 capitalize">{lang}:</p>
          <p>{mutation.data.translation || mutation.data.translatedText || (typeof mutation.data === 'string' ? mutation.data : '')}</p>
        </div>
      )}
    </div>
  );
}

// ── Story Card ────────────────────────────────────────────────────────────────

function StoryCard({ item, i }) {
  const isProverb = item._isProverb;
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={i}>
      <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all h-full flex flex-col">
        <CardContent className="p-4 flex flex-col flex-1">
          {isProverb ? (
            <Link href="/proverbs" className="flex-1 block">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-serif font-semibold text-sm italic line-clamp-2 flex-1">&ldquo;{item.title}&rdquo;</p>
                <Badge className={`text-xs shrink-0 ${LANGUAGE_COLORS[item.language] || ''}`}>{item.language}</Badge>
              </div>
              {item.englishTranslation && (
                <p className="text-xs text-muted-foreground mb-1">{item.englishTranslation}</p>
              )}
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">{item.analysis?.summary}</p>
              <Badge variant="secondary" className="text-xs">Proverb</Badge>
            </Link>
          ) : (
            <Link href={`/stories/${item._id}`} className="flex-1 block">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm line-clamp-2 flex-1 hover:text-primary transition-colors">{item.title}</h3>
                <Badge className={`text-xs shrink-0 ${LANGUAGE_COLORS[item.language] || ''}`}>{item.language}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">
                {item.analysis?.summary || item.content?.slice(0, 120) + '…'}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs capitalize">{item.knowledgeType?.replace(/_/g, ' ')}</Badge>
                {item.analysis?.themes?.slice(0, 2).map((theme) => (
                  <Badge key={theme} variant="outline" className="text-xs">{theme}</Badge>
                ))}
              </div>
            </Link>
          )}
          {!isProverb && <TranslateInline storyId={item._id} />}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Upload Card ───────────────────────────────────────────────────────────────

function UploadCard({ item, i, onAskAI }) {
  const Icon = UPLOAD_TYPE_ICONS[item.uploadType] || FileText;
  const fileUrl = item.fileUrl && !item.fileUrl.startsWith('local://') ? item.fileUrl : null;
  const hasText = !!item.extractedText || item.analysisStatus === 'completed';

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={i}>
      <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all h-full flex flex-col">
        <CardContent className="p-4 flex flex-col flex-1">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              {fileUrl ? (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="font-semibold text-sm truncate hover:text-primary transition-colors flex items-center gap-1">
                  <span className="truncate">{item.ingestion?.metadata?.title || item.originalName}</span>
                </a>
              ) : (
                <p className="font-semibold text-sm truncate">{item.ingestion?.metadata?.title || item.originalName}</p>
              )}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <p className="text-xs text-muted-foreground capitalize">{item.uploadType}</p>
                {item.ingestion?.detectedLanguage && (
                  <Badge className={`text-xs ${LANGUAGE_COLORS[item.ingestion.detectedLanguage] || ''}`}>
                    {item.ingestion.detectedLanguage}
                  </Badge>
                )}
                <Badge className={`text-xs shrink-0 ${
                  item.analysisStatus === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {item.analysisStatus || 'pending'}
                </Badge>
              </div>
            </div>
          </div>

          {item.ingestion?.summaries?.short && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-2">
              {item.ingestion.summaries.short}
            </p>
          )}

          {item.ingestion?.aiUnderstanding?.moralLessons?.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-foreground mb-0.5">Moral:</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {item.ingestion.aiUnderstanding.moralLessons[0]}
              </p>
            </div>
          )}

          {item.ingestion?.aiUnderstanding?.subThemes?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.ingestion.aiUnderstanding.subThemes.slice(0, 3).map((t) => (
                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-auto pt-2">
            {hasText && (
              <Button
                size="sm"
                className="gap-1.5 h-7 text-xs gradient-brand text-white border-0 flex-1"
                onClick={() => onAskAI(item)}
              >
                <MessageSquare className="w-3 h-3" /> Ask AI
              </Button>
            )}
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  View
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function KnowledgeLibraryPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [language, setLanguage] = useState('hausa');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const router = useRouter();
  const { lang } = useLanguage();

  const hasFilters = activeCategory !== 'all' || language !== 'all' || !!searchQuery;

  // Stories + Proverbs combined
  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ['knowledge-library-stories', activeCategory, language, searchQuery],
    queryFn: async () => {
      if (searchQuery) {
        const params = new URLSearchParams({ q: searchQuery, limit: '30' });
        if (language !== 'all') params.set('language', language);
        if (activeCategory !== 'all') params.set('knowledgeType', activeCategory);
        const r = await api.get(`/search?${params}`);
        const stories = r.data.data?.stories || [];
        const proverbs = r.data.data?.proverbs || [];
        // Normalise proverbs to story-like shape for unified rendering
        const normProverbs = proverbs.map((p) => ({
          ...p, _isProverb: true,
          title: p.original,
          knowledgeType: 'proverb',
          analysis: { summary: p.meaning },
        }));
        return [...stories, ...normProverbs];
      }
      const results = [];
      // Fetch stories (skip if category is proverb-only)
      if (activeCategory !== 'proverb') {
        const params = new URLSearchParams({ limit: '40', sort: '-createdAt' });
        if (activeCategory !== 'all') params.set('knowledgeType', activeCategory);
        if (language !== 'all') params.set('language', language);
        const r = await api.get(`/stories?${params}`);
        results.push(...(r.data.data || []));
      }
      // Fetch proverbs when category is all or proverb
      if (activeCategory === 'all' || activeCategory === 'proverb') {
        const params = new URLSearchParams({ limit: '20' });
        if (language !== 'all') params.set('language', language);
        const r = await api.get(`/proverbs?${params}`);
        const proverbs = (r.data.data || []).map((p) => ({
          ...p, _isProverb: true,
          title: p.original,
          knowledgeType: 'proverb',
          analysis: { summary: p.meaning },
        }));
        results.push(...proverbs);
      }
      return results;
    },
  });

  const { data: uploadsRaw, isLoading: uploadsLoading } = useQuery({
    queryKey: ['knowledge-uploads'],
    queryFn: () => api.get('/uploads?limit=50').then((r) => r.data.data || []),
  });

  const stories = storiesData || [];

  // Client-side filter uploads by language (from ingestion.detectedLanguage) and search
  const uploads = (uploadsRaw || []).filter((u) => {
    if (language !== 'all') {
      const detected = u.ingestion?.detectedLanguage?.toLowerCase();
      if (detected && detected !== language) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        u.originalName?.toLowerCase().includes(q) ||
        u.ingestion?.summaries?.short?.toLowerCase().includes(q) ||
        u.ingestion?.metadata?.title?.toLowerCase().includes(q) ||
        u.ingestion?.aiUnderstanding?.subThemes?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSearch = (q) => { setSearchQuery(q); setInputValue(q); };
  const clearSearch = () => { setSearchQuery(''); setInputValue(''); };

  const clearAll = () => {
    setActiveCategory('all');
    setLanguage('hausa');
    clearSearch();
  };

  // Open chat pre-loaded with this document — any user can do this
  const handleAskAI = (upload) => {
    router.push(`/chat?uploadId=${upload._id}&uploadTitle=${encodeURIComponent(upload.ingestion?.metadata?.title || upload.originalName)}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">Knowledge Library</h1>
            <p className="text-muted-foreground text-sm">Browse, filter, and translate indigenous knowledge</p>
          </div>
        </div>
      </motion.div>

      {/* Search bar */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(inputValue.trim())}
            placeholder="Search stories, proverbs, traditions… (Enter to search)"
            className="w-full h-10 pl-9 pr-10 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {inputValue && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Keyword chips */}
        <div className="mt-3 space-y-2">
          {KEYWORD_GROUPS.map((group) => (
            <div key={group.label} className="flex items-start gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 w-16 shrink-0 pt-1">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {group.keywords.map((kw) => (
                  <button
                    key={kw}
                    onClick={() => handleSearch(kw)}
                    className={[
                      'px-2.5 py-0.5 rounded-full text-xs border transition-all',
                      searchQuery === kw
                        ? 'gradient-brand text-white border-transparent'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground bg-background',
                    ].join(' ')}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
        <div className="filter-panel space-y-3">
          {/* Category row */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="section-label w-20 shrink-0">Category</span>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1 pb-0.5">
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setActiveCategory(value)}
                  className={[
                    'filter-chip shrink-0',
                    activeCategory === value ? 'active' : '',
                  ].join(' ')}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-divider" />

          {/* Language row */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="section-label w-20 shrink-0">Language</span>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1 pb-0.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={[
                    'filter-chip shrink-0 capitalize',
                    language === lang ? 'active' : '',
                  ].join(' ')}
                >
                  {lang === 'all' ? 'All' : lang}
                </button>
              ))}
            </div>
          </div>

          {/* Active filter summary + clear */}
          {hasFilters && (
            <>
              <div className="filter-divider" />
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {activeCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                    {CATEGORIES.find((c) => c.value === activeCategory)?.label}
                    <button onClick={() => setActiveCategory('all')} aria-label="Remove category filter">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {language !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 capitalize">
                    {language}
                    <button onClick={() => setLanguage('all')} aria-label="Remove language filter">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                    &ldquo;{searchQuery}&rdquo;
                    <button onClick={clearSearch} aria-label="Remove search filter">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-destructive ml-auto transition-colors">
                  Clear all
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
        <Tabs defaultValue="stories">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="stories" className="gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Stories & Knowledge
                {!storiesLoading && <span className="ml-1 text-xs opacity-60">({stories.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="uploads" className="gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Uploaded Documents
                {!uploadsLoading && <span className="ml-1 text-xs opacity-60">({uploads.length})</span>}
              </TabsTrigger>
            </TabsList>
            <Link href="/upload">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <Upload className="w-3.5 h-3.5" /> Upload New
              </Button>
            </Link>
          </div>

          {/* Stories tab */}
          <TabsContent value="stories">
            {storiesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(9).fill(0).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
              </div>
            ) : stories.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p className="font-medium mb-1">No stories found</p>
                <p className="text-sm mb-4">
                  {hasFilters
                    ? 'No results match your current filters. Try adjusting them.'
                    : 'No stories yet. Be the first to contribute.'}
                </p>
                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={clearAll}>Clear Filters</Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stories.map((item, i) => <StoryCard key={item._id} item={item} i={i} />)}
              </div>
            )}
          </TabsContent>

          {/* Uploads tab */}
          <TabsContent value="uploads">
            {uploadsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
              </div>
            ) : uploads.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Upload className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p className="font-medium mb-1">No uploaded documents found</p>
                <p className="text-sm mb-4">
                  {hasFilters ? 'Try adjusting your filters.' : 'Upload PDFs, images, audio, or text files.'}
                </p>
                {hasFilters
                  ? <Button variant="outline" size="sm" onClick={clearAll}>Clear Filters</Button>
                  : <Link href="/upload"><Button variant="outline" size="sm" className="gap-1.5"><Upload className="w-3.5 h-3.5" /> Upload Knowledge</Button></Link>
                }
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploads.map((item, i) => <UploadCard key={item._id} item={item} i={i} onAskAI={handleAskAI} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
