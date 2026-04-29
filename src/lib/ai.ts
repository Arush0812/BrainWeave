import type { GraphNode, GraphEdge, InsightResponse, Insight } from '@/types';
import { analyzeGraph, computeKeywordFrequency, findMissingConnections, extractNodeKeywords } from './graph';

const AI_TIMEOUT_MS = 3000;

// ─── Local Insight Engine ─────────────────────────────────────────────────────

export function generateLocalInsights(
  nodes: GraphNode[],
  edges: GraphEdge[]
): InsightResponse {
  if (nodes.length === 0) {
    return {
      insights: [
        {
          id: 'empty',
          type: 'local',
          title: 'Start Building Your Knowledge Graph',
          description: 'Create your first node to begin mapping your ideas and knowledge.',
          severity: 'info',
        },
      ],
      generatedAt: new Date().toISOString(),
      source: 'local',
    };
  }

  const analysis = analyzeGraph(nodes, edges);
  const keywordFreq = computeKeywordFrequency(nodes);
  const keywords = extractNodeKeywords(nodes);
  const missingConnections = findMissingConnections(nodes, edges, keywords);
  const insights: Insight[] = [];

  // Isolated nodes
  if (analysis.isolatedNodes.length > 0) {
    const isolatedTitles = analysis.isolatedNodes
      .map((id) => nodes.find((n) => n.id === id)?.title ?? id)
      .slice(0, 3);

    insights.push({
      id: 'isolated',
      type: 'local',
      title: `${analysis.isolatedNodes.length} Isolated Node${analysis.isolatedNodes.length > 1 ? 's' : ''} Found`,
      description: `These nodes have no connections: ${isolatedTitles.join(', ')}${analysis.isolatedNodes.length > 3 ? ` and ${analysis.isolatedNodes.length - 3} more` : ''}. Consider linking them to related ideas.`,
      relatedNodes: analysis.isolatedNodes,
      severity: 'warning',
    });
  }

  // Related but unconnected nodes
  if (missingConnections.length > 0) {
    const example = missingConnections[0];
    const fromTitle = nodes.find((n) => n.id === example.from)?.title ?? '';
    const toTitle = nodes.find((n) => n.id === example.to)?.title ?? '';

    insights.push({
      id: 'missing-connections',
      type: 'local',
      title: `${missingConnections.length} Potential Connection${missingConnections.length > 1 ? 's' : ''} Detected`,
      description: `"${fromTitle}" and "${toTitle}" share common topics (${example.reason}) but aren't connected. ${missingConnections.length > 1 ? `Found ${missingConnections.length} similar pairs.` : ''}`,
      relatedNodes: Array.from(new Set(missingConnections.flatMap((m) => [m.from, m.to]))),
      severity: 'suggestion',
    });
  }

  // Frequent keywords
  const topKeywords = Object.entries(keywordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (topKeywords.length > 0) {
    const kwList = topKeywords.map(([kw, count]) => `"${kw}" (${count}x)`).join(', ');
    insights.push({
      id: 'frequent-topics',
      type: 'local',
      title: 'Dominant Topics in Your Graph',
      description: `These topics appear most frequently across your nodes: ${kwList}. They may represent core themes worth exploring further.`,
      severity: 'info',
    });
  }

  // Cluster analysis
  const multiNodeClusters = analysis.clusters.filter((c) => c.length > 1);
  if (multiNodeClusters.length > 1) {
    insights.push({
      id: 'clusters',
      type: 'local',
      title: `${multiNodeClusters.length} Knowledge Clusters Identified`,
      description: `Your graph has ${multiNodeClusters.length} distinct connected groups. The largest cluster has ${Math.max(...multiNodeClusters.map((c) => c.length))} nodes. Consider bridging clusters to create richer connections.`,
      severity: 'info',
    });
  }

  // Similar groups
  if (analysis.relatedGroups.length > 0) {
    const group = analysis.relatedGroups[0];
    const groupTitles = group
      .map((id) => nodes.find((n) => n.id === id)?.title ?? id)
      .slice(0, 3);

    insights.push({
      id: 'similar-groups',
      type: 'local',
      title: 'Semantically Similar Nodes',
      description: `Nodes like ${groupTitles.join(', ')} share similar content and may benefit from being grouped or connected.`,
      relatedNodes: group,
      severity: 'suggestion',
    });
  }

  // Hub nodes
  const hubNodes = Object.entries(analysis.nodeImportance)
    .filter(([, importance]) => importance > 0.5)
    .map(([id]) => id);

  if (hubNodes.length > 0) {
    const hubTitles = hubNodes
      .map((id) => nodes.find((n) => n.id === id)?.title ?? id)
      .slice(0, 3);

    insights.push({
      id: 'hub-nodes',
      type: 'local',
      title: `${hubNodes.length} Hub Node${hubNodes.length > 1 ? 's' : ''} Detected`,
      description: `${hubTitles.join(', ')} ${hubNodes.length > 1 ? 'are' : 'is'} highly connected and act as knowledge hubs. These are central to your graph's structure.`,
      relatedNodes: hubNodes,
      severity: 'info',
    });
  }

  return {
    insights,
    generatedAt: new Date().toISOString(),
    source: 'local',
  };
}

// ─── AI Enhancement ───────────────────────────────────────────────────────────

async function callWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI request timed out')), ms)
  );
  return Promise.race([promise, timeout]);
}

async function tryOpenRouter(
  nodes: GraphNode[],
  edges: GraphEdge[],
  apiKey: string
): Promise<string> {
  const nodesSummary = nodes
    .slice(0, 20)
    .map((n) => `- ${n.title}: ${n.content.slice(0, 100)}`)
    .join('\n');

  const edgesSummary = edges
    .slice(0, 20)
    .map((e) => {
      const from = nodes.find((n) => n.id === e.fromId)?.title ?? e.fromId;
      const to = nodes.find((n) => n.id === e.toId)?.title ?? e.toId;
      return `${from} → ${to}`;
    })
    .join(', ');

  const prompt = `You are an intelligent knowledge analyst. Analyze this knowledge graph and provide 3-5 concise insights.

Nodes:
${nodesSummary}

Connections: ${edgesSummary || 'None'}

Summarize themes, find connections, highlight gaps, and suggest improvements. Be specific and actionable. Format as JSON array with objects having: title, description, severity (info/warning/suggestion).`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json();
  return data.choices[0]?.message?.content ?? '';
}

async function tryOllama(nodes: GraphNode[], edges: GraphEdge[]): Promise<string> {
  const nodesSummary = nodes
    .slice(0, 10)
    .map((n) => `- ${n.title}: ${n.content.slice(0, 80)}`)
    .join('\n');

  const prompt = `Analyze this knowledge graph and give 3 insights as JSON array with title, description, severity fields:\n${nodesSummary}`;

  const response = await fetch(
    `${process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'}/api/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        prompt,
        stream: false,
      }),
    }
  );

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json();
  return data.response ?? '';
}

function parseAIResponse(raw: string): Insight[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item.title && item.description)
      .map((item, i) => ({
        id: `ai-${i}`,
        type: 'ai' as const,
        title: String(item.title),
        description: String(item.description),
        severity: (['info', 'warning', 'suggestion'].includes(item.severity)
          ? item.severity
          : 'info') as Insight['severity'],
      }));
  } catch {
    return [];
  }
}

export async function generateAIInsights(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Promise<InsightResponse> {
  const localFallback = generateLocalInsights(nodes, edges);

  try {
    let rawResponse = '';

    if (process.env.OPENROUTER_API_KEY) {
      rawResponse = await callWithTimeout(
        tryOpenRouter(nodes, edges, process.env.OPENROUTER_API_KEY),
        AI_TIMEOUT_MS
      );
    } else {
      rawResponse = await callWithTimeout(tryOllama(nodes, edges), AI_TIMEOUT_MS);
    }

    const aiInsights = parseAIResponse(rawResponse);

    if (aiInsights.length === 0) {
      return localFallback;
    }

    return {
      insights: aiInsights,
      generatedAt: new Date().toISOString(),
      source: 'ai',
    };
  } catch {
    // Silently fall back to local insights
    return localFallback;
  }
}
