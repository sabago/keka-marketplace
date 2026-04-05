import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Recursively find all markdown files in a directory
function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

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

// GET /api/knowledge-base - List all articles by reading markdown files directly
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');

    // Find all markdown files in content directories
    const contentDirs = [
      path.join(process.cwd(), 'src/content/knowledge-base'),
      path.join(process.cwd(), 'src/content/massachusetts'),
    ];

    const allFiles: string[] = [];
    contentDirs.forEach(dir => {
      findMarkdownFiles(dir, allFiles);
    });

    // Parse all markdown files
    const articles = allFiles.map(filePath => {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data: frontmatter, content } = matter(fileContent);

        const {
          title,
          slug,
          state: articleState,
          tags: articleTags,
          excerpt,
          category: articleCategory,
          source_type,
          cost_level,
          referral_channel_types,
          isOverview,
        } = frontmatter;

        // Skip if missing required fields
        if (!title || !slug || !articleState) {
          return null;
        }

        // Build tags array
        const tagArray: string[] = [];
        if (Array.isArray(articleTags)) tagArray.push(...articleTags);
        if (articleCategory) tagArray.push(articleCategory);
        if (source_type) tagArray.push(source_type);
        if (cost_level) tagArray.push(cost_level);
        if (Array.isArray(referral_channel_types)) tagArray.push(...referral_channel_types);

        // Get file stats for dates
        const stats = fs.statSync(filePath);

        // Strip markdown syntax from excerpt to prevent JS syntax errors
        const cleanExcerpt = (text: string) => {
          return text
            .replace(/\*\*/g, '') // Remove bold markers
            .replace(/\*/g, '') // Remove italic markers
            .replace(/#{1,6}\s/g, '') // Remove headers
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
            .replace(/`/g, '') // Remove code markers
            .trim();
        };

        const rawExcerpt = excerpt || content.substring(0, 200).trim();
        const cleanedExcerpt = cleanExcerpt(rawExcerpt);

        // Generate unique ID from file path to avoid duplicates
        const relativePath = filePath.replace(process.cwd(), '').replace(/^\//, '');
        const uniqueId = relativePath.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');

        return {
          id: uniqueId,
          slug,
          title,
          state: articleState,
          category: articleCategory || null,
          isOverview: isOverview || false,
          tags: tagArray,
          excerpt: cleanedExcerpt + (cleanedExcerpt.length >= 200 ? '...' : ''),
          updatedAt: stats.mtime.toISOString(),
          createdAt: stats.birthtime.toISOString(),
        };
      } catch (error) {
        console.error(`Error parsing file ${filePath}:`, error);
        return null;
      }
    }).filter(article => article !== null);

    // Apply filters
    let filteredArticles = articles;

    if (state) {
      filteredArticles = filteredArticles.filter(article => article.state === state);
    }

    if (category) {
      filteredArticles = filteredArticles.filter(article => article.category === category);
    }

    if (tag) {
      filteredArticles = filteredArticles.filter(article =>
        article.tags.some(t => t.toLowerCase() === tag.toLowerCase())
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredArticles = filteredArticles.filter(article =>
        article.title.toLowerCase().includes(searchLower) ||
        article.excerpt?.toLowerCase().includes(searchLower)
      );
    }

    // Sort: overview articles first, then by updated date
    filteredArticles.sort((a, b) => {
      if (a.isOverview && !b.isOverview) return -1;
      if (!a.isOverview && b.isOverview) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return NextResponse.json({ articles: filteredArticles });
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
