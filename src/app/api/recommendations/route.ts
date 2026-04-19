import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAgency } from "@/lib/authHelpers";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith(".md")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

export async function GET(request: NextRequest) {
  try {
    const { agency } = await requireAgency();

    const contentDirs = [
      path.join(process.cwd(), "src/content/knowledge-base"),
      path.join(process.cwd(), "src/content/massachusetts"),
    ];

    const allFiles: string[] = [];
    contentDirs.forEach(dir => findMarkdownFiles(dir, allFiles));

    const articles: { slug: string; title: string; category: string | null; tags: string[]; state: string }[] = [];

    for (const filePath of allFiles) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const { data } = matter(raw);
        if (!data.slug || !data.title || !data.state) continue;

        const tagArray: string[] = [];
        if (Array.isArray(data.tags)) tagArray.push(...data.tags);
        if (data.source_type) tagArray.push(data.source_type);
        if (data.cost_level) tagArray.push(data.cost_level);

        articles.push({
          slug: data.slug,
          title: data.title,
          category: data.category || null,
          tags: tagArray,
          state: data.state,
        });
      } catch {
        // skip
      }
    }

    const scoredArticles = articles.map((article) => {
      let score = 50;
      let reason = "";

      if (agency.serviceArea && agency.serviceArea.includes(article.state)) {
        score += 20;
        reason = `Located in your service area (${article.state})`;
      }

      if (agency.agencySize === "SMALL" && article.tags.some(t => t.toLowerCase() === "free")) {
        score += 15;
        reason = reason
          ? `${reason}. No-cost option ideal for small agencies`
          : "No-cost option ideal for small agencies";
      }

      if (
        article.category &&
        agency.servicesOffered &&
        agency.servicesOffered.some((service: string) =>
          article.category?.toLowerCase().includes(service.toLowerCase())
        )
      ) {
        score += 15;
        reason = reason
          ? `${reason}. Matches your service offerings`
          : "Matches your service offerings";
      }

      if (!reason) {
        reason = "Popular with similar agencies";
      }

      return {
        slug: article.slug,
        title: article.title,
        category: article.category || "General",
        compatibilityScore: Math.min(score, 95),
        reason,
        tags: article.tags.slice(0, 3),
      };
    });

    const recommendations = scoredArticles
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 5);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
