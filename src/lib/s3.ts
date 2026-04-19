import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Dev-only local file cache for S3 objects.
// On localhost the IAM user may lack GetObject permission (write-only policy).
// We mirror every uploaded file here so the parsing pipeline can read it back.
const DEV_CACHE_DIR = process.env.NODE_ENV === 'development'
  ? path.join('/tmp', 'dev-s3-cache')
  : null;

function devCachePath(key: string): string | null {
  if (!DEV_CACHE_DIR) return null;
  // Replace path separators with underscores so the key is a flat filename
  const safe = key.replace(/\//g, '__');
  return path.join(DEV_CACHE_DIR, safe);
}

function ensureDevCacheDir(): void {
  if (DEV_CACHE_DIR && !fs.existsSync(DEV_CACHE_DIR)) {
    fs.mkdirSync(DEV_CACHE_DIR, { recursive: true });
  }
}

  /* eslint-disable @typescript-eslint/no-explicit-any */
// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY || '',
  },
});

/**
 * Upload a file to S3
 * @param file File buffer to upload
 * @param fileName Original file name
 * @param contentType MIME type of the file
 * @param folder Folder path in S3 bucket
 * @returns S3 key of the uploaded file
 */
export async function uploadFileToS3(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'products'
): Promise<string> {
  // Generate a unique file name
  const key = `${folder}/${uuidv4()}-${fileName.replace(/\s+/g, '-')}`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '',
    Key: key,
    Body: file,
    ContentType: contentType,
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    // Mirror to local cache on dev so the parsing pipeline can read it back
    // even when the IAM user lacks GetObject permission on this bucket.
    const cachePath = devCachePath(key);
    if (cachePath) {
      ensureDevCacheDir();
      fs.writeFileSync(cachePath, file);
    }
    return key;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Generate a signed URL for downloading a file from S3
 * @param key S3 key of the file
 * @param expiresIn Expiration time in seconds (default: 300 seconds / 5 minutes)
 * @param fileName Optional file name for Content-Disposition
 * @returns Signed URL for downloading the file
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 300,
  fileName?: string
): Promise<string> {
  const params: {
    Bucket: string;
    Key: string;
    ResponseContentDisposition?: string;
  } = {
    Bucket: process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '',
    Key: key,
  };

  if (fileName) {
    params.ResponseContentDisposition = `attachment; filename="${fileName}"`;
  }

  try {
    const url = await getSignedUrl(s3Client, new GetObjectCommand(params), {
      expiresIn,
    });

    // On dev, the IAM user has explicit deny on GetObject so the signed URL
    // will return AccessDenied when the browser tries to fetch it. If we have
    // the file in the local cache, return a local API URL instead.
    if (process.env.NODE_ENV === 'development') {
      const cachePath = devCachePath(key);
      if (cachePath && fs.existsSync(cachePath)) {
        const encodedKey = encodeURIComponent(key);
        const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        return `${appUrl}/api/dev/file?key=${encodedKey}${fileName ? `&name=${encodeURIComponent(fileName)}` : ''}`;
      }
    }

    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Get the public URL for a file in S3
 * @param key S3 key of the file
 * @returns Public URL of the file
 */
export function getPublicUrl(key: string): string {
  return `https://${process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
}

/**
 * Get a file from S3 as a readable stream
 * @param key S3 key of the file
 * @returns Readable stream of the file
 */
export async function getFileFromS3(key: string): Promise<ReadableStream> {
  const bucket = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '';

  // First attempt: direct GetObject SDK call
  try {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) {
      throw new Error('Empty response body');
    }
    const stream = response.Body as any;
    return stream.transformToWebStream();
  } catch (sdkError) {
    // Check dev local cache before giving up.
    // On localhost the IAM user is write-only — GetObject and presigned-URL
    // fetches both fail under an explicit deny policy. The cache was written
    // during uploadFileToS3 and contains the exact bytes the pipeline needs.
    const cachePath = devCachePath(key);
    if (cachePath && fs.existsSync(cachePath)) {
      console.log('[dev] S3 GetObject denied — serving from local cache:', cachePath);
      const buffer = fs.readFileSync(cachePath);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        },
      });
    }

    console.error('Error getting file from S3:', sdkError);
    throw new Error(`Failed to get file from S3: ${(sdkError as Error).message}`);
  }
}

// Alias for backward compatibility
export const getS3DownloadUrl = async (
  key: string,
  expiresIn: number = 300,
  fileName?: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const url = await getSignedDownloadUrl(key, expiresIn, fileName);
    return { success: true, url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Upload to a fully-specified S3 key (no UUID prefix generation).
// Use this when the caller has already constructed the exact key to store.
export const uploadToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ success: boolean; key?: string; error?: string }> => {
  try {
    const bucket = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '';
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    // Mirror to local dev cache so the parsing pipeline can read it back
    const cachePath = devCachePath(key);
    if (cachePath) {
      ensureDevCacheDir();
      fs.writeFileSync(cachePath, buffer);
    }
    return { success: true, key };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
