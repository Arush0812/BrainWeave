'use client';

import { useEffect, useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { NodePanel } from '@/components/graph/NodePanel';
import { CreateNodeModal } from '@/components/graph/CreateNodeModal';

// Lazy load the heavy 3D scene
const GraphScene = lazy(() =>
  import('@/components/graph/GraphScene').then((m) => ({ default: m.GraphScene }))
);

function GraphLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-surface-950">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent mx-auto mb-4"
        />
        <p className="text-surface-400 text-sm">Loading 3D Graph...</p>
      </div>
    </div>
  );
}

export default function GraphPage() {
  const {
    nodes,
    edges,
    selectedNodeId,
    connectingFromId,
    isLoading,
    setNodes,
    setEdges,
    setLoading,
    setSelectedNode,
    setConnectingFrom,
  } = useGraphStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (hasFetched) return;

    const fetchData = async () => {
      setLoading(true);
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
        console.error('Failed to fetch graph data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hasFetched, setNodes, setEdges, setLoading]);

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col bg-surface-950 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 animated-gradient opacity-30 pointer-events-none" />

      {/* Toolbar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 glass border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="text-sm text-surface-400">
            <span className="text-white font-medium">{nodes.length}</span> nodes ·{' '}
            <span className="text-white font-medium">{edges.length}</span> edges
          </div>

          {connectingFromId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600/20 border border-brand-500/30 text-brand-300 text-sm"
            >
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              Click another node to connect
              <button
                onClick={() => setConnectingFrom(null)}
                className="ml-1 text-brand-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white text-sm font-medium hover:from-brand-500 hover:to-purple-500 transition-all glow-indigo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Node
          </motion.button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          {isLoading ? (
            <GraphLoadingFallback />
          ) : (
            <Suspense fallback={<GraphLoadingFallback />}>
              <GraphScene />
            </Suspense>
          )}

          {/* Empty state overlay */}
          {!isLoading && nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center pointer-events-auto"
              >
                <div className="text-6xl mb-4">🧠</div>
                <h3 className="text-2xl font-bold text-white mb-3">Your graph is empty</h3>
                <p className="text-surface-400 mb-6 max-w-sm">
                  Create your first node to start building your 3D knowledge graph.
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold glow-indigo"
                >
                  Create First Node
                </motion.button>
              </motion.div>
            </div>
          )}

          {/* Controls hint */}
          {!isLoading && nodes.length > 0 && (
            <div className="absolute bottom-4 left-4 text-xs text-surface-600 space-y-1 pointer-events-none">
              <p>🖱️ Drag to rotate · Scroll to zoom · Right-click to pan</p>
              <p>Click node to select · Drag node to move</p>
            </div>
          )}
        </div>

        {/* Node panel */}
        <AnimatePresence>
          {selectedNodeId && (
            <NodePanel onClose={() => setSelectedNode(null)} />
          )}
        </AnimatePresence>
      </div>

      {/* Create node modal */}
      <CreateNodeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
