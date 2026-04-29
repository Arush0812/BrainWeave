import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createEdgeSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  label: z.string().max(100).optional(),
  strength: z.number().min(0).max(1).optional().default(1.0),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const edges = await prisma.edge.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ edges });
  } catch (error) {
    console.error('GET /api/edges error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createEdgeSchema.parse(body);

    // Prevent self-loops
    if (data.fromId === data.toId) {
      return NextResponse.json({ error: 'Cannot connect a node to itself' }, { status: 400 });
    }

    // Prevent duplicate edges
    const existing = await prisma.edge.findFirst({
      where: {
        userId: session.user.id,
        OR: [
          { fromId: data.fromId, toId: data.toId },
          { fromId: data.toId, toId: data.fromId },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Connection already exists' }, { status: 409 });
    }

    // Verify nodes belong to user
    const nodeCount = await prisma.node.count({
      where: {
        userId: session.user.id,
        id: { in: [data.fromId, data.toId] },
      },
    });

    if (nodeCount !== 2) {
      return NextResponse.json({ error: 'Invalid nodes' }, { status: 400 });
    }

    const edge = await prisma.edge.create({
      data: { ...data, userId: session.user.id },
    });

    return NextResponse.json({ edge }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('POST /api/edges error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
