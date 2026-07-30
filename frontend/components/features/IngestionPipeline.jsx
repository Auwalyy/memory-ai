'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Brain, FileSearch, Sparkles, Network, BookOpen,
  Cpu, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const STEPS = [
  { step: 1, label: 'Detecting Language',        icon: Globe,       color: 'text-blue-500' },
  { step: 2, label: 'Understanding Content',      icon: Brain,       color: 'text-purple-500' },
  { step: 3, label: 'Reading & Summarising',      icon: FileSearch,  color: 'text-amber-500' },
  { step: 4, label: 'Extracting Cultural Knowledge', icon: BookOpen, color: 'text-green-500' },
  { step: 5, label: 'Understanding Culture',      icon: Sparkles,    color: 'text-pink-500' },
  { step: 6, label: 'Generating Metadata',        icon: Cpu,         color: 'text-cyan-500' },
  { step: 7, label: 'Building Intelligence',      icon: Brain,       color: 'text-indigo-500' },
  { step: 8, label: 'Building Knowledge Graph',   icon: Network,     color: 'text-primary' },
];

/**
 * IngestionPipeline
 * Props:
 *   uploadId       — string, required
 *   outputLanguage — string, optional (hausa/yoruba/igbo/english/pidgin)
 *   onComplete(result) — called when pipeline finishes
 *   onError(msg)       — called on failure
 */
export default function IngestionPipeline({ uploadId, outputLanguage, onComplete, onError }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress]       = useState(0);
  const [done, setDone]               = useState(false);
  const [failed, setFailed]           = useState(false);
  const [result, setResult]           = useState(null);
  const esRef = useRef(null);

  useEffect(() => {
    if (!uploadId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    const base  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

    // Trigger pipeline
    fetch(`${base}/ingestion/${uploadId}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputLanguage: outputLanguage || null }),
    }).catch(() => {});

    // Open SSE stream
    const es = new EventSource(
      `${base}/ingestion/${uploadId}/progress?token=${token}`
    );
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setCurrentStep(data.step || 0);
        setProgress(data.progress || 0);

        if (data.done) {
          es.close();
          if (data.error) {
            setFailed(true);
            onError?.(data.error);
          } else {
            setDone(true);
            setResult(data.result || null);
            onComplete?.(data.result || null);
          }
        }
      } catch (_) {}
    };

    es.onerror = () => {
      es.close();
      // If already done, ignore the close event error
      setFailed((prev) => {
        if (!prev && !done) onError?.('Connection lost');
        return prev;
      });
    };

    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadId]);

  return (
    <div className="space-y-3">
      {/* Progress bar + percentage */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {done ? 'Complete' : failed ? 'Failed' : `Step ${currentStep} of ${STEPS.length}`}
          </p>
          <span className={`text-xs font-semibold ${
            done ? 'text-green-500' : failed ? 'text-destructive' : 'text-primary'
          }`}>{progress}%</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${
              failed ? 'bg-destructive' : done ? 'bg-green-500' : 'gradient-brand'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {STEPS.map(({ step, label, icon: Icon, color }) => {
          const isActive   = currentStep === step && !done && !failed;
          const isComplete = done || currentStep > step;
          const isPending  = currentStep < step && !done;

          return (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: step * 0.04 }}
            >
              <Card
                className={`border transition-all duration-300 ${
                  isActive
                    ? 'border-primary/60 bg-primary/5 shadow-sm'
                    : isComplete
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-border/40 opacity-40'
                }`}
              >
                <CardContent className="p-2.5 flex items-center gap-2">
                  <div className="shrink-0">
                    {failed && isActive ? (
                      <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                    ) : isComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : isActive ? (
                      <Loader2 className={`w-3.5 h-3.5 ${color} animate-spin`} />
                    ) : (
                      <Icon className={`w-3.5 h-3.5 ${isPending ? 'text-muted-foreground/40' : color}`} />
                    )}
                  </div>
                  <span className="text-xs font-medium leading-tight">{label}</span>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Result summary */}
      <AnimatePresence>
        {done && result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                Knowledge Preserved Successfully
              </span>
            </div>

            {result.title && (
              <p className="text-sm font-medium">{result.title}</p>
            )}
            {result.summaries?.short && (
              <p className="text-xs text-muted-foreground">{result.summaries.short}</p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {result.detectedLanguage && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {result.detectedLanguage}
                </Badge>
              )}
              {result.contentType && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {result.contentType.replace(/_/g, ' ')}
                </Badge>
              )}
              {result.aiUnderstanding?.mainTheme && (
                <Badge variant="outline" className="text-xs">
                  {result.aiUnderstanding.mainTheme}
                </Badge>
              )}
              {(result.aiUnderstanding?.subThemes || []).slice(0, 3).map((t) => (
                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
              ))}
            </div>

            {result.aiUnderstanding?.moralLessons?.[0] && (
              <p className="text-xs">
                <span className="font-medium">Moral: </span>
                {result.aiUnderstanding.moralLessons[0]}
              </p>
            )}
          </motion.div>
        )}

        {failed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-xs text-destructive">
              AI processing failed. You can retry from the uploads list.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
