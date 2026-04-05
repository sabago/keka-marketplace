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
import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse';

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
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
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
    return this.extractTextFromBuffer(buffer, 'image/jpeg'); // Tesseract handles all image types
  }

  async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    if (!mimeType.startsWith('image/')) {
      throw new Error('TesseractProvider only supports image files');
    }

    try {
      const worker = await createWorker('eng');

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
    // Determine file type from extension
    const extension = s3Key.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      return this.pdfProvider.extractText(s3Key);
    } else if (['jpg', 'jpeg', 'png'].includes(extension || '')) {
      return this.imageProvider.extractText(s3Key);
    } else {
      throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      return this.pdfProvider.extractTextFromBuffer(buffer, mimeType);
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
