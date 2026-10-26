"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  ECHO_CHECKLIST_ITEMS,
  ECHO_CRIT_DMG_VALUES,
  ECHO_CRIT_RATE_VALUES,
  ECHO_SCORING_OPTIONS,
  MAX_ECHO_SETS,
} from "../constants";
import {
  ER_STATUS_CLASSES,
  getEchoCheckerCritValue,
  getEchoCheckerScore,
  getEchoCheckerSubstatIds,
  getEchoCheckerSubstatOptions,
  getEchoSetChecklist,
  getEchoSetScore,
  getErStatus,
  getIgnoredErEchoKeys,
  getRatingGrade,
  ratingGradeClasses,
} from "../domain";
import { getMakanEchoEstimate } from "../echo-estimates";
import { addEchoSet, deleteEchoSet, updateEchoSet } from "../echo-sets";
import { getCharacterSubstatPriority } from "../substat-priorities";
import type { EchoCheckerEcho, EchoCheckerSubstatId, EchoSet, TrackedCharacter } from "../types";
import { EchoEstimateSection } from "./echo-estimate-section";
import { ErInput, SelectInput } from "./ui";

const ECHO_ROW_COLUMNS = {
  crit: "@2xl:grid-cols-[6rem_6rem_6rem_6rem_minmax(0,1fr)]",
  priority: "@2xl:grid-cols-[6rem_6rem_minmax(0,1fr)]",
};

const ECHO_SUBSTAT_SHORT_LABELS: Record<EchoCheckerSubstatId, string> = {
  "crit-rate": "CR",
  "crit-dmg": "CD",
  atk: "ATK",
  hp: "HP",
  def: "DEF",
  "atk-percent": "ATK%",
  "hp-percent": "HP%",
  "def-percent": "DEF%",
  "energy-regen": "ER",
  basic: "Basic",
  heavy: "Heavy",
  skill: "Skill",
  liberation: "Liberation",
};

/**
 * Manages independent echo sets and displays the selected set's editor.
 * @param props - The owning character and validated update handler.
 * @returns Set navigation, settings, and echo rows.
 */
export function CharacterEchoSets({
  character,
  onUpdate,
}: {
  character: TrackedCharacter;
  onUpdate: (character: TrackedCharacter) => void;
}) {
  const [editorSetId, setEditorSetId] = useState(character.echoSets[0].id);
  const echoSet = character.echoSets.find((set) => set.id === editorSetId) ?? character.echoSets[0];
  const atLimit = character.echoSets.length >= MAX_ECHO_SETS;

  /** Saves one set through the validated tracker update path. */
  function saveSet(set: EchoSet) {
    onUpdate(updateEchoSet(character, set));
  }

  /** Adds a new set or an independent copy, then opens its editor. */
  function createSet(duplicate = false) {
    const id = crypto.randomUUID();
    onUpdate(addEchoSet(character, id, duplicate ? echoSet.id : undefined));
    setEditorSetId(id);
  }

  /** Removes the selected set after confirmation, retaining at least one. */
  function removeSet() {
    if (confirm(`Delete echo set "${echoSet.name}"?`)) {
      const updated = deleteEchoSet(character, echoSet.id);
      onUpdate(updated);
      setEditorSetId(updated.echoSets[0].id);
    }
  }

  return (
    <div className="grid min-w-0 gap-3">
      <section aria-label="Echo sets" className="@container min-w-0 rounded-lg border border-app-border bg-app-surface">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-app-border px-3.5">
          <div className="flex min-w-0 flex-wrap gap-x-5" aria-label="Choose an echo set">
            {character.echoSets.map((set) => (
              <button
                aria-controls="echo-set-editor"
                aria-pressed={set.id === echoSet.id}
                className={`max-w-40 truncate border-b-2 py-3 text-sm font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-app-accent ${set.id === echoSet.id ? "border-app-accent text-app-fg" : "border-transparent text-app-muted-subtle hover:text-app-fg"}`}
                key={set.id}
                onClick={() => setEditorSetId(set.id)}
                title={set.name}
                type="button"
              >{set.name}</button>
            ))}
          </div>
          <button
            className="my-2 rounded-md border border-app-border bg-app-bg px-2.5 py-1.5 text-xs text-app-muted hover:bg-app-raised focus-visible:outline-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-40"
            disabled={atLimit}
            onClick={() => createSet()}
            title={atLimit ? `Maximum of ${MAX_ECHO_SETS} echo sets` : undefined}
            type="button"
          >+ Add set</button>
        </div>
        <EchoSetEditor
          key={echoSet.id}
          characterId={character.characterId}
          expectedEr={character.expectedEr}
          echoSet={echoSet}
          onUpdate={saveSet}
          atLimit={atLimit}
          canDelete={character.echoSets.length > 1}
          onDuplicate={() => createSet(true)}
          onDelete={removeSet}
        />
      </section>
      {echoSet.mode === "detailed" ? <EchoSetReferences characterId={character.characterId} echoSet={echoSet} /> : null}
    </div>
  );
}

/** Keeps the selected set's name, tracking, scoring, and ER directly editable. */
function EchoSetControls({
  echoSet,
  expectedEr,
  onUpdate,
}: {
  echoSet: EchoSet;
  expectedEr: number | null;
  onUpdate: (set: EchoSet) => void;
}) {
  const [name, setName] = useState(echoSet.name);
  const erStatus = getErStatus(echoSet.actualEr, expectedEr);

  /** Commits a nonempty name while preserving the current name for blank input. */
  function saveName() {
    const trimmed = name.trim();
    setName(trimmed || echoSet.name);

    if (trimmed && trimmed !== echoSet.name) {
      onUpdate({ ...echoSet, name: trimmed });
    }
  }

  return (
    <div className="mb-4 grid grid-cols-2 items-start gap-3 border-b border-app-border pb-4 @2xl:grid-cols-[minmax(8rem,14rem)_8rem_9rem_7rem]">
      <label className="grid min-w-0 gap-1 text-xs font-medium text-app-muted">
        Set name
        <input
          className="h-9 w-full rounded-md border border-app-border bg-app-bg px-2.5 text-sm text-app-fg outline-none focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/20"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={saveName}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      <SelectInput<EchoSet["mode"]>
        compact
        label="Tracking mode"
        value={echoSet.mode}
        options={[{ label: "Checklist", value: "checklist" }, { label: "Detailed", value: "detailed" }]}
        onChange={(mode) => onUpdate({ ...echoSet, mode })}
      />
      {echoSet.mode === "detailed" ? (
        <>
          <div className="grid content-start gap-1">
            <ScoringPresetHelp />
            <SelectInput<EchoSet["scoring"]>
              compact
              showLabel={false}
              label="Scoring preset"
              value={echoSet.scoring}
              options={ECHO_SCORING_OPTIONS}
              onChange={(scoring) => onUpdate({ ...echoSet, scoring })}
            />
          </div>
          <div className="grid gap-1">
            <label className="block text-xs font-medium text-app-muted">
              <span className="mb-1 block">Actual ER</span>
              <ErInput compact value={echoSet.actualEr} onChange={(actualEr) => onUpdate({ ...echoSet, actualEr })} />
            </label>
            <span className={`text-xs ${ER_STATUS_CLASSES[erStatus]}`} title={erStatus === "below" ? "Below target ER" : undefined}>
              {erStatus === "met" ? <span aria-hidden="true">✓ </span> : null}
              {erStatus === "below" ? <span aria-hidden="true">↓ </span> : null}
              {expectedEr === null ? "No ER target" : `Target ${expectedEr}%`}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Explains each preset's echo completion requirements on hover, focus, or tap. */
function ScoringPresetHelp() {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    /** Dismisses a tapped tooltip when the user presses elsewhere. */
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    /** Dismisses the tooltip without moving keyboard focus. */
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      className="relative flex items-center gap-1.5 text-xs font-medium text-app-muted"
      ref={container}
      onPointerLeave={(event) => {
        if (!event.currentTarget.contains(document.activeElement)) {
          setOpen(false);
        }
      }}
    >
      <span>Scoring preset</span>
      <button
        aria-label="Explain scoring presets"
        aria-describedby={open ? tooltipId : undefined}
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-app-muted-subtle hover:text-app-fg focus-visible:outline-2 focus-visible:outline-app-accent"
        onPointerEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" className="block h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5" />
          <path d="M12 16.5h.01" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 w-72 max-w-[calc(100vw-3rem)] pt-2">
          <div className="grid gap-2 rounded-md border border-app-border bg-app-raised p-3 text-xs font-normal leading-5 text-app-muted shadow-lg" id={tooltipId} role="tooltip">
            <p><strong className="font-medium text-app-fg">Damage:</strong> Both crit rolls + 2 priority stats, or 1 with 30+ CV.</p>
            <p><strong className="font-medium text-app-fg">Balanced:</strong> Both crit rolls + 1 priority stat, or one crit + 4 priority stats.</p>
            <p><strong className="font-medium text-app-fg">Utility:</strong> 3 priority stats; crit rolls optional.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Displays a grade and score consistently for sets and individual echoes. */
function EchoScore({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-app-muted-subtle">Unrated</span>;
  }

  const grade = getRatingGrade(value);

  return (
    <span className="inline-flex items-center gap-2 text-sm tabular-nums text-app-fg">
      <span className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${ratingGradeClasses(grade)}`}>
        {grade}
      </span>
      {value.toFixed(2)}
    </span>
  );
}

/** Shows the selected set's controls and measurements together in its card. */
function EchoSetEditor({
  characterId,
  expectedEr,
  echoSet,
  onUpdate,
  atLimit,
  canDelete,
  onDuplicate,
  onDelete,
}: {
  characterId: number;
  expectedEr: number | null;
  echoSet: EchoSet;
  onUpdate: (set: EchoSet) => void;
  atLimit: boolean;
  canDelete: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const priority = getCharacterSubstatPriority(characterId);
  const priorityOnly = echoSet.scoring === "priority-stats";
  const detailed = echoSet.mode === "detailed";
  const options = getEchoCheckerSubstatOptions(priority ?? "", priorityOnly);
  const ignoredEr = getIgnoredErEchoKeys(characterId, expectedEr, echoSet);
  const checklist = getEchoSetChecklist(characterId, expectedEr, echoSet);
  const score = getEchoSetScore(characterId, expectedEr, echoSet);
  const rowColumns = ECHO_ROW_COLUMNS[priorityOnly ? "priority" : "crit"];

  /** Saves one echo's measurements while retaining every other position. */
  function patchEcho(key: keyof EchoSet["echoes"], echo: EchoCheckerEcho) {
    onUpdate({ ...echoSet, echoes: { ...echoSet.echoes, [key]: echo } });
  }

  return (
    <div id="echo-set-editor" className="px-3.5 pb-3.5" aria-label={`${echoSet.name} echo set`}>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-app-muted-subtle">Set score</span>
          {detailed ? <EchoScore value={score} /> : <span className="text-sm text-app-fg">Checklist</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-sm py-1 text-xs text-app-muted-subtle hover:text-app-fg focus-visible:outline-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-40"
            disabled={atLimit}
            onClick={onDuplicate}
            type="button"
          >Duplicate</button>
          <button
            className="rounded-sm py-1 text-xs text-status-danger-text hover:text-app-fg focus-visible:outline-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canDelete}
            onClick={onDelete}
            type="button"
          >Delete set</button>
        </div>
      </div>
      <EchoSetControls echoSet={echoSet} expectedEr={expectedEr} onUpdate={onUpdate} />

      {detailed ? (
        <>
          {priority === null ? (
            <p className="mb-3 text-sm text-app-muted-subtle">
              No curated priorities are available for this character yet. Measurements are saved; scoring is unavailable.
            </p>
          ) : null}
          {ignoredEr.size > 0 ? (
            <p className="mb-3 rounded-md border border-status-warn-border bg-status-warn-bg px-3 py-2 text-xs text-status-warn-text">
              {ignoredEr.size} excess ER {ignoredEr.size === 1 ? "roll is" : "rolls are"} ignored for this set&apos;s score and completion.
            </p>
          ) : null}
          <div className={`hidden items-center gap-4 px-2.5 pb-2 text-xs text-app-muted-subtle @2xl:grid ${rowColumns}`} aria-hidden="true">
            <span>Echo</span>
            {!priorityOnly ? <><span>Crit rate</span><span>Crit dmg</span></> : null}
            <span>{priorityOnly ? "Score" : "Score / CV"}</span>
            <span>Priority stats</span>
          </div>
          {ECHO_CHECKLIST_ITEMS.map(({ key, label }) => (
            <EchoRow
              key={key}
              label={label}
              echo={echoSet.echoes[key]}
              complete={checklist[key]}
              priority={priority}
              priorityOnly={priorityOnly}
              options={options}
              erIgnored={ignoredEr.has(key)}
              onUpdate={(echo) => patchEcho(key, echo)}
            />
          ))}
        </>
      ) : (
        <div className="grid gap-1.5">
          {ECHO_CHECKLIST_ITEMS.map(({ key, label }) => (
            <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-3 text-sm text-app-fg ${echoSet.checklist[key] ? "bg-status-good-bg/35" : "bg-app-bg"}`}>
              <input
                className="h-4 w-4 accent-app-accent"
                type="checkbox"
                checked={echoSet.checklist[key]}
                onChange={(event) => onUpdate({ ...echoSet, checklist: { ...echoSet.checklist, [key]: event.target.checked } })}
              />
              {label}
              <span className={`ml-auto rounded-sm px-1.5 py-0.5 text-xs ${echoSet.checklist[key] ? "bg-status-good-bg text-status-good-text" : "text-app-muted-subtle"}`}>
                {echoSet.checklist[key] ? "Complete" : "In progress"}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Keeps priorities and resource estimates visible as separate reference sections. */
function EchoSetReferences({ characterId, echoSet }: { characterId: number; echoSet: EchoSet }) {
  const priority = getCharacterSubstatPriority(characterId);
  const priorityOnly = echoSet.scoring === "priority-stats";
  const estimate = useMemo(
    () => priority === null || priorityOnly ? null : getMakanEchoEstimate({ substatPriority: priority }),
    [priority, priorityOnly],
  );

  return (
    <>
      <section aria-label="Substat priorities and scoring" className="grid gap-2 rounded-lg border border-app-border bg-app-surface p-3.5 text-xs leading-5 text-app-muted-subtle">
        <h2 className="text-sm font-medium text-app-fg">Substat priorities</h2>
        <p className="text-app-fg">{priority ?? "No curated priorities are available for this character yet."}</p>
        <p>
          {priorityOnly
            ? "Utility requires at least three priority substats per echo. Crit rolls are optional."
            : "Damage requires both crit rolls plus two priority stats, or one with 30+ CV. Balanced accepts both crit rolls plus one priority stat, or one crit roll plus four priority stats. Both use the same scoring formula."}
        </p>
      </section>
      {estimate ? <EchoEstimateSection estimate={estimate} /> : null}
    </>
  );
}

/** Edits one echo's rolls and priority stats, preserving the five-slot selection limit. */
function EchoRow({
  label,
  echo,
  complete,
  priority,
  priorityOnly,
  options,
  erIgnored,
  onUpdate,
}: {
  label: string;
  echo: EchoCheckerEcho;
  complete: boolean;
  priority: string | null;
  priorityOnly: boolean;
  options: EchoCheckerSubstatId[];
  erIgnored: boolean;
  onUpdate: (echo: EchoCheckerEcho) => void;
}) {
  const selected = getEchoCheckerSubstatIds(echo, priorityOnly).filter(
    (stat): stat is EchoCheckerSubstatId => stat !== null && options.includes(stat),
  );
  const critCount = priorityOnly ? 0 : Number(echo.critRate !== null) + Number(echo.critDmg !== null);
  const limit = 5 - critCount;
  const score = priority === null ? null : getEchoCheckerScore(echo, priority, erIgnored, priorityOnly);
  const rowColumns = ECHO_ROW_COLUMNS[priorityOnly ? "priority" : "crit"];

  return (
    <div className={`mb-1.5 grid grid-cols-2 items-center gap-x-3 gap-y-2.5 rounded-md px-2.5 py-3 @2xl:gap-4 ${rowColumns} ${complete ? "bg-status-good-bg/35" : "bg-app-bg"}`} role="group" aria-label={label}>
      <h3 className="col-span-2 flex flex-wrap items-center justify-between gap-1.5 text-sm font-medium text-app-fg @2xl:col-span-1 @2xl:grid @2xl:justify-items-start">
        {label}
        <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-normal ${complete ? "bg-status-good-bg text-status-good-text" : "text-app-muted-subtle"}`}>
          {complete ? <span aria-hidden="true">✓</span> : null}
          {complete ? "Complete" : "In progress"}
        </span>
      </h3>
      {!priorityOnly ? (
        <>
          <EchoRollSelect
            label="CR"
            accessibleLabel={`${label} crit rate`}
            value={echo.critRate}
            values={ECHO_CRIT_RATE_VALUES}
            disabled={echo.critRate === null && selected.length + critCount >= 5}
            onChange={(critRate) => onUpdate({ ...echo, critRate })}
          />
          <EchoRollSelect
            label="CD"
            accessibleLabel={`${label} crit damage`}
            value={echo.critDmg}
            values={ECHO_CRIT_DMG_VALUES}
            disabled={echo.critDmg === null && selected.length + critCount >= 5}
            onChange={(critDmg) => onUpdate({ ...echo, critDmg })}
          />
        </>
      ) : null}
      <div className="col-span-2 flex items-center justify-between gap-1 @2xl:col-span-1 @2xl:grid @2xl:justify-items-start">
        <EchoScore value={score} />
        {!priorityOnly ? <span className="text-xs tabular-nums text-app-muted-subtle">CV {getEchoCheckerCritValue(echo) ?? "—"}</span> : null}
      </div>
      <div className="col-span-2 min-w-0 @2xl:col-span-1">
        <EchoSubstatCheckboxes
          erIgnored={erIgnored}
          options={options}
          selectedStats={selected}
          selectionLimit={limit}
          onChange={(stat, checked) => {
            const next = checked ? [...selected, stat] : selected.filter((value) => value !== stat);

            if (next.length <= limit) {
              const slots = Array.from({ length: 5 }, (_, index) => next[index] ?? null);
              onUpdate({ ...echo, [priorityOnly ? "prioritySubstatIds" : "substatIds"]: slots });
            }
          }}
        />
      </div>
    </div>
  );
}

/** Edits one nullable crit roll with a visible label on narrow screens. */
function EchoRollSelect({
  label,
  accessibleLabel,
  value,
  values,
  disabled,
  onChange,
}: {
  label: string;
  accessibleLabel: string;
  value: number | null;
  values: number[];
  disabled: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-xs text-app-muted-subtle">
      <span className="@2xl:sr-only">{label}</span>
      <span className="relative min-w-0 flex-1">
        <select
          aria-label={accessibleLabel}
          className="h-9 w-full min-w-0 appearance-none rounded-md border border-app-border bg-app-bg pl-2 pr-7 text-xs tabular-nums text-app-fg outline-none focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/20 disabled:cursor-not-allowed disabled:bg-app-raised disabled:text-app-muted-dim"
          value={value === null ? "" : String(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">—</option>
          {values.map((option) => <option key={option} value={option}>{option}%</option>)}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-app-muted-subtle">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </span>
    </label>
  );
}

/** Shows quiet stat checkboxes while keeping selected and ignored ER rolls distinct. */
function EchoSubstatCheckboxes({
  erIgnored,
  onChange,
  options,
  selectedStats,
  selectionLimit,
}: {
  erIgnored: boolean;
  onChange: (stat: EchoCheckerSubstatId, checked: boolean) => void;
  options: EchoCheckerSubstatId[];
  selectedStats: EchoCheckerSubstatId[];
  selectionLimit: number;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => {
        const checked = selectedStats.includes(option);
        const disabled = !checked && selectedStats.length >= selectionLimit;
        const erWarning = option === "energy-regen" && erIgnored;
        let colors = "text-app-muted-subtle";

        if (erWarning) {
          colors = "bg-status-danger-bg/45 text-status-danger-text";
        } else if (checked) {
          colors = "bg-app-accent-soft text-status-good-text";
        }

        return (
          <label
            className={`flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs ${colors} ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            key={option}
            title={erWarning ? "Excess ER roll: ignored for score and completion" : undefined}
          >
            <input
              className={`h-3.5 w-3.5 shrink-0 ${erWarning ? "accent-status-danger-border" : "accent-app-accent"}`}
              checked={checked}
              disabled={disabled}
              onChange={(event) => onChange(option, event.target.checked)}
              type="checkbox"
            />
            {ECHO_SUBSTAT_SHORT_LABELS[option]}
          </label>
        );
      })}
    </div>
  );
}
