'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ContributionForm } from '@/components/memory/ContributionForm';
import { useContributionPipeline } from '@/hooks/useContributionPipeline';
import { useLanguage } from '@/hooks/useLanguage';
import { PRINCIPLE } from '@/lib/knowledge';

export default function ContributePage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const pipeline = useContributionPipeline();

  const handleSubmit = async (input) => {
    const jobId = await pipeline.submit(input);
    if (jobId) router.push(`/contribute/processing?job=${jobId}`);
  };

  useEffect(() => {
    if (pipeline.error) toast.error(pipeline.error, { id: 'contribute-error' });
  }, [pipeline.error]);

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8 border-b border-border pb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Contribute knowledge</p>
        <h1 className="mt-1 font-serif text-3xl font-bold">
          {lang === 'hausa' ? 'Adana ilimin al’ummarku' : 'Preserve your community’s knowledge'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Speak in Hausa or English. N-ATLAS transcribes and structures what you say, and you confirm it is accurate
          before it enters the archive.
        </p>
        <p className="mt-3 text-xs text-muted-foreground italic">{PRINCIPLE}</p>
      </header>

      <ContributionForm
        onSubmit={handleSubmit}
        submitting={pipeline.uploading}
        defaultLanguage={lang === 'english' ? 'english' : 'hausa'}
      />
    </div>
  );
}
