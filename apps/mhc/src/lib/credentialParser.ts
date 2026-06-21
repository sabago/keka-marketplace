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
const CHAT_MODEL = 'gpt-4o';
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
  credentialHolderName: string | null; // Person the credential was issued TO

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
 * Category-specific extraction guidance.
 * Replaces the ever-growing list of generic rules with focused instructions
 * per document category so GPT doesn't need to guess document semantics.
 */
const CATEGORY_GUIDANCE: Record<string, string> = {
  LICENSE: `This is a professional license or certificate issued by a state board or certifying body.
- issuer: the licensing board or certifying organization (e.g. "Massachusetts Board of Nursing", "American Red Cross")
- licenseNumber: the license/certificate number printed on the document
- issuedAt: the issue or effective date
- expiresAt: the expiration or renewal date
- credentialHolderName: the licensee's full name as printed`,

  BACKGROUND_CHECK: `This is a background check or exclusion search result page, NOT a license.
- issuer: the database or agency that was searched (e.g. "OIG LEIE", "SAM.gov", "DCJIS", "CORI")
- licenseNumber: null — these checks have no license number
- issuedAt: the date the search was CONDUCTED (look for "Search conducted", "Search date", "Date of search", or a timestamp at the top/bottom of the page)
- expiresAt: null — expiry is calculated by the system, not printed on the document
- credentialHolderName: the person who was searched (may appear as "Last, First" — convert to "First Last")
- A result of "No results found" or "Not excluded" is a PASSING result — do NOT lower confidence because of this
- confidence: 0.90+ if search date and subject name are clearly present`,

  TRAINING: `This is a training completion certificate or course record.
- issuer: the training provider or organization that delivered the course
- licenseNumber: the certificate number if present, otherwise null
- issuedAt: the completion date or course date
- expiresAt: the expiration date if printed; otherwise null (system derives it)
- credentialHolderName: the trainee's full name`,

  VACCINATION: `This is a vaccination record, immunization card, TB test result, or medical clearance.
- issuer: the clinic, hospital, or medical practice that administered/performed it (NOT the employer)
- licenseNumber: null — vaccinations have no license number
- issuedAt: the date the vaccine was given OR the date the TB test/physical was performed (look for "Date of Service", "Date:", "administered on", "performed on", "done on")
- expiresAt: null unless explicitly printed on the document (system derives from issue date)
- credentialHolderName: the patient's full name`,

  HR: `This is an HR or employment document (I-9, W-4, offer letter, job description, etc.).
- issuer: the employer or agency name if visible
- licenseNumber: null
- issuedAt: the document date or signature date
- expiresAt: null unless explicitly stated
- credentialHolderName: the employee's full name`,

  ID: `This is a government-issued ID (driver's license, passport, state ID, social security card).
- issuer: the issuing government agency (e.g. "Massachusetts RMV", "U.S. Department of State")
- licenseNumber: the ID or document number
- issuedAt: the issue date
- expiresAt: the expiration date printed on the ID
- credentialHolderName: the full name printed on the ID`,

  INSURANCE: `This is an insurance certificate or policy document.
- issuer: the insurance company
- licenseNumber: the policy number
- issuedAt: the policy effective date
- expiresAt: the policy expiration date
- credentialHolderName: the insured person's full name`,

  COMPETENCY: `This is a competency checklist or skills evaluation.
- issuer: the evaluating supervisor or organization
- licenseNumber: null
- issuedAt: the evaluation or completion date
- expiresAt: null unless explicitly stated
- credentialHolderName: the staff member being evaluated`,
};

/**
 * Build system prompt for credential extraction
 */
function buildSystemPrompt(documentTypeName: string, category?: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const categoryGuidance = category && CATEGORY_GUIDANCE[category]
    ? `\nDOCUMENT CATEGORY — ${category}:\n${CATEGORY_GUIDANCE[category]}`
    : '';

  return `You are a specialized AI that extracts structured metadata from professional credentials and compliance documents for home care workers.

Today's date is ${today}. All dates you extract must be plausible relative to today. Two-digit years are always 20XX — never 19XX.

Document type: "${documentTypeName}"${categoryGuidance}

Extract the following fields from the OCR text:
- credentialType: type of document
- issuer: organization that issued or conducted it
- licenseNumber: license/certificate/policy number (null if not applicable)
- issuedAt: issue, completion, or search date (YYYY-MM-DD)
- expiresAt: expiration date (YYYY-MM-DD), null if not present
- verificationUrl: URL to verify online, if present
- credentialHolderName: full name of the PERSON this document belongs to
- confidence: 0.0–1.0 confidence in accuracy
- parsingNotes: brief explanation of what was found and any uncertainties

UNIVERSAL RULES:
1. Only extract what is explicitly in the text — no guessing
2. Return null for any field not found
3. Dates: handle M/D/YY, M/D/YYYY, written months — always output YYYY-MM-DD
4. When multiple pages are present, synthesize across all of them
5. If the document is unreadable or clearly wrong type, set confidence below 0.4

Return ONLY valid JSON, no markdown:
{
  "credentialType": "string or null",
  "issuer": "string or null",
  "licenseNumber": "string or null",
  "issuedAt": "YYYY-MM-DD or null",
  "expiresAt": "YYYY-MM-DD or null",
  "verificationUrl": "string or null",
  "credentialHolderName": "string or null",
  "confidence": 0.85,
  "parsingNotes": "string"
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

Please analyze the above text and extract credential metadata as JSON.
For credentialType: identify what the document ACTUALLY IS based solely on its content — do not use the document type hint or file name to determine this field. This is used to verify the correct document was uploaded.`;
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
      credentialHolderName: parsed.credentialHolderName || null,
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
  documentTypeName: string,
  category?: string
): Promise<{ data: Omit<ParsedCredentialData, 'extractedText' | 'requiresReview' | 'reviewReason' | '__userProvided'>; tokensUsed: number }> {
  try {
    const systemPrompt = buildSystemPrompt(documentTypeName, category);
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
  documentTypeName: string,
  category?: string
): Promise<{ data: Omit<ParsedCredentialData, 'extractedText' | 'requiresReview' | 'reviewReason' | '__userProvided'>; tokensUsed: number; extractedText: string }> {
  const openai = getOpenAI();
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const systemPrompt = buildSystemPrompt(documentTypeName, category);

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
  userProvidedFields?: Record<string, unknown>,
  category?: string
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
            documentTypeName,
            category
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
        // PDFs: try text extraction first, then fall back to Tesseract OCR via pdftoppm.
        // Many credential PDFs (e.g. MA state licenses) embed variable data (license number,
        // dates, name) as images — the text layer only contains the static template.
        // We always run both and concatenate so the LLM sees everything.
        ocrProviderName = 'smart';
        const pdfProvider = getOCRProvider('pdf');
        const tesseractProvider = getOCRProvider('tesseract');
        try {
          const texts: string[] = [];

          // 1. Text layer
          try {
            const textLayerText = await pdfProvider.extractText(file.s3Key);
            if (textLayerText && textLayerText.trim().length >= 10) {
              texts.push(textLayerText);
            }
          } catch {
            // text layer extraction failed — that's fine, Tesseract will cover it
          }

          // 2. Tesseract OCR on rendered page images (catches image-based data)
          try {
            const ocrText = await tesseractProvider.extractText(file.s3Key);
            if (ocrText && ocrText.trim().length >= 10) {
              texts.push(ocrText);
            }
          } catch {
            // Tesseract failed — rely on text layer only
          }

          if (texts.length === 0) {
            return {
              success: false,
              error: `File ${file.fileName} appears empty or unreadable.`,
              ocrProvider: ocrProviderName,
              processingTimeMs: Date.now() - startTime,
            };
          }

          // Deduplicate and join — text layer + OCR often overlap partially
          pageTexts.push(separator + texts.join('\n\n--- OCR ---\n\n'));
        } catch (err) {
          console.error(`OCR failed for ${file.fileName}:`, err);
          return {
            success: false,
            error: `Failed to extract text from ${file.fileName}: ${err instanceof Error ? err.message : String(err)}`,
            ocrProvider: ocrProviderName,
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
        documentTypeName,
        category
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
  documentTypeName: string,
  category?: string
): Promise<CredentialParsingResult> {
  return parseCredentialFiles(
    [{ s3Key, pageRole: 'SINGLE', fileName, mimeType }],
    documentTypeName,
    undefined,
    category
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
