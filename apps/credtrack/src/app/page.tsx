export default function CredTrackHome() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] px-4 text-white">
      <div className="max-w-2xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">
          Mastering HomeCare
        </p>
        <h1 className="mb-4 text-5xl font-bold">CredTrack</h1>
        <p className="mb-8 text-xl text-white/90">
          AI-powered credential tracking for home-care agencies.
          <br />
          Auto-parse documents, track expirations, stay compliant.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="/auth/signin"
            className="rounded-lg bg-white px-8 py-3 font-semibold text-[#0B4F96] shadow-lg transition hover:bg-white/90"
          >
            Sign In
          </a>
          <a
            href="/auth/signup"
            className="rounded-lg border border-white/40 bg-white/10 px-8 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            Get Started Free
          </a>
        </div>
        <p className="mt-8 text-sm text-white/60">
          Already on Mastering HomeCare PRO or higher?{' '}
          <a href="/auth/signin" className="underline hover:text-white">
            Sign in — CredTrack is included.
          </a>
        </p>
      </div>
    </main>
  );
}
