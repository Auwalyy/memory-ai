'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, MessageSquare, Upload, Sparkles, Globe, Network, TrendingUp, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import api from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LANGUAGE_COLORS } from '@/lib/constants';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.08 } }),
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: () => api.get('/knowledge/stats').then((r) => r.data.data),
  });

  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ['recent-stories'],
    queryFn: () => api.get('/stories?limit=5&sort=-createdAt').then((r) => r.data),
  });

  const totalStories = statsData?.storyStats?.reduce((sum, s) => sum + s.count, 0) ?? 0;

  const quickActions = [
    { href: '/upload', icon: Upload, label: t('uploadKnowledge'), desc: t('uploadDesc'), color: 'text-blue-500' },
    { href: '/stories', icon: BookOpen, label: t('writeStory'), desc: t('writeDesc'), color: 'text-green-500' },
    { href: '/chat', icon: MessageSquare, label: t('chatWithAI'), desc: t('chatDesc'), color: 'text-purple-500' },
    { href: '/education', icon: Sparkles, label: t('generateLesson'), desc: t('generateDesc'), color: 'text-orange-500' },
  ];

  const summaryCards = [
    { label: t('totalStories'), value: statsLoading ? null : totalStories, icon: BookOpen, color: 'text-primary' },
    { label: t('proverb'), value: statsLoading ? null : (statsData?.proverbCount ?? 0), icon: Globe, color: 'text-green-500' },
    { label: t('uploads'), value: statsLoading ? null : (statsData?.uploadCount ?? 0), icon: Upload, color: 'text-blue-500' },
    { label: t('graphNodes'), value: statsLoading ? null : (statsData?.graphNodeCount ?? 0), icon: Network, color: 'text-purple-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <h1 className="font-serif text-3xl font-bold">
          {t('welcomeBack')}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">{t('preserving')}</p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((card, i) => (
            <Card key={card.label} className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</span>
                  <card.icon className={`w-4 h-4 ${card.color}`} aria-hidden="true" />
                </div>
                {card.value === null
                  ? <Skeleton className="h-8 w-16" />
                  : <div className="font-serif text-3xl font-bold">{card.value}</div>
                }
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Language Breakdown */}
      {!statsLoading && statsData?.storyStats?.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1.5}>
          <h2 className="font-semibold text-lg mb-3">{t('storiesByLanguage')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statsData.storyStats.map((stat) => (
              <Card key={stat._id} className="border-border/50">
                <CardContent className="p-4">
                  <Badge className={LANGUAGE_COLORS[stat._id] || LANGUAGE_COLORS.english}>
                    {stat._id}
                  </Badge>
                  <div className="font-serif text-2xl font-bold mt-2">{stat.count}</div>
                  <div className="text-xs text-muted-foreground">{stat.totalViews} views</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sample Data Banner */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1.8}>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Try with prebuilt sample data</p>
            <p className="text-xs text-muted-foreground mt-0.5">Each section has ready-made Nigerian stories, proverbs, and uploads — no external source needed.</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href="/stories"><Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Stories</Button></Link>
            <Link href="/proverbs"><Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"><Globe className="w-3.5 h-3.5" /> Proverbs</Button></Link>
            <Link href="/upload"><Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"><Upload className="w-3.5 h-3.5" /> Upload</Button></Link>
            <Link href="/chat"><Button size="sm" className="h-8 text-xs gap-1.5 gradient-brand text-white border-0"><MessageSquare className="w-3.5 h-3.5" /> Chat</Button></Link>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
        <h2 className="font-semibold text-lg mb-4">{t('quickActions')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <Link key={action.href} href={action.href}>
              <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-5">
                  <action.icon className={`w-6 h-6 mb-3 ${action.color}`} />
                  <div className="font-medium text-sm mb-1">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.desc}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Stories */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">{t('recentStories')}</h2>
          <Link href="/stories">
            <Button variant="ghost" size="sm">{t('viewAll')}</Button>
          </Link>
        </div>
        <div className="space-y-3">
          {storiesLoading
            ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : storiesData?.data?.map((story) => (
                <Link key={story._id} href={`/stories/${story._id}`}>
                  <Card className="border-border/50 hover:border-primary/20 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">{story.title}</h3>
                          <Badge variant="secondary" className="text-xs shrink-0">{story.knowledgeType}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {story.analysis?.summary || t('aiAnalysisProgress')}
                        </p>
                      </div>
                      <Badge className={`${LANGUAGE_COLORS[story.language]} text-xs shrink-0`}>
                        {story.language}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
        </div>
      </motion.div>

      {/* Top Themes */}
      {statsData?.topThemes?.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
          <h2 className="font-semibold text-lg mb-4">{t('topThemes')}</h2>
          <div className="flex flex-wrap gap-2">
            {statsData.topThemes.slice(0, 15).map((theme) => (
              <Badge key={theme._id} variant="secondary" className="text-sm px-3 py-1">
                {theme._id}
                <span className="ml-1.5 text-muted-foreground text-xs">{theme.count}</span>
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {/* Knowledge Type Breakdown */}
      {statsData?.typeBreakdown?.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
          <h2 className="font-semibold text-lg mb-4">{t('knowledgeByType')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statsData.typeBreakdown.map((t) => (
              <Card key={t._id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="font-serif text-2xl font-bold">{t.count}</div>
                  <div className="text-xs text-muted-foreground capitalize mt-1">{t._id?.replace(/_/g, ' ')}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Graph Stats */}
      {(statsData?.graphNodeCount > 0 || statsData?.graphEdgeCount > 0) && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">{t('knowledgeGraph')}</h2>
            <Link href="/graph"><Button variant="ghost" size="sm">{t('viewGraph')}</Button></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-5">
                <Network className="w-5 h-5 text-primary mb-2" />
                <div className="font-serif text-3xl font-bold">{statsData.graphNodeCount}</div>
                <div className="text-xs text-muted-foreground mt-1">{t('knowledgeNodes')}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <TrendingUp className="w-5 h-5 text-purple-500 mb-2" />
                <div className="font-serif text-3xl font-bold">{statsData.graphEdgeCount}</div>
                <div className="text-xs text-muted-foreground mt-1">{t('connections')}</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}
