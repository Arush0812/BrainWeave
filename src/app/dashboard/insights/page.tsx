'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import type { InsightResponse, Insight } from '@/types';

const severityConfig = {
  info: {
    icon: '💡',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Info',
  },
  warning: {
    icon: '⚠️',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Warning',
  },
  suggestion: {
    icon: '✨',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    label: 'Suggestion',
  },
};

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const config = severityConfig[insight.severity ?? 'info'];
  const { nodes } = useGraphStore();

  const relatedNodeTitles = insight.relatedNodes
    ?.map((id) => nodes.find((n) => n.id === id)?.title)
    .filter(Boolean)
    .slice(0, 3) as string[] | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -2 }}
      className={`glass-strong rounded-2xl p-6 border ${config.border} ${config.bg} transition-all`}
    >
      <div className="flex items-start gap-4">
        <div className="text-2xl flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-white font-semibold">{insight.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border} flex-shrink-0`}>
              {config.label}
            </span>
            {insight.type === 'ai' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-brand-600/20 to-purple-600/20 text-brand-300 border border-brand-500/20 flex-shrink-0">
                AI
              </span>
            )}
          </div>
          <p className="text-surface-300 text-sm leading-relaxed">{insight.description}</p>

          {relatedNodeTitles && relatedNodeTitles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {relatedNodeTitles.map((title) => (
                <span
                  key={title}
                  className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-surface-400"
                >
                  {title}
                </span>
              ))}
              {(insight.relatedNodes?.length ?? 0) > 3 && (
                <span className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-surface-500">
                  +{(insight.relatedNodes?.length ?? 0) - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function InsightsPage() {
  const { nodes, edges, setNodes, setEdges } = useGraphStore();
  const [insightData, setInsightData] = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch graph data if not already loaded
  useEffect(() => {
    if (nodes.length > 0 || hasFetched) return;

    const fetchGraph = async () => {
      try {
        const [nodesRes, edgesRes] = await Promise.all([
          fetch('/api/nodes'),
          fetch('/api/edges'),
        ]);
        const nodesData = await nodesRes.json();
        const edgesData = await edgesRes.json();
        if (nodesData.nodes) setNodes(nodesData.nodes);
        if (edgesData.edges) setEdges(edgesData.edges);
        setHasFetched(true);
      } catch (err) {
        console.error('Failed to fetch graph:', err);
      }
    };

    fetchGraph();
  }, [nodes.length, hasFetched, setNodes, setEdges]);

  // Auto-fetch local insights
  useEffect(() => {
    if (!hasFetched && nodes.length === 0) return;
    fetchInsights(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFetched, nodes.length]);

  const fetchInsights = async (enhance: boolean) => {
    if (enhance) {
      setEnhancing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/insights${enhance ? '?enhance=true' : ''}`);
      const data = await res.json();
      setInsightData(data);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
    } finally {
      setLoading(false);
      setEnhancing(false);
    }
  };

  const isLoadingAny = loading || enhancing;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Knowledge Insights</h1>
            <p className="text-surface-400">
              Discover patterns, connections, and gaps in your knowledge graph.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchInsights(true)}
            disabled={isLoadingAny}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 glow-purple"
          >
            {enhancing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Enhancing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Enhance with AI
              </>
            )}
          </motion.button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-4 text-sm text-surface-500">
          <span>{nodes.length} nodes</span>
          <span>·</span>
          <span>{edges.length} connections</span>
          {insightData && (
            <>
              <span>·</span>
              <span className={insightData.source === 'ai' ? 'text-brand-400' : 'text-surface-500'}>
                {insightData.source === 'ai' ? '✨ AI-powered' : '⚡ Local analysis'}
              </span>
              <span>·</span>
              <span>Updated {new Date(insightData.generatedAt).toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </motion.div>

      {/* AI note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 p-4 rounded-xl glass border border-white/8 flex items-start gap-3"
      >
        <span className="text-lg">🔒</span>
        <div>
          <p className="text-surface-300 text-sm">
            <strong className="text-white">Local insights are instant and private.</strong>{' '}
            Click &quot;Enhance with AI&quot; to optionally use OpenRouter or Ollama for deeper analysis.
            AI is never required — the app works fully without it.
          </p>
        </div>
      </motion.div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-6 border border-white/8">
              <div className="shimmer h-5 w-48 rounded mb-3" />
              <div className="shimmer h-4 w-full rounded mb-2" />
              <div className="shimmer h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {!loading && insightData && (
        <AnimatePresence mode="wait">
          <motion.div
            key={insightData.generatedAt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {insightData.insights.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🌱</div>
                <p className="text-surface-400">No insights yet. Add more nodes to your graph!</p>
              </div>
            ) : (
              insightData.insights.map((insight, i) => (
                <InsightCard key={insight.id} insight={insight} index={i} />
              ))
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Refresh button */}
      {!loading && insightData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => fetchInsights(false)}
            disabled={isLoadingAny}
            className="text-sm text-surface-500 hover:text-surface-300 transition-colors disabled:opacity-50"
          >
            ↻ Refresh local insights
          </button>
        </motion.div>
      )}
    </div>
  );
}
