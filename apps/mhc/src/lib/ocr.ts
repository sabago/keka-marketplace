/**
 * OCR Provider Abstraction Layer
 *
 * Provides a unified interface for different OCR providers:
 * - AWS Textract (primary, best for forms and structured documents)
 * - Tesseract.js (fallback, free but less accurate)
 *
 * Usage:
 *   const provider = getOCRProvider('aws');
 *   const text = await provider.extractText(s3Key);
 */

import { getFileFromS3 } from './s3';
import { execSync, spawnSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Convert a PDF buffer to an array of PNG buffers using pdftoppm (poppler).
 * Returns one buffer per page. Falls back to empty array if pdftoppm is unavailable.
 */
function pdfBufferToPngImages(pdfBuffer: Buffer): Buffer[] {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-pdf-'));
  const pdfPath = path.join(tmpDir, 'input.pdf');
  const outPrefix = path.join(tmpDir, 'page');

  try {
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Render at 150 DPI — good enough for OCR, fast enough to not time out
    const result = spawnSync(
      'pdftoppm',
      ['-r', '150', '-png', pdfPath, outPrefix],
      { timeout: 30000 }
    );

    if (result.status !== 0) {
      const stderr = result.stderr?.toString() ?? '';
      console.error('[OCR] pdftoppm failed:', stderr);
      return [];
    }

    // pdftoppm writes page-1.png, page-2.png, etc. (zero-padded on some versions)
    const files = fs.readdirSync(tmpDir)
      .filter((f) => f.startsWith('page') && f.endsWith('.png'))
      .sort();

    return files.map((f) => fs.readFileSync(path.join(tmpDir, f)));
  } finally {
    // Clean up temp files
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

// OCR Provider interface
export interface OCRProvider {
  name: string;
  extractText(s3Key: string): Promise<string>;
  extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string>;
}

/**
 * AWS Textract Provider (Primary)
 * Best for: Structured documents, forms, tables, licenses
 */
export class AWSTextractProvider implements OCRProvider {
  name = 'aws-textract';

  async extractText(s3Key: string): Promise<string> {
    // For Phase 2, we'll implement a simpler approach using PDF parsing
    // AWS Textract requires additional setup and costs more
    // We'll use pdf-parse for PDFs and fall back to Tesseract for images

    throw new Error('AWS Textract not yet implemented. Use pdf-parse or tesseract instead.');
  }

  async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    throw new Error('AWS Textract not yet implemented. Use pdf-parse or tesseract instead.');
  }
}

/**
 * PDF Parser Provider
 * Best for: PDF documents with embedded text
 */
export class PDFParserProvider implements OCRProvider {
  name = 'pdf-parse';

  async extractText(s3Key: string): Promise<string> {
    // Download file from S3
    const stream = await getFileFromS3(s3Key);

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);
    return this.extractTextFromBuffer(buffer, 'application/pdf');
  }

  async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType !== 'application/pdf') {
      throw new Error('PDFParserProvider only supports PDF files');
    }

    try {
      // Use pdfjs-dist directly — pdf-parse v2 is incompatible with Next.js RSC bundler
      // (Object.defineProperty called on non-object at module load time).
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const workerPath = require('path').join(
        process.cwd(),
        'node_modules',
        'pdfjs-dist',
        'legacy',
        'build',
        'pdf.worker.mjs'
      );
      pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      const pageTexts: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pageTexts.push(content.items.map((item: any) => item.str).join(' '));
      }
      const text = pageTexts.join('\n');
      if (!text.trim()) throw new Error('No text returned from PDF');
      return text;
    } catch (error) {
      console.error('[PDFParserProvider] Error parsing PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }
}

/**
 * Tesseract.js Provider (Fallback for images)
 * Best for: JPEG, PNG images of documents
 */
export class TesseractProvider implements OCRProvider {
  name = 'tesseract';

  async extractText(s3Key: string): Promise<string> {
    // Download file from S3
    const stream = await getFileFromS3(s3Key);

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);
    // Infer mimeType from S3 key extension so PDF pages go through pdftoppm
    const ext = s3Key.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
    return this.extractTextFromBuffer(buffer, mimeType);
  }

  async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
      throw new Error('TesseractProvider only supports image and PDF files');
    }

    // Tesseract.js cannot read PDF buffers directly.
    // Convert each PDF page to a PNG image first using pdftoppm, then OCR each page.
    if (mimeType === 'application/pdf') {
      const pageImages = pdfBufferToPngImages(buffer);
      if (pageImages.length === 0) {
        throw new Error('Failed to render PDF pages for OCR (pdftoppm returned no images)');
      }
      const pageTexts: string[] = [];
      for (const img of pageImages) {
        try {
          const pageText = await this.extractTextFromBuffer(img, 'image/png');
          pageTexts.push(pageText);
        } catch {
          // Skip pages that fail OCR rather than aborting entirely
        }
      }
      if (pageTexts.length === 0) throw new Error('OCR produced no text from any PDF page');
      return pageTexts.join('\n\n');
    }

    try {
      // Dynamically import tesseract to avoid build-time loading
      const { createWorker } = await import('tesseract.js');

      // Next.js RSC bundler rewrites __dirname and require.resolve paths by
      // prepending "(rsc)/" which makes the resolved path invalid at runtime.
      // Use process.cwd() (the project root, always correct) to build the path.
      const workerPath = require('path').join(
        process.cwd(),
        'node_modules',
        'tesseract.js',
        'src',
        'worker-script',
        'node',
        'index.js'
      );

      const worker = await createWorker('eng', 1, { workerPath, logger: () => {} });
      const result = await worker.recognize(buffer);
      const text = result.data.text;
      await worker.terminate();

      return text;
    } catch (error) {
      console.error('Error running Tesseract OCR:', error);
      throw new Error('Failed to extract text from image using OCR');
    }
  }
}

/**
 * Smart OCR Provider (Auto-selects based on file type)
 * Automatically chooses the best provider for the file type
 */
export class SmartOCRProvider implements OCRProvider {
  name = 'smart';

  private pdfProvider = new PDFParserProvider();
  private imageProvider = new TesseractProvider();

  async extractText(s3Key: string): Promise<string> {
    const extension = s3Key.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      try {
        const text = await this.pdfProvider.extractText(s3Key);
        // If pdf-parse succeeded but returned no meaningful text, the PDF is
        // image-based (scanned). Fall through to Tesseract.
        if (text && text.trim().length > 20) return text;
      } catch {
        // pdf-parse failed — PDF is likely scanned. Fall through to Tesseract.
      }
      // Re-download for Tesseract (pdfProvider already consumed the stream)
      return this.imageProvider.extractText(s3Key);
    } else if (['jpg', 'jpeg', 'png'].includes(extension || '')) {
      return this.imageProvider.extractText(s3Key);
    } else {
      throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      try {
        const text = await this.pdfProvider.extractTextFromBuffer(buffer, mimeType);
        if (text && text.trim().length > 20) return text;
      } catch {
        // pdf-parse failed or returned no text — fall through to Tesseract
      }
      // Use TesseractProvider with application/pdf — it will convert via pdftoppm first
      return this.imageProvider.extractTextFromBuffer(buffer, 'application/pdf');
    } else if (mimeType.startsWith('image/')) {
      return this.imageProvider.extractTextFromBuffer(buffer, mimeType);
    } else {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }
  }
}

/**
 * Get OCR provider by name
 * @param providerName Provider name: 'pdf', 'tesseract', 'smart', or 'aws'
 * @returns OCR provider instance
 */
export function getOCRProvider(providerName: string = 'smart'): OCRProvider {
  switch (providerName.toLowerCase()) {
    case 'pdf':
    case 'pdf-parse':
      return new PDFParserProvider();

    case 'tesseract':
    case 'ocr':
      return new TesseractProvider();

    case 'aws':
    case 'textract':
      return new AWSTextractProvider();

    case 'smart':
    case 'auto':
    default:
      return new SmartOCRProvider();
  }
}

/**
 * Extract text from a file
 * Convenience function that uses the smart provider by default
 *
 * @param s3Key S3 key of the file
 * @param providerName Optional provider name (default: 'smart')
 * @returns Extracted text
 */
export async function extractTextFromFile(
  s3Key: string,
  providerName: string = 'smart'
): Promise<string> {
  const provider = getOCRProvider(providerName);
  return provider.extractText(s3Key);
}

/**
 * Extract text from a buffer
 *
 * @param buffer File buffer
 * @param mimeType MIME type of the file
 * @param providerName Optional provider name (default: 'smart')
 * @returns Extracted text
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  providerName: string = 'smart'
): Promise<string> {
  const provider = getOCRProvider(providerName);
  return provider.extractTextFromBuffer(buffer, mimeType);
}

/**
 * Check if a file type is supported for OCR
 *
 * @param mimeType MIME type to check
 * @returns True if supported
 */
export function isOCRSupported(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/');
}

/**
 * Get recommended provider for a MIME type
 *
 * @param mimeType MIME type
 * @returns Recommended provider name
 */
export function getRecommendedProvider(mimeType: string): string {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  } else if (mimeType.startsWith('image/')) {
    return 'tesseract';
  } else {
    return 'smart';
  }
}
