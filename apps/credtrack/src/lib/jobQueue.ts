// Re-export job queue helpers from the shared credential-core package.
// processParsingQueue is NOT re-exported here — CredTrack's cron route imports
// it directly from the MHC app at runtime via Next.js webpack transpilation.
export { enqueueParsingJob, getJobStatus, cancelJob } from '@mhc/credential-core';

// processParsingQueue lives in apps/mhc/src/lib/jobQueue and is imported
// directly by apps/credtrack/src/app/api/cron/process-parsing/route.ts
// using a dynamic import to avoid TypeScript pulling in MHC's full dep tree.
