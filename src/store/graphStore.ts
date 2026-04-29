import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GraphNode, GraphEdge, CreateNodeInput, CreateEdgeInput } from '@/types';

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  connectingFromId: string | null;

  // Actions
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  addNode: (node: GraphNode) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: GraphEdge) => void;
  deleteEdge: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setConnectingFrom: (id: string | null) => void;
  updateNodePosition: (id: string, x: number, y: number, z: number) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;
  getNodeById: (id: string) => GraphNode | undefined;
  getEdgesForNode: (id: string) => GraphEdge[];
  getConnectedNodes: (id: string) => GraphNode[];
  reset: () => void;
}

const initialState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  isLoading: false,
  isSyncing: false,
  error: null,
  connectingFromId: null,
};

export const useGraphStore = create<GraphState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    addNode: (node) =>
      set((state) => ({ nodes: [...state.nodes, node] })),

    updateNode: (id, updates) =>
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      })),

    deleteNode: (id) =>
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.fromId !== id && e.toId !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      })),

    addEdge: (edge) =>
      set((state) => ({ edges: [...state.edges, edge] })),

    deleteEdge: (id) =>
      set((state) => ({ edges: state.edges.filter((e) => e.id !== id) })),

    setSelectedNode: (id) => set({ selectedNodeId: id }),
    setHoveredNode: (id) => set({ hoveredNodeId: id }),
    setConnectingFrom: (id) => set({ connectingFromId: id }),

    updateNodePosition: (id, x, y, z) =>
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y, z } : n)),
      })),

    setLoading: (isLoading) => set({ isLoading }),
    setSyncing: (isSyncing) => set({ isSyncing }),
    setError: (error) => set({ error }),

    getNodeById: (id) => get().nodes.find((n) => n.id === id),

    getEdgesForNode: (id) =>
      get().edges.filter((e) => e.fromId === id || e.toId === id),

    getConnectedNodes: (id) => {
      const { nodes, edges } = get();
      const connectedIds = new Set<string>();
      for (const edge of edges) {
        if (edge.fromId === id) connectedIds.add(edge.toId);
        if (edge.toId === id) connectedIds.add(edge.fromId);
      }
      return nodes.filter((n) => connectedIds.has(n.id));
    },

    reset: () => set(initialState),
  }))
);
