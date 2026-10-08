'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { languageLabel, typeLabel, formatMs, formatDate, STATUS_META, apiErrorMessage } from '@/lib/knowledge';
import { cn } from '@/lib/utils';

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl font-bold tabular-nums">{value ?? '—'}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Single-series horizontal bars: one hue, value labels in text ink, hover title per bar. */
function Bars({ title, rows, format = (v) => v, labelFor = (r) => r.name }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={labelFor(r)} className="grid grid-cols-[110px_1fr_40px] items-center gap-2 text-sm" title={`${labelFor(r)}: ${format(r.count)}`}>
              <span className="truncate text-muted-foreground">{labelFor(r)}</span>
              <span className="h-3 rounded-r-[4px] bg-muted">
                <span className="block h-3 rounded-r-[4px] bg-primary" style={{ width: `${(r.count / max) * 100}%`, minWidth: r.count ? 2 : 0 }} />
              </span>
              <span className="text-right font-mono text-xs tabular-nums">{format(r.count)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StepRow({ label, success, failed, skipped, avgMs }) {
  const total = success + failed;
  const rate = total ? Math.round((success / total) * 100) : null;
  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-3 text-sm">{label}</td>
      <td className="py-2 px-3 text-right font-mono text-sm tabular-nums">{success}</td>
      <td className={cn('py-2 px-3 text-right font-mono text-sm tabular-nums', failed > 0 && 'text-destructive')}>{failed}</td>
      <td className="py-2 px-3 text-right font-mono text-sm tabular-nums text-muted-foreground">{skipped ?? '—'}</td>
      <td className="py-2 px-3 text-right font-mono text-sm tabular-nums">{rate == null ? '—' : `${rate}%`}</td>
      <td className="py-2 pl-3 text-right font-mono text-sm tabular-nums">{formatMs(avgMs)}</td>
    </tr>
  );
}

const PROVIDER_LABEL = { 'n-atlas': 'N-ATLAS', 'gemma-fallback': 'Gemma (dev fallback)', mongodb: 'MongoDB', embedding: 'Embeddings', 'contributor-text': 'Typed text' };

export default function AnalyticsPage() {
  const { user } = useAuth();
  const canExport = ['admin', 'moderator'].includes(user?.role);
  const [exporting, setExporting] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['naic-analytics'],
    queryFn: () => api.get('/analytics').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const download = async (format) => {
    setExporting(format);
    try {
      const res = await api.get(`/analytics/export?format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memoryai-validation-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) return <div className="max-w-6xl mx-auto grid gap-4 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (error) return <div className="max-w-6xl mx-auto rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{apiErrorMessage(error)}</div>;

  const { totals, fidelity, natlas } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Evaluation</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Validation dashboard</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Real-world evidence from community contributions: how N-ATLAS performs, and how faithful people judge the results to be.
          </p>
        </div>
        {canExport && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => download('csv')} disabled={Boolean(exporting)}>
              {exporting === 'csv' ? <Loader2 className="animate-spin" /> : <Download />} CSV
            </Button>
            <Button variant="outline" onClick={() => download('json')} disabled={Boolean(exporting)}>
              {exporting === 'json' ? <Loader2 className="animate-spin" /> : <Download />} JSON
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Total contributions" value={totals.contributions} hint={`${totals.contributionsWithAudio} with audio`} />
        <Stat label="Audio preserved" value={`${totals.audioMinutes} min`} />
        <Stat label="Average Cultural Fidelity" value={fidelity.average != null ? `${fidelity.average.toFixed(2)} / 5` : '—'} hint={`${fidelity.reviews} human ratings`} />
        <Stat label="Avg. N-ATLAS processing" value={formatMs(natlas.avgProcessingMs)} hint="recording → structured record" />
        <Stat label="Verified" value={totals.verified} />
        <Stat label="Human reviewed" value={totals.humanReviewed} />
        <Stat label="Pending reviews" value={totals.pendingReviews} />
        <Stat
          label="Correction rate"
          value={fidelity.correctionRate != null ? `${Math.round(fidelity.correctionRate * 100)}%` : '—'}
          hint="reviews rated ≤ 3 or with corrections"
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">N-ATLAS processing</h2>
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">Stage</th>
              <th className="py-1.5 px-3 font-medium text-right">Succeeded</th>
              <th className="py-1.5 px-3 font-medium text-right">Failed</th>
              <th className="py-1.5 px-3 font-medium text-right">Skipped</th>
              <th className="py-1.5 px-3 font-medium text-right">Success rate</th>
              <th className="py-1.5 pl-3 font-medium text-right">Avg time</th>
            </tr>
          </thead>
          <tbody>
            <StepRow label="ASR (speech → transcript)" {...natlas.asr} />
            <StepRow label="Translation" success={natlas.translation.success} failed={natlas.translation.failed} avgMs={natlas.translation.avgMs} />
            <StepRow label="Knowledge extraction" success={natlas.extraction.success} failed={natlas.extraction.failed} avgMs={natlas.extraction.avgMs} />
            <StepRow label="Whole pipeline" success={natlas.jobs.completed} failed={natlas.jobs.failed} avgMs={natlas.avgProcessingMs} />
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">
          LLM processing successful in {natlas.llm.success} of {natlas.jobs.total} runs. Skipped ASR = typed contributions.
        </p>
        {natlas.providers.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Models used:{' '}
            {natlas.providers
              .filter((p) => ['asr', 'translation', 'extraction'].includes(p.step))
              .map((p) => `${p.step}: ${PROVIDER_LABEL[p.provider] || p.provider}${p.model ? ` (${p.model})` : ''} ×${p.count}`)
              .join(' · ')}
          </p>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Bars title="Cultural Fidelity ratings" rows={fidelity.distribution.map((d) => ({ name: `${d.score}`, count: d.count }))} labelFor={(r) => `Score ${r.name}`} />
        <Bars title="Languages" rows={data.languages} labelFor={(r) => languageLabel(r.name)} />
        <Bars title="Verification status" rows={data.verification} labelFor={(r) => STATUS_META[r.name]?.label || r.name} />
      </div>

      <Bars title="Knowledge types" rows={data.knowledgeTypes} labelFor={(r) => typeLabel(r.name)} />

      <section className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent processing runs</h2>
        {data.recentJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-3 font-medium">Date</th>
                <th className="py-1.5 px-3 font-medium">Language</th>
                <th className="py-1.5 px-3 font-medium">Type</th>
                <th className="py-1.5 px-3 font-medium">Steps</th>
                <th className="py-1.5 px-3 font-medium">Status</th>
                <th className="py-1.5 pl-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentJobs.map((j) => (
                <tr key={j._id} className="border-t border-border">
                  <td className="py-2 pr-3 text-muted-foreground">{formatDate(j.createdAt)}</td>
                  <td className="py-2 px-3">{languageLabel(j.language)}</td>
                  <td className="py-2 px-3">{typeLabel(j.knowledgeType)}</td>
                  <td className="py-2 px-3 font-mono text-xs">
                    {j.steps.map((s) => (
                      <span key={s.name} className={cn('mr-1.5', s.status === 'failed' && 'text-destructive', s.status === 'skipped' && 'text-muted-foreground')}>
                        {s.name}:{s.status === 'completed' ? '✓' : s.status === 'failed' ? '✗' : s.status === 'skipped' ? '–' : '…'}
                      </span>
                    ))}
                  </td>
                  <td className={cn('py-2 px-3', j.status === 'failed' && 'text-destructive')} title={j.error || ''}>{j.status}</td>
                  <td className="py-2 pl-3 text-right font-mono text-xs">{formatMs(j.totalDurationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {!canExport && <p className="text-xs text-muted-foreground">CSV/JSON validation exports are available to moderators and admins.</p>}
    </div>
  );
}
