export interface GraphNode {
  id: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  x: number;
  y: number;
  z: number;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  userId: string;
  fromId: string;
  toId: string;
  label?: string;
  strength: number;
  createdAt: string;
  updatedAt: string;
}

export interface Insight {
  id: string;
  type: 'local' | 'ai';
  title: string;
  description: string;
  relatedNodes?: string[];
  severity?: 'info' | 'warning' | 'suggestion';
}

export interface InsightResponse {
  insights: Insight[];
  generatedAt: string;
  source: 'local' | 'ai';
}

export interface GraphAnalysis {
  clusters: string[][];
  isolatedNodes: string[];
  nodeImportance: Record<string, number>;
  keywords: Record<string, string[]>;
  relatedGroups: string[][];
}

export interface CreateNodeInput {
  title: string;
  content?: string;
  color?: string;
  x?: number;
  y?: number;
  z?: number;
}

export interface CreateEdgeInput {
  fromId: string;
  toId: string;
  label?: string;
  strength?: number;
}

export interface UpdateNodePositionInput {
  id: string;
  x: number;
  y: number;
  z: number;
}

export type NodeColor =
  | '#6366f1'
  | '#8b5cf6'
  | '#ec4899'
  | '#06b6d4'
  | '#10b981'
  | '#f59e0b'
  | '#ef4444'
  | '#3b82f6';

export const NODE_COLORS: NodeColor[] = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
];
