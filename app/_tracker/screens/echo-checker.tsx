"use client";

import { useEffect, useRef } from "react";

import {
  ECHO_CHECKER_PLAN_OPTIONS,
  ECHO_CHECKLIST_ITEMS,
  ECHO_CRIT_DMG_VALUES,
  ECHO_CRIT_RATE_VALUES,
} from "../constants";
import {
  createDefaultEchoChecker,
  formatDecimalInputValue,
  getEchoCheckerCritValue,
  getEchoCheckerCritValueRating,
  getEchoCheckerEcho,
  getDefaultEchoCheckerPlan,
  getPrydwenCharacterUrl,
  getRatingGrade,
  getRatings,
  isEchoCheckerEchoComplete,
  isEchoCheckerEnabled,
  ratingGradeClasses,
} from "../domain";
import type {
  EchoChecker,
  EchoCheckerEcho,
  EchoCheckerPlan,
  TrackedCharacter,
} from "../types";
import {
  CharacterAvatar,
  ErInput,
  RatingSummaryBlock,
  SelectInput,
  TextButton,
  TextLink,
} from "../components/ui";

function EchoRollSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: number | null;
  values: number[];
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 text-xs font-medium text-app-muted-subtle">
      <span>{label}</span>
      <span className="relative">
        <select
          className="h-9 w-full appearance-none rounded-md border border-app-border bg-app-surface pl-2.5 pr-7 text-xs font-semibold text-app-fg outline-none transition focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/25"
          onChange={(event) =>
            onChange(event.target.value ? Number(event.target.value) : null)
          }
          value={value === null ? "" : String(value)}
        >
          <option value="">-</option>
          {values.map((option) => (
            <option key={option} value={option}>
              {option}%
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-app-muted-dim">
          v
        </span>
      </span>
    </label>
  );
}

function AutoGrowTextarea({
  id,
  onChange,
  placeholder,
  value,
}: {
  id: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      className="min-h-11 resize-none overflow-hidden rounded-md border border-app-border bg-app-surface px-3 py-2.5 text-sm font-medium leading-5 text-app-fg outline-none transition placeholder:text-app-muted-dim focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/25"
      id={id}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      ref={textareaRef}
      rows={1}
      value={value}
    />
  );
}

function HelpTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      <button
        aria-label="Substat priority help"
        className="grid h-5 w-5 cursor-help place-items-center rounded-full border border-app-border bg-app-surface text-[11px] font-bold text-app-muted-subtle outline-none transition group-hover:border-app-accent group-hover:text-app-fg focus:border-app-accent focus:text-app-fg focus:ring-2 focus:ring-app-accent/25"
        type="button"
      >
        ?
      </button>
      <span
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-md border border-app-border bg-app-raised px-3 py-2 text-xs font-medium leading-5 text-app-muted opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        {children}
      </span>
    </span>
  );
}

export function EchoCheckerScreen({
  character,
  onBack,
  onUpdate,
}: {
  character: TrackedCharacter;
  onBack: () => void;
  onUpdate: (character: TrackedCharacter) => void;
}) {
  const echoChecker = character.echoChecker ?? createDefaultEchoChecker(character.roles);
  const echoCheckerActive = isEchoCheckerEnabled(character);
  const substatPriority = echoChecker.substatPriority ?? "";
  const ratings = getRatings(character);
  const prydwenUrl = getPrydwenCharacterUrl(character.characterName);
  const defaultPlan = getDefaultEchoCheckerPlan(character.roles);
  const planOptions = ECHO_CHECKER_PLAN_OPTIONS.map((option) => ({
    ...option,
    label:
      option.value === defaultPlan
        ? `${option.label} (recommended)`
        : option.label,
  }));
  const planSelectClassName =
    echoChecker.plan === "DPS"
      ? "border-role-dps-border/70 bg-role-dps-bg/35 text-role-dps-text focus:border-role-dps-border focus:ring-role-dps-border/25"
      : "border-role-hybrid-border/70 bg-role-hybrid-bg/35 text-role-hybrid-text focus:border-role-hybrid-border focus:ring-role-hybrid-border/25";
  const expectedErSet = character.expectedEr > 0;
  const expectedErMet = expectedErSet && character.actualEr >= character.expectedEr;
  const expectedErText = expectedErSet
    ? `${formatDecimalInputValue(character.expectedEr)}%`
    : "Not set";
  const expectedErTextClass = expectedErSet
    ? expectedErMet
      ? "text-status-good-text"
      : "text-status-warn-text"
    : "text-app-muted-dim";

  function patchCharacter(patch: Partial<TrackedCharacter>) {
    onUpdate({
      ...character,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  function patchEchoChecker(patch: Partial<EchoChecker>) {
    patchCharacter({
      echoChecker: {
        ...echoChecker,
        ...patch,
      },
    });
  }

  function enableEchoChecker() {
    if (character.noCrit) {
      return;
    }

    patchEchoChecker({
      enabled: true,
      plan: character.echoChecker?.plan ?? getDefaultEchoCheckerPlan(character.roles),
    });
  }

  function patchEchoCheckerEcho(
    key: keyof EchoChecker["echoes"],
    patch: Partial<EchoCheckerEcho>,
  ) {
    patchEchoChecker({
      echoes: {
        ...echoChecker.echoes,
        [key]: {
          ...getEchoCheckerEcho(character, key),
          ...patch,
        },
      },
    });
  }

  function patchSubstatPriority(nextSubstatPriority: string) {
    patchEchoChecker({
      substatPriority: nextSubstatPriority,
    });
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CharacterAvatar character={character} />
          <div>
            <h1 className="text-2xl font-bold text-app-fg">Echo Tracker</h1>
            <p className="mt-1 text-sm text-app-muted-subtle">
              {character.characterName} / {character.elementName}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextButton onClick={onBack}>Character</TextButton>
          <TextLink href={prydwenUrl}>Prydwen</TextLink>
          {!echoCheckerActive && character.noCrit ? (
            <button
              className="h-10 cursor-not-allowed rounded-md border border-app-border bg-app-surface px-4 text-sm font-semibold text-app-muted-dim opacity-70"
              disabled
              type="button"
            >
              Enable Checker
            </button>
          ) : !echoCheckerActive ? (
            <TextButton
              onClick={enableEchoChecker}
              variant="primary"
            >
              Enable Checker
            </TextButton>
          ) : null}
        </div>
      </div>

      {character.noCrit ? (
        <section className="rounded-md border border-app-border/80 bg-app-surface p-3">
          <div className="text-[11px] font-semibold uppercase tracking-normal text-app-muted-dim">
            Crit Rating
          </div>
          <div className="mt-1 text-lg font-semibold leading-none text-app-muted">No crit</div>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-3">
          <RatingSummaryBlock
            label="CR Rating"
            tone={ratings.crRating === null ? "warn" : "neutral"}
            value={ratings.crRating}
          />
          <RatingSummaryBlock
            label="CD Rating"
            tone={ratings.cdRating === null ? "warn" : "neutral"}
            value={ratings.cdRating}
          />
          <RatingSummaryBlock
            label="Weighted"
            tone={ratings.weighted === null ? "warn" : ratings.weighted >= 1 ? "good" : "neutral"}
            value={ratings.weighted}
          />
        </section>
      )}

      <section className="grid gap-3 rounded-md border border-app-border bg-app-surface/70 p-3">
        <div className="grid gap-2 text-sm font-semibold text-app-fg">
          <div className="flex items-center gap-2">
            <label htmlFor="echo-substat-priority">Substat Priority</label>
            <HelpTooltip>
              Paste or type the character&apos;s target substat priority here. This is saved as a note only.
            </HelpTooltip>
          </div>
          <AutoGrowTextarea
            id="echo-substat-priority"
            onChange={patchSubstatPriority}
            placeholder="Energy Regen (Until Satisfied) > CRIT DMG = CRIT Rate > ATK% > Liberation DMG% > ATK"
            value={substatPriority}
          />
          <span className="text-xs font-medium leading-5 text-app-muted-dim">
            Saved with this character for reference while checking echo rolls.
          </span>
        </div>
      </section>

      {character.noCrit ? (
        <section className="rounded-md border border-status-warn-border bg-status-warn-bg p-4 text-sm font-medium text-status-warn-text">
          Echo Checker needs a crit-focused 4 cost setup.
        </section>
      ) : (
        <section className="grid gap-5 rounded-md border border-app-border/80 bg-app-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-app-fg">Plan</h2>
              <p className="mt-1 text-sm text-app-muted-subtle">
                {echoChecker.plan === "DPS"
                  ? "DPS: double crit, then either 30 CV plus a target stat or two target stats."
                  : "Hybrid/Support: double crit on each echo."}
              </p>
            </div>
            <div className="w-full sm:w-80">
              <SelectInput<EchoCheckerPlan>
                label="Checker Plan"
                onChange={(plan) => patchEchoChecker({ enabled: true, plan })}
                options={planOptions}
                selectClassName={planSelectClassName}
                showLabel={false}
                value={echoChecker.plan}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ECHO_CHECKLIST_ITEMS.map((item) => {
              const echo = getEchoCheckerEcho(character, item.key);
              const complete = isEchoCheckerEchoComplete(echo, echoChecker.plan);
              const critValue = getEchoCheckerCritValue(echo);
              const critValueRating = getEchoCheckerCritValueRating(echo);
              const critValueGrade =
                critValueRating === null ? null : getRatingGrade(critValueRating);

              return (
                <div
                  className={`grid gap-2 rounded-md border p-3 ${
                    complete
                      ? "border-status-good-border bg-status-good-bg/65"
                      : "border-app-border bg-app-surface"
                  }`}
                  key={item.key}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-app-fg">{item.label}</h3>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        complete
                          ? "bg-status-good-border text-app-bg"
                          : "bg-app-raised text-app-muted-dim"
                      }`}
                    >
                      {complete ? "Done" : "Open"}
                    </span>
                  </div>
                  <EchoRollSelect
                    label="CR"
                    onChange={(critRate) => patchEchoCheckerEcho(item.key, { critRate })}
                    value={echo.critRate}
                    values={ECHO_CRIT_RATE_VALUES}
                  />
                  <EchoRollSelect
                    label="CD"
                    onChange={(critDmg) => patchEchoCheckerEcho(item.key, { critDmg })}
                    value={echo.critDmg}
                    values={ECHO_CRIT_DMG_VALUES}
                  />
                  <div className="grid gap-2">
                    <label className="flex items-center justify-between gap-2 rounded-md border border-app-border bg-app-surface/70 px-2 py-2 text-xs font-semibold text-app-muted">
                      Target stat 1
                      <input
                        checked={echo.hasRelevantStat}
                        className="h-4 w-4 accent-app-accent"
                        onChange={(event) =>
                          patchEchoCheckerEcho(item.key, {
                            hasRelevantStat: event.target.checked,
                            hasSecondRelevantStat: event.target.checked
                              ? echo.hasSecondRelevantStat
                              : false,
                          })
                        }
                        type="checkbox"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 rounded-md border border-app-border bg-app-surface/70 px-2 py-2 text-xs font-semibold text-app-muted">
                      Target stat 2
                      <input
                        checked={echo.hasSecondRelevantStat}
                        className="h-4 w-4 accent-app-accent"
                        onChange={(event) =>
                          patchEchoCheckerEcho(item.key, {
                            hasRelevantStat: event.target.checked
                              ? true
                              : echo.hasRelevantStat,
                            hasSecondRelevantStat: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                    </label>
                  </div>
                  <div className="rounded-md border border-app-border bg-app-surface/70 px-2 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-normal text-app-muted-dim">
                      Crit Value
                    </div>
                    <div className="mt-1 flex min-h-6 items-center gap-1.5">
                      {critValueGrade === null ? (
                        <span className="rounded bg-status-warn-bg px-1.5 py-0.5 text-xs font-bold leading-none text-status-warn-text">
                          Check
                        </span>
                      ) : (
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-bold leading-none ${ratingGradeClasses(
                            critValueGrade,
                          )}`}
                        >
                          {critValueGrade}
                        </span>
                      )}
                      <span className="text-sm font-semibold leading-none text-app-fg">
                        {critValue === null ? "-" : critValue}
                      </span>
                      {critValueRating === null ? null : (
                        <span className="text-[11px] font-semibold leading-none text-app-muted-dim">
                          {critValueRating.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid w-full gap-3 rounded-md border border-app-border bg-app-surface/70 p-3">
            <label className="grid max-w-md gap-2 text-sm font-medium text-app-muted">
              Current ER
              <ErInput
                onChange={(actualEr) => patchCharacter({ actualEr })}
                placeholder="125"
                value={character.actualEr}
              />
            </label>
            <div className="grid gap-1 text-xs leading-5 text-app-muted-dim">
              <p>
                Expected Minimum ER:{" "}
                <span className={`font-bold ${expectedErTextClass}`}>
                  {expectedErText}
                </span>
              </p>
              <p>Use the ER value from the main character screen.</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
