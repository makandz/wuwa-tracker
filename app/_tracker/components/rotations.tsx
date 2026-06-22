import { Fragment } from "react";

import {
  ROTATION_ACTION_CLASSES,
  ROTATION_ACTION_LABELS,
  type CharacterRotation,
  type RotationAction,
  type RotationStep,
} from "../rotations";

const ROTATION_LEGEND_ACTIONS: RotationAction[] = [
  "intro",
  "echo",
  "basic",
  "heavy",
  "skill",
  "holdSkill",
  "ultimate",
  "outro",
];

function RotationStepCard({ step }: { step: RotationStep }) {
  const actionClasses = ROTATION_ACTION_CLASSES[step.action];
  const actionLabel = ROTATION_ACTION_LABELS[step.action];
  const labelMatchesAction = step.label.toLowerCase() === actionLabel.toLowerCase();
  const compactAction = step.count ? `${actionLabel} ${step.count}` : actionLabel;
  const mainLabel = labelMatchesAction ? compactAction : step.label;
  const eyebrowLabel = labelMatchesAction ? null : compactAction;

  return (
    <li className="group relative shrink-0">
      <div
        className={`grid min-h-10 w-fit min-w-20 max-w-44 content-center rounded-md border px-3 py-1.5 shadow-sm ${actionClasses}`}
        tabIndex={step.note ? 0 : undefined}
      >
        <div>
          {eyebrowLabel ? (
            <div className="text-[10px] font-semibold uppercase tracking-normal opacity-75">
              {eyebrowLabel}
            </div>
          ) : null}
          <div className="whitespace-nowrap text-xs font-bold leading-4 text-current sm:text-sm">
            {mainLabel}
          </div>
        </div>
        {step.note ? (
          <div className="pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] z-10 hidden w-48 -translate-x-1/2 rounded-md border border-app-border bg-app-raised px-3 py-2 text-xs font-medium leading-5 text-app-muted shadow-lg group-hover:block group-focus-within:block">
            {step.note}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function RotationConnector({ label }: { label?: string }) {
  const cancelConnector = Boolean(label);

  return (
    <li
      aria-label={label ? `${label} into next move` : "Then"}
      className="group/connector relative grid min-h-10 w-8 shrink-0 place-items-center"
    >
      <div
        className={`relative grid h-7 w-7 place-items-center text-base font-bold leading-none ${
          cancelConnector
            ? "text-status-danger-border"
            : "text-app-muted-dim"
        }`}
        tabIndex={cancelConnector ? 0 : undefined}
      >
        <span>&gt;</span>
        {label ? (
          <span className="absolute h-5 w-0.5 rotate-45 rounded-full bg-status-danger-border" />
        ) : null}
        {label ? (
          <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.25rem)] z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-app-border bg-app-raised px-2 py-1 text-[10px] font-semibold uppercase tracking-normal text-app-muted shadow-lg group-hover/connector:block group-focus-within/connector:block">
            {label}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function RotationTimeline({ rotation }: { rotation: CharacterRotation }) {
  return (
    <article className="grid gap-3">
      <div>
        <h3 className="text-base font-semibold text-app-fg">{rotation.title}</h3>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-app-muted-subtle">
          {rotation.summary}
        </p>
      </div>
      <ol className="flex flex-wrap items-center gap-y-3">
        {rotation.steps.map((step, index) => {
          const stepKey = `${step.action}-${step.label}-${step.count ?? ""}-${index}`;

          return (
            <Fragment key={stepKey}>
              <RotationStepCard step={step} />
              {index < rotation.steps.length - 1 ? (
                <RotationConnector label={step.nextLink?.label} />
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </article>
  );
}

export function CharacterRotationsSection({
  rotations,
}: {
  rotations: CharacterRotation[];
}) {
  if (rotations.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-5 rounded-md border border-app-border/80 bg-app-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-app-fg">Rotations</h2>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Rotation action legend">
          {ROTATION_LEGEND_ACTIONS.map((action) => (
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${ROTATION_ACTION_CLASSES[action]}`}
              key={action}
            >
              {ROTATION_ACTION_LABELS[action]}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-5">
        {rotations.map((rotation) => (
          <RotationTimeline key={rotation.title} rotation={rotation} />
        ))}
      </div>
    </section>
  );
}
