import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateLocalInsights, generateAIInsights } from '@/lib/ai';
import type { GraphNode, GraphEdge } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const enhance = searchParams.get('enhance') === 'true';

    // Fetch nodes and edges in parallel
    const [nodes, edges] = await Promise.all([
      prisma.node.findMany({ where: { userId: session.user.id } }),
      prisma.edge.findMany({ where: { userId: session.user.id } }),
    ]);

    const typedNodes = nodes as unknown as GraphNode[];
    const typedEdges = edges as unknown as GraphEdge[];

    if (enhance) {
      // Try AI, fallback to local
      const result = await generateAIInsights(typedNodes, typedEdges);

      // Cache AI insights if successful
      if (result.source === 'ai') {
        await prisma.insight.create({
          data: {
            userId: session.user.id,
            type: 'ai',
            content: JSON.stringify(result.insights),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour cache
          },
        }).catch(() => {}); // Non-blocking
      }

      return NextResponse.json(result);
    }

    // Local insights - instant
    const result = generateLocalInsights(typedNodes, typedEdges);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
