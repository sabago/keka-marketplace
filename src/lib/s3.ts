import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

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
  const params = {
    Bucket: process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '',
    Key: key,
  };

  try {
    const response = await s3Client.send(new GetObjectCommand(params));
    
    if (!response.Body) {
      throw new Error('Empty response body');
    }
    
    // Convert the S3 body stream to a web ReadableStream
    const stream = response.Body as any;
    return stream.transformToWebStream();
  } catch (error) {
    console.error('Error getting file from S3:', error);
    
    // In development mode, return a mock file stream
    if (process.env.NODE_ENV === 'development') {
      // Create a mock PDF file with some text
      const mockPdfContent = `
%PDF-1.4
1 0 obj
<< /Type /Catalog
   /Pages 2 0 R
>>
endobj
2 0 obj
<< /Type /Pages
   /Kids [3 0 R]
   /Count 1
>>
endobj
3 0 obj
<< /Type /Page
   /Parent 2 0 R
   /Resources << /Font << /F1 4 0 R >> >>
   /Contents 5 0 R
>>
endobj
4 0 obj
<< /Type /Font
   /Subtype /Type1
   /BaseFont /Helvetica
>>
endobj
5 0 obj
<< /Length 68 >>
stream
BT
/F1 24 Tf
100 700 Td
(This is a mock PDF file for development purposes.) Tj
ET
stream
endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000060 00000 n
0000000120 00000 n
0000000220 00000 n
0000000290 00000 n
trailer
<< /Size 6
   /Root 1 0 R
>>
startxref
410
%%EOF
      `;
      
      // Convert the string to a ReadableStream
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(mockPdfContent);
      
      // Create a ReadableStream from the Uint8Array
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(uint8Array);
          controller.close();
        }
      });
      
      console.log('Returning mock PDF file for development');
      return stream;
    }
    
    throw new Error('Failed to get file from S3');
  }
}
