'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Headphones, BookOpen, Network, FileSearch, MapPin, MicOff } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { languageLabel, typeLabel, formatDuration } from '@/lib/knowledge';

/**
 * Archive catalogue card for a knowledge item.
 */
export function KnowledgeCard({ item }) {
  const [listening, setListening] = useState(false);
  const place = item.location?.town || item.location?.state || item.location?.community;

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
        <span>{languageLabel(item.language)}</span>
        <span aria-hidden>·</span>
        <span>{typeLabel(item.knowledgeType)}</span>
      </div>

      <h3 className="mt-1.5 font-serif text-lg font-semibold leading-snug">
        <Link href={`/knowledge/${item._id}`} className="hover:text-primary">{item.title}</Link>
      </h3>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {item.location?.label && (
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location.label}</span>
        )}
        <span>{item.contributorName}</span>
      </div>

      <p className="mt-2.5 text-sm text-muted-foreground line-clamp-3 flex-1">
        {item.summary || 'No summary available.'}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusBadge status={item.verificationStatus} />
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {item.hasAudio ? (
            <><Headphones className="w-3 h-3" /> {item.audioDurationSec ? formatDuration(item.audioDurationSec) : 'Audio'}</>
          ) : (
            <><MicOff className="w-3 h-3" /> Text only</>
          )}
        </span>
      </div>

      {listening && item.audioUrl && (
        <audio controls autoPlay src={item.audioUrl} className="mt-3 w-full h-9" />
      )}

      <div className="mt-3 grid grid-cols-4 gap-1 border-t border-border pt-3 text-xs">
        <button
          type="button"
          onClick={() => setListening((v) => !v)}
          disabled={!item.audioUrl}
          className="flex flex-col items-center gap-1 rounded-md py-1.5 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Headphones className="w-4 h-4" /> {listening ? 'Hide' : 'Listen'}
        </button>
        <Link href={`/knowledge/${item._id}`} className="flex flex-col items-center gap-1 rounded-md py-1.5 hover:bg-muted">
          <BookOpen className="w-4 h-4" /> Read
        </Link>
        <Link
          href={place ? `/explore?location=${encodeURIComponent(place)}` : '/explore'}
          className="flex flex-col items-center gap-1 rounded-md py-1.5 hover:bg-muted"
        >
          <Network className="w-4 h-4" /> Explore
        </Link>
        <Link href={`/knowledge/${item._id}#provenance`} className="flex flex-col items-center gap-1 rounded-md py-1.5 hover:bg-muted">
          <FileSearch className="w-4 h-4" /> Source
        </Link>
      </div>
    </article>
  );
}
