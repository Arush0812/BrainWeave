import { useEffect, useRef, useCallback } from 'react';
import type { GraphNode, GraphEdge, GraphAnalysis } from '@/types';

type WorkerMessage =
  | { type: 'result'; data: GraphAnalysis }
  | { type: 'error'; error: string };

export function useGraphWorker() {
  const workerRef = useRef<Worker | null>(null);
  const callbackRef = useRef<((analysis: GraphAnalysis) => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      workerRef.current = new Worker('/workers/graphWorker.js');
      workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
        if (e.data.type === 'result' && callbackRef.current) {
          callbackRef.current(e.data.data);
        }
      };
    } catch (err) {
      console.warn('Web Worker not available:', err);
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const analyze = useCallback(
    (nodes: GraphNode[], edges: GraphEdge[], callback: (analysis: GraphAnalysis) => void) => {
      callbackRef.current = callback;

      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'analyze', nodes, edges });
      } else {
        // Fallback: run synchronously (import dynamically to avoid SSR issues)
        import('@/lib/graph').then(({ analyzeGraph }) => {
          const result = analyzeGraph(nodes, edges);
          callback(result);
        });
      }
    },
    []
  );

  return { analyze };
}
