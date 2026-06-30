"use client";

import { TextButton } from "../components/ui";

const workflowSteps = [
  {
    title: "Add your characters",
    description: "Pick the characters you are building and assign their role and weapon.",
  },
  {
    title: "Track what is done",
    description: "Mark skills and echo slots as finished when they reach your target.",
  },
  {
    title: "Compare builds",
    description: "Enter combined echo crit stats to calculate crit value across characters.",
  },
  {
    title: "Plan endgame teams",
    description: "Use your tracked roster to build Matrix teams and spot shared weapon conflicts.",
  },
];

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="grid min-h-full place-items-center bg-app-bg px-4 py-8 text-app-fg sm:px-6 lg:px-8">
      <section className="grid w-full max-w-xl gap-6 rounded-md border border-app-border/80 bg-app-surface p-5">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-normal text-app-fg">
            Wuthering Waves Tracker
          </h1>
          <p className="text-sm leading-6 text-app-muted-subtle">
            Set up local tracking for builds, weapons, echo stats, and Matrix teams.
          </p>
        </div>

        <section className="grid gap-4">
          <h2 className="text-base font-semibold text-app-fg">Setup Flow</h2>
          <div className="grid gap-3">
            {workflowSteps.map((step, index) => (
              <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3" key={step.title}>
                <div className="grid size-9 place-items-center rounded-md border border-app-border bg-app-bg text-sm font-semibold text-app-muted">
                  {index + 1}
                </div>
                <div className="grid gap-1 border-b border-app-border/70 pb-3">
                  <h3 className="text-sm font-semibold text-app-fg">{step.title}</h3>
                  <p className="text-sm leading-6 text-app-muted-subtle">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <TextButton onClick={onStart} variant="primary">
            Start Tracking
          </TextButton>
        </div>
      </section>
    </main>
  );
}
