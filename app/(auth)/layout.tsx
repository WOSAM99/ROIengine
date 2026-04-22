export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background grid min-h-screen lg:grid-cols-[3fr_2fr]">
      <aside className="bg-gradient-primary relative hidden flex-col justify-between overflow-hidden px-10 py-10 text-white lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)] opacity-[0.12]"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative flex items-baseline gap-2">
          <span className="font-mono text-lg font-bold tracking-tight text-white">ROI</span>
          <span className="text-[11px] tracking-wider text-white/70 uppercase">Dashboard</span>
        </div>
        <div className="relative max-w-md space-y-5">
          <h2 className="text-4xl leading-[1.1] font-bold tracking-[-0.02em] break-words text-white">
            Upload job data.
            <br />
            See profit leaks.
            <br />
            Ask questions.
          </h2>
          <p className="text-sm leading-relaxed break-words text-white/85">
            Interactive dashboards and AI narration built on top of your raw Excel — without any of
            your customer data ever leaving the server.
          </p>
        </div>
        <div className="relative text-[11px] tracking-wider text-white/70 uppercase">
          v0.1.0 · private preview
        </div>
      </aside>

      <section className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}
