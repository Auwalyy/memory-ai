import { StatusBadge } from './StatusBadge';
import { languageLabel, typeLabel, formatDate, formatMs, formatDuration } from '@/lib/knowledge';

const PROVIDER_LABEL = {
  'n-atlas': 'N-ATLAS',
  'gemma-fallback': 'Gemma (development fallback)',
  'contributor-text': 'Typed by contributor',
  none: '—',
};

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children || '—'}</dd>
    </div>
  );
}

const stepLine = (meta) =>
  meta?.provider
    ? `${PROVIDER_LABEL[meta.provider] || meta.provider}${meta.model ? ` · ${meta.model}` : ''}${meta.durationMs ? ` · ${formatMs(meta.durationMs)}` : ''}`
    : null;

/**
 * Where a knowledge item came from and how it was processed and verified.
 */
export function ProvenancePanel({ item, provenance }) {
  const n = item.natlas || {};
  return (
    <dl id="provenance" className="divide-y divide-border">
      <Row label="Source">{provenance?.source || 'Community contribution'}</Row>
      <Row label="Contributor">{item.contributorName}</Row>
      <Row label="Language">{languageLabel(item.language)}</Row>
      <Row label="Type">{typeLabel(item.knowledgeType)}</Row>
      <Row label="Location">{item.location?.label}</Row>
      <Row label="Recorded">{formatDate(item.recordedAt)}</Row>
      {item.audioDurationSec ? <Row label="Recording">{formatDuration(item.audioDurationSec)} audio</Row> : null}
      <Row label="Consent">
        {provenance?.consent?.given ? (
          <span>
            Given {formatDate(provenance.consent.givenAt)}
            <span className="block text-xs text-muted-foreground">“{provenance.consent.statement}”</span>
          </span>
        ) : null}
      </Row>
      <Row label="AI processing">
        <span className="space-y-0.5 block">
          {stepLine(n.asr) && <span className="block">ASR: {stepLine(n.asr)}</span>}
          {stepLine(n.translation) && <span className="block">Translation: {stepLine(n.translation)}</span>}
          {stepLine(n.extraction) && <span className="block">Structuring: {stepLine(n.extraction)}</span>}
          {n.grounding?.checked && (
            <span className="block text-xs text-muted-foreground">
              Source-grounding check passed{n.grounding.removed?.length ? ` · ${n.grounding.removed.length} unsupported item(s) removed` : ''}
            </span>
          )}
        </span>
      </Row>
      <Row label="Verification">
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.verificationStatus} />
          {item.fidelityScore ? (
            <span className="text-xs text-muted-foreground">
              Fidelity {item.fidelityScore.toFixed(1)}/5 · {item.reviewCount} review{item.reviewCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </span>
      </Row>
      <Row label="Archived">{formatDate(item.createdAt)}</Row>
    </dl>
  );
}
