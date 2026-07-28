'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, BookOpen, LayoutGrid, List, SortAsc, Download, Copy, Check, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import api from '@/lib/api';
import { StoryCard } from '@/components/features/StoryCard';
import { SUPPORTED_LANGUAGES, KNOWLEDGE_TYPES, LANGUAGE_COLORS } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  language: z.string().min(1, 'Language is required'),
  knowledgeType: z.string().min(1, 'Type is required'),
  community: z.string().optional(),
  source: z.string().optional(),
});

const LANG_EMOJI = { hausa: '🟢', yoruba: '🔵', igbo: '🟣', english: '⚪', pidgin: '🟠' };
const TYPE_LABELS = {
  folktale: 'Folktale', proverb: 'Proverb', oral_history: 'Oral History',
  tradition: 'Tradition', ceremony: 'Ceremony', medicine: 'Medicine',
  song: 'Song', poem: 'Poem', historical_event: 'Historical', community_history: 'Community', other: 'Other',
};

const SAMPLE_STORIES = [
  {
    title: 'Mbe na Nnụnụ — The Tortoise and the Birds',
    content: 'Long ago, Mbe the tortoise heard that the birds were invited to a feast in the sky. He begged each bird for one feather until he had enough to fly. Before they left, he told everyone: "In the sky, we must use new names. My name shall be All of You." When the feast was served and the host said the food was for all of you, Mbe ate everything alone. The angry birds took back their feathers. Mbe fell from the sky and his shell cracked into pieces — which is why the tortoise shell has many lines today.',
    language: 'igbo',
    knowledgeType: 'folktale',
    community: 'Igbo',
    source: 'Elder Chukwuemeka Obi, oral tradition',
  },
  {
    title: 'Hausa Proverb — The Value of Patience',
    content: 'Hausa elders say: "Hankali ya fi karfi" — patience is stronger than force. This wisdom comes from the story of the farmer who tried to pull his crops out of the ground to make them grow faster, only to destroy them. His neighbour who waited and tended carefully harvested three times as much. The proverb is used to counsel young people against rushing important decisions, especially in marriage, business, and conflict resolution.',
    language: 'hausa',
    knowledgeType: 'proverb',
    community: 'Hausa',
    source: 'Kano oral tradition',
  },
  {
    title: 'The New Yam Festival — Igbo Iri Ji',
    content: 'Iri Ji, the New Yam Festival, is one of the most important ceremonies in Igboland. Held at the end of the farming season (August–September), it marks the time when the new yam harvest is ready to eat. No one may eat the new yam before the Eze (king) or eldest man in the community performs the first tasting ceremony. He offers the first yam to Ani (earth goddess) and the ancestors, then eats publicly to declare the harvest open. The community then feasts, dances, and gives thanks. Yam is not just food in Igbo culture — it is the king of crops, a symbol of wealth, masculinity, and the covenant between the living and the ancestors.',
    language: 'igbo',
    knowledgeType: 'ceremony',
    community: 'Igbo',
    source: 'Anambra State oral tradition',
  },
  {
    title: 'Sango — Yoruba God of Thunder',
    content: 'Sango was the third Alaafin (king) of the Oyo Empire, a real historical figure who became deified after his death. He was known for his fierce temper, his love of drumming, and his supernatural ability to call down lightning. According to oral tradition, Sango accidentally destroyed his own palace with lightning while experimenting with a powerful charm. Overcome with grief, he walked into the forest and disappeared — some say he hanged himself, others say he ascended to the sky. His followers declared: "Oba Koso" — the king did not hang. Today, Sango is worshipped across Yorubaland and in the African diaspora (as Shango in Trinidad, Cuba, and Brazil). His symbol is the double-headed axe (oshe), and his colours are red and white.',
    language: 'yoruba',
    knowledgeType: 'oral_history',
    community: 'Yoruba, Oyo',
    source: 'Oyo oral tradition and Ifa corpus',
  },
];

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(text); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); }}
      className="icon-btn"
      aria-label="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function StoryListItem({ story, onDelete }) {
  return (
    <a href={`/stories/${story._id}`} className="block group">
      <div className="result-card p-4 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-1">
              {story.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <CopyBtn text={`${story.title}\n\n${story.content}`} />
              <button
                onClick={(e) => { e.preventDefault(); onDelete(story._id, story.title); }}
                className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                aria-label="Delete story"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <Badge className={`text-xs ${LANGUAGE_COLORS[story.language] || ''}`}>{story.language}</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
            {story.analysis?.summary || 'Gemma AI analysis in progress…'}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {story.knowledgeType && (
              <Badge variant="secondary" className="text-xs h-5 px-2">{TYPE_LABELS[story.knowledgeType] || story.knowledgeType}</Badge>
            )}
            {story.analysis?.themes?.slice(0, 2).map((t) => (
              <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </a>
  );
}

export default function StoriesPage() {
  const [open, setOpen] = useState(false);
  const [sampleIdx, setSampleIdx] = useState(0);
  const [langFilter, setLangFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [viewMode, setViewMode] = useState('list');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['stories', langFilter, typeFilter, sortBy],
    queryFn: () => {
      const params = new URLSearchParams();
      if (langFilter) params.set('language', langFilter);
      if (typeFilter) params.set('knowledgeType', typeFilter);
      if (sortBy) params.set('sort', sortBy);
      return api.get(`/stories?${params}`).then((r) => r.data);
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/stories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story submitted! Gemma AI is analyzing it now.');
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create story'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/stories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story deleted');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete story'),
  });

  const hasFilters = langFilter || typeFilter;
  const stories = data?.data || [];

  const exportStories = () => {
    if (!stories.length) return toast.info('No stories to export');
    const csv = [
      'Title,Language,Type,Summary,Community',
      ...stories.map((s) =>
        [s.title, s.language, s.knowledgeType, s.analysis?.summary || '', s.community || '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'stories.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported stories as CSV');
  };

  return (
    <div className="page-container space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('stories')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Folktales, histories &amp; indigenous knowledge</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 h-9 hidden sm:flex" onClick={exportStories}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5 h-9 hidden sm:flex"
            onClick={() => { reset(SAMPLE_STORIES[0]); setSampleIdx(0); setOpen(true); }}
          >
            ✨ Try Sample
          </Button>
          <Button onClick={() => setOpen(true)} className="gradient-brand text-white border-0 gap-2 h-9">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('addStory')}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="filter-panel">
        {/* Language row */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="section-label w-14 shrink-0">Language</span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
            {['', ...SUPPORTED_LANGUAGES].map((lang) => (
              <button
                key={lang}
                className={`filter-chip shrink-0 ${langFilter === lang ? 'active' : ''}`}
                onClick={() => setLangFilter(lang)}
              >
                {lang ? `${LANG_EMOJI[lang] || ''} ${lang.charAt(0).toUpperCase() + lang.slice(1)}` : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-divider" />

        {/* Type row */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="section-label w-14 shrink-0">Type</span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
            {['', ...KNOWLEDGE_TYPES].map((type) => (
              <button
                key={type}
                className={`filter-chip shrink-0 ${typeFilter === type ? 'active' : ''}`}
                onClick={() => setTypeFilter(type)}
              >
                {type ? (TYPE_LABELS[type] || type) : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-divider" />

        {/* Sort + view + meta row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {!isLoading && (
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{stories.length}</span>
                {' '}{stories.length === 1 ? 'story' : 'stories'}
                {hasFilters && ' matched'}
              </span>
            )}
            {hasFilters && (
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-full hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                onClick={() => { setLangFilter(''); setTypeFilter(''); }}
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-36 text-xs gap-1">
                <SortAsc className="w-3 h-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-createdAt">Newest first</SelectItem>
                <SelectItem value="createdAt">Oldest first</SelectItem>
                <SelectItem value="-viewCount">Most viewed</SelectItem>
                <SelectItem value="title">A → Z</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground'}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground'}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stories */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 gap-3' : 'space-y-2.5'}>
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-base mb-1">No stories found</p>
          <p className="text-sm">
            {hasFilters ? 'Try adjusting your filters.' : 'Be the first to share indigenous knowledge.'}
          </p>
          {!hasFilters && (
            <button
              className="mt-3 text-sm text-primary hover:underline"
              onClick={() => { reset(SAMPLE_STORIES[0]); setSampleIdx(0); setOpen(true); }}
            >
              ✨ Load a sample story to try
            </button>
          )}
          {hasFilters && (
            <button
              className="mt-3 text-sm text-primary hover:underline"
              onClick={() => { setLangFilter(''); setTypeFilter(''); }}
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {stories.map((story) => <StoryCard key={story._id} story={story} />)}
        </div>
      ) : (
        <div className="space-y-2.5">
          {stories.map((story) => (
            <StoryListItem
              key={story._id}
              story={story}
              onDelete={(id, title) => setDeleteTarget({ id, title })}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold">Delete this story?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  &ldquo;{deleteTarget.title}&rdquo; will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Story Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Share Indigenous Knowledge</DialogTitle>
          </DialogHeader>
          {/* Sample data picker */}
          <div className="flex items-center gap-2 flex-wrap pt-1 pb-2 border-b border-border/50">
            <span className="text-xs text-muted-foreground shrink-0">Try a sample:</span>
            {SAMPLE_STORIES.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSampleIdx(i);
                  reset(SAMPLE_STORIES[i]);
                }}
                className={`filter-chip text-xs ${sampleIdx === i && Object.values(SAMPLE_STORIES[i]).some(v => v) ? 'active' : ''}`}
              >
                {s.title.split(' — ')[0]}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input {...register('title')} placeholder="e.g. The Tortoise and the Birds" />
              {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Language</label>
                <Controller name="language" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.language && <p className="text-destructive text-xs">{errors.language.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <Controller name="knowledgeType" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {KNOWLEDGE_TYPES.map((type) => <SelectItem key={type} value={type}>{TYPE_LABELS[type] || type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.knowledgeType && <p className="text-destructive text-xs">{errors.knowledgeType.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Content</label>
              <Textarea {...register('content')} placeholder="Share the story, history, or knowledge…" rows={7} />
              {errors.content && <p className="text-destructive text-xs">{errors.content.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Community <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input {...register('community')} placeholder="e.g. Yoruba, Kano" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Source <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input {...register('source')} placeholder="e.g. Elder Musa, oral tradition" />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
              <Button
                type="submit"
                className="flex-1 gradient-brand text-white border-0"
                disabled={isSubmitting || createMutation.isPending}
              >
                {createMutation.isPending ? 'Submitting…' : 'Submit Story'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
