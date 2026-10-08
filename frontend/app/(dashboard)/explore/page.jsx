'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight, ChevronDown, MapPin, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { languageLabel, typeLabel, apiErrorMessage, CONTRIBUTION_LANGUAGES } from '@/lib/knowledge';
import { cn } from '@/lib/utils';

function LocationNode({ loc, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <MapPin className="w-4 h-4 text-primary" />
        <span className="font-serif text-lg font-semibold flex-1">{loc.name}</span>
        <span className="text-xs text-muted-foreground">
          {loc.languages.map(languageLabel).join(', ')} · {loc.count} record{loc.count === 1 ? '' : 's'}
        </span>
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          <ul className="ml-2 border-l border-border pl-4 space-y-3">
            {loc.types.map((t) => (
              <li key={t.type} className="relative">
                <span className="absolute -left-4 top-2.5 w-3 border-t border-border" aria-hidden />
                <p className="text-sm font-medium">
                  {typeLabel(t.type)} <span className="text-xs font-normal text-muted-foreground">({t.items.length})</span>
                </p>
                <ul className="ml-2 mt-1 border-l border-border pl-4 space-y-1">
                  {t.items.slice(0, 8).map((it) => (
                    <li key={it._id} className="relative text-sm">
                      <span className="absolute -left-4 top-2.5 w-3 border-t border-border" aria-hidden />
                      <Link href={`/knowledge/${it._id}`} className="text-muted-foreground hover:text-primary">{it.title}</Link>
                    </li>
                  ))}
                  {t.items.length > 8 && (
                    <li className="text-xs">
                      <Link href={`/knowledge?location=${encodeURIComponent(loc.name)}&knowledgeType=${t.type}`} className="text-primary hover:underline">
                        +{t.items.length - 8} more
                      </Link>
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
          {loc.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {loc.topics.map((tp) => (
                <Link key={tp.name} href={`/knowledge?topic=${encodeURIComponent(tp.name)}`} className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs hover:bg-muted">
                  {tp.name} <span className="text-muted-foreground">{tp.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Facet({ title, items, hrefFor, empty = 'None yet' }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 10).map((x) => (
            <li key={x.name} className="flex items-center justify-between gap-2 text-sm">
              {hrefFor ? <Link href={hrefFor(x.name)} className="truncate hover:text-primary">{x.name}</Link> : <span className="truncate">{x.name}</span>}
              <span className="font-mono text-xs text-muted-foreground">{x.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ExploreView() {
  const params = useSearchParams();
  const focus = params.get('location');
  const [language, setLanguage] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge-explore', language],
    queryFn: () => api.get(`/knowledge/explore${language ? `?language=${language}` : ''}`).then((r) => r.data.data),
  });

  const locations = data?.locations || [];
  const ordered = focus ? [...locations].sort((a, b) => (a.name === focus ? -1 : b.name === focus ? 1 : 0)) : locations;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Knowledge Explorer</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">How the knowledge connects</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Places, traditions, people and proverbs drawn from reviewed community contributions.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {[{ value: '', label: 'All' }, ...CONTRIBUTION_LANGUAGES.filter((l) => l.enabled)].map((l) => (
            <button
              key={l.value}
              onClick={() => setLanguage(l.value)}
              className={cn('rounded-md px-3 py-1 text-sm', language === l.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]"><Skeleton className="h-96 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{apiErrorMessage(error)}</div>
      ) : data.totalItems === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Network className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 font-medium">Nothing to connect yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Relationships appear as reviewed contributions are added.</p>
          <Link href="/contribute"><Button className="mt-4">Contribute knowledge</Button></Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <ul className="space-y-3">
            {ordered.map((loc, i) => (
              <LocationNode key={loc.name} loc={loc} defaultOpen={focus ? loc.name === focus : i < 2} />
            ))}
          </ul>

          <aside className="space-y-4">
            <Facet title="Languages" items={data.facets.languages.map((l) => ({ ...l, name: languageLabel(l.name) }))} />
            <Facet title="Topics" items={data.facets.topics} hrefFor={(t) => `/knowledge?topic=${encodeURIComponent(t)}`} />
            <Facet title="People" items={data.facets.people} hrefFor={(p) => `/knowledge?person=${encodeURIComponent(p)}`} empty="No named people yet" />
            <Facet title="Places mentioned" items={data.facets.places} hrefFor={(p) => `/knowledge?place=${encodeURIComponent(p)}`} />
            <Facet title="Cultural concepts" items={data.facets.culturalConcepts} />

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Proverbs</h2>
              {data.facets.proverbs.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.facets.proverbs.slice(0, 6).map((p, i) => (
                    <li key={i} className="border-l-2 border-primary pl-2.5">
                      <Link href={`/knowledge/${p.item._id}`} className="font-serif italic text-sm hover:text-primary">“{p.text}”</Link>
                      {p.translation && <p className="text-xs text-muted-foreground">{p.translation}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(data.facets.occupations.length > 0 || data.facets.traditions.length > 0) && (
              <section className="rounded-xl border border-border bg-card p-4 space-y-3">
                {[['Occupations & crafts', data.facets.occupations], ['Traditions', data.facets.traditions]].map(([title, list]) =>
                  list.length ? (
                    <div key={title}>
                      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</h2>
                      <ul className="space-y-1">
                        {list.slice(0, 6).map((x) => (
                          <li key={x._id} className="text-sm">
                            <Link href={`/knowledge/${x._id}`} className="hover:text-primary">{x.title}</Link>
                            <span className="text-xs text-muted-foreground"> · {x.place}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null
                )}
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-6xl mx-auto rounded-xl" />}>
      <ExploreView />
    </Suspense>
  );
}
