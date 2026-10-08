'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Mic, Search, Network, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { PRINCIPLE, formatMs } from '@/lib/knowledge';

/** Home-page summary of the N-ATLAS voice archive with primary actions. */
export function VoiceArchivePanel() {
  const { data } = useQuery({
    queryKey: ['naic-analytics'],
    queryFn: () => api.get('/analytics').then((r) => r.data.data),
  });

  const stats = [
    { label: 'Voice contributions', value: data?.totals.contributions },
    { label: 'Minutes of audio', value: data?.totals.audioMinutes },
    { label: 'Human reviewed / verified', value: data ? data.totals.humanReviewed + data.totals.verified : undefined },
    { label: 'Avg. fidelity', value: data?.fidelity.average != null ? `${data.fidelity.average.toFixed(1)}/5` : data ? '—' : undefined },
    { label: 'Avg. N-ATLAS time', value: data ? formatMs(data.natlas.avgProcessingMs) : undefined },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Our Stories, Our Languages, Our Memory</p>
          <h2 className="mt-1 font-serif text-2xl font-bold">Preserve knowledge by voice</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Speak in Hausa or English. N-ATLAS transcribes and structures it, you confirm it, and it becomes part of a
            searchable archive for future generations. <span className="italic">{PRINCIPLE}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link href="/contribute"><Button size="lg" className="w-full"><Mic /> Contribute</Button></Link>
          <Link href="/search"><Button size="lg" variant="outline" className="w-full"><Search /> Search</Button></Link>
          <Link href="/explore"><Button size="lg" variant="outline" className="w-full"><Network /> Explore</Button></Link>
          <Link href="/demo"><Button size="lg" variant="outline" className="w-full"><Presentation /> NAIC demo</Button></Link>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {stats.map((s) => (
          <div key={s.label} className="bg-card p-3">
            <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
            <dd className="mt-0.5 font-serif text-xl font-semibold tabular-nums">{s.value ?? '…'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
