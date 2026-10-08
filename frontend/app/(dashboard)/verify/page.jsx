'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ClipboardCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/memory/StatusBadge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { languageLabel, typeLabel, formatDate, apiErrorMessage } from '@/lib/knowledge';

function Queue({ title, description, queryKey, url, filter = () => true, empty }) {
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => api.get(url).then((r) => r.data.data.filter(filter)),
  });

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-serif text-xl font-semibold">
          {title} {data && <span className="font-sans text-sm font-normal text-muted-foreground">({data.length})</span>}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : error ? (
        <p className="text-sm text-destructive">{apiErrorMessage(error)}</p>
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {data.map((item) => (
            <li key={item._id}>
              <Link href={`/knowledge/${item._id}`} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {languageLabel(item.language)} · {typeLabel(item.knowledgeType)}
                    {item.location?.label ? ` · ${item.location.label}` : ''} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <StatusBadge status={item.verificationStatus} />
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function VerifyPage() {
  const { user } = useAuth();
  const isModerator = ['admin', 'moderator'].includes(user?.role);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Cultural fidelity</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Verification</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            N-ATLAS output is only published once a person confirms it matches what was said. Contributors rate their own
            records; moderators give the final verification.
          </p>
        </div>
        <ClipboardCheck className="hidden sm:block w-10 h-10 text-muted-foreground/40" />
      </header>

      <Queue
        title="Waiting for your review"
        description="Your contributions that N-ATLAS has processed but you have not yet checked."
        queryKey={['verify-mine']}
        url="/knowledge?mine=true&limit=100"
        filter={(i) => i.verificationStatus === 'AI_PROCESSED' && !i.isWithdrawn}
        empty="Nothing waiting — all your contributions have been reviewed."
      />

      {isModerator ? (
        <>
          <Queue
            title="Ready for moderator verification"
            description="Reviewed by the contributor. Verify to mark them as trusted archive records."
            queryKey={['verify-moderator-reviewed']}
            url="/knowledge?status=HUMAN_REVIEWED&limit=100"
            empty="No records waiting for verification."
          />
          <Queue
            title="Not yet reviewed by contributors"
            description="Processed by N-ATLAS; the contributor has not rated them. Moderators may review these directly."
            queryKey={['verify-moderator-ai']}
            url="/knowledge?status=AI_PROCESSED&limit=100"
            empty="No unreviewed records."
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Moderators see an additional verification queue here. <Link href="/contribute"><Button variant="link" className="px-1">Contribute knowledge</Button></Link>
        </p>
      )}
    </div>
  );
}
