'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { FIDELITY_SCALE, flowStrings, apiErrorMessage } from '@/lib/knowledge';
import { cn } from '@/lib/utils';

/**
 * Contributor's Cultural Fidelity review: "Does this accurately represent what you said?"
 * In moderator mode it posts to /verify with a verify/reject decision instead.
 */
export function VerificationForm({ itemId, lang = 'english', mode = 'contributor', compact = false, onDone }) {
  const s = flowStrings(lang);
  const [score, setScore] = useState(null);
  const [correction, setCorrection] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (decision) => {
    if (!score) {
      toast.error('Please choose a rating from 1 to 5');
      return;
    }
    setSaving(true);
    try {
      const res =
        mode === 'moderator'
          ? await api.post(`/knowledge/${itemId}/verify`, { decision, fidelityScore: score, correctionText: correction })
          : await api.post(`/knowledge/${itemId}/review`, { fidelityScore: score, correctionText: correction, userFeedback: feedback });
      toast.success(res.data.message);
      onDone?.(res.data.data.item);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="font-serif text-lg font-semibold">
          {mode === 'moderator' ? 'How faithful is this record to the source recording?' : s.accurateQuestion}
        </p>
        {lang === 'hausa' && mode !== 'moderator' && (
          <p className="text-sm text-muted-foreground">{flowStrings('english').accurateQuestion}</p>
        )}
      </div>

      <div role="radiogroup" aria-label="Fidelity rating" className={cn('grid grid-cols-1 gap-2', !compact && 'sm:grid-cols-5')}>
        {FIDELITY_SCALE.map((f) => (
          <button
            key={f.score}
            type="button"
            role="radio"
            aria-checked={score === f.score}
            onClick={() => setScore(f.score)}
            className={cn(
              'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
              !compact && 'sm:flex-col sm:items-start sm:gap-1',
              score === f.score ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
            )}
          >
            <span className={cn('font-mono text-lg font-semibold', score === f.score && 'text-primary')}>{f.score}</span>
            <span className="text-xs leading-tight">
              {lang === 'hausa' ? f.ha : f.en}
              {lang === 'hausa' && <span className="block text-muted-foreground">{f.en}</span>}
            </span>
          </button>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{s.correction}</span>
        <Textarea
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          maxLength={5000}
          rows={3}
          placeholder={lang === 'hausa' ? 'Misali: kalmar “lefe” ba haka ake rubuta ta ba…' : 'e.g. the word “lefe” was transcribed incorrectly…'}
        />
      </label>

      {mode !== 'moderator' && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{s.feedback}</span>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} rows={2} />
        </label>
      )}

      {mode === 'moderator' ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => submit('verify')} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Verify & publish
          </Button>
          <Button variant="outline" onClick={() => submit('reject')} disabled={saving}>
            Return to contributor
          </Button>
        </div>
      ) : (
        <Button onClick={() => submit()} disabled={saving} size="lg">
          {saving && <Loader2 className="animate-spin" />} {s.saveReview}
        </Button>
      )}
    </div>
  );
}
