/**
 * Credential Parser with AI Extraction
 *
 * Uses OCR + GPT-4 to intelligently extract credential metadata from documents.
 * Supports multi-file credentials (front/back IDs, multi-page documents).
 *
 * Pipeline:
 * 1. OCR: Extract text from each file using the appropriate provider
 * 2. Concatenate: Join OCR outputs with page-role separators
 * 3. LLM: Run a single GPT-4 extraction on the combined text
 * 4. Validation: Score confidence and determine if manual review needed
 * 5. Merge: Overlay any user-provided fields onto the AI result
 *
 * Usage (multi-file):
 *   const result = await parseCredentialFiles(files, documentTypeName, userProvided);
 *
 * Usage (single-file, legacy shim):
 *   const result = await parseCredentialDocument(s3Key, fileName, mimeType, documentTypeName);
 */

import OpenAI from 'openai';
import { CredentialPageRole } from '@prisma/client';
import { getOCRProvider, isOCRSupported } from './ocr';
import { getFileFromS3 } from './s3';
import { shouldRequireReview } from './credentialHelpers';

// Lazy initialize OpenAI to avoid build-time errors
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for credential parsing');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

// Configuration
const CHAT_MODEL = 'gpt-4-turbo';
const CONFIDENCE_THRESHOLD = 0.7; // Below this = requires manual review
const MAX_TEXT_LENGTH = 15000; // Limit OCR text sent to LLM (token management)

/**
 * Input descriptor for a single file within a multi-file credential.
 */
export interface CredentialFileInput {
  s3Key: string;
  pageRole: CredentialPageRole;
  pageNumber?: number;
  fileName: string;
  mimeType: string;
}

/**
 * Parsed credential data returned by AI
 */
export interface ParsedCredentialData {
  // Core metadata
  credentialType: string | null;
  issuer: string | null;
  licenseNumber: string | null;
  issuedAt: string | null; // ISO date string
  expiresAt: string | null; // ISO date string
  verificationUrl: string | null;

  // AI metadata
  confidence: number; // 0.0 - 1.0
  extractedText: string; // Full OCR text (for admin review)
  parsingNotes: string; // AI explanation of what it found

  // Workflow
  requiresReview: boolean;
  reviewReason?: string;

  // User-provided overrides (stored under __userProvided in aiParsedData)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __userProvided?: Record<string, any>;
}

/**
 * Result from credential parsing operation
 */
export interface CredentialParsingResult {
  success: boolean;
  data?: ParsedCredentialData;
  error?: string;
  ocrProvider?: string;
  tokensUsed?: number;
  processingTimeMs: number;
}

/**
 * Build system prompt for credential extraction
 */
function buildSystemPrompt(documentTypeName: string): string {
  return `You are a specialized AI that extracts structured metadata from professional credentials and licenses for home care workers.

Your task is to analyze the provided OCR text and extract the following fields:
- credentialType: The type of credential (e.g., "Nursing License", "CNA Certificate", "CPR Certification")
- issuer: The organization that issued the credential (e.g., "Massachusetts Board of Nursing", "American Red Cross")
- licenseNumber: The unique license or certificate number
- issuedAt: Issue date in ISO format (YYYY-MM-DD)
- expiresAt: Expiration date in ISO format (YYYY-MM-DD)
- verificationUrl: URL to verify the credential online (if present)
- confidence: Your confidence score (0.0 - 1.0) in the accuracy of extracted data
- parsingNotes: Brief explanation of what you found and any uncertainties

Document type hint: "${documentTypeName}"

IMPORTANT RULES:
1. Only extract information explicitly present in the text
2. If a field is not found or unclear, return null for that field
3. Be conservative with confidence scores - if unsure, score it lower
4. Dates must be in YYYY-MM-DD format or null
5. License numbers should be the exact alphanumeric code (no extra formatting)
6. In parsingNotes, explain what you found and what you couldn't find
7. If the document appears to be the wrong type or unreadable, score confidence very low
8. When multiple pages are present (front, back, or numbered pages), synthesize across all pages

Return ONLY valid JSON with this structure (no markdown, no explanation):
{
  "credentialType": "string or null",
  "issuer": "string or null",
  "licenseNumber": "string or null",
  "issuedAt": "YYYY-MM-DD or null",
  "expiresAt": "YYYY-MM-DD or null",
  "verificationUrl": "string or null",
  "confidence": 0.85,
  "parsingNotes": "Brief explanation of what was found"
}`;
}

/**
 * Build user prompt with OCR text
 */
function buildUserPrompt(ocrText: string, fileName: string): string {
  // Truncate text if too long (to manage tokens)
  const truncatedText = ocrText.length > MAX_TEXT_LENGTH
    ? ocrText.substring(0, MAX_TEXT_LENGTH) + '\n\n[... text truncated for length ...]'
    : ocrText;

  return `File name: ${fileName}

OCR extracted text:
---
${truncatedText}
---

Please analyze the above text and extract credential metadata as JSON.`;
}

/**
 * Parse AI response and validate structure
 */
function parseAIResponse(content: string): Omit<ParsedCredentialData, 'extractedText' | 'requiresReview' | 'reviewReason' | '__userProvided'> {
  try {
    // Remove markdown code blocks if present
    let jsonText = content.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(jsonText);

    // Validate required fields
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
      throw new Error('Invalid confidence score');
    }

    // Validate date formats if present
    if (parsed.issuedAt && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.issuedAt)) {
      console.warn(`Invalid issuedAt format: ${parsed.issuedAt}, setting to null`);
      parsed.issuedAt = null;
    }
    if (parsed.expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.expiresAt)) {
      console.warn(`Invalid expiresAt format: ${parsed.expiresAt}, setting to null`);
      parsed.expiresAt = null;
    }

    return {
      credentialType: parsed.credentialType || null,
      issuer: parsed.issuer || null,
      licenseNumber: parsed.licenseNumber || null,
      issuedAt: parsed.issuedAt || null,
      expiresAt: parsed.expiresAt || null,
      verificationUrl: parsed.verificationUrl || null,
      confidence: parsed.confidence,
      parsingNotes: parsed.parsingNotes || 'No notes provided',
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Raw content:', content);
    throw new Error('Failed to parse AI response as valid JSON');
  }
}

/**
 * Extract credential metadata using GPT-4
 */
async function extractMetadataWithLLM(
  ocrText: string,
  fileName: string,
  documentTypeName: string
): Promise<{ data: Omit<ParsedCredentialData, 'extractedText' | 'requiresReview' | 'reviewReason' | '__userProvided'>; tokensUsed: number }> {
  try {
    const systemPrompt = buildSystemPrompt(documentTypeName);
    const userPrompt = buildUserPrompt(ocrText, fileName);

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1, // Very low temperature for consistent, factual extraction
      max_tokens: 1000,
      response_format: { type: 'json_object' }, // Force JSON response
    });

    const content = response.choices[0].message.content || '{}';
    const tokensUsed = response.usage?.total_tokens || 0;

    const data = parseAIResponse(content);

    return { data, tokensUsed };
  } catch (error) {
    console.error('Error calling OpenAI for credential parsing:', error);
    throw error;
  }
}

/**
 * Extract credential metadata directly from an image using GPT-4 Vision.
 * Bypasses Tesseract OCR — GPT-4 Vision reads the image bytes natively.
 * Used for JPEG/PNG files where Tesseract has server-side worker issues.
 */
async function extractMetadataWithVision(
  imageBuffer: Buffer,
  mimeType: string,
  fileName: string,
  documentTypeName: string
): Promise<{ data: Omit<ParsedCredentialData, 'extractedText' | 'requiresReview' | 'reviewReason' | '__userProvided'>; tokensUsed: number; extractedText: string }> {
  const openai = getOpenAI();
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const systemPrompt = buildSystemPrompt(documentTypeName);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `File name: ${fileName}\n\nPlease analyze this credential document image and extract all metadata as JSON.`,
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl, detail: 'high' },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content || '{}';
  const tokensUsed = response.usage?.total_tokens || 0;
  const data = parseAIResponse(content);
  // extractedText for images is the AI's own description from parsingNotes
  return { data, tokensUsed, extractedText: data.parsingNotes };
}

/**
 * Download a file from S3 as a Buffer.
 */
async function downloadS3Buffer(s3Key: string): Promise<Buffer> {
  const stream = await getFileFromS3(s3Key);
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Determine if credential requires manual review
 */
function evaluateReviewRequirement(
  aiConfidence: number,
  hasExpirationDate: boolean,
  hasLicenseNumber: boolean
): { requiresReview: boolean; reviewReason?: string } {
  // Check AI confidence threshold
  if (shouldRequireReview(aiConfidence, CONFIDENCE_THRESHOLD)) {
    return {
      requiresReview: true,
      reviewReason: `Low AI confidence (${(aiConfidence * 100).toFixed(0)}%). Manual review recommended.`,
    };
  }

  // Check critical fields
  if (!hasExpirationDate) {
    return {
      requiresReview: true,
      reviewReason: 'No expiration date found. Manual review required.',
    };
  }

  if (!hasLicenseNumber) {
    return {
      requiresReview: true,
      reviewReason: 'No license number found. Manual verification needed.',
    };
  }

  // All checks passed
  return { requiresReview: false };
}

/**
 * Parse an ordered list of credential files using OCR + LLM.
 *
 * Each file is OCR'd individually. The extracted texts are concatenated
 * with clear page-role separators, then passed to a single LLM call.
 * User-provided fields (e.g. competencyName, ceHours) are merged into the
 * result under the __userProvided key so the AI parser can defer to them.
 *
 * @param files      Ordered array of files that together form one credential
 * @param documentTypeName   Hint for the LLM (e.g. "Driver's License")
 * @param userProvidedFields Optional fields the user filled in on the upload form
 */
export async function parseCredentialFiles(
  files: CredentialFileInput[],
  documentTypeName: string,
  userProvidedFields?: Record<string, unknown>
): Promise<CredentialParsingResult> {
  const startTime = Date.now();

  if (files.length === 0) {
    return {
      success: false,
      error: 'No files provided for parsing',
      processingTimeMs: Date.now() - startTime,
    };
  }

  try {
    const pageTexts: string[] = [];
    let totalTokens = 0;
    let ocrProviderName = 'mixed';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const separator = `\n--- PAGE ${i + 1} (${file.pageRole}) ---\n`;

      if (!isOCRSupported(file.mimeType)) {
        return {
          success: false,
          error: `Unsupported file type: ${file.mimeType}. Only PDFs and images are supported.`,
          processingTimeMs: Date.now() - startTime,
        };
      }

      if (file.mimeType.startsWith('image/')) {
        // Images: use GPT-4 Vision directly (avoids Tesseract worker issues in Next.js)
        ocrProviderName = 'gpt-4o-vision';
        let imageBuffer: Buffer;
        try {
          imageBuffer = await downloadS3Buffer(file.s3Key);
        } catch (err) {
          console.error(`Failed to download image ${file.s3Key}:`, err);
          return {
            success: false,
            error: `Failed to download file: ${err instanceof Error ? err.message : String(err)}`,
            ocrProvider: ocrProviderName,
            processingTimeMs: Date.now() - startTime,
          };
        }

        try {
          const { tokensUsed, extractedText } = await extractMetadataWithVision(
            imageBuffer,
            file.mimeType,
            file.fileName,
            documentTypeName
          );
          pageTexts.push(separator + extractedText);
          totalTokens += tokensUsed;
        } catch (err) {
          console.error(`Vision extraction failed for ${file.fileName}:`, err);
          return {
            success: false,
            error: `Vision analysis failed: ${err instanceof Error ? err.message : String(err)}`,
            ocrProvider: ocrProviderName,
            processingTimeMs: Date.now() - startTime,
          };
        }
      } else {
        // PDFs: use pdf-parse OCR provider
        ocrProviderName = 'pdf-parse';
        const ocrProvider = getOCRProvider('pdf');
        try {
          const text = await ocrProvider.extractText(file.s3Key);
          if (!text || text.trim().length < 10) {
            return {
              success: false,
              error: `File ${file.fileName} appears empty or unreadable (< 10 chars extracted).`,
              ocrProvider: ocrProvider.name,
              processingTimeMs: Date.now() - startTime,
            };
          }
          pageTexts.push(separator + text);
        } catch (err) {
          console.error(`OCR failed for ${file.fileName}:`, err);
          return {
            success: false,
            error: `Failed to extract text from ${file.fileName}: ${err instanceof Error ? err.message : String(err)}`,
            ocrProvider: ocrProvider.name,
            processingTimeMs: Date.now() - startTime,
          };
        }
      }
    }

    // Combine all page texts into one string for the LLM
    const combinedText = pageTexts.join('\n');

    // Single LLM call on combined text
    let aiData: Omit<ParsedCredentialData, 'extractedText' | 'requiresReview' | 'reviewReason' | '__userProvided'>;
    let llmTokens: number;
    try {
      ({ data: aiData, tokensUsed: llmTokens } = await extractMetadataWithLLM(
        combinedText,
        files[0].fileName,
        documentTypeName
      ));
      totalTokens += llmTokens;
    } catch (err) {
      console.error('LLM extraction failed:', err);
      return {
        success: false,
        error: `AI analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        ocrProvider: ocrProviderName,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Evaluate review requirements
    const { requiresReview, reviewReason } = evaluateReviewRequirement(
      aiData.confidence,
      aiData.expiresAt !== null,
      aiData.licenseNumber !== null
    );

    // Build final result, merging user-provided fields
    const parsedData: ParsedCredentialData = {
      ...aiData,
      extractedText: combinedText,
      requiresReview,
      reviewReason,
      ...(userProvidedFields && Object.keys(userProvidedFields).length > 0
        ? { __userProvided: userProvidedFields }
        : {}),
    };

    return {
      success: true,
      data: parsedData,
      ocrProvider: ocrProviderName,
      tokensUsed: totalTokens,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Credential parsing error:', error);
    return {
      success: false,
      error: `Parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Main function: Parse a single credential document (legacy / shim).
 *
 * Delegates to parseCredentialFiles with a single-element array.
 * Kept for backward compatibility with jobQueue.ts and any other callers
 * that have not yet been updated to the multi-file API.
 *
 * @param s3Key          S3 key of uploaded document
 * @param fileName       Original file name
 * @param mimeType       MIME type of file
 * @param documentTypeName  Type of credential (e.g., "Nursing License")
 */
export async function parseCredentialDocument(
  s3Key: string,
  fileName: string,
  mimeType: string,
  documentTypeName: string
): Promise<CredentialParsingResult> {
  return parseCredentialFiles(
    [{ s3Key, pageRole: 'SINGLE', fileName, mimeType }],
    documentTypeName
  );
}

/**
 * Parse credential from buffer (for in-memory processing)
 *
 * @param buffer File buffer
 * @param fileName Original file name
 * @param mimeType MIME type
 * @param documentTypeName Type of credential
 * @returns Parsing result
 */
export async function parseCredentialFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  documentTypeName: string
): Promise<CredentialParsingResult> {
  const startTime = Date.now();

  try {
    // Step 1: Validate file type
    if (!isOCRSupported(mimeType)) {
      return {
        success: false,
        error: `Unsupported file type: ${mimeType}`,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Step 2: Extract text using OCR
    const ocrProvider = getOCRProvider('smart');
    let ocrText: string;

    try {
      ocrText = await ocrProvider.extractTextFromBuffer(buffer, mimeType);
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return {
        success: false,
        error: `Failed to extract text: ${error instanceof Error ? error.message : String(error)}`,
        ocrProvider: ocrProvider.name,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Validate OCR output
    if (!ocrText || ocrText.trim().length < 10) {
      return {
        success: false,
        error: 'Document appears to be empty or unreadable',
        ocrProvider: ocrProvider.name,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Step 3: Parse metadata with GPT-4
    const { data: aiData, tokensUsed } = await extractMetadataWithLLM(
      ocrText,
      fileName,
      documentTypeName
    );

    // Step 4: Evaluate review requirements
    const { requiresReview, reviewReason } = evaluateReviewRequirement(
      aiData.confidence,
      aiData.expiresAt !== null,
      aiData.licenseNumber !== null
    );

    // Step 5: Build result
    const parsedData: ParsedCredentialData = {
      ...aiData,
      extractedText: ocrText,
      requiresReview,
      reviewReason,
    };

    return {
      success: true,
      data: parsedData,
      ocrProvider: ocrProvider.name,
      tokensUsed,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Credential parsing error:', error);

    return {
      success: false,
      error: `Parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Validate parser setup
 * Test function to ensure OpenAI and OCR are working
 */
export async function validateParserSetup(): Promise<{
  success: boolean;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
}> {
  try {
    // Test basic OCR provider instantiation
    const ocrProvider = getOCRProvider('smart');

    // Test OpenAI connection with minimal request
    const openai = getOpenAI();
    const testResponse = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Say "OK" if you can read this.' },
      ],
      max_tokens: 10,
    });

    const answer = testResponse.choices[0].message.content;

    return {
      success: true,
      message: 'Credential parser is configured correctly',
      details: {
        ocrProvider: ocrProvider.name,
        llmModel: CHAT_MODEL,
        testResponse: answer,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Parser validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
