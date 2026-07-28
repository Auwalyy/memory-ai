'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bookmark, BookOpen, Eye, Copy, Check, Download, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { LANGUAGE_COLORS } from '@/lib/constants';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.06 } }),
};

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(text); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); }}
      className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function BookmarksPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => api.get('/bookmarks').then((r) => r.data),
  });

  const removeMutation = useMutation({
    mutationFn: (storyId) => api.post(`/bookmarks/${storyId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookmarks'] }); toast.success('Bookmark removed'); },
    onError: () => toast.error('Failed to remove bookmark'),
  });

  const exportBookmarks = () => {
    const items = data?.data || [];
    if (!items.length) return toast.info('No bookmarks to export');
    const csv = [
      'Title,Language,Type,Summary',
      ...items.map((b) => {
        const s = b.story;
        return [s?.title, s?.language, s?.type, s?.analysis?.summary || '']
          .map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',');
      }),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bookmarks.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported bookmarks as CSV');
  };

  const bookmarks = data?.data || [];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Bookmarks</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your saved indigenous knowledge</p>
        </div>
        {bookmarks.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 h-9 shrink-0" onClick={exportBookmarks}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        )}
      </div>

      {!isLoading && bookmarks.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{bookmarks.length}</span> saved {bookmarks.length === 1 ? 'story' : 'stories'}
        </p>
      )}

      <div className="space-y-3">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : bookmarks.map((bookmark, i) => {
              const story = bookmark.story;
              if (!story) return null;
              return (
                <motion.div key={bookmark._id} variants={fadeUp} initial="hidden" animate="visible" custom={i}>
                  <Link href={`/stories/${story._id}`} className="block group">
                    <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <h3 className="font-semibold text-sm">{story.title}</h3>
                              {story.type && (
                                <Badge variant="secondary" className="text-xs">{story.type}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {story.analysis?.summary || 'No summary available'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <CopyBtn text={`${story.title}\n\n${story.analysis?.summary || ''}`} />
                              <button
                                onClick={(e) => { e.preventDefault(); removeMutation.mutate(story._id); }}
                                className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                aria-label="Remove bookmark"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <Badge className={`text-xs ${LANGUAGE_COLORS[story.language] || ''}`}>
                              {story.language}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="w-3 h-3" />
                              {story.viewCount ?? 0}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
      </div>

      {!isLoading && !bookmarks.length && (
        <div className="text-center py-16 text-muted-foreground">
          <Bookmark className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p className="text-base font-medium mb-2">No bookmarks yet</p>
          <p className="text-sm">Bookmark stories to save them here for quick access.</p>
          <Link href="/stories">
            <Button variant="outline" size="sm" className="mt-4 gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Browse Stories
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
