'use client';

import { Suspense, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, EyeOff, Trash2, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { StructuredKnowledge } from '@/components/memory/StructuredKnowledge';
import { ProvenancePanel } from '@/components/memory/ProvenancePanel';
import { VerificationForm } from '@/components/memory/VerificationForm';
import { StatusBadge } from '@/components/memory/StatusBadge';
import { PipelineSteps, stagesFromJob } from '@/components/memory/PipelineSteps';
import api from '@/lib/api';
import { languageLabel, typeLabel, formatDate, apiErrorMessage, FIDELITY_SCALE } from '@/lib/knowledge';

function Panel({ title, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <h2 className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h2>
      {children}
    </section>
  );
}

function EditForm({ item, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: item.title || '',
    originalTranscript: item.originalTranscript || '',
    translation: item.translation || '',
    summary: item.summary || '',
    town: item.location?.town || '',
    state: item.location?.state || '',
    community: item.location?.community || '',
    isAnonymous: Boolean(item.isAnonymous),
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/knowledge/${item._id}`, {
        title: form.title,
        originalTranscript: form.originalTranscript,
        translation: form.translation,
        summary: form.summary,
        isAnonymous: form.isAnonymous,
        location: { town: form.town, state: form.state, community: form.community },
      });
      toast.success('Your corrections were saved');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border-2 border-primary/30 p-5">
      <p className="font-serif text-lg font-semibold">Edit your contribution</p>
      <label className="block space-y-1"><span className="text-sm font-medium">Title</span>
        <Input value={form.title} onChange={set('title')} maxLength={300} required minLength={3} />
      </label>
      <label className="block space-y-1"><span className="text-sm font-medium">Original transcript ({languageLabel(item.language)})</span>
        <Textarea value={form.originalTranscript} onChange={set('originalTranscript')} rows={6} required />
      </label>
      <label className="block space-y-1"><span className="text-sm font-medium">English translation</span>
        <Textarea value={form.translation} onChange={set('translation')} rows={6} />
      </label>
      <label className="block space-y-1"><span className="text-sm font-medium">Summary</span>
        <Textarea value={form.summary} onChange={set('summary')} rows={3} maxLength={2000} />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Town</span><Input value={form.town} onChange={set('town')} maxLength={120} /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">State</span><Input value={form.state} onChange={set('state')} maxLength={60} /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Community</span><Input value={form.community} onChange={set('community')} maxLength={120} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isAnonymous} onChange={set('isAnonymous')} className="h-4 w-4 accent-[var(--color-primary)]" />
        Show this contribution anonymously
      </label>
      {item.verificationStatus === 'VERIFIED' && (
        <p className="text-xs text-muted-foreground">Changing the content of a verified record sends it back for moderator verification.</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Save changes</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function DetailView() {
  const { id } = useParams();
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(params.get('edit') === '1');
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['knowledge-item', id],
    queryFn: () => api.get(`/knowledge/${id}`).then((r) => r.data.data),
  });

  if (isLoading) return <div className="max-w-6xl mx-auto space-y-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;
  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <p className="font-serif text-xl font-semibold">Record not available</p>
        <p className="mt-2 text-sm text-muted-foreground">{apiErrorMessage(error)}</p>
        <Link href="/knowledge"><Button variant="outline" className="mt-4">Back to the library</Button></Link>
      </div>
    );
  }

  const { item, provenance, reviews, permissions } = data;
  const refresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['knowledge-library'] });
  };

  const withdraw = async () => {
    if (!window.confirm('Withdraw this contribution? It will be hidden from the library but kept in My Contributions.')) return;
    setBusy(true);
    try {
      await api.post(`/knowledge/${item._id}/withdraw`);
      toast.success('Contribution withdrawn');
      refresh();
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm('Permanently delete this contribution and its recording? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api.delete(`/knowledge/${item._id}`);
      toast.success('Contribution deleted');
      queryClient.invalidateQueries({ queryKey: ['knowledge-library'] });
      router.push('/contributions');
    } catch (err) { toast.error(apiErrorMessage(err)); setBusy(false); }
  };

  const needsContributorReview = permissions.canEdit && item.verificationStatus === 'AI_PROCESSED' && !item.isWithdrawn;
  const canModerate = permissions.canVerify && item.verificationStatus !== 'VERIFIED' && !item.isWithdrawn;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link href="/knowledge" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Knowledge Library
      </Link>

      <header className="border-b border-border pb-5 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <span>{languageLabel(item.language)}</span><span>·</span><span>{typeLabel(item.knowledgeType)}</span>
          <span>·</span><span>Recorded {formatDate(item.recordedAt)}</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold">{item.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <StatusBadge status={item.verificationStatus} />
          {item.location?.label && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{item.location.label}</span>}
          <span>Contributed by {item.contributorName}</span>
          {item.isWithdrawn && <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Withdrawn — hidden from library</span>}
        </div>
        {permissions.canEdit && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}><Pencil /> {editing ? 'Close editor' : 'Edit'}</Button>
            {!item.isWithdrawn && <Button variant="outline" size="sm" onClick={withdraw} disabled={busy}><EyeOff /> Withdraw</Button>}
            {permissions.canDelete && <Button variant="destructive" size="sm" onClick={remove} disabled={busy}><Trash2 /> Delete</Button>}
          </div>
        )}
      </header>

      {item.audioUrl && (
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground mb-2">Original recording · {languageLabel(item.language)}</p>
          <audio controls src={item.audioUrl} className="w-full" preload="metadata" />
        </div>
      )}

      {editing && <EditForm item={item} onSaved={() => { setEditing(false); refresh(); }} onCancel={() => setEditing(false)} />}

      {needsContributorReview && (
        <div className="rounded-xl border-2 border-primary/30 p-5">
          <VerificationForm itemId={item._id} lang={item.language === 'hausa' ? 'hausa' : 'english'} onDone={refresh} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <main className="min-w-0">
          <StructuredKnowledge item={item} linkChips />
        </main>

        <aside className="space-y-4">
          <Panel title="Source & provenance"><ProvenancePanel item={item} provenance={provenance} /></Panel>

          {provenance?.pipeline?.steps && (
            <Panel title="N-ATLAS processing">
              <PipelineSteps
                stages={stagesFromJob(provenance.pipeline, {
                  recorded: true,
                  reviewed: item.reviewCount > 0,
                  published: ['HUMAN_REVIEWED', 'VERIFIED'].includes(item.verificationStatus) && !item.isWithdrawn,
                })}
              />
            </Panel>
          )}

          <Panel title={`Human reviews (${reviews.length})`}>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one has reviewed this record yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {reviews.map((r) => (
                  <li key={r._id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{r.reviewerName} <span className="text-xs font-normal text-muted-foreground">· {r.reviewerRole}</span></span>
                      <span className="font-mono text-xs">{r.fidelityScore}/5</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {FIDELITY_SCALE.find((f) => f.score === r.fidelityScore)?.en}
                      {r.decision !== 'reviewed' && ` · ${r.decision}`} · {formatDate(r.reviewedAt)}
                    </p>
                    {r.correctionText && <p className="mt-1 text-xs border-l-2 border-border pl-2">{r.correctionText}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {canModerate && (
            <Panel title="Moderator verification">
              <VerificationForm itemId={item._id} mode="moderator" compact onDone={refresh} />
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function KnowledgeDetailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-6xl mx-auto rounded-xl" />}>
      <DetailView />
    </Suspense>
  );
}
