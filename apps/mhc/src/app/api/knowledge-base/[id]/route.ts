import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Recursively find all markdown files
function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// GET /api/knowledge-base/[id] - Get a single article by slug (reads from markdown files)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contentDirs = [
      path.join(process.cwd(), 'src/content/knowledge-base'),
      path.join(process.cwd(), 'src/content/massachusetts'),
    ];

    const allFiles: string[] = [];
    contentDirs.forEach(dir => findMarkdownFiles(dir, allFiles));

    // Find the file whose frontmatter slug matches
    let found: { filePath: string; frontmatter: Record<string, any>; content: string } | null = null;

    for (const filePath of allFiles) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { data: frontmatter, content } = matter(raw);
        if (frontmatter.slug === id) {
          found = { filePath, frontmatter, content };
          break;
        }
      } catch {
        // skip unreadable files
      }
    }

    if (!found) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const { frontmatter, content, filePath } = found;
    const stats = fs.statSync(filePath);

    // Build tags
    const tagArray: string[] = [];
    if (Array.isArray(frontmatter.tags)) tagArray.push(...frontmatter.tags);
    if (frontmatter.category) tagArray.push(frontmatter.category);
    if (frontmatter.source_type) tagArray.push(frontmatter.source_type);
    if (frontmatter.cost_level) tagArray.push(frontmatter.cost_level);
    if (Array.isArray(frontmatter.referral_channel_types)) tagArray.push(...frontmatter.referral_channel_types);

    const relativePath = filePath.replace(process.cwd(), '').replace(/^\//, '');
    const uniqueId = relativePath.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');

    const article = {
      id: uniqueId,
      slug: frontmatter.slug,
      title: frontmatter.title,
      state: frontmatter.state,
      category: frontmatter.category || null,
      isOverview: frontmatter.isOverview || false,
      tags: tagArray,
      content,
      excerpt: frontmatter.excerpt || content.substring(0, 200).trim(),
      officialUrl: frontmatter.official_url || null,
      costLevel: frontmatter.cost_level || null,
      sourceType: frontmatter.source_type || null,
      updatedAt: stats.mtime.toISOString(),
      createdAt: stats.birthtime.toISOString(),
    };

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error fetching knowledge base article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}

// PUT /api/knowledge-base/[id] - Not implemented (articles live in markdown files)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}

// DELETE /api/knowledge-base/[id] - Not implemented (articles live in markdown files)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
