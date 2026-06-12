import Link from "next/link";
import type { ReactNode } from "react";

export default function Home() {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Tend</p>
        <h1 className="text-4xl font-semibold tracking-tight">Tend demo is live</h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
          An AI agent handles a wellness practice&apos;s bookings — but only within policy. Routine
          steps run automatically, outbound emails wait for the owner&apos;s approval, and sensitive
          calls are handed back to a human. You can play both sides below.
        </p>
      </header>

      <section className="rounded-3xl border border-[var(--accent)]/30 bg-[var(--card)] p-6">
        <h2 className="text-xl font-medium">Try it in 2 minutes</h2>
        <ol className="mt-4 max-w-2xl list-none space-y-4 text-base leading-7">
          <GuideStep
            number={1}
            title="Be the owner"
            description={
              <>
                Open the <a className="underline decoration-[var(--accent)]/40 underline-offset-4" href="/dashboard">Dashboard</a> and
                find the case marked <strong>Start here</strong> — Jane Kim, with a pulsing amber
                dot (just below the red escalated case). The system drafted an email but won&apos;t
                send it without you. Click <strong>Approve</strong> and watch the timeline: the
                system immediately proposes time slots on its own.
              </>
            }
          />
          <GuideStep
            number={2}
            title="Be the client"
            description={
              <>
                Open the <a className="underline decoration-[var(--accent)]/40 underline-offset-4" href="/inbox">Mock Inbox</a>.
                Jane&apos;s new &ldquo;Available time slots&rdquo; email is already open, marked{" "}
                <strong>ACTION</strong> — click <strong>Pick a time</strong> inside it and confirm
                a slot, exactly as the client would.
              </>
            }
          />
          <GuideStep
            number={3}
            title="Close the loop"
            description={
              <>
                Back on the <a className="underline decoration-[var(--accent)]/40 underline-offset-4" href="/dashboard">Dashboard</a>,
                a confirmation draft is waiting for you. Approve it — the case turns{" "}
                <strong>Booked ✓</strong> and a session reminder is scheduled automatically.
              </>
            }
          />
        </ol>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Your session is private — every visitor plays their own copy of the demo. Stuck or want
          a clean slate? Use <strong>Reset Demo</strong> in the top-right corner of the dashboard
          or inbox; it only restarts yours.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Explore freely</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
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

function GuideStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
        {number}
      </span>
      <span>
        <strong className="font-medium">{title}.</strong>{" "}
        <span className="text-[var(--muted)]">{description}</span>
      </span>
    </li>
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
