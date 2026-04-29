'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { NODE_COLORS } from '@/types';
import type { GraphNode } from '@/types';

interface NodePanelProps {
  onClose: () => void;
}

export function NodePanel({ onClose }: NodePanelProps) {
  const {
    selectedNodeId,
    nodes,
    edges,
    getNodeById,
    getConnectedNodes,
    updateNode,
    deleteNode,
    setConnectingFrom,
    connectingFromId,
  } = useGraphStore();

  const node = selectedNodeId ? getNodeById(selectedNodeId) : null;
  const connectedNodes = selectedNodeId ? getConnectedNodes(selectedNodeId) : [];
  const nodeEdges = edges.filter(
    (e) => e.fromId === selectedNodeId || e.toId === selectedNodeId
  );

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content);
      setColor(node.color);
      setIsEditing(false);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, color }),
      });
      const data = await res.json();
      if (data.node) {
        updateNode(node.id, { title, content, color });
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to update node:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${node.title}"? This will also remove all its connections.`)) return;

    try {
      await fetch(`/api/nodes/${node.id}`, { method: 'DELETE' });
      deleteNode(node.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete node:', err);
    }
  };

  const handleDeleteEdge = async (edgeId: string) => {
    try {
      await fetch(`/api/edges/${edgeId}`, { method: 'DELETE' });
      useGraphStore.getState().deleteEdge(edgeId);
    } catch (err) {
      console.error('Failed to delete edge:', err);
    }
  };

  const handleStartConnect = () => {
    setConnectingFrom(node.id);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-80 glass-strong border-l border-white/8 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: node.color, boxShadow: `0 0 8px ${node.color}` }}
          />
          <span className="text-sm font-medium text-surface-300">Node Details</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-surface-400 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-2 uppercase tracking-wider">
            Title
          </label>
          {isEditing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 outline-none transition-all"
              autoFocus
            />
          ) : (
            <p className="text-white font-semibold text-lg leading-tight">{node.title}</p>
          )}
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-2 uppercase tracking-wider">
            Content
          </label>
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-brand-500 outline-none transition-all resize-none"
              placeholder="Add notes, details, or context..."
            />
          ) : (
            <p className="text-surface-300 text-sm leading-relaxed">
              {node.content || <span className="text-surface-600 italic">No content</span>}
            </p>
          )}
        </div>

        {/* Color picker */}
        {isEditing && (
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-2 uppercase tracking-wider">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {NODE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-900 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ background: c, boxShadow: `0 0 8px ${c}60` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Connections */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-2 uppercase tracking-wider">
            Connections ({connectedNodes.length})
          </label>
          {connectedNodes.length === 0 ? (
            <p className="text-surface-600 text-sm italic">No connections yet</p>
          ) : (
            <div className="space-y-2">
              {connectedNodes.map((connected) => {
                const edge = nodeEdges.find(
                  (e) => e.fromId === connected.id || e.toId === connected.id
                );
                return (
                  <div
                    key={connected.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/3 border border-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: connected.color }}
                      />
                      <span className="text-surface-300 text-sm truncate">{connected.title}</span>
                    </div>
                    {edge && (
                      <button
                        onClick={() => handleDeleteEdge(edge.id)}
                        className="w-5 h-5 rounded flex items-center justify-center text-surface-600 hover:text-red-400 transition-colors flex-shrink-0"
                        title="Remove connection"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="text-xs text-surface-600 space-y-1">
          <p>Created: {new Date(node.createdAt).toLocaleDateString()}</p>
          <p>Updated: {new Date(node.updatedAt).toLocaleDateString()}</p>
          <p>Position: ({node.x.toFixed(1)}, {node.y.toFixed(1)}, {node.z.toFixed(1)})</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-white/8 space-y-2">
        {isEditing ? (
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEditing(false)}
              className="flex-1 py-2 rounded-lg glass border border-white/10 text-surface-300 text-sm"
            >
              Cancel
            </motion.button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsEditing(true)}
                className="flex-1 py-2 rounded-lg glass border border-white/10 text-surface-300 text-sm hover:text-white hover:border-white/20 transition-all"
              >
                Edit
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartConnect}
                className="flex-1 py-2 rounded-lg bg-brand-600/20 border border-brand-500/30 text-brand-300 text-sm hover:bg-brand-600/30 transition-all"
              >
                Connect
              </motion.button>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDelete}
              className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-all"
            >
              Delete Node
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}
