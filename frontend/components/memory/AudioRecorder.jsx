'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square, RotateCcw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/knowledge';
import { cn } from '@/lib/utils';

const MAX_SECONDS = 10 * 60;

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) =>
    MediaRecorder.isTypeSupported(t)
  ) || '';
};

/** Read duration from an audio file's metadata (webm files may report Infinity). */
const probeDuration = (url) =>
  new Promise((resolve) => {
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => resolve(null);
    a.src = url;
  });

/**
 * Voice recorder with live level meter and file-upload fallback.
 * Calls onChange({ blob, durationSec, mimeType, fileName }) or onChange(null).
 */
export function AudioRecorder({ strings, onChange, disabled = false, compact = false }) {
  const [state, setState] = useState('idle'); // idle | recording | recorded
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedRef = useRef(0);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const fileInputRef = useRef(null);

  const cleanupStream = () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  };

  useEffect(() => () => cleanupStream(), []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const setResult = (blob, durationSec, fileName) => {
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setState('recorded');
    onChange?.({ blob, durationSec, mimeType: blob.type || 'audio/webm', fileName });
  };

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser cannot record audio. Please upload a recording instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamRef.current = stream;

      // Level meter so speakers can see they are being heard
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtxRef.current = ctx;
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
          setLevel(Math.min(1, peak / 64));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch { /* meter is optional */ }

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const duration = (Date.now() - startedRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        cleanupStream();
        setResult(blob, duration, 'recording');
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      startedRef.current = Date.now();
      setSeconds(0);
      setState('recording');
      timerRef.current = setInterval(() => {
        const s = (Date.now() - startedRef.current) / 1000;
        setSeconds(s);
        if (s >= MAX_SECONDS) recorder.state === 'recording' && recorder.stop();
      }, 250);
    } catch (err) {
      cleanupStream();
      setError(err?.name === 'NotAllowedError' ? strings.micDenied : `Could not start recording: ${err.message}`);
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const reset = () => {
    setAudioUrl(null);
    setSeconds(0);
    setState('idle');
    onChange?.(null);
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Please choose an audio file (mp3, m4a, wav, webm, ogg).');
      return;
    }
    setError(null);
    const tmpUrl = URL.createObjectURL(file);
    const duration = await probeDuration(tmpUrl);
    URL.revokeObjectURL(tmpUrl);
    setSeconds(duration || 0);
    setResult(file, duration, file.name);
  };

  return (
    <div className={cn('rounded-xl border border-border bg-card', compact ? 'p-4' : 'p-6')}>
      {state !== 'recorded' ? (
        <div className="flex flex-col items-center text-center gap-3">
          <button
            type="button"
            onClick={state === 'recording' ? stop : start}
            disabled={disabled}
            aria-label={state === 'recording' ? strings.stop : strings.record}
            className={cn(
              'relative flex items-center justify-center rounded-full transition-colors disabled:opacity-50',
              compact ? 'w-20 h-20' : 'w-24 h-24',
              state === 'recording'
                ? 'bg-destructive text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {state === 'recording' && (
              <span
                className="absolute inset-0 rounded-full border-4 border-destructive/40"
                style={{ transform: `scale(${1 + level * 0.35})`, transition: 'transform 80ms linear' }}
                aria-hidden
              />
            )}
            {state === 'recording' ? <Square className="w-8 h-8" /> : <Mic className="w-9 h-9" />}
          </button>
          <div>
            <p className="font-medium">{state === 'recording' ? strings.recording : strings.record}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {state === 'recording' ? `${formatDuration(seconds)} / ${formatDuration(MAX_SECONDS)}` : strings.speakNow}
            </p>
          </div>
          {state === 'idle' && (
            <>
              <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onFile} />
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                <Upload className="w-3.5 h-3.5" /> {strings.uploadFile}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              Recording ready <span className="text-muted-foreground tabular-nums">· {formatDuration(seconds)}</span>
            </p>
            <Button type="button" variant="outline" size="sm" onClick={reset} disabled={disabled}>
              <RotateCcw /> {strings.reRecord}
            </Button>
          </div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}
      {error && <p className="mt-3 text-sm text-destructive text-center" role="alert">{error}</p>}
    </div>
  );
}
