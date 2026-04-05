import { NextResponse } from 'next/server';
import { categories } from '@/lib/categoryConfig';
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

// GET /api/knowledge-base/categories - Get all categories with article counts from markdown files
export async function GET() {
  try {
    // Find all markdown files in content directories
    const contentDirs = [
      path.join(process.cwd(), 'src/content/knowledge-base'),
      path.join(process.cwd(), 'src/content/massachusetts'),
    ];

    const allFiles: string[] = [];
    contentDirs.forEach(dir => {
      findMarkdownFiles(dir, allFiles);
    });

    // Parse all markdown files and count by category
    const countMap: Record<string, number> = {};
    let totalCount = 0;

    allFiles.forEach(filePath => {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data: frontmatter } = matter(fileContent);

        const { title, slug, state, category } = frontmatter;

        // Skip if missing required fields
        if (!title || !slug || !state) {
          return;
        }

        totalCount++;

        if (category) {
          countMap[category] = (countMap[category] || 0) + 1;
        }
      } catch (error) {
        console.error(`Error parsing file ${filePath}:`, error);
      }
    });

    // Add counts to categories (exclude icon - can't be serialized)
    const categoriesWithCounts = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      color: cat.color,
      order: cat.order,
      count: countMap[cat.slug] || 0,
    }));

    return NextResponse.json({
      categories: categoriesWithCounts,
      totalCount,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
