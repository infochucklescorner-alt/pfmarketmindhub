import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prop Firm Comparison Directory — Coming Soon" },
      {
        name: "description",
        content:
          "A refined directory for comparing prop firms is on the way. Stay tuned for the launch.",
      },
      {
        property: "og:title",
        content: "Prop Firm Comparison Directory — Coming Soon",
      },
      {
        property: "og:description",
        content:
          "A refined directory for comparing prop firms is on the way. Stay tuned for the launch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const BUBBLE_COLORS = [
  "oklch(0.72 0.15 250)",
  "oklch(0.68 0.16 300)",
  "oklch(0.74 0.14 350)",
  "oklch(0.78 0.12 200)",
  "oklch(0.76 0.13 155)",
  "oklch(0.78 0.14 60)",
  "oklch(0.84 0.13 95)",
];

function rand(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

const BUBBLES = Array.from({ length: 46 }, (_, i) => {
  const depth = rand(i + 1);
  const size = 14 + depth * 120;
  return {
    id: i,
    left: rand(i + 11) * 100,
    size,
    color: BUBBLE_COLORS[Math.floor(rand(i + 23) * BUBBLE_COLORS.length)]!,
    blur: (1 - depth) * 14 + rand(i + 31) * 4,
    opacity: 0.22 + depth * 0.4,
    duration: 34 - depth * 16 + rand(i + 41) * 10,
    delay: -rand(i + 53) * 40,
    drift: (rand(i + 61) - 0.5) * 14,
    scale: 0.85 + depth * 0.3,
  };
});

function Index() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--background)_82%,transparent)_0%,color-mix(in_oklab,var(--background)_45%,transparent)_58%,transparent_100%)]" />
      </div>

      <div className="max-w-4xl text-center">
        <h1 className="reveal reveal-delay-1 text-3xl font-light uppercase leading-tight tracking-[0.18em] text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
          Upcoming Prop Firm Comparison Directory
        </h1>
        <p className="reveal reveal-delay-2 mt-10 text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground sm:text-base">
          Stay Tuned
        </p>
        <p className="reveal reveal-delay-3 mt-6 inline-flex items-center text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground sm:text-sm">
          Big Ideas Loading
          <span className="loading-dot loading-dot-1 ml-0.5">.</span>
          <span className="loading-dot loading-dot-2">.</span>
          <span className="loading-dot loading-dot-3">.</span>
        </p>
      </div>
    </main>
  );
}
