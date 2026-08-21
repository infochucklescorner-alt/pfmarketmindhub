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
        <div className="orb orb-1 absolute left-[18%] top-[22%] h-[62vmax] w-[62vmax] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]" />
        <div className="orb orb-2 absolute left-[78%] top-[30%] h-[54vmax] w-[54vmax] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]" />
        <div className="orb orb-3 absolute left-[46%] top-[82%] h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]" />
        <div className="orb orb-4 absolute left-[62%] top-[58%] h-[40vmax] w-[40vmax] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px]" />
        <div className="aurora-sweep absolute -inset-[30%]" />
        <div className="noise-drift absolute -inset-[10%] text-foreground opacity-[0.045] [background-image:radial-gradient(currentColor_0.5px,transparent_0.5px)] [background-size:3px_3px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--background)_78%,transparent)_0%,color-mix(in_oklab,var(--background)_35%,transparent)_55%,transparent_100%)]" />
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
