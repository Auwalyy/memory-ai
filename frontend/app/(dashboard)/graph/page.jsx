'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network, Layers, GitBranch, Globe, Download, RefreshCw, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import KnowledgeGraph from '@/components/features/KnowledgeGraph';
import api from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';

const TYPE_COLORS = {
  story: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  proverb: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  person: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  location: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  theme: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  tradition: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
};

function StatCard({ icon: Icon, label, value, sub, colorClass }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        <p className="font-serif text-2xl font-bold">{value ?? '—'}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 capitalize">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function GraphPage() {
  const { t } = useTranslation();
  const [selectedNode, setSelectedNode] = useState(null);

  const { data: graphData, isLoading: graphLoading, refetch: refetchGraph } = useQuery({
    queryKey: ['graph'],
    queryFn: () => api.get('/graph').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['graph-stats'],
    queryFn: () => api.get('/graph/stats').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: nodeDetail } = useQuery({
    queryKey: ['graph-node', selectedNode?._id],
    queryFn: () => api.get(`/graph/nodes/${selectedNode._id}`).then((r) => r.data.data),
    enabled: !!selectedNode,
    staleTime: 60_000,
  });

  const topType = stats?.byType?.sort((a, b) => b.count - a.count)?.[0];

  const exportGraph = () => {
    const data = graphData;
    if (!data?.nodes?.length) return toast.info('No graph data to export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'knowledge-graph.json'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Graph exported as JSON');
  };

  const refresh = () => { refetchGraph(); refetchStats(); toast.success('Graph refreshed'); };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('graphTitle')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('graphDesc')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={refresh}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportGraph}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={Network}   label={t('knowledgeNodesLabel')} value={stats?.nodeCount}      colorClass="gradient-brand" />
            <StatCard icon={GitBranch} label={t('relationshipsLabel')}  value={stats?.edgeCount}      colorClass="bg-purple-500" />
            <StatCard icon={Layers}    label={t('topNodeType')}         value={topType?.count}        sub={topType?._id?.replace(/_/g, ' ')} colorClass="bg-green-600" />
            <StatCard icon={Globe}     label={t('nodeTypes')}           value={stats?.byType?.length} colorClass="bg-blue-600" />
          </>
        )}
      </div>

      {/* Type breakdown chips */}
      {stats?.byType?.length > 0 && (
        <div className="filter-panel">
          <div className="flex items-center gap-3 min-w-0">
            <span className="section-label shrink-0 w-16">{t('byType')}</span>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
              {stats.byType.sort((a, b) => b.count - a.count).map((t) => (
                <span
                  key={t._id}
                  className={`filter-chip shrink-0 cursor-default ${TYPE_COLORS[t._id] || ''}`}
                >
                  <span className="capitalize">{t._id?.replace(/_/g, ' ')}</span>
                  <span className="ml-1 opacity-70 font-bold">{t.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Graph canvas */}
      <Card className="border-border/50">
        <CardContent className="p-3 sm:p-4" style={{ height: 580 }}>
          {graphLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center animate-pulse">
                <Network className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium">{t('loadingGraph')}</p>
              <Skeleton className="h-2 w-48 rounded-full" />
            </div>
          ) : (
            <KnowledgeGraph
              nodes={graphData?.nodes || []}
              edges={graphData?.edges || []}
              onNodeClick={setSelectedNode}
            />
          )}
        </CardContent>
      </Card>

      {/* Node detail panel */}
      {nodeDetail && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> {t('nodeDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold">{nodeDetail.node.label}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {nodeDetail.node.nodeType?.replace(/_/g, ' ')}
                  </Badge>
                  {nodeDetail.node.language && nodeDetail.node.language !== 'unknown' && (
                    <Badge variant="outline" className="text-xs capitalize">{nodeDetail.node.language}</Badge>
                  )}
                  {nodeDetail.node.weight > 1 && (
                    <span className="text-xs text-muted-foreground">weight: {nodeDetail.node.weight}</span>
                  )}
                </div>
              </div>
              {nodeDetail.node.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{nodeDetail.node.description}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                {t('connectedNodes')}
                <Badge variant="secondary" className="text-xs ml-auto">{nodeDetail.neighbours?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nodeDetail.neighbours?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">{t('noConnections')}</p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {(nodeDetail.neighbours || []).map((n) => (
                    <div key={n._id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
                      <span className="text-sm font-medium truncate">{n.label}</span>
                      <Badge variant="secondary" className="text-xs capitalize shrink-0">
                        {n.nodeType?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state hint */}
      {!graphLoading && !graphData?.nodes?.length && (
        <div className="text-center py-10 text-muted-foreground">
          <Network className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-1">{t('noGraphNodes')}</p>
          <p className="text-sm">{t('noGraphDesc')}</p>
        </div>
      )}
    </div>
  );
}
