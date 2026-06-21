import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Recursively find all markdown files in a directory
function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// POST /api/admin/knowledge-base/seed - Seed database from markdown files
export async function POST(request: NextRequest) {
  try {
    // In production, you'd want to add authentication here
    // For now, we'll allow seeding (useful for initial setup)

    // Check both old and new content directories
    const oldContentDir = path.join(process.cwd(), 'src/content/knowledge-base');
    const newContentDir = path.join(process.cwd(), 'src/content/massachusetts');

    const contentDirs = [];
    if (fs.existsSync(oldContentDir)) {
      contentDirs.push(oldContentDir);
    }
    if (fs.existsSync(newContentDir)) {
      contentDirs.push(newContentDir);
    }

    if (contentDirs.length === 0) {
      return NextResponse.json(
        { error: 'No content directories found' },
        { status: 404 }
      );
    }

    // Find all markdown files recursively
    const allFiles: string[] = [];
    contentDirs.forEach(dir => {
      findMarkdownFiles(dir, allFiles);
    });

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: 'No markdown files found in content directories' },
        { status: 404 }
      );
    }

    const results = {
      created: [] as string[],
      updated: [] as string[],
      errors: [] as string[],
    };

    // Process each markdown file
    for (const filePath of allFiles) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Parse frontmatter and content
        const { data: frontmatter, content } = matter(fileContent);

        const {
          title,
          slug,
          state,
          tags,
          excerpt,
          category,
          source_type,
          cost_level,
          referral_channel_types,
        } = frontmatter;

        // Validate required fields
        if (!title || !slug || !state) {
          results.errors.push(`${path.basename(filePath)}: Missing required frontmatter fields (title, slug, or state)`);
          continue;
        }

        // Build tags array from various metadata fields
        const tagArray: string[] = [];

        // Add existing tags if present
        if (Array.isArray(tags)) {
          tagArray.push(...tags);
        }

        // Add category as tag
        if (category) {
          tagArray.push(category);
        }

        // Add source_type as tag
        if (source_type) {
          tagArray.push(source_type);
        }

        // Add cost_level as tag
        if (cost_level) {
          tagArray.push(cost_level);
        }

        // Add referral_channel_types as tags
        if (Array.isArray(referral_channel_types)) {
          tagArray.push(...referral_channel_types);
        }

        // Generate excerpt if not provided (first 200 chars of content)
        const articleExcerpt = excerpt || content.substring(0, 200).trim() + '...';

        // Check if article already exists
        const existing = await prisma.knowledgeBaseArticle.findUnique({
          where: { slug },
        });

        if (existing) {
          // Update existing article
          await prisma.knowledgeBaseArticle.update({
            where: { slug },
            data: {
              title,
              state,
              tags: tagArray,
              content,
              excerpt: articleExcerpt,
              published: true,
            },
          });
          results.updated.push(title);
        } else {
          // Create new article
          await prisma.knowledgeBaseArticle.create({
            data: {
              slug,
              title,
              state,
              tags: tagArray,
              content,
              excerpt: articleExcerpt,
              published: true,
            },
          });
          results.created.push(title);
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        results.errors.push(`${path.basename(filePath)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: 'Seeding completed',
      results,
      summary: {
        total: allFiles.length,
        created: results.created.length,
        updated: results.updated.length,
        errors: results.errors.length,
      },
    });
  } catch (error) {
    console.error('Error seeding knowledge base:', error);
    return NextResponse.json(
      { error: 'Failed to seed knowledge base' },
      { status: 500 }
    );
  }
}

// GET /api/admin/knowledge-base/seed - Get seeding status/info
export async function GET() {
  try {
    const contentDir = path.join(process.cwd(), 'src/content/knowledge-base');

    // Check if directory exists
    if (!fs.existsSync(contentDir)) {
      return NextResponse.json({
        status: 'not_ready',
        message: 'Content directory not found',
        contentDir,
      });
    }

    // Count markdown files
    const files = fs.readdirSync(contentDir).filter(file => file.endsWith('.md'));

    // Count articles in database
    const articleCount = await prisma.knowledgeBaseArticle.count();

    return NextResponse.json({
      status: 'ready',
      markdownFiles: files.length,
      databaseArticles: articleCount,
      files: files,
      contentDir,
    });
  } catch (error) {
    console.error('Error checking seed status:', error);
    return NextResponse.json(
      { error: 'Failed to check seed status' },
      { status: 500 }
    );
  }
}
