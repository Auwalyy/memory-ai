'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck, Keyboard, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AudioRecorder } from './AudioRecorder';
import {
  CONTRIBUTION_LANGUAGES, CONTRIBUTION_TYPES, CONSENT_STATEMENT, NIGERIAN_STATES, flowStrings,
} from '@/lib/knowledge';
import { cn } from '@/lib/utils';

function Step({ n, title, subtitle, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-muted-foreground">{String(n).padStart(2, '0')}</span>
        <div>
          <h2 className="font-serif text-lg font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Voice-first contribution form. Calls onSubmit(input) with everything
 * useContributionPipeline().submit needs.
 */
export function ContributionForm({ onSubmit, submitting = false, defaultLanguage = 'hausa', compact = false }) {
  const [language, setLanguage] = useState(defaultLanguage);
  const [knowledgeType, setKnowledgeType] = useState(null);
  const [town, setTown] = useState('');
  const [state, setState] = useState('');
  const [community, setCommunity] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [consent, setConsent] = useState(false);
  const [audio, setAudio] = useState(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');

  const s = flowStrings(language);
  const en = flowStrings('english');
  const bilingual = language === 'hausa';

  const hasContent = typing ? text.trim().length >= 20 : Boolean(audio);
  const canSubmit = Boolean(knowledgeType) && consent && hasContent && !submitting;

  const missing = [
    !knowledgeType && 'choose what you are preserving',
    !hasContent && (typing ? 'write at least 20 characters' : 'record or upload audio'),
    !consent && 'give consent',
  ].filter(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      language, knowledgeType, town, state, community, isAnonymous,
      audio: typing ? null : audio,
      text: typing ? text.trim() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn(compact ? 'space-y-6' : 'space-y-8')}>
      <Step n={1} title={s.chooseLanguage} subtitle={bilingual ? en.chooseLanguage : null}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CONTRIBUTION_LANGUAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              disabled={!l.enabled || submitting}
              onClick={() => setLanguage(l.value)}
              aria-pressed={language === l.value}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed',
                language === l.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
                !l.enabled && 'opacity-50'
              )}
            >
              <span className="block text-sm font-medium">{l.native}</span>
              <span className="block text-[11px] text-muted-foreground">{l.enabled ? l.label : 'Coming soon'}</span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={2} title={s.whatToPreserve} subtitle={bilingual ? en.whatToPreserve : null}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CONTRIBUTION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              disabled={submitting}
              onClick={() => setKnowledgeType(t.value)}
              aria-pressed={knowledgeType === t.value}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-left transition-colors',
                knowledgeType === t.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              )}
            >
              <span className="block text-sm font-medium">{language === 'hausa' ? t.ha : t.en}</span>
              {language === 'hausa' && <span className="block text-[11px] text-muted-foreground">{t.en}</span>}
            </button>
          ))}
        </div>
      </Step>

      <Step n={3} title={s.where} subtitle={bilingual ? en.where : null}>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{s.town}</span>
            <Input value={town} onChange={(e) => setTown(e.target.value)} maxLength={120} placeholder="Kano" disabled={submitting} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{s.state}</span>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={submitting}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">—</option>
              {NIGERIAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{s.community}</span>
            <Input value={community} onChange={(e) => setCommunity(e.target.value)} maxLength={120} disabled={submitting} />
          </label>
        </div>
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
          />
          <span>
            {s.anonymous}
            <span className="block text-xs text-muted-foreground">{s.anonymousHint}</span>
          </span>
        </label>
      </Step>

      <Step n={4} title={s.consentTitle} subtitle={bilingual ? en.consentTitle : null}>
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <p className="flex items-start gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <span>
              {CONSENT_STATEMENT} You can stay anonymous, edit, withdraw or delete your contribution at any time
              from <span className="font-medium">My Contributions</span>.
            </span>
          </p>
          <label className="flex items-start gap-2.5 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
              required
            />
            <span>
              {s.consentAgree}
              {bilingual && <span className="block text-xs font-normal text-muted-foreground">{en.consentAgree}</span>}
            </span>
          </label>
        </div>
      </Step>

      <Step n={5} title={typing ? 'Write your contribution' : s.record} subtitle={bilingual && !typing ? en.record : null}>
        {typing ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            maxLength={20000}
            placeholder={s.typePlaceholder}
            disabled={submitting}
          />
        ) : (
          <div className={cn(!consent && 'opacity-60')}>
            <AudioRecorder strings={s} onChange={setAudio} disabled={submitting || !consent} compact={compact} />
            {!consent && <p className="mt-2 text-xs text-muted-foreground text-center">Give consent above to enable recording.</p>}
          </div>
        )}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { setTyping((v) => !v); setAudio(null); }}
          disabled={submitting}
        >
          {typing ? <><Mic className="w-3.5 h-3.5" /> {s.useVoice}</> : <><Keyboard className="w-3.5 h-3.5" /> {s.typeInstead}</>}
        </button>
      </Step>

      <div className="space-y-2">
        <Button type="submit" size="lg" className="w-full h-11 text-base" disabled={!canSubmit}>
          {submitting ? <><Loader2 className="animate-spin" /> {s.submitting}</> : s.submit}
        </Button>
        {missing.length > 0 && !submitting && (
          <p className="text-xs text-muted-foreground text-center">To continue: {missing.join(', ')}.</p>
        )}
      </div>
    </form>
  );
}
