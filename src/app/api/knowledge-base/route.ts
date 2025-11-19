import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/knowledge-base - List all published articles with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');

    const where: any = {
      published: true,
    };

    if (state) {
      where.state = state;
    }

    if (category) {
      where.category = category;
    }

    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where,
      orderBy: [
        { isOverview: 'desc' }, // Overview articles first
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        slug: true,
        title: true,
        state: true,
        category: true,
        isOverview: true,
        tags: true,
        excerpt: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Error fetching knowledge base articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

// POST /api/knowledge-base - Create a new article
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, title, state, tags, content, excerpt, published } = body;

    // Basic validation
    if (!slug || !title || !state || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, title, state, content' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.knowledgeBaseArticle.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An article with this slug already exists' },
        { status: 409 }
      );
    }

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        slug,
        title,
        state,
        tags: tags || [],
        content,
        excerpt,
        published: published !== undefined ? published : true,
      },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge base article:', error);
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}
