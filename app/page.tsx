import Link from "next/link";

export default function Home() {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Tend</p>
        <h1 className="text-4xl font-semibold tracking-tight">Tend demo is live</h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
          A wellness booking workflow demo with owner-controlled automation, draft approvals,
          and client scheduling.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <DemoLink
          href="/dashboard"
          title="Owner Dashboard"
          description="Review active cases, approve drafts, and see the system timeline."
        />
        <DemoLink
          href="/inbox"
          title="Mock Inbox"
          description="View sent emails and simulate client replies during the demo."
        />
        <DemoLink
          href="/entry-form.html"
          title="Entry Form"
          description="Submit a new client inquiry and start the booking workflow."
        />
        <DemoLink
          href="/select-time?case_id=case_003"
          title="Slot Selection"
          description="Preview the client time selection page with a seeded case."
        />
      </section>

      {isDevelopment ? (
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-xl font-medium">Development</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Start with <code>/api/health</code> and <code>/api/cases</code>.
          </p>
        </section>
      ) : null}
    </main>
  );
}

function DemoLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  const className =
    "rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 transition-colors hover:border-[var(--accent)]";
  const content = (
    <>
      <h2 className="text-xl font-medium">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </>
  );

  // Static files in public/ are not app routes — client-side navigation would 404.
  if (href.endsWith(".html")) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
