import { Check, Loader2, X, Circle, Minus, AlertTriangle } from 'lucide-react';
import { formatMs } from '@/lib/knowledge';
import { cn } from '@/lib/utils';

const stepOf = (job, name) => job?.steps?.find((s) => s.name === name);

const combine = (...steps) => {
  const present = steps.filter(Boolean);
  if (!present.length) return 'pending';
  if (present.some((s) => s.status === 'running')) return 'running';
  if (present.some((s) => s.status === 'failed')) return 'failed';
  if (present.every((s) => s.status === 'completed' || s.status === 'skipped')) return 'completed';
  if (present.some((s) => s.status === 'completed')) return 'running';
  return 'pending';
};

const sumMs = (...steps) => {
  const done = steps.filter((s) => s?.durationMs != null && s.status !== 'pending');
  return done.length ? done.reduce((n, s) => n + s.durationMs, 0) : null;
};

/**
 * The six NAIC demo stages, derived from a ProcessingJob plus client state.
 * @param {object|null} job
 * @param {{ recorded?: boolean, reviewed?: boolean, published?: boolean, uploading?: boolean }} flags
 */
export function stagesFromJob(job, { recorded = false, reviewed = false, published = false, uploading = false } = {}) {
  const asr = stepOf(job, 'asr');
  const tr = stepOf(job, 'translation');
  const ex = stepOf(job, 'extraction');
  const save = stepOf(job, 'save');
  const emb = stepOf(job, 'embedding');
  const jobDone = job?.status === 'completed';

  const extractionFailed = ex?.status === 'failed';

  return [
    {
      key: 'record',
      title: 'Record knowledge',
      subtitle: 'Contributor speaks in their own language',
      status: job || recorded ? (uploading ? 'running' : 'completed') : 'pending',
      detail: uploading ? 'Uploading recording…' : null,
    },
    {
      key: 'asr',
      title: 'N-ATLAS speech recognition',
      subtitle: asr?.model || 'Hausa ASR',
      status: asr?.status === 'skipped' ? 'skipped' : asr?.status || 'pending',
      durationMs: asr?.status === 'completed' ? asr.durationMs : null,
      detail: asr?.status === 'skipped' ? 'Typed contribution — no audio' : asr?.error,
    },
    {
      key: 'understanding',
      title: 'N-ATLAS language understanding',
      subtitle: ex?.model || tr?.model || 'Translation + meaning',
      status: extractionFailed && tr?.status === 'completed' ? 'warning' : combine(tr, ex),
      durationMs: sumMs(tr, ex),
      detail: extractionFailed
        ? 'Structuring failed — transcript and translation kept for review'
        : tr?.error || (ex?.provider && ex.provider !== 'n-atlas' ? `Provider: ${ex.provider}` : null),
    },
    {
      key: 'structured',
      title: 'Structured cultural knowledge',
      subtitle: 'Grounded against the source, saved with provenance',
      status: combine(save, emb),
      durationMs: sumMs(save, emb),
      detail: emb?.status === 'skipped' ? 'Semantic index unavailable — keyword search used' : save?.error,
    },
    {
      key: 'verify',
      title: 'Human verification',
      subtitle: 'Contributor rates cultural fidelity',
      status: reviewed ? 'completed' : jobDone ? 'waiting' : 'pending',
    },
    {
      key: 'publish',
      title: 'Published to Knowledge Library',
      subtitle: 'Searchable, with source and provenance',
      status: published ? 'completed' : 'pending',
    },
  ];
}

const STATUS_ICON = {
  completed: { icon: Check, className: 'bg-emerald-600 text-white border-emerald-600' },
  running: { icon: Loader2, className: 'bg-background text-primary border-primary', spin: true },
  waiting: { icon: Circle, className: 'bg-primary/10 text-primary border-primary' },
  failed: { icon: X, className: 'bg-destructive text-white border-destructive' },
  warning: { icon: AlertTriangle, className: 'bg-amber-500 text-white border-amber-500' },
  skipped: { icon: Minus, className: 'bg-muted text-muted-foreground border-border' },
  pending: { icon: Circle, className: 'bg-background text-muted-foreground/40 border-border' },
};

/**
 * Vertical (default) or horizontal pipeline of stages.
 */
export function PipelineSteps({ stages, orientation = 'vertical', className }) {
  if (orientation === 'horizontal') {
    return (
      <ol className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2', className)}>
        {stages.map((s, i) => {
          const meta = STATUS_ICON[s.status] || STATUS_ICON.pending;
          const Icon = meta.icon;
          return (
            <li
              key={s.key}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                s.status === 'running' || s.status === 'waiting' ? 'border-primary bg-primary/5' : 'border-border bg-card'
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn('flex w-6 h-6 shrink-0 items-center justify-center rounded-full border text-[11px]', meta.className)}>
                  <Icon className={cn('w-3.5 h-3.5', meta.spin && 'animate-spin')} aria-hidden />
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">STEP {i + 1}</span>
              </div>
              <p className="text-sm font-medium leading-snug">{s.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate" title={s.subtitle}>{s.subtitle}</p>
              {s.durationMs != null && <p className="text-[11px] font-mono text-muted-foreground mt-1">{formatMs(s.durationMs)}</p>}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn('relative', className)}>
      {stages.map((s, i) => {
        const meta = STATUS_ICON[s.status] || STATUS_ICON.pending;
        const Icon = meta.icon;
        const last = i === stages.length - 1;
        return (
          <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" aria-hidden />}
            <span className={cn('relative z-10 flex w-7 h-7 shrink-0 items-center justify-center rounded-full border', meta.className)}>
              <Icon className={cn('w-4 h-4', meta.spin && 'animate-spin')} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className={cn('text-sm font-medium', s.status === 'pending' && 'text-muted-foreground')}>{s.title}</p>
                {s.durationMs != null && <span className="text-xs font-mono text-muted-foreground shrink-0">{formatMs(s.durationMs)}</span>}
              </div>
              <p className="text-xs text-muted-foreground">{s.subtitle}</p>
              {s.detail && (
                <p className={cn('text-xs mt-1', s.status === 'failed' ? 'text-destructive' : 'text-muted-foreground')}>{s.detail}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
