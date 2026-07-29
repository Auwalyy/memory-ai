'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Check, X, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import api from '@/lib/api';
import { LANGUAGE_COLORS } from '@/lib/constants';

export default function PendingReviewsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pending-stories'],
    queryFn: () => api.get('/stories?isPublished=false&sort=-createdAt').then((r) => r.data),
  });

  const publishMutation = useMutation({
    mutationFn: (id) => api.patch(`/stories/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-stories'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story published');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to publish'),
  });

  const stories = data?.data || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold">Pending Reviews</h1>
          <p className="text-muted-foreground text-sm">Stories awaiting moderation and publication</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-semibold">No pending reviews</p>
          <p className="text-sm mt-1">All submitted stories have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map((story) => (
            <Card key={story._id} className="border-border/50">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link href={`/stories/${story._id}`}>
                      <h3 className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1">
                        {story.title}
                      </h3>
                    </Link>
                    <Badge className={`text-xs shrink-0 ${LANGUAGE_COLORS[story.language] || ''}`}>
                      {story.language}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {story.analysis?.summary || 'No AI summary yet'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{story.knowledgeType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(story.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gradient-brand text-white border-0 gap-1.5 shrink-0"
                  onClick={() => publishMutation.mutate(story._id)}
                  disabled={publishMutation.isPending}
                >
                  <Check className="w-3.5 h-3.5" /> Publish
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
