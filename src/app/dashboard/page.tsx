'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { nodes, edges, setNodes, setEdges, setLoading } = useGraphStore();
  const [stats, setStats] = useState({ nodes: 0, edges: 0, clusters: 0 });

  useEffect(() => {
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
      } catch (err) {
        console.error('Failed to fetch graph data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setNodes, setEdges, setLoading]);

  useEffect(() => {
    // Simple cluster count (connected components)
    const adjacency = new Map<string, Set<string>>();
    for (const node of nodes) adjacency.set(node.id, new Set());
    for (const edge of edges) {
      adjacency.get(edge.fromId)?.add(edge.toId);
      adjacency.get(edge.toId)?.add(edge.fromId);
    }
    const visited = new Set<string>();
    let clusters = 0;
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        clusters++;
        const stack = [node.id];
        while (stack.length) {
          const id = stack.pop()!;
          if (visited.has(id)) continue;
          visited.add(id);
          for (const neighbor of adjacency.get(id) ?? []) {
            if (!visited.has(neighbor)) stack.push(neighbor);
          }
        }
      }
    }
    setStats({ nodes: nodes.length, edges: edges.length, clusters });
  }, [nodes, edges]);

  const recentNodes = [...nodes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statCards = [
    {
      label: 'Total Nodes',
      value: stats.nodes,
      icon: '🔵',
      color: 'from-brand-600/20 to-brand-800/10',
      border: 'border-brand-500/20',
    },
    {
      label: 'Connections',
      value: stats.edges,
      icon: '🔗',
      color: 'from-purple-600/20 to-purple-800/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Clusters',
      value: stats.clusters,
      icon: '🌐',
      color: 'from-cyan-600/20 to-cyan-800/10',
      border: 'border-cyan-500/20',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {session?.user?.name?.split(' ')[0] ?? 'Explorer'} 👋
        </h1>
        <p className="text-surface-400 mt-2">
          Your knowledge graph is growing. Here&apos;s an overview.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass rounded-2xl p-6 bg-gradient-to-br ${card.color} border ${card.border}`}
          >
            <div className="text-3xl mb-3">{card.icon}</div>
            <div className="text-4xl font-bold text-white mb-1">{card.value}</div>
            <div className="text-surface-400 text-sm">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link href="/dashboard/graph">
            <div className="glass-strong rounded-2xl p-6 border border-white/8 hover:border-brand-500/30 transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-surface-500 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Open 3D Graph</h3>
              <p className="text-surface-400 text-sm">
                Explore and edit your knowledge graph in an immersive 3D environment.
              </p>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link href="/dashboard/insights">
            <div className="glass-strong rounded-2xl p-6 border border-white/8 hover:border-purple-500/30 transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-surface-500 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">View Insights</h3>
              <p className="text-surface-400 text-sm">
                Discover patterns, connections, and gaps in your knowledge graph.
              </p>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Recent nodes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-strong rounded-2xl border border-white/8 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Nodes</h2>
          <Link href="/dashboard/graph" className="text-brand-400 hover:text-brand-300 text-sm transition-colors">
            View all →
          </Link>
        </div>

        {recentNodes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-4">🌱</div>
            <p className="text-surface-400 mb-4">No nodes yet. Start building your knowledge graph!</p>
            <Link href="/dashboard/graph">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-medium text-sm"
              >
                Create First Node
              </motion.button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentNodes.map((node, i) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="px-6 py-4 flex items-center gap-4 hover:bg-white/3 transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: node.color, boxShadow: `0 0 8px ${node.color}80` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{node.title}</p>
                  {node.content && (
                    <p className="text-surface-500 text-sm truncate mt-0.5">{node.content}</p>
                  )}
                </div>
                <span className="text-surface-600 text-xs flex-shrink-0">
                  {new Date(node.createdAt).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
