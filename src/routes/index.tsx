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

function Index() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="aurora-a absolute left-1/2 top-1/2 h-[80vmax] w-[80vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--foreground)_9%,transparent)_0%,transparent_62%)] blur-3xl" />
        <div className="aurora-b absolute left-1/2 top-1/2 h-[65vmax] w-[65vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--muted-foreground)_12%,transparent)_0%,transparent_60%)] blur-3xl" />
        <div className="noise-drift absolute -inset-[10%] opacity-[0.05] [background-image:radial-gradient(currentColor_0.5px,transparent_0.5px)] [background-size:3px_3px] text-foreground" />
      </div>

      <div className="breathe max-w-4xl text-center">
        <h1 className="reveal reveal-delay-1 headline-shimmer text-3xl font-light uppercase leading-tight tracking-[0.18em] text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
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
