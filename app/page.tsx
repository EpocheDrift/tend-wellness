import { store } from "@/lib/store";

export default function Home() {
  const cases = store.listCases();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Tend</p>
        <h1 className="text-4xl font-semibold tracking-tight">Next.js scaffold is live</h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
          Issue #1 adds the root Next.js app, an in-memory demo store, and seed data for four
          booking cases. Start with <code>/api/health</code> and <code>/api/cases</code>.
        </p>
      </header>

      <section className="grid gap-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Seed Cases</h2>
          <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-sm text-white">
            {cases.length} loaded
          </span>
        </div>

        <ul className="grid gap-3">
          {cases.map((bookingCase) => (
            <li
              key={bookingCase.id}
              className="rounded-2xl border border-[var(--border)] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{bookingCase.client_name}</p>
                  <p className="text-sm text-[var(--muted)]">{bookingCase.client_email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{bookingCase.current_step}</p>
                  <p className="text-sm text-[var(--muted)]">{bookingCase.state}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
