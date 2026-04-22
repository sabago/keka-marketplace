/**
 * GET /api/dev/file?key=<s3key>&name=<filename>
 *
 * Development-only route that serves files from the local S3 cache
 * (/tmp/dev-s3-cache/). This exists because the production S3 IAM user
 * has write-only permissions (explicit deny on GetObject/ListBucket), so
 * presigned download URLs fail in dev. The local cache is populated by
 * uploadFileToS3/uploadToS3 whenever NODE_ENV=development.
 *
 * This route is excluded from auth middleware and must NEVER be deployed
 * to production — it is only compiled/reachable when NODE_ENV=development.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getFileFromS3 } from '@/lib/s3';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { lookup: mimeLookup } = require('mime-types') as { lookup: (f: string) => string | false };

const DEV_CACHE_DIR = '/tmp/dev-s3-cache';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  const fileName = searchParams.get('name') || 'download';
  // inline=1 means serve for viewing (no Content-Disposition attachment)
  const inline = searchParams.get('inline') === '1';

  if (!key) {
    return NextResponse.json({ error: 'key parameter required' }, { status: 400 });
  }

  const mimeType = mimeLookup(fileName) || 'application/octet-stream';

  // Try local cache first
  const safe = key.replace(/\//g, '__');
  const cachePath = path.join(DEV_CACHE_DIR, safe);

  if (fs.existsSync(cachePath)) {
    const buffer = fs.readFileSync(cachePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': inline ? 'inline' : `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    });
  }

  // Cache miss — try fetching directly from S3 (getFileFromS3 has its own fallback)
  try {
    const stream = await getFileFromS3(key);
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      if (value) chunks.push(value);
      done = d;
    }
    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    // Populate cache so subsequent requests are fast
    if (!fs.existsSync(DEV_CACHE_DIR)) fs.mkdirSync(DEV_CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath, buffer);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': inline ? 'inline' : `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'File not found in local cache or S3. Re-upload the file.' },
      { status: 404 }
    );
  }
}
