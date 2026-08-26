import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PF MARKET MIND — Automated Prop Firm Trading" },
      {
        name: "description",
        content:
          "PF MARKET MIND is a cloud-based automated trading platform for prop firm accounts. Connect MT5, activate trading bots, and control risk — no laptop required.",
      },
      {
        property: "og:title",
        content: "PF MARKET MIND — Automated Prop Firm Trading",
      },
      {
        property: "og:description",
        content:
          "Cloud-based automated trading for prop firm accounts. Connect MT5, activate bots, control risk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const BUBBLE_COLORS = [
  "oklch(0.65 0.2 250)",
  "oklch(0.62 0.22 300)",
  "oklch(0.68 0.2 350)",
  "oklch(0.72 0.16 200)",
  "oklch(0.78 0.17 162)",
  "oklch(0.72 0.18 60)",
  "oklch(0.8 0.17 95)",
];

function rand(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

const BUBBLES = Array.from({ length: 36 }, (_, i) => {
  const depth = rand(i + 1);
  const size = 14 + depth * 120;
  return {
    id: i,
    left: rand(i + 11) * 100,
    size,
    color: BUBBLE_COLORS[Math.floor(rand(i + 23) * BUBBLE_COLORS.length)]!,
    blur: (1 - depth) * 14 + rand(i + 31) * 4,
    opacity: 0.14 + depth * 0.2,
    duration: 34 - depth * 16 + rand(i + 41) * 10,
    delay: -rand(i + 53) * 40,
    drift: (rand(i + 61) - 0.5) * 14,
    scale: 0.85 + depth * 0.3,
  };
});

function Index() {
  const { session } = useAuth();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {BUBBLES.map((b) => (
          <span
            key={b.id}
            className="bubble"
            style={{
              left: `${b.left}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              background: `radial-gradient(circle at 32% 28%, color-mix(in oklab, ${b.color} 70%, white) 0%, ${b.color} 45%, color-mix(in oklab, ${b.color} 55%, transparent) 100%)`,
              filter: `blur(${b.blur}px)`,
              boxShadow: `0 0 ${b.size / 2}px color-mix(in oklab, ${b.color} 45%, transparent)`,
              ["--b-duration" as string]: `${b.duration}s`,
              ["--b-delay" as string]: `${b.delay}s`,
              ["--b-opacity" as string]: `${b.opacity}`,
              ["--b-drift" as string]: `${b.drift}vw`,
              ["--b-scale" as string]: `${b.scale}`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--background)_62%,transparent)_0%,color-mix(in_oklab,var(--background)_18%,transparent)_55%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-3xl text-center">
        <p className="reveal text-xs font-medium uppercase tracking-[0.35em] text-primary">
          Cloud Automated Trading
        </p>
        <h1 className="reveal reveal-delay-1 mt-6 font-display text-4xl font-semibold uppercase leading-tight tracking-[0.12em] text-foreground sm:text-5xl lg:text-6xl">
          PF Market Mind
        </h1>
        <p className="reveal reveal-delay-2 mx-auto mt-8 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Connect your MT5 account, activate a trading bot, and let our cloud
          infrastructure execute on your prop firm account — no laptop, no VPS, no
          babysitting.
        </p>
        <div className="reveal reveal-delay-3 mt-12 flex flex-wrap items-center justify-center gap-4">
          {session ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
