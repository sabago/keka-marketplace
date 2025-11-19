import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/knowledge-base/[id] - Get a single article by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Try to find by ID first, then by slug
    let article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id },
    });

    if (!article) {
      article = await prisma.knowledgeBaseArticle.findUnique({
        where: { slug: id },
      });
    }

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Only return published articles to non-admin users
    // (In a real app, you'd check authentication here)
    if (!article.published) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error fetching knowledge base article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge-base/[id] - Update an article
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { slug, title, state, tags, content, excerpt, published } = body;

    // Check if article exists
    const existing = await prisma.knowledgeBaseArticle.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // If slug is being changed, check for conflicts
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.knowledgeBaseArticle.findUnique({
        where: { slug },
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: 'An article with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Update the article
    const article = await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        ...(slug && { slug }),
        ...(title && { title }),
        ...(state && { state }),
        ...(tags && { tags }),
        ...(content && { content }),
        ...(excerpt !== undefined && { excerpt }),
        ...(published !== undefined && { published }),
      },
    });

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error updating knowledge base article:', error);
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge-base/[id] - Delete an article
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if article exists
    const existing = await prisma.knowledgeBaseArticle.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    await prisma.knowledgeBaseArticle.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting knowledge base article:', error);
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
