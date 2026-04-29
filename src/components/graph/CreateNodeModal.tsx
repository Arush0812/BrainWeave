'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/store/graphStore';
import { NODE_COLORS } from '@/types';

interface CreateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateNodeModal({ isOpen, onClose }: CreateNodeModalProps) {
  const { addNode, nodes } = useGraphStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError('');

    // Spread nodes in 3D space
    const angle = (nodes.length * 137.5 * Math.PI) / 180;
    const radius = 2 + nodes.length * 0.3;
    const x = Math.cos(angle) * radius;
    const y = (Math.random() - 0.5) * 4;
    const z = Math.sin(angle) * radius;

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content, color, x, y, z }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to create node');
        return;
      }

      addNode(data.node);
      setTitle('');
      setContent('');
      setColor('#6366f1');
      onClose();
    } catch {
      setError('Failed to create node. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="glass-strong rounded-2xl border border-white/12 w-full max-w-md shadow-2xl pointer-events-auto">
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}30`, border: `1px solid ${color}50` }}
                  >
                    <svg className="w-4 h-4" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-white">Create Node</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-surface-400 hover:text-white transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    autoFocus
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-surface-500 focus:border-brand-500 outline-none transition-all"
                    placeholder="Node title..."
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={3}
                    maxLength={5000}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-surface-500 focus:border-brand-500 outline-none transition-all resize-none"
                    placeholder="Add notes, details, or context..."
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-3">
                    Color
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {NODE_COLORS.map((c) => (
                      <motion.button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        className={`w-8 h-8 rounded-full transition-all ${
                          color === c
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-900 scale-110'
                            : ''
                        }`}
                        style={{
                          background: c,
                          boxShadow: color === c ? `0 0 12px ${c}` : `0 0 6px ${c}60`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <motion.button
                    type="button"
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 rounded-xl glass border border-white/10 text-surface-300 font-medium hover:text-white hover:border-white/20 transition-all"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={loading || !title.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold hover:from-brand-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ boxShadow: `0 0 20px ${color}40` }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      'Create Node'
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
