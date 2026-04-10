import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--color-canvas)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-tight text-slate-900">Eonpulse</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Register
            </Link>
            <Link href="/login" className="btn-primary px-4 py-2 text-sm">
              Open workspace
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Eonpulse · Project delivery
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Plan, review, and ship—with commercial control
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              One place for milestones, client approvals, deliverables, and billing gates—built for
              agencies and delivery teams who need discipline without the clutter.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className="btn-primary px-6 py-3 text-base">
                Get started
              </Link>
              <Link
                href="/dashboard"
                className="btn-secondary px-6 py-3 text-base font-semibold"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Built for delivery operations
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Milestone billing",
                desc: "Hard gates, invoices, and payment verification before the next stage unlocks.",
              },
              {
                title: "Review routing",
                desc: "Internal review, client comments, and approvals with a clear audit trail.",
              },
              {
                title: "Team clarity",
                desc: "Assignments, dependencies, and evidence tied to tasks and deliverables.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="card-elevated rounded-xl p-6 transition hover:shadow-md"
              >
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-8 text-center text-xs text-slate-500">
          Eonpulse — project delivery & operations
        </footer>
      </main>
    </div>
  );
}
