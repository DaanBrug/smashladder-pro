import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Trophy, Timer, Shuffle, ListOrdered, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmashRanking — Tennis Ladders, Ranked" },
      { name: "description", content: "Run a modern tennis ladder competition with the sliding rule, automatic seeding, and 3-day challenge timers." },
      { property: "og:title", content: "SmashRanking — Tennis Ladders, Ranked" },
      { property: "og:description", content: "Sliding-rule ladder. Open enrollment. Auto-seeded. Built for clubs." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary font-display text-lg font-bold text-primary-foreground">S</span>
            <span className="font-display text-lg font-bold uppercase tracking-wider">SmashRanking</span>
          </div>
          <Link to="/auth" className="rounded-md border border-border px-4 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary">
            Sign in
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30 [background:radial-gradient(60%_60%_at_50%_0%,var(--color-primary)_0%,transparent_70%)]" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Tennis ladder, reinvented
          </div>
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight md:text-7xl">
            Climb the <span className="neon-text">ladder</span>.<br />Settle it on court.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            A modern, mobile-first ladder for your tennis club. Sliding-rule ranking, open enrollment, automatic seeding, and 72-hour challenge timers.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth"
              className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-display font-bold uppercase tracking-wider text-primary-foreground transition hover:brightness-110">
              Get started <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/join"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 font-display font-bold uppercase tracking-wider hover:border-primary hover:text-primary">
              Join a competition
            </Link>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-16 md:grid-cols-3">
          {[
            { icon: ListOrdered, t: "Sliding rule", d: "Beat someone ranked above you and slide into their spot. Everyone between drops one." },
            { icon: Shuffle, t: "Auto seeding", d: "When registration closes, the ladder draws a random starting order." },
            { icon: Timer, t: "72-hour timers", d: "Challenges expire after 3 days. Results auto-confirm if the loser doesn't respond." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card-surface card-hover p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-xl font-bold uppercase tracking-wide">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold uppercase tracking-wide md:text-4xl">How it works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["01", "Register", "Join the open competition with a magic link."],
              ["02", "Get seeded", "We shuffle everyone into a starting ladder."],
              ["03", "Challenge", "Pick anyone above you. They have 72h to accept."],
              ["04", "Win, slide", "Win and take their spot. They drop one."],
            ].map(([n, t, d]) => (
              <li key={n} className="card-surface p-6">
                <div className="font-display text-3xl font-bold text-primary">{n}</div>
                <div className="mt-2 font-display font-bold uppercase tracking-wide">{t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{d}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* cta */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-wide">Ready to play?</h2>
          <p className="mt-2 text-muted-foreground">Start the ladder. Settle it on court.</p>
          <Link to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3 font-display font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SmashRanking
        </div>
      </footer>
    </div>
  );
}
