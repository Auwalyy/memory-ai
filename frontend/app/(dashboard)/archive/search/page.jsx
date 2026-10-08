'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, BookOpen, Globe, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import api from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';

const LANGUAGE_COLORS = {
  hausa: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  yoruba: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  igbo: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
      aria-label="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [mode, setMode] = useState('text');
  const [langFilter, setLangFilter] = useState('hausa');
  const { t } = useTranslation();

  const { data: textResults, isLoading: textLoading } = useQuery({
    queryKey: ['search-text', submitted, langFilter],
    queryFn: () => {
      const params = new URLSearchParams({ q: submitted });
      if (langFilter) params.set('language', langFilter);
      return api.get(`/search?${params}`).then((r) => r.data.data);
    },
    enabled: !!submitted && mode === 'text',
  });

  const { data: semanticResults, isLoading: semanticLoading } = useQuery({
    queryKey: ['search-semantic', submitted, langFilter],
    queryFn: () => {
      const params = new URLSearchParams({ q: submitted });
      if (langFilter) params.set('language', langFilter);
      return api.get(`/search/semantic?${params}`).then((r) => r.data.data);
    },
    enabled: !!submitted && mode === 'semantic',
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) setSubmitted(query.trim());
  };

  const isLoading = mode === 'text' ? textLoading : semanticLoading;
  const results = mode === 'text' ? textResults : semanticResults;
  const totalResults = (results?.stories?.length || 0) + (results?.proverbs?.length || 0);

  return (
    <div className="page-container space-y-5">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('search')}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Search across all preserved indigenous knowledge</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder') || 'Search stories, proverbs, traditions…'}
            className="pl-10 h-11 text-sm sm:text-base"
            autoFocus
          />
        </div>
        <Button type="submit" className="gradient-brand text-white border-0 h-11 px-5 shrink-0">
          {t('searchBtn') || 'Search'}
        </Button>
      </form>

      {/* Mode toggle + language filter + meta */}
      <div className="filter-panel">
        <div className="flex items-center gap-3">
          <span className="section-label shrink-0">Mode</span>
          <div className="flex gap-1.5">
            <button
              className={`filter-chip ${mode === 'text' ? 'active' : ''}`}
              onClick={() => setMode('text')}
            >
              <Search className="w-3 h-3" />
              {t('textSearch') || 'Text Search'}
            </button>
            <button
              className={`filter-chip ${mode === 'semantic' ? 'active' : ''}`}
              onClick={() => setMode('semantic')}
            >
              <Sparkles className="w-3 h-3" />
              {t('semanticSearch') || 'Semantic (AI)'}
            </button>
          </div>
        </div>

        <div className="filter-divider" />

        <div className="flex items-center gap-3">
          <span className="section-label shrink-0">Language</span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {[['', 'All'], ['hausa', '🟢 Hausa'], ['english', '⚪ English'], ['yoruba', '🔵 Yoruba'], ['igbo', '🟣 Igbo']].map(([code, label]) => (
              <button
                key={code}
                className={`filter-chip shrink-0 ${langFilter === code ? 'active' : ''}`}
                onClick={() => setLangFilter(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {submitted && !isLoading && (
          <>
            <div className="filter-divider" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for &ldquo;{submitted}&rdquo;
              {mode === 'semantic' && <span className="ml-1 text-primary">· AI semantic match</span>}
            </p>
          </>
        )}
      </div>

      {/* Results */}
      {submitted && (
        <div className="space-y-3">
          {isLoading
            ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : (
              <>
                {results?.stories?.map((item) => (
                  <Link key={item._id} href={`/stories/${item._id}`} className="block group">
                    <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <BookOpen className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                                {item.title}
                              </h3>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.similarity && (
                                  <span className="text-xs text-primary font-medium">
                                    {Math.round(item.similarity * 100)}%
                                  </span>
                                )}
                                <Badge className={`text-xs ${LANGUAGE_COLORS[item.language] || ''}`}>
                                  {item.language}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.analysis?.summary || item['analysis.summary']}
                            </p>
                            {item.knowledgeType && (
                              <Badge variant="secondary" className="text-xs mt-1.5 h-5">{item.knowledgeType}</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {mode === 'text' && results?.proverbs?.map((proverb) => (
                  <Card key={proverb._id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Globe className="w-4 h-4 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm italic line-clamp-2">&quot;{proverb.text}&quot;</p>
                            <CopyBtn text={`"${proverb.text}" — ${proverb.meaning}`} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{proverb.meaning}</p>
                          <Badge className={`text-xs mt-1.5 ${LANGUAGE_COLORS[proverb.language] || ''}`}>
                            {proverb.language}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {!isLoading && !results?.stories?.length && !results?.proverbs?.length && (
                  <div className="text-center py-14 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="font-medium mb-1">No results found</p>
                    <p className="text-sm">Try different keywords or switch to semantic search.</p>
                  </div>
                )}
              </>
            )
          }
        </div>
      )}

      {!submitted && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p className="text-base font-medium mb-2">{t('searchEmptyTitle') || 'Search Nigerian Indigenous Knowledge'}</p>
          <p className="text-sm">{t('searchEmptyHint') || 'Try Hausa proverb, Yoruba folktale, or Igbo tradition'}</p>
        </div>
      )}
    </div>
  );
}
