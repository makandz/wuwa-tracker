"use client";

import {
  use,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  ECHO_SCORING_OPTIONS, ECHO_CHECKLIST_ITEMS, ECHO_CRIT_DMG_VALUES,
  ECHO_CRIT_RATE_VALUES, MAX_ECHO_SETS,
} from "@/features/tracker/constants";
import {
  ER_STATUS_CLASSES, buildWeaponInventoryCountMap, findCatalogCharacter, findCatalogWeapon,
  findTrackedCharacterByRouteSegment, getAssignmentCounts,
  getEchoCheckerCritValue, getEchoCheckerScore, getEchoCheckerSubstatIds,
  getEchoCheckerSubstatOptions, getEchoSetChecklist, getEchoSetScore, getErStatus,
  getIgnoredErEchoKeys, getOwnedWeaponsByType, getTrackedCharacterDisplay,
  ratingGradeClasses, getRatingGrade,
} from "@/features/tracker/domain";
import { addEchoSet, deleteEchoSet, updateEchoSet } from "@/features/tracker/echo-sets";
import {
  ECHO_SUBSTAT_LABELS, getMakanEchoEstimate, type MakanEchoEstimate,
} from "@/features/tracker/echo-estimates";
import { getCharacterRotations } from "@/features/tracker/rotations";
import { getCharacterSubstatPriority } from "@/features/tracker/substat-priorities";
import { CharacterOverview } from "@/features/tracker/components/character-overview";
import { WeaponPickerModal } from "@/features/tracker/components/pickers";
import { CharacterRotationsSection } from "@/features/tracker/components/rotations";
import {
  ErInput, Field, RatingSummaryBlock, SelectInput, TextButton,
} from "@/features/tracker/components/ui";
import { useTrackerData } from "@/features/tracker/tracker-provider";
import type {
  ApiCharacter, ApiWeapon, EchoCheckerSubstatId, EchoCheckerEcho,
  EchoScoringPreset, EchoSet, TrackedCharacter, WeaponInventoryItem,
} from "@/features/tracker/types";

/**
 * Opens the tracked character identified by its route.
 * @param props - The asynchronous character route parameters.
 * @returns The character editor after data loads.
 */
export default function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    catalog,
    characters,
    deleteCharacter,
    updateCharacter,
    weaponInventory,
    storageLoaded,
  } = useTrackerData();
  const selectedCharacter = findTrackedCharacterByRouteSegment(id, characters);
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  useEffect(() => {
    if (!storageLoaded || selectedCharacter) {
      return;
    }

    router.replace("/");
  }, [router, selectedCharacter, storageLoaded]);

  /** Deletes the character after confirmation. */
  function confirmDeleteCharacter(characterId: string) {
    if (!confirm("Delete this tracked character?")) {
      return;
    }

    deleteCharacter(characterId);
    router.replace("/");
  }

  if (!selectedCharacter) {
    return <div className="min-h-full bg-app-bg text-app-fg" />;
  }

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <DetailScreen
        assignmentCounts={assignmentCounts}
        character={selectedCharacter}
        key={selectedCharacter.id}
        characters={catalog.characters}
        onDelete={() => confirmDeleteCharacter(selectedCharacter.id)}
        onUpdate={updateCharacter}
        weaponInventory={weaponInventory}
        weapons={catalog.weapons}
      />
    </div>
  );
}

/** Edits an individual echo crit roll. */
function EchoRollSelect({
  disabled = false,
  label,
  value,
  values,
  onChange,
}: {
  disabled?: boolean;
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
          className="h-9 w-full appearance-none rounded-md border border-app-border bg-app-bg pl-2.5 pr-7 text-xs font-semibold text-app-fg outline-none transition-colors focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/20 disabled:cursor-not-allowed disabled:bg-app-raised disabled:text-app-muted-dim"
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value ? Number(event.target.value) : null)
          }
          value={value === null ? "" : String(value)}
        >
          <option value="">-</option>
          {values.map((option) => (
            <option
              key={option}
              value={option}
            >
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

const ECHO_CHECKER_SUBSTAT_LABELS: Record<EchoCheckerSubstatId, string> = {
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

/** Edits prioritized substats within the available slot limit. */
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
  const selectedStatSet = new Set(selectedStats);

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map((option) => {
        const checked = selectedStatSet.has(option);
        const disabled = !checked && selectedStats.length >= selectionLimit;
        const erWarning = option === "energy-regen" && erIgnored;

        return (
          <label
            className={`flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-1.5 text-[10px] font-semibold transition-colors ${
              erWarning
                ? "border-status-danger-border/70 bg-status-danger-bg/45 text-status-danger-text"
                : checked
                  ? "border-app-accent-strong bg-app-accent-soft text-app-fg"
                  : "border-app-border bg-app-bg text-app-muted"
            } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            key={option}
            title={ECHO_CHECKER_SUBSTAT_LABELS[option]}
          >
            <input
              checked={checked}
              className={`h-3.5 w-3.5 shrink-0 ${
                erWarning ? "accent-status-danger-border" : "accent-app-accent"
              }`}
              disabled={disabled}
              onChange={(event) => onChange(option, event.target.checked)}
              type="checkbox"
            />
            <span className="min-w-0 truncate">{ECHO_CHECKER_SUBSTAT_LABELS[option]}</span>
          </label>
        );
      })}
    </div>
  );
}

const echoEstimateNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});
const echoEstimateTunerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
const echoEstimatePercentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  style: "percent",
});

/** Formats the expected echo count. */
function formatExpectedEchoes(value: number | null) {
  return value === null ? "-" : echoEstimateNumberFormatter.format(value);
}

/** Formats the expected tuner count. */
function formatExpectedTuners(value: number | null) {
  return value === null ? "-" : echoEstimateTunerFormatter.format(value);
}

/** Displays the existing echo resource estimate. */
function EchoEstimateSection({ estimate }: { estimate: MakanEchoEstimate }) {
  const targetStatPrefix = estimate.parsed.usedFallback
    ? "Fallback target stats"
    : "Target stats";
  const targetStatSource = estimate.parsed.usedFallback
    ? "using defaults"
    : "parsed from above";

  return (
    <section className="grid gap-3 rounded-md border border-app-border bg-app-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-app-fg">5/20/25 Estimate</h2>
          <p className="mt-1 text-xs font-medium leading-5 text-app-muted-subtle">
            Average echos and tuners needed to finish 1 piece. {targetStatPrefix} (
            {targetStatSource}):{" "}
            {estimate.parsed.otherTargetStats.map((stat, index) => (
              <span key={stat}>
                {index === 0 ? "" : ", "}
                <strong className="font-semibold text-app-fg">
                  {ECHO_SUBSTAT_LABELS[stat]}
                </strong>
              </span>
            ))}
          </p>
        </div>
        <div className="text-xs font-medium text-app-muted-dim">
          +5 {echoEstimatePercentFormatter.format(estimate.passFiveChance)} · +20{" "}
          {echoEstimatePercentFormatter.format(estimate.passTwentyChance)}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-app-border">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-app-raised text-xs font-semibold text-app-muted-subtle">
            <tr>
              <th className="px-3 py-2 text-left">Goal</th>
              <th className="px-3 py-2 text-right">Avg echos</th>
              <th className="px-3 py-2 text-right">Net tuners</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border bg-app-surface">
            {estimate.rows.map((row) => (
              <tr
                className={row.emphasized ? "bg-app-raised/45 text-app-fg" : "text-app-muted"}
                key={row.id}
              >
                <td className="px-3 py-2 font-semibold">{row.label}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatExpectedEchoes(row.expectedEchoes)}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatExpectedTuners(row.expectedNetTuners)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs font-medium leading-5 text-app-muted-dim">
        Net tuners assume 30% refund on trashed leveled echos.
      </p>
    </section>
  );
}

/** Edits shared character settings and manages up to three independent sets. */
function DetailScreen({
  character,
  characters,
  weapons,
  weaponInventory,
  assignmentCounts,
  onDelete,
  onUpdate,
}: {
  character: TrackedCharacter;
  characters: ApiCharacter[];
  weapons: ApiWeapon[];
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onDelete: () => void;
  onUpdate: (character: TrackedCharacter) => void;
}) {
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const [editorSetId, setEditorSetId] = useState(character.echoSets[0].id);
  const inventoryCounts = buildWeaponInventoryCountMap(weaponInventory);
  const catalogCharacter = findCatalogCharacter(characters, character.characterId);
  const display = getTrackedCharacterDisplay(character, catalogCharacter);
  const selectedWeapon = findCatalogWeapon(weapons, character.weaponId);
  const availableWeapons = getOwnedWeaponsByType({ inventoryCounts, weaponTypeId: display.weaponTypeId, weapons });
  const echoSet = character.echoSets.find((set) => set.id === editorSetId) ?? character.echoSets[0];
  const atLimit = character.echoSets.length >= MAX_ECHO_SETS;

  /** Saves shared fields through the validated tracker update path. */
  function patchCharacter(patch: Partial<TrackedCharacter>) {
    onUpdate({ ...character, ...patch });
  }

  /** Adds an independent new set or a deep copy of the currently edited one. */
  function createSet(duplicate = false) {
    const id = crypto.randomUUID();
    onUpdate(addEchoSet(character, id, duplicate ? echoSet.id : undefined));
    setEditorSetId(id);
  }

  /** Removes the current set after confirmation, retaining at least one. */
  function removeSet() {
    if (confirm(`Delete echo set "${echoSet.name}"?`)) {
      onUpdate(deleteEchoSet(character, echoSet.id));
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <CharacterOverview
        character={character}
        catalogCharacter={catalogCharacter}
        weapon={selectedWeapon}
        ownedCount={selectedWeapon ? inventoryCounts[selectedWeapon.Id] ?? 0 : 0}
        onChangeWeapon={() => setWeaponPickerOpen(true)}
        onDelete={onDelete}
        onPatch={patchCharacter}
      />

      <section className="grid gap-4 rounded-md border border-app-border bg-app-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex min-w-0 flex-wrap gap-2"
            aria-label="Echo sets"
          >
            {character.echoSets.map((set) => (
              <button
                aria-pressed={set.id === echoSet.id}
                className={`max-w-48 truncate rounded-md border px-3 py-2 text-sm font-semibold ${set.id === echoSet.id ? "border-app-accent-strong bg-app-accent-soft text-app-fg" : "border-app-border text-app-muted"}`}
                key={set.id}
                onClick={() => setEditorSetId(set.id)}
                title={set.name}
                type="button"
              >{set.name}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <TextButton
              compact
              disabled={atLimit}
              onClick={() => createSet()}
            >Add Set ({character.echoSets.length}/3)</TextButton>
            <TextButton
              compact
              disabled={atLimit}
              onClick={() => createSet(true)}
            >Duplicate</TextButton>
            <TextButton
              compact
              disabled={character.echoSets.length === 1}
              onClick={removeSet}
              variant="danger"
            >Delete Set</TextButton>
          </div>
        </div>
        <EchoSetEditor
          key={echoSet.id}
          characterId={character.characterId}
          expectedEr={character.expectedEr}
          echoSet={echoSet}
          onUpdate={(set) => onUpdate(updateEchoSet(character, set))}
        />
      </section>

      <CharacterRotationsSection rotations={getCharacterRotations(display.name)} />
      {weaponPickerOpen ? (
        <WeaponPickerModal
          weapons={availableWeapons}
          inventoryCounts={inventoryCounts}
          assignmentCounts={assignmentCounts}
          selectedId={character.weaponId}
          weaponTypeName={display.weaponTypeName}
          onClose={() => setWeaponPickerOpen(false)}
          onClear={() => {
            patchCharacter({ weaponId: null, weaponName: "" });
            setWeaponPickerOpen(false);
          }}
          onSelect={(weapon) => {
            patchCharacter({ weaponId: weapon.Id, weaponName: weapon.Name });
            setWeaponPickerOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}

/** Edits the mode, preset, measurements, and manual progress of one set. */
function EchoSetEditor({
  characterId,
  expectedEr,
  echoSet,
  onUpdate,
}: {
  characterId: number;
  expectedEr: number | null;
  echoSet: EchoSet;
  onUpdate: (set: EchoSet) => void;
}) {
  const [name, setName] = useState(echoSet.name);
  const priority = getCharacterSubstatPriority(characterId);
  const priorityOnly = echoSet.scoring === "priority-stats";
  const options = getEchoCheckerSubstatOptions(priority ?? "", priorityOnly);
  const ignoredEr = getIgnoredErEchoKeys(characterId, expectedEr, echoSet);
  const checklist = getEchoSetChecklist(characterId, expectedEr, echoSet);
  const score = getEchoSetScore(characterId, expectedEr, echoSet);
  const erStatus = getErStatus(echoSet.actualEr, expectedEr);
  const estimate = priority === null || priorityOnly ? null : getMakanEchoEstimate({ substatPriority: priority });

  /** Saves an echo measurement without affecting another position or set. */
  function patchEcho(key: keyof EchoSet["echoes"], patch: Partial<EchoCheckerEcho>) {
    onUpdate({
      ...echoSet,
      echoes: { ...echoSet.echoes, [key]: { ...echoSet.echoes[key], ...patch } },
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Set name">
          <input
            className="h-11 w-full rounded-md border border-app-border bg-app-bg px-3 text-sm text-app-fg"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            onBlur={() => {
              const trimmed = name.trim();
              setName(trimmed || echoSet.name);

              if (trimmed && trimmed !== echoSet.name) {
                onUpdate({ ...echoSet, name: trimmed });
              }
            }}
          />
        </Field>
        <SelectInput<EchoSet["mode"]>
          label="Tracking mode"
          value={echoSet.mode}
          options={[{ label: "Checklist", value: "checklist" }, { label: "Detailed", value: "detailed" }]}
          onChange={(mode) => onUpdate({ ...echoSet, mode })}
        />
        {echoSet.mode === "detailed" ? (
          <>
            <SelectInput<EchoScoringPreset>
              label="Scoring preset"
              value={echoSet.scoring}
              options={ECHO_SCORING_OPTIONS}
              onChange={(scoring) => onUpdate({ ...echoSet, scoring })}
            />
            <Field label="Actual ER (this set)">
              <ErInput
                value={echoSet.actualEr}
                onChange={(actualEr) => onUpdate({ ...echoSet, actualEr })}
              />
              <span className={`mt-1 block text-xs ${ER_STATUS_CLASSES[erStatus]}`}>
                {{
                  unknown: "Set actual ER and a character target to compare.",
                  met: "Meets target ER",
                  below: "Below target ER",
                }[erStatus]}
              </span>
            </Field>
          </>
        ) : null}
      </div>

      {echoSet.mode === "checklist" ? (
        <div className="grid gap-2 sm:grid-cols-5">
          {ECHO_CHECKLIST_ITEMS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 rounded-md border border-app-border bg-app-bg p-3 text-sm text-app-muted"
            >
              <input
                className="h-4 w-4 accent-app-accent"
                type="checkbox"
                checked={echoSet.checklist[key]}
                onChange={(event) => onUpdate({ ...echoSet, checklist: { ...echoSet.checklist, [key]: event.target.checked } })}
              />
              {label}
            </label>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <div className="rounded-md border border-app-border bg-app-bg p-3 text-sm text-app-muted">
              <div className="mb-1 font-semibold text-app-fg">Substat Priority</div>
              {priority ?? "No curated priorities are available for this character yet. Measurements are saved; scoring is unavailable."}
              <p className="mt-2 text-xs text-app-muted-dim">Strict Crit uses tougher completion requirements than Standard Crit. Both use the same crit scoring formula.</p>
            </div>
            <RatingSummaryBlock
              label="Set Score"
              value={score}
            />
          </div>
          {ignoredEr.size > 0 ? (
            <p className="rounded-md border border-status-warn-border bg-status-warn-bg p-3 text-sm text-status-warn-text">
              {ignoredEr.size} excess ER {ignoredEr.size === 1 ? "roll is" : "rolls are"} ignored for this set&apos;s score and completion.
            </p>
          ) : null}
          <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ECHO_CHECKLIST_ITEMS.map(({ key, label }) => {
              const echo = echoSet.echoes[key];
              const selected = getEchoCheckerSubstatIds(echo, priorityOnly).filter(
                (stat): stat is EchoCheckerSubstatId => stat !== null && options.includes(stat),
              );
              const critCount = priorityOnly ? 0 : Number(echo.critRate !== null) + Number(echo.critDmg !== null);
              const limit = 5 - critCount;
              const echoScore = priority === null ? null : getEchoCheckerScore(echo, priority, ignoredEr.has(key), priorityOnly);
              const grade = echoScore === null ? null : getRatingGrade(echoScore);

              return (
                <div
                  key={key}
                  className={`grid gap-3 rounded-md border bg-app-bg p-3 ${checklist[key] ? "border-status-good-border" : "border-app-border"}`}
                >
                  <h3 className="text-sm font-semibold text-app-fg">{label}{checklist[key] ? " · Done" : ""}</h3>
                  {!priorityOnly ? (
                    <>
                      <EchoRollSelect
                        label="CR"
                        value={echo.critRate}
                        values={ECHO_CRIT_RATE_VALUES}
                        disabled={echo.critRate === null && selected.length + critCount >= 5}
                        onChange={(critRate) => patchEcho(key, { critRate })}
                      />
                      <EchoRollSelect
                        label="CD"
                        value={echo.critDmg}
                        values={ECHO_CRIT_DMG_VALUES}
                        disabled={echo.critDmg === null && selected.length + critCount >= 5}
                        onChange={(critDmg) => patchEcho(key, { critDmg })}
                      />
                    </>
                  ) : null}
                  <EchoSubstatCheckboxes
                    erIgnored={ignoredEr.has(key)}
                    options={options}
                    selectedStats={selected}
                    selectionLimit={limit}
                    onChange={(stat, checked) => {
                      const next = checked ? [...selected, stat] : selected.filter((value) => value !== stat);

                      if (next.length <= limit) {
                        const slots = Array.from({ length: 5 }, (_, index) => next[index] ?? null);
                        patchEcho(key, { [priorityOnly ? "prioritySubstatIds" : "substatIds"]: slots });
                      }
                    }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-2 text-xs text-app-muted">
                    <span className={grade === null ? "text-app-muted-dim" : ratingGradeClasses(grade)}>{grade ?? "Unrated"} {echoScore?.toFixed(2)}</span>
                    {!priorityOnly ? <span>CV {getEchoCheckerCritValue(echo) ?? "—"}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
          {estimate ? <EchoEstimateSection estimate={estimate} /> : null}
        </>
      )}
    </div>
  );
}
