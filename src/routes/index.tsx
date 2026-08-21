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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-20">
      <div className="animate-fade-in max-w-4xl text-center">
        <h1 className="text-3xl font-light uppercase leading-tight tracking-[0.18em] text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
          Upcoming Prop Firm Comparison Directory
        </h1>
        <p className="mt-10 text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground sm:text-base">
          Stay Tuned
        </p>
        <p className="mt-6 inline-flex items-center text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground sm:text-sm">
          Big Ideas Loading
          <span className="loading-dot loading-dot-1 ml-0.5">.</span>
          <span className="loading-dot loading-dot-2">.</span>
          <span className="loading-dot loading-dot-3">.</span>
        </p>
      </div>
    </main>
  );
}
