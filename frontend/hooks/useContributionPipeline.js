'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { apiErrorMessage, newSessionId } from '@/lib/knowledge';

const DONE = ['completed', 'failed'];

/**
 * Upload a contribution, start the N-ATLAS pipeline and poll its progress.
 * Pass an existing jobId to resume polling (e.g. after a page navigation).
 */
export function useContributionPipeline(initialJobId = null) {
  const [jobId, setJobId] = useState(initialJobId);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId] = useState(newSessionId);

  const jobQuery = useQuery({
    queryKey: ['knowledge-job', jobId],
    enabled: Boolean(jobId),
    queryFn: () => api.get(`/knowledge/jobs/${jobId}`).then((r) => r.data.data),
    refetchInterval: (query) => (DONE.includes(query.state.data?.job?.status) ? false : 1500),
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  /**
   * @param {{ audio?: {blob: Blob, durationSec?: number, mimeType: string, fileName?: string}, text?: string,
   *           language: string, knowledgeType: string, town?: string, state?: string, community?: string,
   *           isAnonymous?: boolean }} input
   * @returns {Promise<string|null>} the processing job id
   */
  const submit = useCallback(async (input) => {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('consent', 'true');
      form.append('language', input.language);
      form.append('knowledgeType', input.knowledgeType);
      form.append('sessionId', sessionId);
      form.append('isAnonymous', String(Boolean(input.isAnonymous)));
      form.append('recordedAt', new Date().toISOString());
      ['town', 'state', 'community'].forEach((k) => input[k]?.trim() && form.append(k, input[k].trim()));
      if (input.audio) {
        const ext = input.audio.mimeType.includes('mp4') ? 'm4a' : input.audio.mimeType.includes('ogg') ? 'ogg' : 'webm';
        form.append('audio', input.audio.blob, input.audio.fileName && input.audio.fileName !== 'recording' ? input.audio.fileName : `recording.${ext}`);
        if (input.audio.durationSec) form.append('durationSec', String(Math.round(input.audio.durationSec * 10) / 10));
      } else if (input.text) {
        form.append('text', input.text);
      }

      const up = await api.post('/knowledge/upload', form);
      const contributionId = up.data.data.contribution._id;
      const pr = await api.post('/knowledge/process', { contributionId });
      const id = pr.data.data.job._id;
      setJobId(id);
      return id;
    } catch (err) {
      setError(apiErrorMessage(err, 'Upload failed. Please try again.'));
      return null;
    } finally {
      setUploading(false);
    }
  }, [sessionId]);

  /** Re-run the pipeline for the same contribution after a failure. */
  const retry = useCallback(async () => {
    const contributionId = jobQuery.data?.job?.contribution;
    if (!contributionId) return null;
    setError(null);
    try {
      const pr = await api.post('/knowledge/process', { contributionId });
      const id = pr.data.data.job._id;
      setJobId(id);
      return id;
    } catch (err) {
      setError(apiErrorMessage(err));
      return null;
    }
  }, [jobQuery.data]);

  const reset = useCallback(() => {
    setJobId(null);
    setError(null);
  }, []);

  return {
    jobId,
    job: jobQuery.data?.job || null,
    item: jobQuery.data?.item || null,
    isDone: DONE.includes(jobQuery.data?.job?.status),
    jobError: jobQuery.error ? apiErrorMessage(jobQuery.error) : null,
    uploading,
    error,
    submit,
    retry,
    reset,
    refetch: jobQuery.refetch,
  };
}
