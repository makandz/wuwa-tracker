"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ECHO_CHECKER_PLAN_OPTIONS,
  ECHO_CHECKLIST_ITEMS,
  ECHO_CRIT_DMG_VALUES,
  ECHO_CRIT_RATE_VALUES,
} from "@/features/tracker/constants";
import {
  buildWeaponInventoryCountMap,
  characterRoleToneClasses,
  createDefaultEchoChecker,
  findCatalogCharacter,
  findCatalogWeapon,
  findTrackedCharacterByRouteSegment,
  getAssignmentCounts,
  getDefaultEchoCheckerPlan,
  getEchoCheckerCritValue,
  getEchoCheckerEcho,
  getEchoCheckerScore,
  getEchoCheckerTargetStatCount,
  getEchoCritPlaceholders,
  getEffectiveChecklist,
  getEffectiveEchoCritStats,
  getOwnedWeaponsByType,
  getPrimaryRole,
  getPrydwenCharacterUrl,
  getRatingGrade,
  getRatings,
  getTrackedCharacterDisplay,
  getTrackedWeaponDisplay,
  getWeaponInventoryStatus,
  getWeaponRarityTone,
  isComplete,
  isEchoCheckerEchoComplete,
  isEchoCheckerEnabled,
  ratingGradeClasses,
} from "@/features/tracker/domain";
import {
  ECHO_SUBSTAT_LABELS,
  getMakanEchoEstimate,
  type MakanEchoEstimate,
} from "@/features/tracker/echo-estimates";
import { getCharacterRotations } from "@/features/tracker/rotations";
import {
  FourCostMainControl,
  RoleSelectionControl,
} from "@/features/tracker/components/build-form-controls";
import {
  getFourCostMainSelection,
  getNextNoCrit,
  getNextRolesAfterRoleToggle,
  getRolesAfterMultipleRolesChange,
} from "@/features/tracker/components/build-form-state";
import { PickerSummary, WeaponPickerModal } from "@/features/tracker/components/pickers";
import { CharacterRotationsSection } from "@/features/tracker/components/rotations";
import {
  CharacterAvatar,
  ErInput,
  Field,
  Modal,
  NumberInput,
  RatingSummaryBlock,
  SelectInput,
  TextButton,
  TextLink,
  WeaponStatusBadge,
} from "@/features/tracker/components/ui";
import { useTrackerData } from "@/features/tracker/tracker-provider";
import type {
  ApiCharacter,
  ApiWeapon,
  Checklist,
  EchoChecker,
  EchoCheckerEcho,
  EchoCheckerPlan,
  Role,
  TrackedCharacter,
  WeaponInventoryItem,
} from "@/features/tracker/types";

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
        characters={catalog.characters}
        onDelete={() => confirmDeleteCharacter(selectedCharacter.id)}
        onUpdate={updateCharacter}
        weaponInventory={weaponInventory}
        weapons={catalog.weapons}
      />
    </div>
  );
}

const FORTE_CHECKLIST_ITEM = {
  key: "skills",
  label: "Skills / Forte level ups",
} satisfies { key: keyof Checklist; label: string };

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
          className="h-9 w-full appearance-none rounded-md border border-app-border bg-app-bg pl-2.5 pr-7 text-xs font-semibold text-app-fg outline-none transition-colors focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/20 disabled:cursor-not-allowed disabled:bg-app-raised disabled:text-app-muted-dim"
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
  parsing = false,
  onChange,
  placeholder,
  value,
}: {
  id: string;
  parsing?: boolean;
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
      className={`substat-priority-textarea min-h-11 resize-none overflow-hidden rounded-md px-3 py-2.5 text-sm font-medium leading-5 text-app-fg outline-none transition-colors placeholder:text-app-muted-dim focus:ring-2 focus:ring-app-accent/20 ${
        parsing ? "substat-priority-parsing" : ""
      }`}
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
        className="grid h-5 w-5 cursor-help place-items-center rounded-md border border-app-border bg-app-bg text-[11px] font-bold text-app-muted-subtle outline-none transition-colors group-hover:border-app-accent group-hover:text-app-fg focus:border-app-accent focus:text-app-fg focus:ring-2 focus:ring-app-accent/20"
        type="button"
      >
        ?
      </button>
      <span
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-md border border-app-border bg-app-raised px-3 py-2 text-xs font-medium leading-5 text-app-muted opacity-0 shadow-lg shadow-black/25 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        {children}
      </span>
    </span>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return {
    debouncedValue,
    isDebouncing: !Object.is(value, debouncedValue),
  };
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

function formatExpectedEchoes(value: number | null) {
  return value === null ? "-" : echoEstimateNumberFormatter.format(value);
}

function formatExpectedTuners(value: number | null) {
  return value === null ? "-" : echoEstimateTunerFormatter.format(value);
}

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
  const inventoryCounts = useMemo(
    () => buildWeaponInventoryCountMap(weaponInventory),
    [weaponInventory],
  );
  const catalogCharacter = findCatalogCharacter(characters, character.characterId);
  const characterDisplay = getTrackedCharacterDisplay(character, catalogCharacter);
  const availableWeapons = getOwnedWeaponsByType({
    inventoryCounts,
    weaponTypeId: characterDisplay.weaponTypeId,
    weapons,
  });
  const ratings = getRatings(character);
  const echoChecker = character.echoChecker ?? createDefaultEchoChecker(character.roles);
  const echoCritPlaceholders = getEchoCritPlaceholders(character.fourCostMain);
  const effectiveChecklist = getEffectiveChecklist(character);
  const echoCheckerActive = isEchoCheckerEnabled(character);
  const effectiveEchoCritStats = getEffectiveEchoCritStats(character);
  const complete = isComplete(character);
  const primaryRole = getPrimaryRole(character.roles);
  const characterToneClasses = characterRoleToneClasses(primaryRole, complete);
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const [echoModeConfirmOpen, setEchoModeConfirmOpen] = useState(false);
  const [multipleRoles, setMultipleRoles] = useState(character.roles.length > 1);
  const selectedWeapon = findCatalogWeapon(weapons, character.weaponId);
  const weaponDisplay = getTrackedWeaponDisplay(character, selectedWeapon);
  const rotations = getCharacterRotations(characterDisplay.name);
  const weaponStatus = getWeaponInventoryStatus({
    weaponId: character.weaponId,
    inventory: weaponInventory,
    assignmentCounts,
  });
  const prydwenUrl = getPrydwenCharacterUrl(characterDisplay.name);
  const defaultPlan = getDefaultEchoCheckerPlan(character.roles);
  const substatPriorityValue =
    character.substatPriority ?? character.echoChecker?.substatPriority ?? "";
  const {
    debouncedValue: debouncedSubstatPriority,
    isDebouncing: substatPriorityParsing,
  } = useDebouncedValue(substatPriorityValue, 3000);
  const makanEchoEstimate = useMemo(
    () =>
      getMakanEchoEstimate({
        substatPriority: debouncedSubstatPriority,
      }),
    [debouncedSubstatPriority],
  );
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

  function patchCharacter(patch: Partial<TrackedCharacter>) {
    onUpdate({
      ...character,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  function patchChecklist(key: keyof Checklist, value: boolean) {
    patchCharacter({
      checklist: {
        ...character.checklist,
        [key]: value,
      },
    });
  }

  function disableEchoChecker() {
    if (!character.echoChecker) {
      return;
    }

    patchCharacter({
      echoChecker: {
        ...character.echoChecker,
        enabled: false,
      },
    });
  }

  function enableEchoChecker() {
    if (character.noCrit) {
      return;
    }

    patchCharacter({
      echoChecker: character.echoChecker
        ? {
            ...character.echoChecker,
            enabled: true,
          }
        : createDefaultEchoChecker(character.roles),
    });
  }

  function requestEnableEchoChecker() {
    if (character.noCrit) {
      return;
    }

    if (character.critRate > 0 || character.critDmg > 0) {
      setEchoModeConfirmOpen(true);
      return;
    }

    enableEchoChecker();
  }

  function patchEchoChecker(patch: Partial<EchoChecker>) {
    patchCharacter({
      echoChecker: {
        ...echoChecker,
        ...patch,
      },
    });
  }

  function patchEchoCheckerEcho(
    key: keyof EchoChecker["echoes"],
    patch: Partial<EchoCheckerEcho>,
  ) {
    patchEchoChecker({
      enabled: true,
      echoes: {
        ...echoChecker.echoes,
        [key]: {
          ...getEchoCheckerEcho(character, key),
          ...patch,
        },
      },
    });
  }

  function patchSubstatPriority(substatPriority: string) {
    patchCharacter({ substatPriority });
  }

  function toggleEchoMode() {
    if (echoCheckerActive) {
      disableEchoChecker();
      return;
    }

    requestEnableEchoChecker();
  }

  function toggleRole(role: Role) {
    const nextRoles = getNextRolesAfterRoleToggle({
      multipleRoles,
      role,
      roles: character.roles,
    });

    if (nextRoles === character.roles) {
      return;
    }

    patchCharacter({ roles: nextRoles });
  }

  function updateMultipleRoles(checked: boolean) {
    const nextRoles = getRolesAfterMultipleRolesChange(character.roles, checked);

    setMultipleRoles(checked);

    if (nextRoles !== character.roles) {
      patchCharacter({ roles: nextRoles });
    }
  }

  function updateWeapon(selectedWeapon: ApiWeapon | null) {
    patchCharacter({
      weaponId: selectedWeapon?.Id ?? null,
      weaponName: selectedWeapon?.Name ?? "",
    });
  }

  const characterMeta =
    [characterDisplay.elementName, characterDisplay.weaponTypeName]
      .filter(Boolean)
      .join(" / ") || "Catalog data unavailable";

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CharacterAvatar character={character} catalogCharacter={catalogCharacter} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-app-fg">{characterDisplay.name}</h1>
              <span
                className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${characterToneClasses.status}`}
              >
                {complete ? "Done" : "In progress"}
              </span>
            </div>
            <p className="mt-1 text-sm text-app-muted-subtle">
              {characterMeta}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextLink href={prydwenUrl} variant="external">
            Prydwen
          </TextLink>
          <TextButton onClick={onDelete} variant="danger">
            Delete
          </TextButton>
        </div>
      </div>

      {character.noCrit ? (
        <section className="rounded-md border border-app-border/80 bg-app-surface p-3">
          <div className="text-[11px] font-medium text-app-muted-subtle">
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
            label="Build Score"
            tone={
              ratings.buildScore === null
                ? "warn"
                : ratings.buildScore >= 1
                  ? "good"
                  : "neutral"
            }
            value={ratings.buildScore}
          />
        </section>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="grid content-start gap-5 rounded-md border border-app-border/80 bg-app-surface p-5">
          <h2 className="text-lg font-semibold text-app-fg">Build Setup</h2>
          <PickerSummary
            actionLabel="Change"
            image={weaponDisplay.icon}
            label="Weapon"
            meta={
              selectedWeapon
                ? `${selectedWeapon.TypeName} / Own ${
                    inventoryCounts[selectedWeapon.Id] ?? 0
                  } / Used ${assignmentCounts[selectedWeapon.Id] ?? 0}`
                : character.weaponId
                  ? "Catalog data unavailable"
                  : "No weapon selected"
            }
            onClick={() => setWeaponPickerOpen(true)}
            quality={weaponDisplay.qualityId}
            rarityTone={getWeaponRarityTone({
              name: weaponDisplay.name,
              qualityId: weaponDisplay.qualityId,
            })}
            title={weaponDisplay.name || "No weapon selected"}
          />
          <WeaponStatusBadge status={weaponStatus} />

          {weaponPickerOpen ? (
            <WeaponPickerModal
              onClear={() => {
                updateWeapon(null);
                setWeaponPickerOpen(false);
              }}
              onClose={() => setWeaponPickerOpen(false)}
              onSelect={(weapon) => {
                updateWeapon(weapon);
                setWeaponPickerOpen(false);
              }}
              selectedId={character.weaponId}
              weapons={availableWeapons}
              inventoryCounts={inventoryCounts}
              assignmentCounts={assignmentCounts}
              weaponTypeName={characterDisplay.weaponTypeName || "Matching"}
            />
          ) : null}

          <RoleSelectionControl
            multipleRoles={multipleRoles}
            onMultipleRolesChange={updateMultipleRoles}
            onToggleRole={toggleRole}
            roles={character.roles}
          />

          <FourCostMainControl
            fourCostMain={character.fourCostMain}
            noCrit={character.noCrit}
            onSelectFourCostMain={(fourCostMain) =>
              patchCharacter(getFourCostMainSelection(fourCostMain))
            }
            onToggleNoCrit={() => patchCharacter({ noCrit: getNextNoCrit(character.noCrit) })}
          />

          <div className="max-w-md">
            <Field label="Expected Minimum ER">
              <ErInput
                onChange={(value) => patchCharacter({ expectedEr: value })}
                placeholder="120"
                value={character.expectedEr}
              />
            </Field>
            <p className="mt-2 text-xs leading-5 text-app-muted-dim">
              This depends on the team and rotation.
            </p>
          </div>
        </section>

        <section className="grid content-start gap-5 rounded-md border border-app-border/80 bg-app-surface p-5">
          <h2 className="text-lg font-semibold text-app-fg">Completion</h2>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="text-sm font-medium text-app-muted">Character Stats</div>
              {echoCheckerActive && !character.noCrit ? (
                <span className="rounded-sm border border-app-accent/55 bg-app-accent-soft px-2 py-0.5 text-[11px] font-bold text-app-fg">
                  Echo Tracker
                </span>
              ) : null}
            </div>
            {character.noCrit ? (
              <div className="max-w-sm">
                <Field label="Actual ER">
                  <ErInput
                    onChange={(value) => patchCharacter({ actualEr: value })}
                    placeholder="125"
                    value={character.actualEr}
                  />
                </Field>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Echo Crit Rate">
                  <NumberInput
                    disabled={echoCheckerActive}
                    onChange={(value) => patchCharacter({ critRate: value })}
                    placeholder={echoCritPlaceholders.critRate}
                    value={effectiveEchoCritStats.critRate}
                  />
                </Field>
                <Field label="Echo Crit DMG">
                  <NumberInput
                    disabled={echoCheckerActive}
                    onChange={(value) => patchCharacter({ critDmg: value })}
                    placeholder={echoCritPlaceholders.critDmg}
                    value={effectiveEchoCritStats.critDmg}
                  />
                </Field>
                <Field label="Actual ER">
                  <ErInput
                    onChange={(value) => patchCharacter({ actualEr: value })}
                    placeholder="125"
                    value={character.actualEr}
                  />
                </Field>
              </div>
            )}
            <p className="mt-2 text-xs leading-5 text-app-muted-dim">
              {character.noCrit
                ? "Use ER from the main character screen."
                : echoCheckerActive
                  ? "Crit Rate and Crit DMG are calculated from Echo Tracker rolls plus the selected 4 cost main stat."
                  : "Use Crit Rate and Crit DMG from the echo selection screen, and ER from the main character screen."}
            </p>
          </div>
          {ratings.issue ? (
            <div className="rounded-md border border-status-warn-border bg-status-warn-bg px-3 py-2 text-sm font-medium text-status-warn-text">
              {ratings.issue}
            </div>
          ) : null}
          <div className="grid gap-3">
            <label className="flex items-center justify-between gap-4 rounded-md border border-app-border/80 bg-app-surface/70 px-3 py-3 text-sm font-medium text-app-muted">
              {FORTE_CHECKLIST_ITEM.label}
              <input
                checked={character.checklist[FORTE_CHECKLIST_ITEM.key]}
                className="h-5 w-5 accent-app-accent"
                onChange={(event) =>
                  patchChecklist(FORTE_CHECKLIST_ITEM.key, event.target.checked)
                }
                type="checkbox"
              />
            </label>

            <div
              aria-label="Echos"
              className="rounded-md border border-app-border/80 bg-app-surface/70 px-3 py-3"
              role="group"
            >
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <div className="mr-auto text-sm font-medium text-app-muted">Echos</div>
                <div className="grid flex-1 grid-cols-5 gap-2 min-[520px]:flex min-[520px]:justify-end">
                  {ECHO_CHECKLIST_ITEMS.map((item) => (
                    <label
                      className={`flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-2 py-2 text-xs font-semibold ${
                        echoCheckerActive
                          ? effectiveChecklist[item.key]
                            ? "border-status-good-border bg-status-good-bg text-status-good-text"
                            : "border-status-warn-border bg-status-warn-bg text-status-warn-text"
                          : "border-app-border bg-app-surface text-app-muted"
                      }`}
                      key={item.key}
                    >
                      <span>{item.label}</span>
                      <input
                        checked={effectiveChecklist[item.key]}
                        className="h-4 w-4 shrink-0 accent-app-accent disabled:opacity-70"
                        disabled={echoCheckerActive}
                        onChange={(event) => patchChecklist(item.key, event.target.checked)}
                        type="checkbox"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-app-border/70 pt-3">
                {character.noCrit ? (
                  <div className="rounded-md border border-status-warn-border bg-status-warn-bg px-3 py-2 text-xs font-medium text-status-warn-text">
                    Echo Tracker needs a crit-focused 4 cost setup.
                  </div>
                ) : (
                  <div className="text-xs font-medium text-app-muted-dim">
                    {echoCheckerActive
                      ? "Echo slots are controlled by the checker."
                      : "Manual echo tracking is active."}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {character.noCrit ? (
                    <button
                      className="h-8 cursor-not-allowed rounded-md border border-app-border bg-app-surface px-3 text-xs font-semibold text-app-muted-dim opacity-70"
                      disabled
                      type="button"
                    >
                      Echo Mode
                    </button>
                  ) : (
                    <TextButton compact onClick={toggleEchoMode}>
                      {echoCheckerActive ? "Manual Mode" : "Echo Mode"}
                    </TextButton>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Field label="Notes">
            <textarea
              className="min-h-40 rounded-md border border-app-border bg-app-bg p-3 text-sm text-app-fg outline-none transition-colors focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/20"
              onChange={(event) => patchCharacter({ notes: event.target.value })}
              value={character.notes}
            />
          </Field>
        </section>
      </div>

      <section className="grid gap-3 rounded-md border border-app-border bg-app-surface/70 p-3">
        <div className="grid gap-2 text-sm font-semibold text-app-fg">
          <div className="flex items-center gap-2">
            <label htmlFor="character-substat-priority">Substat Priority</label>
            <HelpTooltip>
              Paste or type the character&apos;s target substat priority here. This also feeds the
              Makan estimate below.
            </HelpTooltip>
          </div>
          <AutoGrowTextarea
            id="character-substat-priority"
            onChange={patchSubstatPriority}
            parsing={substatPriorityParsing}
            placeholder="Energy Regen (Until Satisfied) > CRIT DMG = CRIT Rate > ATK% > Liberation DMG% > ATK"
            value={substatPriorityValue}
          />
          <span className="text-xs font-medium leading-5 text-app-muted-dim">
            Saved with this character and parsed after typing pauses.
          </span>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-md border border-app-border/80 bg-app-surface p-5">
        <fieldset
          className={`grid gap-5 transition ${
            echoCheckerActive ? "" : "pointer-events-none select-none opacity-60 blur-[2px]"
          }`}
          disabled={!echoCheckerActive}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-app-fg">Echo Tracker</h2>
              <p className="mt-1 text-sm text-app-muted-subtle">
                {echoChecker.plan === "DPS"
                  ? "DPS: double crit, then either 30 CV plus a target stat or two target stats. Echo Score adds target stat bonuses to CV."
                  : "Hybrid/Support: double crit plus one target stat on each echo. Echo Score adds target stat bonuses to CV."}
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
              const echoComplete = isEchoCheckerEchoComplete(echo, echoChecker.plan);
              const critValue = getEchoCheckerCritValue(echo);
              const targetStatCount = getEchoCheckerTargetStatCount(echo);
              const echoScore = getEchoCheckerScore(echo);
              const echoScoreGrade = echoScore === null ? null : getRatingGrade(echoScore);

              return (
                <div
                  className={`grid gap-2 rounded-md border p-3 ${
                    echoComplete
                      ? "border-status-good-border bg-status-good-bg/65"
                      : "border-app-border bg-app-surface"
                  }`}
                  key={item.key}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-app-fg">{item.label}</h3>
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                        echoComplete
                          ? "bg-status-good-border text-app-bg"
                          : "bg-app-raised text-app-muted-dim"
                      }`}
                    >
                      {echoComplete ? "Done" : "Open"}
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
                            hasThirdRelevantStat: event.target.checked
                              ? echo.hasThirdRelevantStat
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
                            hasThirdRelevantStat: event.target.checked
                              ? echo.hasThirdRelevantStat
                              : false,
                          })
                        }
                        type="checkbox"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 rounded-md border border-app-border bg-app-surface/70 px-2 py-2 text-xs font-semibold text-app-muted">
                      Target stat 3
                      <input
                        checked={echo.hasThirdRelevantStat}
                        className="h-4 w-4 accent-app-accent"
                        onChange={(event) =>
                          patchEchoCheckerEcho(item.key, {
                            hasRelevantStat: event.target.checked
                              ? true
                              : echo.hasRelevantStat,
                            hasSecondRelevantStat: event.target.checked
                              ? true
                              : echo.hasSecondRelevantStat,
                            hasThirdRelevantStat: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                    </label>
                  </div>
                  <div className="grid gap-2">
                    <div className="rounded-md border border-app-border bg-app-surface/70 px-2 py-2">
                      <div className="text-[10px] font-medium text-app-muted-subtle">
                        Echo Score
                      </div>
                      <div className="mt-1 flex min-h-6 items-center gap-1.5">
                        {echoScoreGrade === null ? (
                          <span className="rounded-sm bg-status-warn-bg px-1.5 py-0.5 text-xs font-bold leading-none text-status-warn-text">
                            Check
                          </span>
                        ) : (
                          <span
                            className={`rounded-sm px-1.5 py-0.5 text-xs font-bold leading-none ${ratingGradeClasses(
                              echoScoreGrade,
                            )}`}
                          >
                            {echoScoreGrade}
                          </span>
                        )}
                        <span className="text-sm font-semibold leading-none text-app-fg">
                          {echoScore === null ? "-" : echoScore.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md border border-app-border bg-app-surface/70 px-2 py-2">
                        <div className="text-[10px] font-medium text-app-muted-subtle">
                          Crit Value
                        </div>
                        <div className="mt-1 font-semibold leading-none text-app-fg">
                          {critValue === null ? "-" : critValue}
                        </div>
                      </div>
                      <div className="rounded-md border border-app-border bg-app-surface/70 px-2 py-2">
                        <div className="text-[10px] font-medium text-app-muted-subtle">
                          Targets
                        </div>
                        <div className="mt-1 font-semibold leading-none text-app-fg">
                          {targetStatCount}/3
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="border-t border-app-border/70 pt-3 text-xs font-medium leading-5 text-app-muted-dim">
            If you swap out any echos, update the ER numbers at the top of this page.
          </p>
        </fieldset>

        {!echoCheckerActive ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-app-bg/45 px-4">
            <div className="grid max-w-sm gap-3 rounded-md border border-app-border bg-app-surface px-4 py-4 text-center shadow-lg shadow-black/20">
              <div>
                <h2 className="text-base font-semibold text-app-fg">
                  {character.noCrit ? "Echo Tracker unavailable" : "Enable Echo Tracker"}
                </h2>
                <p className="mt-1 text-sm leading-5 text-app-muted-subtle">
                  {character.noCrit
                    ? "Echo Tracker needs a crit-focused 4 cost setup."
                    : "Enable Echo Tracker to edit echo rolls and use them for completion."}
                </p>
              </div>
              {character.noCrit ? null : (
                <TextButton onClick={requestEnableEchoChecker} variant="primary">
                  Enable Echo Tracker
                </TextButton>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {echoModeConfirmOpen ? (
        <Modal
          onClose={() => setEchoModeConfirmOpen(false)}
          subtitle="Your manual Crit Rate and Crit DMG values will remain saved."
          title="Enable Echo Tracker?"
        >
          <div className="grid gap-5">
            <p className="text-sm leading-6 text-app-muted-subtle">
              While Echo Tracker is enabled, ratings use values calculated from the five echo
              cards instead of the manual values above. Switching back to Manual Mode restores
              those saved values.
            </p>
            <div className="flex justify-end gap-2">
              <TextButton onClick={() => setEchoModeConfirmOpen(false)}>Cancel</TextButton>
              <TextButton
                onClick={() => {
                  enableEchoChecker();
                  setEchoModeConfirmOpen(false);
                }}
                variant="primary"
              >
                Enable Echo Tracker
              </TextButton>
            </div>
          </div>
        </Modal>
      ) : null}

      {character.noCrit ? null : <EchoEstimateSection estimate={makanEchoEstimate} />}

      <CharacterRotationsSection rotations={rotations} />
    </main>
  );
}
