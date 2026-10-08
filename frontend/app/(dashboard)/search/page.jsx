'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Sparkles, Database, MapPin, Headphones, ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/memory/StatusBadge';
import api from '@/lib/api';
import { CONTRIBUTION_LANGUAGES, languageLabel, typeLabel, apiErrorMessage } from '@/lib/knowledge';

const EXAMPLES = [
  'What traditional marriage practices are mentioned in Kano?',
  'Wane karin magana ne ake faɗi game da haƙuri?',
  'How is leather prepared in traditional crafts?',
  'Labaran tarihi na garin Zariya',
];

/** Turn "[1][3]" citations into links to the matching source cards. */
function CitedAnswer({ text }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        return m ? (
          <a key={i} href={`#source-${m[1]}`} className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-primary/10 px-1 text-[11px] font-mono text-primary hover:bg-primary/20">
            {m[1]}
          </a>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </p>
  );
}

function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get('q') || '';
  const language = params.get('language') || '';
  const [input, setInput] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  // Keep the input in sync when the URL changes (examples, back/forward)
  if (q !== prevQ) {
    setPrevQ(q);
    setInput(q);
  }

  const run = (nextQ, nextLang = language) => {
    const sp = new URLSearchParams();
    if (nextQ) sp.set('q', nextQ);
    if (nextLang) sp.set('language', nextLang);
    router.push(`${pathname}?${sp}`);
  };

  const { data, isFetching, error } = useQuery({
    queryKey: ['knowledge-search', q, language],
    enabled: q.trim().length >= 2,
    queryFn: () => {
      const sp = new URLSearchParams({ q, answer: 'true' });
      if (language) sp.set('language', language);
      return api.get(`/knowledge/search?${sp}`).then((r) => r.data.data);
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="border-b border-border pb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Search</p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Ask the community archive</h1>
        <p className="mt-2 text-muted-foreground">
          Answers come only from knowledge Nigerians have contributed. MemoryAI first finds matching records, then
          N-ATLAS summarises those records — with citations you can open.
        </p>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); run(input.trim()); }} className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask in Hausa or English…"
              className="h-11 pl-9 text-base"
              maxLength={300}
              aria-label="Search question"
            />
          </div>
          <Button type="submit" size="lg" className="h-11 px-5" disabled={input.trim().length < 2}>Search</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Source language"
            value={language}
            onChange={(e) => run(q, e.target.value)}
            className="h-7 rounded-md border border-input bg-transparent px-2 text-xs dark:bg-input/30"
          >
            <option value="">Sources in all languages</option>
            {CONTRIBUTION_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label} sources</option>)}
          </select>
        </div>
      </form>

      {!q && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try asking</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => run(ex)} className="rounded-lg border border-border p-3 text-left text-sm hover:border-primary/50 hover:bg-muted/40">
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {q && isFetching && (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      )}

      {error && <div className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{apiErrorMessage(error)}</div>}

      {data && !isFetching && (
        <div className="space-y-6">
          {data.sources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Database className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="mt-3 font-medium">No community contributions match this question yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                MemoryAI does not generate answers without sources. If you hold this knowledge, consider preserving it.
              </p>
              <Link href="/contribute"><Button className="mt-4">Contribute knowledge</Button></Link>
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-primary" /> Summary from the archive
                  </p>
                  <p className="text-xs font-medium rounded-md bg-muted px-2 py-1">
                    {data.answer
                      ? `Based on ${data.basedOn} community contribution${data.basedOn === 1 ? '' : 's'}`
                      : `${data.totalMatches} matching contribution${data.totalMatches === 1 ? '' : 's'}`}
                  </p>
                </div>
                {data.answer ? (
                  <CitedAnswer text={data.answer} />
                ) : (
                  <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    {data.answerError || 'Read the matching sources below.'}
                  </p>
                )}
                {data.answerMeta && (
                  <p className="mt-3 text-[11px] text-muted-foreground font-mono">
                    Summarised by {data.answerMeta.provider === 'n-atlas' ? 'N-ATLAS' : data.answerMeta.provider} · {data.answerMeta.model}
                    {' · retrieval: '}{[data.retrieval.keyword && 'keyword', data.retrieval.semantic && 'semantic'].filter(Boolean).join(' + ')}
                  </p>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sources</h2>
                <ol className="space-y-3">
                  {data.sources.map((s) => (
                    <li key={s._id} id={`source-${s.index}`} className="scroll-mt-20 rounded-xl border border-border p-4 hover:border-primary/40">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs text-primary">{s.index}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                            <span>{languageLabel(s.language)}</span><span>·</span><span>{typeLabel(s.knowledgeType)}</span>
                          </div>
                          <Link href={`/knowledge/${s._id}`} className="font-serif text-lg font-semibold hover:text-primary">{s.title}</Link>
                          {s.snippet && <p className="mt-1 text-sm text-muted-foreground">“{s.snippet}”</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <StatusBadge status={s.verificationStatus} />
                            {s.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</span>}
                            <span>{s.contributorName}</span>
                            {s.hasAudio && <span className="inline-flex items-center gap-1"><Headphones className="w-3 h-3" /> audio</span>}
                            <Link href={`/knowledge/${s._id}#provenance`} className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
                              Open source <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        Searching the earlier story and proverb collection? Use the <Link href="/archive/search" className="text-primary hover:underline">text archive search</Link>.
      </p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-4xl mx-auto rounded-xl" />}>
      <SearchView />
    </Suspense>
  );
}
