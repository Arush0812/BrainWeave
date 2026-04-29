/**
 * Web Worker for heavy graph computations
 * Runs off the main thread to keep UI smooth
 */

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

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

function detectClusters(nodes, edges) {
  const adjacency = new Map();
  for (const node of nodes) adjacency.set(node.id, new Set());
  for (const edge of edges) {
    adjacency.get(edge.fromId)?.add(edge.toId);
    adjacency.get(edge.toId)?.add(edge.fromId);
  }

  const visited = new Set();
  const clusters = [];

  function dfs(nodeId, cluster) {
    visited.add(nodeId);
    cluster.push(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (!visited.has(neighbor)) dfs(neighbor, cluster);
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const cluster = [];
      dfs(node.id, cluster);
      clusters.push(cluster);
    }
  }

  return clusters;
}

function computeNodeImportance(nodes, edges) {
  const degree = {};
  for (const node of nodes) degree[node.id] = 0;
  for (const edge of edges) {
    degree[edge.fromId] = (degree[edge.fromId] ?? 0) + 1;
    degree[edge.toId] = (degree[edge.toId] ?? 0) + 1;
  }
  const maxDegree = Math.max(...Object.values(degree), 1);
  const normalized = {};
  for (const [id, d] of Object.entries(degree)) {
    normalized[id] = d / maxDegree;
  }
  return normalized;
}

self.onmessage = function (e) {
  const { type, nodes, edges } = e.data;

  if (type === 'analyze') {
    try {
      const clusters = detectClusters(nodes, edges);
      const nodeImportance = computeNodeImportance(nodes, edges);

      const connected = new Set();
      for (const edge of edges) {
        connected.add(edge.fromId);
        connected.add(edge.toId);
      }
      const isolatedNodes = nodes.filter((n) => !connected.has(n.id)).map((n) => n.id);

      const keywords = {};
      for (const node of nodes) {
        keywords[node.id] = [...new Set(extractKeywords(`${node.title} ${node.content}`))];
      }

      self.postMessage({
        type: 'result',
        data: { clusters, nodeImportance, isolatedNodes, keywords },
      });
    } catch (err) {
      self.postMessage({ type: 'error', error: err.message });
    }
  }
};
