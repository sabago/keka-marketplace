import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

const DEV_CACHE_DIR = process.env.NODE_ENV === 'development'
  ? path.join('/tmp', 'dev-s3-cache') : null;

function devCachePath(key: string): string | null {
  if (!DEV_CACHE_DIR) return null;
  return path.join(DEV_CACHE_DIR, key.replace(/\//g, '__'));
}

function ensureDevCacheDir() {
  if (DEV_CACHE_DIR && !fs.existsSync(DEV_CACHE_DIR)) {
    fs.mkdirSync(DEV_CACHE_DIR, { recursive: true });
  }
}

const s3Client = new S3Client({
  region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY_ID     || process.env.ACCESS_KEY_ID     || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = () => process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '';

/** Upload a buffer to a fully-specified S3 key. */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ success: boolean; key?: string; error?: string }> {
  try {
    await s3Client.send(new PutObjectCommand({ Bucket: BUCKET(), Key: key, Body: buffer, ContentType: contentType }));
    const cp = devCachePath(key);
    if (cp) { ensureDevCacheDir(); fs.writeFileSync(cp, buffer); }
    return { success: true, key };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Generate a signed download URL (5-min default). */
export async function getSignedDownloadUrl(key: string, expiresIn = 300, fileName?: string): Promise<string> {
  const params: { Bucket: string; Key: string; ResponseContentDisposition?: string } = {
    Bucket: BUCKET(), Key: key,
    ...(fileName ? { ResponseContentDisposition: `attachment; filename="${fileName}"` } : {}),
  };
  if (process.env.NODE_ENV === 'development') {
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return `${appUrl}/api/dev/file?key=${encodeURIComponent(key)}${fileName ? `&name=${encodeURIComponent(fileName)}` : ''}`;
  }
  return getSignedUrl(s3Client, new GetObjectCommand(params), { expiresIn });
}

/** Get a file from S3 as a ReadableStream (falls back to dev cache). */
export async function getFileFromS3(key: string): Promise<ReadableStream> {
  try {
    const res = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
    if (!res.Body) throw new Error('Empty S3 response');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.Body as any).transformToWebStream();
  } catch (sdkErr) {
    const cp = devCachePath(key);
    if (cp && fs.existsSync(cp)) {
      const buf = fs.readFileSync(cp);
      return new ReadableStream({ start(c) { c.enqueue(new Uint8Array(buf)); c.close(); } });
    }
    throw new Error(`S3 GetObject failed: ${(sdkErr as Error).message}`);
  }
}
