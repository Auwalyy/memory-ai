'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart2, BookOpen, Globe, Upload, Users, TrendingUp, Network, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { LANGUAGE_COLORS } from '@/lib/constants';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.07 } }),
};

function StatCard({ icon: Icon, label, value, sub, color, i }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={i}>
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          {value === null
            ? <Skeleton className="h-8 w-16" />
            : <div className="font-serif text-3xl font-bold">{value}</div>
          }
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: () => api.get('/knowledge/stats').then((r) => r.data.data),
  });

  const { data: storiesData } = useQuery({
    queryKey: ['stories-all'],
    queryFn: () => api.get('/stories?limit=100&sort=-viewCount').then((r) => r.data),
  });

  const totalStories = stats?.storyStats?.reduce((s, x) => s + x.count, 0) ?? 0;
  const topStories = storiesData?.data?.slice(0, 5) || [];

  const summaryCards = [
    { icon: BookOpen,  label: 'Total Uploads',          value: isLoading ? null : (stats?.uploadCount ?? 0),    sub: 'Documents, audio & images', color: 'text-blue-500' },
    { icon: Globe,     label: 'Languages Represented',  value: isLoading ? null : (stats?.storyStats?.length ?? 0), sub: 'Hausa, Yoruba, Igbo & more', color: 'text-green-500' },
    { icon: Users,     label: 'Communities',            value: isLoading ? null : (stats?.communityCount ?? '—'), sub: 'Contributing communities',   color: 'text-purple-500' },
    { icon: Network,   label: 'Knowledge Connections',  value: isLoading ? null : (stats?.graphEdgeCount ?? 0),  sub: 'Graph relationships',        color: 'text-orange-500' },
    { icon: BookOpen,  label: 'Total Stories',          value: isLoading ? null : totalStories,                  sub: 'Across all languages',       color: 'text-primary' },
    { icon: Globe,     label: 'Proverbs',               value: isLoading ? null : (stats?.proverbCount ?? 0),    sub: 'Preserved wisdom phrases',   color: 'text-teal-500' },
    { icon: Network,   label: 'Graph Nodes',            value: isLoading ? null : (stats?.graphNodeCount ?? 0),  sub: 'Knowledge entities',         color: 'text-indigo-500' },
    { icon: TrendingUp,label: 'AI Analyses',            value: isLoading ? null : totalStories,                  sub: 'Gemma-processed stories',    color: 'text-rose-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Analytics</h1>
        </div>
        <p className="text-muted-foreground text-sm">Platform insights — knowledge preserved, languages represented, and community impact.</p>
      </motion.div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <StatCard key={card.label} {...card} i={i} />
        ))}
      </div>

      {/* Stories by language */}
      {!isLoading && stats?.storyStats?.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Stories by Language
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.storyStats.map((stat) => {
                  const pct = totalStories > 0 ? Math.round((stat.count / totalStories) * 100) : 0;
                  return (
                    <div key={stat._id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${LANGUAGE_COLORS[stat._id] || ''}`}>{stat._id}</Badge>
                          <span className="text-xs text-muted-foreground">{stat.count} stories</span>
                        </div>
                        <span className="text-xs font-medium">{pct}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-brand rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Most viewed stories */}
      {topStories.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Most Viewed Stories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {topStories.map((story, i) => (
                  <div key={story._id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{story.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{story.analysis?.summary || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-xs ${LANGUAGE_COLORS[story.language] || ''}`}>{story.language}</Badge>
                      <span className="text-xs text-muted-foreground">{story.viewCount ?? 0} views</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Top themes */}
      {stats?.topThemes?.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Most Searched Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.topThemes.slice(0, 20).map((theme) => (
                  <Badge key={theme._id} variant="secondary" className="text-sm px-3 py-1">
                    {theme._id}
                    <span className="ml-1.5 text-muted-foreground text-xs">{theme.count}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Knowledge type breakdown */}
      {stats?.typeBreakdown?.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Knowledge by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {stats.typeBreakdown.map((t) => (
                  <div key={t._id} className="bg-muted rounded-xl p-3 text-center">
                    <div className="font-serif text-2xl font-bold">{t.count}</div>
                    <div className="text-xs text-muted-foreground capitalize mt-1">{t._id?.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
