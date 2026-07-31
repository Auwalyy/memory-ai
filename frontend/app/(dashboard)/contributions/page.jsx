'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User, Upload, Clock, CheckCircle, Sparkles, BookOpen, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import api from '@/lib/api';
import { LANGUAGE_COLORS } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05 } }),
};

const STATUS_STYLES = {
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  draft:     'bg-muted text-muted-foreground',
  rejected:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function StoryRow({ story, i }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={i}>
      <Link href={`/stories/${story._id}`}>
        <Card className="border-border/50 hover:border-primary/20 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-medium text-sm truncate">{story.title}</h3>
                <Badge variant="secondary" className="text-xs capitalize shrink-0">
                  {story.knowledgeType?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {story.analysis?.summary || story.content?.slice(0, 100) + '…'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge className={`text-xs ${LANGUAGE_COLORS[story.language] || ''}`}>{story.language}</Badge>
              <Badge className={`text-xs ${STATUS_STYLES[story.status] || STATUS_STYLES.draft}`}>
                {story.status || 'draft'}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />{story.viewCount ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function UploadRow({ upload, i }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={i}>
      <Card className="border-border/50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Upload className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{upload.originalName || upload.filename}</p>
            <p className="text-xs text-muted-foreground capitalize">{upload.fileType} · {upload.mimeType}</p>
          </div>
          <Badge className={`text-xs shrink-0 ${STATUS_STYLES[upload.status] || STATUS_STYLES.draft}`}>
            {upload.status || 'uploaded'}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ContributionsPage() {
  const { user } = useAuth();

  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ['my-stories'],
    queryFn: () => api.get('/stories?limit=50&sort=-createdAt').then((r) => r.data),
  });

  const { data: uploadsData, isLoading: uploadsLoading } = useQuery({
    queryKey: ['my-uploads'],
    queryFn: () => api.get('/uploads/mine').then((r) => r.data),
  });

  const stories = storiesData?.data || [];
  const uploads = uploadsData?.data || [];

  const published = stories.filter((s) => s.status === 'published' || s.status === 'approved');
  const pending   = stories.filter((s) => s.status === 'pending' || s.status === 'under_review');
  const drafts    = stories.filter((s) => !s.status || s.status === 'draft');
  const aiAnalyzed = stories.filter((s) => s.analysis?.summary);

  const summaryCards = [
    { icon: Upload,      label: 'My Uploads',    value: uploads.length,   color: 'text-blue-500'   },
    { icon: Clock,       label: 'Pending Review', value: pending.length,   color: 'text-yellow-500' },
    { icon: CheckCircle, label: 'Published',      value: published.length, color: 'text-green-500'  },
    { icon: Sparkles,    label: 'AI Analyzed',    value: aiAnalyzed.length,color: 'text-purple-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">My Contributions</h1>
            <p className="text-muted-foreground text-sm">Your uploads, drafts, and published knowledge · <Link href="/upload" className="text-primary hover:underline">See all community uploads →</Link></p>
          </div>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryCards.map((card) => (
            <Card key={card.label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className="font-serif text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
        <Tabs defaultValue="uploads">
          <TabsList className="mb-4">
            <TabsTrigger value="uploads">Uploads ({uploads.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
            <TabsTrigger value="ai">AI History ({aiAnalyzed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="uploads" className="space-y-3">
            {uploadsLoading
              ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              : uploads.length === 0
                ? <EmptyState icon={Upload} text="No uploads yet" link="/upload" linkText="Upload Knowledge" />
                : uploads.map((u, i) => <UploadRow key={u._id} upload={u} i={i} />)
            }
          </TabsContent>

          <TabsContent value="published" className="space-y-3">
            {storiesLoading
              ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              : published.length === 0
                ? <EmptyState icon={CheckCircle} text="No published stories yet" />
                : published.map((s, i) => <StoryRow key={s._id} story={s} i={i} />)
            }
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            {storiesLoading
              ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              : pending.length === 0
                ? <EmptyState icon={Clock} text="No stories pending review" />
                : pending.map((s, i) => <StoryRow key={s._id} story={s} i={i} />)
            }
          </TabsContent>

          <TabsContent value="drafts" className="space-y-3">
            {storiesLoading
              ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              : drafts.length === 0
                ? <EmptyState icon={BookOpen} text="No drafts" link="/stories" linkText="Create Story" />
                : drafts.map((s, i) => <StoryRow key={s._id} story={s} i={i} />)
            }
          </TabsContent>

          <TabsContent value="ai" className="space-y-3">
            {storiesLoading
              ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              : aiAnalyzed.length === 0
                ? <EmptyState icon={Sparkles} text="No AI-analyzed content yet" />
                : aiAnalyzed.map((s, i) => <StoryRow key={s._id} story={s} i={i} />)
            }
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function EmptyState({ icon: Icon, text, link, linkText }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="w-8 h-8 mx-auto mb-3 opacity-20" />
      <p className="text-sm">{text}</p>
      {link && (
        <Link href={link}>
          <Button variant="outline" size="sm" className="mt-3">{linkText}</Button>
        </Link>
      )}
    </div>
  );
}
