/**
 * Import markdown files from src/content/massachusetts into the database
 *
 * Usage: npx tsx scripts/import-content-to-db.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { PrismaClient } from '@prisma/client';
import { normalizeCategorySlug } from '../src/lib/categoryConfig';

const prisma = new PrismaClient();

interface FrontMatter {
  title: string;
  slug: string;
  state: string;
  category?: string;
  source_type?: string;
  primary_audience?: string;
  official_url?: string;
  cost_level?: string;
  referral_channel_types?: string[];
  last_reviewed?: string;
  [key: string]: any;
}

/**
 * Recursively get all markdown files from a directory
 */
function getMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (item.endsWith('.md')) {
      // Include all markdown files, including _category-overview.md files
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract excerpt from markdown content
 */
function extractExcerpt(content: string, maxLength: number = 200): string {
  // Remove markdown formatting
  let text = content
    .replace(/^#{1,6}\s+/gm, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  // Get first paragraph or truncate
  const firstParagraph = text.split(/\.\s+/)[0] || text;

  if (firstParagraph.length > maxLength) {
    return firstParagraph.substring(0, maxLength).trim() + '...';
  }

  return firstParagraph + '.';
}

/**
 * Build tags array from frontmatter
 */
function buildTags(frontmatter: FrontMatter): string[] {
  const tags: string[] = [];

  // Add category as tag
  if (frontmatter.category) {
    tags.push(frontmatter.category);
  }

  // Add source type
  if (frontmatter.source_type) {
    tags.push(frontmatter.source_type);
  }

  // Add cost level
  if (frontmatter.cost_level) {
    tags.push(frontmatter.cost_level);
  }

  // Add referral channel types
  if (frontmatter.referral_channel_types && Array.isArray(frontmatter.referral_channel_types)) {
    tags.push(...frontmatter.referral_channel_types);
  }

  // Add primary audience
  if (frontmatter.primary_audience) {
    tags.push(frontmatter.primary_audience);
  }

  return tags;
}

/**
 * Extract category from file path
 * Example: /path/to/src/content/massachusetts/1-hospitals-and-health-systems/article.md
 * Returns: "hospitals-health-systems"
 */
function extractCategoryFromPath(filePath: string): string | null {
  const pathParts = filePath.split(path.sep);
  const massachusettsIndex = pathParts.indexOf('massachusetts');

  if (massachusettsIndex === -1 || massachusettsIndex === pathParts.length - 1) {
    return null;
  }

  // Get the category folder name (e.g., "1-hospitals-and-health-systems")
  const categoryFolder = pathParts[massachusettsIndex + 1];

  // Normalize it using our category config
  return normalizeCategorySlug(categoryFolder);
}

/**
 * Check if file is a category overview article
 */
function isOverviewArticle(filePath: string, frontmatter: FrontMatter): boolean {
  const fileName = path.basename(filePath);
  // Check filename for overview indicators or if slug contains "overview"
  return fileName.includes('overview') ||
         fileName.includes('index') ||
         fileName.startsWith('_category') ||
         frontmatter.slug?.includes('overview') === true;
}

/**
 * Import a single markdown file
 */
async function importMarkdownFile(filePath: string, dryRun: boolean = false): Promise<void> {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  const frontmatter = data as FrontMatter;

  // Validate required fields
  if (!frontmatter.title || !frontmatter.slug || !frontmatter.state) {
    console.warn(`⚠️  Skipping ${filePath}: missing required fields (title, slug, or state)`);
    return;
  }

  // Build excerpt and tags
  const excerpt = extractExcerpt(content);
  const tags = buildTags(frontmatter);

  // Extract category from frontmatter or file path
  let category = frontmatter.category
    ? normalizeCategorySlug(frontmatter.category)
    : extractCategoryFromPath(filePath);

  // Check if this is an overview article
  const isOverview = isOverviewArticle(filePath, frontmatter);

  // Prepare article data
  const articleData = {
    slug: frontmatter.slug,
    title: frontmatter.title,
    state: frontmatter.state.toUpperCase(),
    category: category,
    isOverview: isOverview,
    tags: tags,
    content: content.trim(),
    excerpt: excerpt,
    published: true,
  };

  if (dryRun) {
    console.log(`\n📄 Would import: ${frontmatter.slug}`);
    console.log(`   Title: ${frontmatter.title}`);
    console.log(`   State: ${articleData.state}`);
    console.log(`   Category: ${category || 'none'}`);
    console.log(`   Overview: ${isOverview ? 'YES' : 'no'}`);
    console.log(`   Tags: ${tags.join(', ')}`);
    console.log(`   Excerpt: ${excerpt.substring(0, 100)}...`);
    return;
  }

  try {
    // Check if article already exists
    const existing = await prisma.knowledgeBaseArticle.findUnique({
      where: { slug: articleData.slug }
    });

    if (existing) {
      // Update existing article
      await prisma.knowledgeBaseArticle.update({
        where: { slug: articleData.slug },
        data: articleData
      });
      console.log(`✅ Updated: ${articleData.slug}`);
    } else {
      // Create new article
      await prisma.knowledgeBaseArticle.create({
        data: articleData
      });
      console.log(`✨ Created: ${articleData.slug}`);
    }
  } catch (error) {
    console.error(`❌ Error importing ${articleData.slug}:`, error);
  }
}

/**
 * Main import function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const contentDir = path.join(process.cwd(), 'src', 'content', 'massachusetts');

  console.log('🚀 Starting markdown import...\n');
  console.log(`📁 Content directory: ${contentDir}`);
  console.log(`🔍 Dry run: ${dryRun ? 'YES' : 'NO'}\n`);

  // Check if content directory exists
  if (!fs.existsSync(contentDir)) {
    console.error(`❌ Content directory not found: ${contentDir}`);
    process.exit(1);
  }

  // Get all markdown files
  const markdownFiles = getMarkdownFiles(contentDir);
  console.log(`📚 Found ${markdownFiles.length} markdown files\n`);

  if (markdownFiles.length === 0) {
    console.log('No markdown files to import.');
    return;
  }

  // Import each file
  let successCount = 0;
  let errorCount = 0;

  for (const filePath of markdownFiles) {
    try {
      await importMarkdownFile(filePath, dryRun);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to process ${filePath}:`, error);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Import complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('='.repeat(50));
}

// Run the import
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
