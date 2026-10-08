'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, X, Mic, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { KnowledgeCard } from '@/components/memory/KnowledgeCard';
import api from '@/lib/api';
import { CONTRIBUTION_LANGUAGES, CONTRIBUTION_TYPES, apiErrorMessage } from '@/lib/knowledge';

const FILTER_KEYS = ['q', 'language', 'knowledgeType', 'status', 'location', 'topic', 'person', 'place'];

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

function LibraryView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']));
  const [q, setQ] = useState(filters.q);
  const [prevQ, setPrevQ] = useState(filters.q);
  // Keep the input in sync when the URL changes (back/forward, cleared filters)
  if (filters.q !== prevQ) {
    setPrevQ(filters.q);
    setQ(filters.q);
  }

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const query = useInfiniteQuery({
    queryKey: ['knowledge-library', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams({ page: String(pageParam), limit: '12' });
      FILTER_KEYS.forEach((k) => filters[k] && sp.set(k, filters[k]));
      return api.get(`/knowledge?${sp}`).then((r) => r.data);
    },
    getNextPageParam: (last) => (last.pagination?.hasNext ? last.pagination.page + 1 : undefined),
  });

  const items = query.data?.pages.flatMap((p) => p.data) || [];
  const total = query.data?.pages[0]?.pagination?.total ?? 0;
  const facetFilters = ['topic', 'person', 'place', 'location'].filter((k) => filters[k]);
  const anyFilter = FILTER_KEYS.some((k) => filters[k]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Knowledge Library</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Community voice archive</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Knowledge spoken by Nigerians in their own languages, processed by N-ATLAS and checked by people.
            Every record links back to its source recording.
          </p>
        </div>
        <Link href="/contribute"><Button size="lg"><Mic /> Contribute</Button></Link>
      </header>

      <div className="flex flex-col lg:flex-row gap-2">
        <form
          className="relative flex-1"
          onSubmit={(e) => { e.preventDefault(); setFilter('q', q.trim()); }}
        >
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by word: aure, Kano, leather…"
            className="pl-8"
            aria-label="Filter library"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Language" className={selectClass} value={filters.language} onChange={(e) => setFilter('language', e.target.value)}>
            <option value="">All languages</option>
            {CONTRIBUTION_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <select aria-label="Knowledge type" className={selectClass} value={filters.knowledgeType} onChange={(e) => setFilter('knowledgeType', e.target.value)}>
            <option value="">All types</option>
            {CONTRIBUTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.en}</option>)}
          </select>
          <select aria-label="Verification" className={selectClass} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">Reviewed & verified</option>
            <option value="VERIFIED">Verified only</option>
            <option value="HUMAN_REVIEWED">Human reviewed</option>
          </select>
        </div>
      </div>

      {(facetFilters.length > 0 || anyFilter) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {facetFilters.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k, '')}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs hover:bg-muted"
            >
              {k}: {filters[k]} <X className="w-3 h-3" />
            </button>
          ))}
          <button onClick={() => router.replace(pathname)} className="text-xs text-primary hover:underline">Clear all filters</button>
        </div>
      )}

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-destructive/40 p-6 text-sm text-destructive">{apiErrorMessage(query.error)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Archive className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 font-medium">{anyFilter ? 'No records match these filters' : 'The archive is waiting for its first voices'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {anyFilter ? 'Try removing a filter.' : 'Records appear here once a contributor has reviewed what N-ATLAS produced.'}
          </p>
          {!anyFilter && <Link href="/contribute"><Button className="mt-4"><Mic /> Record the first contribution</Button></Link>}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{total} record{total === 1 ? '' : 's'}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => <KnowledgeCard key={item._id} item={item} />)}
          </div>
          {query.hasNextPage && (
            <div className="text-center">
              <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        Looking for the earlier story, proverb and document collection? It is in the{' '}
        <Link href="/archive" className="text-primary hover:underline">text archive</Link>.
      </p>
    </div>
  );
}

export default function KnowledgeLibraryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-6xl mx-auto rounded-xl" />}>
      <LibraryView />
    </Suspense>
  );
}
