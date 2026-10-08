'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, RotateCcw, AlertCircle, ExternalLink, Loader2, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContributionForm } from '@/components/memory/ContributionForm';
import { PipelineSteps, stagesFromJob } from '@/components/memory/PipelineSteps';
import { StructuredKnowledge } from '@/components/memory/StructuredKnowledge';
import { VerificationForm } from '@/components/memory/VerificationForm';
import { StatusBadge } from '@/components/memory/StatusBadge';
import { useContributionPipeline } from '@/hooks/useContributionPipeline';
import api from '@/lib/api';
import { PRINCIPLE, languageLabel, typeLabel } from '@/lib/knowledge';
import { cn } from '@/lib/utils';

function Dot({ ok }) {
  return <span className={cn('inline-block w-2 h-2 rounded-full', ok ? 'bg-emerald-500' : 'bg-destructive')} />;
}

function NatlasStatus() {
  const { data } = useQuery({
    queryKey: ['natlas-status'],
    queryFn: () => api.get('/natlas/status').then((r) => r.data.data),
    staleTime: 60000,
  });
  if (!data) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
      <span className="inline-flex items-center gap-1.5"><Dot ok={data.asr.configured} /> ASR {data.asr.model}</span>
      <span className="inline-flex items-center gap-1.5">
        <Dot ok={data.llm.configured} /> LLM {data.llm.model}
        {data.llm.fallback && <span className="text-amber-600">(dev fallback: {data.llm.fallback})</span>}
      </span>
    </div>
  );
}

export default function DemoPage() {
  const pipeline = useContributionPipeline();
  const [reviewedItem, setReviewedItem] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const { job, isDone, uploading } = pipeline;
  const item = reviewedItem || pipeline.item;
  const reviewed = Boolean(reviewedItem);
  const started = uploading || Boolean(job);
  const stages = stagesFromJob(job, { recorded: started, uploading, reviewed, published: reviewed });

  useEffect(() => {
    if (pipeline.error) toast.error(pipeline.error, { id: 'demo-error' });
  }, [pipeline.error]);

  const restart = () => {
    pipeline.reset();
    setReviewedItem(null);
    setFormKey((k) => k + 1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="border-b border-border pb-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">NAIC · PS2 Voice-First Access</p>
            <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-bold">MemoryAI — N-ATLAS Voice Preservation Demo</h1>
            <p className="mt-2 text-muted-foreground">Our Stories, Our Languages, Our Memory. <span className="italic">{PRINCIPLE}</span></p>
          </div>
          <NatlasStatus />
        </div>
      </header>

      <PipelineSteps stages={stages} orientation="horizontal" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Left: record */}
        <section className="rounded-xl border border-border bg-card p-5 self-start">
          {!started ? (
            <ContributionForm key={formKey} onSubmit={pipeline.submit} submitting={uploading} compact />
          ) : (
            <div className="space-y-4">
              <p className="font-serif text-lg font-semibold">Contribution submitted</p>
              {job && (
                <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Language</dt><dd>{languageLabel(job.language)}</dd>
                  <dt className="text-muted-foreground">Type</dt><dd>{typeLabel(job.knowledgeType)}</dd>
                  <dt className="text-muted-foreground">Session</dt><dd className="font-mono text-xs truncate">{job.sessionId}</dd>
                  <dt className="text-muted-foreground">Pipeline</dt><dd>{job.status}{job.totalDurationMs ? ` · ${(job.totalDurationMs / 1000).toFixed(1)} s` : ''}</dd>
                </dl>
              )}
              {item?.audioUrl && <audio controls src={item.audioUrl} className="w-full" />}
              <Button variant="outline" onClick={restart} disabled={uploading}><RotateCcw /> Record another</Button>
            </div>
          )}
        </section>

        {/* Right: live results */}
        <section className="min-w-0 space-y-5">
          {!started && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <CircleDot className="w-8 h-8 mx-auto opacity-40" />
              <p className="mt-3 font-medium text-foreground">Results appear here, step by step</p>
              <p className="mt-1 text-sm">
                Record a Hausa story, proverb or tradition on the left. N-ATLAS will transcribe it, understand it and
                structure it — and nothing is published until a person confirms it is accurate.
              </p>
            </div>
          )}

          {started && !isDone && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
              <p className="text-sm">
                {uploading ? 'Uploading the recording…' : `N-ATLAS is working: ${stages.find((s) => s.status === 'running')?.title || 'starting'}…`}
              </p>
            </div>
          )}

          {job?.status === 'failed' && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
              <p className="flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="w-5 h-5" /> Processing failed</p>
              <p className="mt-1 text-sm text-muted-foreground">{job.error}</p>
              <Button className="mt-3" onClick={pipeline.retry}><RotateCcw /> Retry</Button>
            </div>
          )}

          {item && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.verificationStatus} />
                {item.location?.label && <span className="text-xs text-muted-foreground">{item.location.label}</span>}
              </div>
              <h2 className="font-serif text-2xl font-bold">{item.title}</h2>
              <StructuredKnowledge item={item} />

              <div className="rounded-xl border-2 border-primary/30 bg-card p-5">
                {reviewed ? (
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 font-serif text-xl font-semibold">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" /> Published to the Knowledge Library
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fidelity rated {item.fidelityScore}/5 by the contributor. The record is now searchable with full provenance.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/knowledge/${item._id}`} target="_blank"><Button><ExternalLink /> Open record & provenance</Button></Link>
                      <Link href="/search" target="_blank"><Button variant="outline">Search the archive</Button></Link>
                    </div>
                  </div>
                ) : (
                  <VerificationForm itemId={item._id} lang={item.language === 'hausa' ? 'hausa' : 'english'} onDone={setReviewedItem} />
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
