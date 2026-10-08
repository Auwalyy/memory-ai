import Link from 'next/link';
import { Info, ShieldAlert } from 'lucide-react';
import { languageLabel } from '@/lib/knowledge';
import { cn } from '@/lib/utils';

function Section({ label, children, className }) {
  return (
    <section className={cn('space-y-1.5', className)}>
      <h3 className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
      {children}
    </section>
  );
}

function Chips({ items, hrefFor }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground italic">None mentioned in the source</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => {
        const chip = <span className="inline-block rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs">{x}</span>;
        return hrefFor ? <Link key={x} href={hrefFor(x)} className="hover:opacity-80">{chip}</Link> : <span key={x}>{chip}</span>;
      })}
    </div>
  );
}

/**
 * Renders an N-ATLAS-processed knowledge item: transcript, translation and
 * the extracted structure, with grounding/confidence notes.
 */
export function StructuredKnowledge({ item, showTranscripts = true, linkChips = false }) {
  if (!item) return null;
  const removed = item.natlas?.grounding?.removed || [];

  return (
    <div className="space-y-6">
      {showTranscripts && (
        <div className="grid gap-4 md:grid-cols-2">
          <Section label={`Original transcript · ${languageLabel(item.language)}`}>
            <blockquote className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap" lang={item.language === 'hausa' ? 'ha' : undefined}>
              {item.originalTranscript}
            </blockquote>
          </Section>
          <Section label="English translation">
            <div className="rounded-lg border border-border p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {item.translation || <span className="text-muted-foreground italic">No translation</span>}
            </div>
          </Section>
        </div>
      )}

      <Section label="AI summary">
        <p className="text-sm leading-relaxed">{item.summary || <span className="text-muted-foreground italic">No summary generated</span>}</p>
      </Section>

      <div className="grid gap-5 sm:grid-cols-2">
        <Section label="Topics">
          <Chips items={item.topics} hrefFor={linkChips ? (t) => `/knowledge?topic=${encodeURIComponent(t)}` : null} />
        </Section>
        <Section label="Places">
          <Chips items={item.places} hrefFor={linkChips ? (p) => `/knowledge?place=${encodeURIComponent(p)}` : null} />
        </Section>
        <Section label="People">
          <Chips items={item.people} hrefFor={linkChips ? (p) => `/knowledge?person=${encodeURIComponent(p)}` : null} />
        </Section>
        <Section label="Keywords">
          <Chips items={item.keywords} />
        </Section>
      </div>

      <Section label="Cultural concepts">
        {item.culturalConcepts?.length ? (
          <dl className="divide-y divide-border rounded-lg border border-border">
            {item.culturalConcepts.map((c) => (
              <div key={c.term} className="grid gap-1 p-3 sm:grid-cols-[180px_1fr]">
                <dt className="text-sm font-medium italic">{c.term}</dt>
                <dd className="text-sm text-muted-foreground">{c.meaning || '—'}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground italic">None identified</p>
        )}
      </Section>

      {item.proverbs?.length > 0 && (
        <Section label="Proverbs">
          <ul className="space-y-2">
            {item.proverbs.map((p) => (
              <li key={p.text} className="border-l-2 border-primary pl-3">
                <p className="font-serif text-base italic">“{p.text}”</p>
                {p.translation && <p className="text-sm text-muted-foreground">{p.translation}</p>}
                {p.meaning && <p className="text-xs text-muted-foreground mt-0.5">Meaning: {p.meaning}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(item.confidenceNotes?.length > 0 || removed.length > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-300">
            <Info className="w-3.5 h-3.5" /> Confidence notes
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs text-amber-900/90 dark:text-amber-200/90 space-y-0.5">
            {item.confidenceNotes?.map((n) => <li key={n}>{n}</li>)}
          </ul>
          {removed.length > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-900/90 dark:text-amber-200/90">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Removed as not present in the recording:{' '}
                {removed.map((r) => `${r.value} (${r.field})`).join(', ')}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
