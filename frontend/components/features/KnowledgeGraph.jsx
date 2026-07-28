'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Search, X, Filter, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NODE_COLORS = {
  upload:           '#c2410c',
  story:            '#b45309',
  folktale:         '#7c3aed',
  proverb:          '#0369a1',
  festival:         '#be185d',
  community:        '#065f46',
  language:         '#1d4ed8',
  person:           '#92400e',
  location:         '#166534',
  food:             '#b45309',
  song:             '#6d28d9',
  historical_event: '#991b1b',
  tradition:        '#0f766e',
  artifact:         '#78350f',
  animal:           '#15803d',
  plant:            '#16a34a',
  moral_lesson:     '#7c3aed',
  theme:            '#0891b2',
};

const EDGE_COLORS = {
  SIMILAR_TO:    '#f59e0b',
  SAME_THEME:    '#8b5cf6',
  SAME_MORAL:    '#ec4899',
  RELATED_TO:    '#6b7280',
  MENTIONS:      '#3b82f6',
  BELONGS_TO:    '#10b981',
  INSPIRED_BY:   '#f97316',
  REFERENCES:    '#06b6d4',
  PART_OF:       '#84cc16',
  LOCATED_IN:    '#22c55e',
  USES:          '#a78bfa',
  CELEBRATED_IN: '#fb7185',
};

const NODE_RADIUS = 18;
const REPULSION   = 4000;
const ATTRACTION  = 0.04;
const DAMPING     = 0.85;
const ITERATIONS  = 80;

function layoutNodes(nodes, edges, width, height) {
  if (!nodes.length) return [];
  const positions = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const r = Math.min(width, height) * 0.35;
    return { id: n._id, x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle), vx: 0, vy: 0 };
  });
  const posMap = Object.fromEntries(positions.map((p) => [p.id, p]));
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i], b = positions[j];
        const dx = b.x - a.x || 0.01, dy = b.y - a.y || 0.01;
        const dist2 = dx * dx + dy * dy;
        const force = REPULSION / dist2;
        const fx = (dx / Math.sqrt(dist2)) * force, fy = (dy / Math.sqrt(dist2)) * force;
        a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
      }
    }
    for (const edge of edges) {
      const a = posMap[edge.from?.toString?.() || edge.from];
      const b = posMap[edge.to?.toString?.() || edge.to];
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      a.vx += dx * ATTRACTION; a.vy += dy * ATTRACTION;
      b.vx -= dx * ATTRACTION; b.vy -= dy * ATTRACTION;
    }
    for (const p of positions) {
      p.vx *= DAMPING; p.vy *= DAMPING;
      p.x = Math.max(NODE_RADIUS + 10, Math.min(width - NODE_RADIUS - 10, p.x + p.vx));
      p.y = Math.max(NODE_RADIUS + 10, Math.min(height - NODE_RADIUS - 10, p.y + p.vy));
    }
  }
  return positions;
}

export default function KnowledgeGraph({ nodes = [], edges = [], onNodeClick }) {
  const svgRef        = useRef(null);
  const containerRef  = useRef(null);
  const [positions, setPositions]   = useState([]);
  const [zoom, setZoom]             = useState(1);
  const [pan, setPan]               = useState({ x: 0, y: 0 });
  const [dragging, setDragging]     = useState(null);
  const [hovered, setHovered]       = useState(null);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('all');
  const [svgSize, setSvgSize]       = useState({ w: 800, h: 520 });
  const [fullscreen, setFullscreen] = useState(false);
  const isPanning  = useRef(false);
  const panStart   = useRef({ x: 0, y: 0 });
  const lastTouch  = useRef(null);
  const pinchDist  = useRef(null);

  // Measure container
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSvgSize({ w: width || 800, h: height || 520 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Layout
  useEffect(() => {
    if (!nodes.length) return;
    setPositions(layoutNodes(nodes, edges, svgSize.w, svgSize.h));
  }, [nodes, edges, svgSize]);

  const posMap = Object.fromEntries(positions.map((p) => [p.id, p]));

  // Filter
  const visibleNodes = nodes.filter((n) => {
    const matchType   = filterType === 'all' || n.nodeType === filterType;
    const matchSearch = !search || n.label.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });
  const visibleIds   = new Set(visibleNodes.map((n) => n._id));
  const visibleEdges = edges.filter(
    (e) => visibleIds.has(e.from?.toString?.() || e.from) && visibleIds.has(e.to?.toString?.() || e.to)
  );

  const connectedIds = selected
    ? new Set(
        edges
          .filter((e) => (e.from?.toString?.() || e.from) === selected || (e.to?.toString?.() || e.to) === selected)
          .flatMap((e) => [e.from?.toString?.() || e.from, e.to?.toString?.() || e.to])
      )
    : null;

  // Mouse drag node
  const onNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    setDragging(nodeId);
    setSelected(nodeId);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (dragging) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top  - pan.y) / zoom;
      setPositions((prev) => prev.map((p) => (p.id === dragging ? { ...p, x, y, vx: 0, vy: 0 } : p)));
    } else if (isPanning.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
  }, [dragging, pan, zoom]);

  const onMouseUp = useCallback(() => { setDragging(null); isPanning.current = false; }, []);

  const onSvgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'svg') {
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelected(null);
    }
  }, [pan]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  // Touch support
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isPanning.current = true;
      panStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [pan]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isPanning.current) {
      setPan({ x: e.touches[0].clientX - panStart.current.x, y: e.touches[0].clientY - panStart.current.y });
    } else if (e.touches.length === 2 && pinchDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist - pinchDist.current;
      setZoom((z) => Math.max(0.3, Math.min(3, z + delta * 0.005)));
      pinchDist.current = dist;
    }
  }, []);

  const onTouchEnd = useCallback(() => { isPanning.current = false; pinchDist.current = null; }, []);

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); setSelected(null); };

  const nodeTypes    = [...new Set(nodes.map((n) => n.nodeType))];
  const selectedNode = selected ? nodes.find((n) => n._id === selected) : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col gap-2 ${fullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {/* Search */}
        <div className="relative min-w-0 flex-1" style={{ minWidth: 120 }}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Search nodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')} aria-label="Clear search">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-32 text-xs shrink-0">
            <Filter className="w-3 h-3 mr-1 shrink-0" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {nodeTypes.map((t) => (
              <SelectItem key={t} value={t} className="capitalize text-xs">{t.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Node count */}
        {nodes.length > 0 && (
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
            <span className="font-medium text-foreground">{visibleNodes.length}</span>/{nodes.length} nodes
          </span>
        )}

        {/* Zoom + reset + fullscreen */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <button
            className="icon-btn w-8 h-8"
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            className="icon-btn w-8 h-8"
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button className="icon-btn w-8 h-8" onClick={reset} aria-label="Reset view">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            className="icon-btn w-8 h-8"
            onClick={() => setFullscreen((v) => !v)}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute top-12 left-3 z-10 bg-card/90 border border-border/50 rounded-lg px-2 py-1 text-xs text-muted-foreground pointer-events-none">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Graph canvas */}
      <div className="relative flex-1 rounded-xl border border-border/50 bg-muted/20 overflow-hidden" style={{ minHeight: 400 }}>
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing select-none touch-none"
          onMouseDown={onSvgMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {visibleEdges.map((edge, i) => {
              const fromId = edge.from?.toString?.() || edge.from;
              const toId   = edge.to?.toString?.()   || edge.to;
              const a = posMap[fromId], b = posMap[toId];
              if (!a || !b) return null;
              const isHighlighted = !selected || (connectedIds?.has(fromId) && connectedIds?.has(toId));
              return (
                <line
                  key={edge._id || i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={EDGE_COLORS[edge.relationship] || '#6b7280'}
                  strokeWidth={isHighlighted ? 1.5 : 0.8}
                  strokeOpacity={isHighlighted ? 0.7 : 0.15}
                  strokeDasharray={edge.relationship === 'SIMILAR_TO' ? '4 3' : undefined}
                />
              );
            })}

            {/* Nodes */}
            {visibleNodes.map((node) => {
              const pos = posMap[node._id];
              if (!pos) return null;
              const color      = NODE_COLORS[node.nodeType] || '#6b7280';
              const isSelected = selected === node._id;
              const isConnected = connectedIds?.has(node._id);
              const isDimmed   = selected && !isSelected && !isConnected;
              const isHov      = hovered === node._id;
              return (
                <g
                  key={node._id}
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: 'pointer', opacity: isDimmed ? 0.2 : 1, transition: 'opacity 0.2s' }}
                  onMouseDown={(e) => onNodeMouseDown(e, node._id)}
                  onMouseEnter={() => setHovered(node._id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => { setSelected(node._id); onNodeClick?.(node); }}
                >
                  {(isHov || isSelected) && (
                    <circle r={NODE_RADIUS + 6} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={1} strokeOpacity={0.35} />
                  )}
                  <circle
                    r={NODE_RADIUS}
                    fill={color}
                    fillOpacity={isSelected ? 1 : 0.85}
                    stroke={isSelected ? '#fff' : 'transparent'}
                    strokeWidth={isSelected ? 2.5 : 0}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fill="#fff"
                    fontWeight="600"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {node.label.slice(0, 10)}{node.label.length > 10 ? '…' : ''}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected node panel (overlay) */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="absolute top-3 right-3 w-52 sm:w-60"
            >
              <Card className="border-border/60 shadow-xl">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight">{selectedNode.label}</p>
                    <button
                      onClick={() => setSelected(null)}
                      className="icon-btn w-6 h-6 shrink-0"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant="secondary"
                      className="text-xs capitalize"
                      style={{
                        backgroundColor: (NODE_COLORS[selectedNode.nodeType] || '#6b7280') + '22',
                        color: NODE_COLORS[selectedNode.nodeType] || '#6b7280',
                      }}
                    >
                      {selectedNode.nodeType?.replace(/_/g, ' ')}
                    </Badge>
                    {selectedNode.language && selectedNode.language !== 'unknown' && (
                      <Badge variant="outline" className="text-xs capitalize">{selectedNode.language}</Badge>
                    )}
                  </div>
                  {selectedNode.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{selectedNode.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Weight: {selectedNode.weight ?? 1}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!nodes.length && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center opacity-25">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-white" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" />
                <circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" />
                <line x1="12" y1="9" x2="4" y2="7" /><line x1="12" y1="9" x2="20" y2="7" />
                <line x1="12" y1="15" x2="4" y2="17" /><line x1="12" y1="15" x2="20" y2="17" />
              </svg>
            </div>
            <p className="text-sm font-medium">No knowledge nodes yet</p>
            <p className="text-xs">Upload content to start building the knowledge graph</p>
          </div>
        )}

        {/* Touch hint */}
        {nodes.length > 0 && (
          <div className="absolute bottom-3 left-3 text-xs text-muted-foreground/60 pointer-events-none sm:hidden">
            Pinch to zoom · Drag to pan
          </div>
        )}
      </div>

      {/* Legend */}
      {nodes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {nodeTypes.slice(0, 10).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all ${
                filterType === type
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border/40 hover:border-border text-muted-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NODE_COLORS[type] || '#6b7280' }} />
              <span className="capitalize">{type.replace(/_/g, ' ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
