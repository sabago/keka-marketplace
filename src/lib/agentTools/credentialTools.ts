/**
 * OpenAI function-calling tool definitions for the Credential Agent.
 *
 * These tools are injected into the chatbot when a credential-domain query
 * is detected via CREDENTIAL_DOMAIN_KEYWORDS. The RAG path remains unchanged.
 */

import type OpenAI from 'openai';

export const CREDENTIAL_DOMAIN_KEYWORDS: string[] = [
  'credential',
  'license',
  'expir',
  'compliance',
  'document',
  'certif',
  'cpr',
  'reminder',
  'upload',
  'renew',
  'staff document',
];

export const CREDENTIAL_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_credentials',
      description:
        'Search employee credentials within the agency. Supports filtering by status, review status, credential type, employee name, and expiration date range. Returns a list of matching credentials with employee and document type info.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['VALID', 'EXPIRING_SOON', 'EXPIRED', 'MISSING', 'PENDING'],
            description: 'Filter by document compliance status.',
          },
          reviewStatus: {
            type: 'string',
            enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CORRECTION'],
            description: 'Filter by admin review status.',
          },
          credentialType: {
            type: 'string',
            description: 'Partial match on the credential/document type name (e.g. "CPR", "Driver").',
          },
          employeeNameQuery: {
            type: 'string',
            description: 'Partial first or last name match to filter by employee.',
          },
          expirationBefore: {
            type: 'string',
            description: 'ISO 8601 date — return credentials expiring on or before this date.',
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 50,
            description: 'Maximum number of results to return (default 20, max 50).',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_employee_credentials',
      description:
        'Get all credentials for a specific employee, including their compliance status and each document\'s current state. Provide either employeeId (exact) or employeeNameQuery (partial name search).',
      parameters: {
        type: 'object',
        properties: {
          employeeId: {
            type: 'string',
            description: 'Exact UUID of the employee.',
          },
          employeeNameQuery: {
            type: 'string',
            description: 'Partial first or last name to search for the employee.',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_compliance_summary',
      description:
        'Get the overall compliance summary for the agency: total employees, compliant count, expiring soon, expired, missing, and overall compliance rate percentage.',
      parameters: {
        type: 'object',
        properties: {
          includeInactiveEmployees: {
            type: 'boolean',
            description: 'Whether to include inactive/terminated employees in the summary (default false).',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_credential_reminders',
      description:
        'Send expiration reminder emails for credentials. If no credentialIds are provided, finds all credentials needing reminders agency-wide. Use dryRun=true to preview without sending.',
      parameters: {
        type: 'object',
        properties: {
          credentialIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional list of specific credential UUIDs to remind. If omitted, reminders go to all eligible credentials.',
          },
          dryRun: {
            type: 'boolean',
            description: 'If true, returns a preview of who would be reminded without actually sending emails (default false).',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
];
