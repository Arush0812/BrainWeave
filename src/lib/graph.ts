import type { GraphNode, GraphEdge, GraphAnalysis } from '@/types';

// ─── Cluster Detection (DFS) ────────────────────────────────────────────────

export function detectClusters(nodes: GraphNode[], edges: GraphEdge[]): string[][] {
  const adjacency = new Map<string, Set<string>>();

  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }

  for (const edge of edges) {
    adjacency.get(edge.fromId)?.add(edge.toId);
    adjacency.get(edge.toId)?.add(edge.fromId);
  }

  const visited = new Set<string>();
  const clusters: string[][] = [];

  function dfs(nodeId: string, cluster: string[]) {
    visited.add(nodeId);
    cluster.push(nodeId);
    const neighbors = Array.from(adjacency.get(nodeId) ?? []);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, cluster);
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const cluster: string[] = [];
      dfs(node.id, cluster);
      clusters.push(cluster);
    }
  }

  return clusters;
}

// ─── Isolated Nodes ──────────────────────────────────────────────────────────

export function findIsolatedNodes(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const connectedSet = new Set<string>();
  for (const edge of edges) {
    connectedSet.add(edge.fromId);
    connectedSet.add(edge.toId);
  }
  return nodes.filter((n) => !connectedSet.has(n.id)).map((n) => n.id);
}

// ─── Node Importance (Degree Centrality) ─────────────────────────────────────

export function computeNodeImportance(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Record<string, number> {
  const degree: Record<string, number> = {};

  for (const node of nodes) {
    degree[node.id] = 0;
  }

  for (const edge of edges) {
    degree[edge.fromId] = (degree[edge.fromId] ?? 0) + 1;
    degree[edge.toId] = (degree[edge.toId] ?? 0) + 1;
  }

  const maxDegree = Math.max(...Object.values(degree), 1);
  const normalized: Record<string, number> = {};
  for (const [id, d] of Object.entries(degree)) {
    normalized[id] = d / maxDegree;
  }

  return normalized;
}

// ─── Keyword Extraction ───────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they',
  'my', 'your', 'his', 'her', 'our', 'their', 'what', 'which', 'who',
  'how', 'when', 'where', 'why', 'not', 'no', 'so', 'if', 'as', 'up',
  'out', 'about', 'into', 'than', 'then', 'also', 'just', 'more', 'very',
]);

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

export function extractNodeKeywords(nodes: GraphNode[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const node of nodes) {
    const text = `${node.title} ${node.content}`;
    result[node.id] = Array.from(new Set(extractKeywords(text)));
  }
  return result;
}

// ─── Group Nodes by Similarity ────────────────────────────────────────────────

export function groupNodesBySimilarity(
  nodes: GraphNode[],
  keywords: Record<string, string[]>
): string[][] {
  const groups: string[][] = [];
  const assigned = new Set<string>();

  for (const node of nodes) {
    if (assigned.has(node.id)) continue;

    const group = [node.id];
    assigned.add(node.id);
    const nodeKws = new Set(keywords[node.id] ?? []);

    for (const other of nodes) {
      if (assigned.has(other.id)) continue;
      const otherKws = keywords[other.id] ?? [];
      const shared = otherKws.filter((k) => nodeKws.has(k));
      if (shared.length >= 2) {
        group.push(other.id);
        assigned.add(other.id);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}

// ─── Full Analysis ────────────────────────────────────────────────────────────

export function analyzeGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphAnalysis {
  const clusters = detectClusters(nodes, edges);
  const isolatedNodes = findIsolatedNodes(nodes, edges);
  const nodeImportance = computeNodeImportance(nodes, edges);
  const keywords = extractNodeKeywords(nodes);
  const relatedGroups = groupNodesBySimilarity(nodes, keywords);

  return {
    clusters,
    isolatedNodes,
    nodeImportance,
    keywords,
    relatedGroups,
  };
}

// ─── Keyword Frequency ────────────────────────────────────────────────────────

export function computeKeywordFrequency(nodes: GraphNode[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const node of nodes) {
    const kws = extractKeywords(`${node.title} ${node.content}`);
    for (const kw of kws) {
      freq[kw] = (freq[kw] ?? 0) + 1;
    }
  }
  return freq;
}

// ─── Missing Connections ──────────────────────────────────────────────────────

export function findMissingConnections(
  nodes: GraphNode[],
  edges: GraphEdge[],
  keywords: Record<string, string[]>
): Array<{ from: string; to: string; reason: string }> {
  const existingEdges = new Set(
    edges.map((e) => `${e.fromId}-${e.toId}`)
  );
  const missing: Array<{ from: string; to: string; reason: string }> = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (
        existingEdges.has(`${a.id}-${b.id}`) ||
        existingEdges.has(`${b.id}-${a.id}`)
      ) {
        continue;
      }

      const aKws = new Set(keywords[a.id] ?? []);
      const bKws = keywords[b.id] ?? [];
      const shared = bKws.filter((k) => aKws.has(k));

      if (shared.length >= 2) {
        missing.push({
          from: a.id,
          to: b.id,
          reason: `Shared topics: ${shared.slice(0, 3).join(', ')}`,
        });
      }
    }
  }

  return missing.slice(0, 10);
}
