import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createNodeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(5000).optional().default(''),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#6366f1'),
  x: z.number().optional().default(0),
  y: z.number().optional().default(0),
  z: z.number().optional().default(0),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nodes = await prisma.node.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ nodes });
  } catch (error) {
    console.error('GET /api/nodes error:', error);
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
    const data = createNodeSchema.parse(body);

    const node = await prisma.node.create({
      data: { ...data, userId: session.user.id },
    });

    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('POST /api/nodes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
