/**
 * Credential Parser with AI Extraction
 *
 * Uses OCR + GPT-4 to intelligently extract credential metadata from documents
 *
 * Pipeline:
 * 1. OCR: Extract text from PDF/image using appropriate provider
 * 2. LLM: Parse structured data using GPT-4
 * 3. Validation: Score confidence and determine if manual review needed
 *
 * Usage:
 *   const result = await parseCredentialDocument(s3Key, fileName, documentTypeName);
 *   if (result.requiresReview) {
 *     // Queue for manual admin review
 *   }
 */

import OpenAI from 'openai';
import { getOCRProvider, isOCRSupported } from './ocr';
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
function parseAIResponse(content: string): Omit<ParsedCredentialData, 'extractedText' | 'requiresReview' | 'reviewReason'> {
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
): Promise<{ data: Omit<ParsedCredentialData, 'extractedText' | 'requiresReview' | 'reviewReason'>; tokensUsed: number }> {
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
 * Main function: Parse credential document
 *
 * @param s3Key S3 key of uploaded document
 * @param fileName Original file name
 * @param mimeType MIME type of file
 * @param documentTypeName Type of credential (e.g., "Nursing License")
 * @returns Parsing result with extracted metadata
 */
export async function parseCredentialDocument(
  s3Key: string,
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
        error: `Unsupported file type: ${mimeType}. Only PDFs and images are supported.`,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Step 2: Extract text using OCR
    const ocrProvider = getOCRProvider('smart');
    let ocrText: string;

    try {
      ocrText = await ocrProvider.extractText(s3Key);
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return {
        success: false,
        error: `Failed to extract text from document: ${error instanceof Error ? error.message : String(error)}`,
        ocrProvider: ocrProvider.name,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Validate OCR output
    if (!ocrText || ocrText.trim().length < 10) {
      return {
        success: false,
        error: 'Document appears to be empty or unreadable. OCR extracted less than 10 characters.',
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

    // Step 5: Build final result
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
