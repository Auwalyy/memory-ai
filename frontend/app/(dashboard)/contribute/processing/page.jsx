'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, RotateCcw, AlertCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineSteps, stagesFromJob } from '@/components/memory/PipelineSteps';
import { StructuredKnowledge } from '@/components/memory/StructuredKnowledge';
import { VerificationForm } from '@/components/memory/VerificationForm';
import { StatusBadge } from '@/components/memory/StatusBadge';
import { useContributionPipeline } from '@/hooks/useContributionPipeline';
import { languageLabel, typeLabel } from '@/lib/knowledge';

function ProcessingView() {
  const params = useSearchParams();
  const router = useRouter();
  const pipeline = useContributionPipeline(params.get('job'));
  const [reviewedItem, setReviewedItem] = useState(null);

  const { job, isDone } = pipeline;
  const item = reviewedItem || pipeline.item;
  const reviewed = Boolean(reviewedItem) || ['HUMAN_REVIEWED', 'VERIFIED'].includes(item?.verificationStatus);
  const stages = stagesFromJob(job, { recorded: true, reviewed, published: reviewed });

  if (!params.get('job')) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">No contribution is being processed.</p>
        <Link href="/contribute"><Button className="mt-4">Contribute knowledge</Button></Link>
      </div>
    );
  }

  const retry = async () => {
    const id = await pipeline.retry();
    if (id) router.replace(`/contribute/processing?job=${id}`);
  };

  return (
    <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="lg:sticky lg:top-8 self-start space-y-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">N-ATLAS pipeline</p>
          {job && (
            <p className="text-sm mt-1">
              {languageLabel(job.language)} · {typeLabel(job.knowledgeType)}
            </p>
          )}
        </div>
        {job ? <PipelineSteps stages={stages} /> : <Skeleton className="h-80 rounded-xl" />}
      </aside>

      <main className="min-w-0 space-y-6">
        {pipeline.jobError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{pipeline.jobError}</div>
        )}

        {!isDone && !pipeline.jobError && (
          <div className="rounded-xl border border-border p-8 text-center">
            <p className="font-serif text-xl font-semibold">N-ATLAS is processing your contribution</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Transcribing the recording, translating it, and extracting the cultural knowledge it contains.
              This usually takes under a minute.
            </p>
          </div>
        )}

        {job?.status === 'failed' && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
            <p className="flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="w-5 h-5" /> Processing failed</p>
            <p className="mt-1 text-sm text-muted-foreground">{job.error}</p>
            <p className="mt-1 text-sm text-muted-foreground">Your recording is saved. You can try processing it again.</p>
            <Button className="mt-4" onClick={retry}><RotateCcw /> Retry N-ATLAS processing</Button>
          </div>
        )}

        {item && (
          <>
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.verificationStatus} />
                <span className="text-xs text-muted-foreground">{item.location?.label}</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold">{item.title}</h1>
            </header>

            {item.audioUrl && <audio controls src={item.audioUrl} className="w-full" />}

            <StructuredKnowledge item={item} />

            <div className="rounded-xl border-2 border-primary/30 bg-card p-5">
              {reviewed ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 font-serif text-xl font-semibold">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" /> Saved to the Knowledge Library
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Thank you. Your review has been recorded and the contribution is now searchable, with its source and
                    provenance. A moderator may verify it later.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/knowledge/${item._id}`}><Button>Open in library</Button></Link>
                    <Link href="/contribute"><Button variant="outline">Contribute another</Button></Link>
                    <Link href="/search"><Button variant="outline">Search the archive</Button></Link>
                  </div>
                </div>
              ) : (
                <>
                  <VerificationForm itemId={item._id} lang={item.language === 'hausa' ? 'hausa' : 'english'} onDone={setReviewedItem} />
                  <p className="mt-4 text-xs text-muted-foreground">
                    Need to fix the transcript or translation directly?{' '}
                    <Link href={`/knowledge/${item._id}?edit=1`} className="text-primary hover:underline inline-flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Edit the record
                    </Link>
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-5xl mx-auto rounded-xl" />}>
      <ProcessingView />
    </Suspense>
  );
}
