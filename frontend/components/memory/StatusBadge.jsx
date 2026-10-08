import { ShieldCheck, UserCheck, Cpu, Clock } from 'lucide-react';
import { STATUS_META } from '@/lib/knowledge';
import { cn } from '@/lib/utils';

const ICONS = { PENDING: Clock, AI_PROCESSED: Cpu, HUMAN_REVIEWED: UserCheck, VERIFIED: ShieldCheck };

export function StatusBadge({ status, className, showDescription = false }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING;
  const Icon = ICONS[status] || Clock;
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={meta.description}>
      <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium', meta.className)}>
        <Icon className="w-3 h-3" aria-hidden />
        {meta.label}
      </span>
      {showDescription && <span className="text-xs text-muted-foreground">{meta.description}</span>}
    </span>
  );
}
