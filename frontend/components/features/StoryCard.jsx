'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, BookOpen, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LanguageBadge } from './LanguageBadge';
import { toast } from 'sonner';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied!');
        setTimeout(() => setCopied(false), 2000);
      }}
      className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label="Copy story"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function StoryCard({ story }) {
  return (
    <Link href={`/stories/${story._id}`} className="block group">
      <div className="result-card p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 flex-1">
                {story.title}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                <CopyBtn text={`${story.title}\n\n${story.content}`} />
                <LanguageBadge language={story.language} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
              {story.analysis?.summary || 'Gemma AI analysis in progress…'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {story.knowledgeType && (
                <Badge variant="secondary" className="text-xs h-5 px-2">{story.knowledgeType}</Badge>
              )}
              {story.analysis?.themes?.slice(0, 2).map((theme) => (
                <span key={theme} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                  {theme}
                </span>
              ))}
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" />
                {story.viewCount ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
