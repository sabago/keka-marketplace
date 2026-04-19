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

  if (!key) {
    return NextResponse.json({ error: 'key parameter required' }, { status: 400 });
  }

  // Reconstruct cache path: slashes replaced with __ during cache write
  const safe = key.replace(/\//g, '__');
  const cachePath = path.join(DEV_CACHE_DIR, safe);

  if (!fs.existsSync(cachePath)) {
    return NextResponse.json(
      { error: `File not in local dev cache. Re-upload the file to populate the cache.` },
      { status: 404 }
    );
  }

  const buffer = fs.readFileSync(cachePath);
  const mimeType = mimeLookup(fileName) || 'application/octet-stream';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    },
  });
}
