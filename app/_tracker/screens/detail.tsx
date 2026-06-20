"use client";

import { useMemo, useState } from "react";

import { FOUR_COST_OPTIONS, ROLES } from "../constants";
import {
  characterRoleToneClasses,
  getRatingGrade,
  getPrimaryRole,
  getPrydwenCharacterUrl,
  getRatings,
  getWeaponInventoryStatus,
  getWeaponRarityTone,
  isComplete,
  ratingGradeClasses,
} from "../domain";
import type {
  ApiWeapon,
  Checklist,
  RatingValue,
  Role,
  TrackedCharacter,
  WeaponInventoryItem,
} from "../types";
import { PickerSummary, WeaponPickerModal } from "../components/pickers";
import {
  CharacterAvatar,
  ErInput,
  Field,
  NumberInput,
  RoleToggle,
  TextButton,
  TextLink,
  WeaponStatusBadge,
} from "../components/ui";

const FORTE_CHECKLIST_ITEM = {
  key: "skills",
  label: "Skills / Forte level ups",
} satisfies { key: keyof Checklist; label: string };

const ECHO_CHECKLIST_ITEMS = [
  { key: "fourCost", label: "Echo 1" },
  { key: "threeCostA", label: "Echo 2" },
  { key: "threeCostB", label: "Echo 3" },
  { key: "oneCostA", label: "Echo 4" },
  { key: "oneCostB", label: "Echo 5" },
] satisfies { key: keyof Checklist; label: string }[];

function RatingSummaryBlock({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: RatingValue;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "border-status-good-border bg-status-good-bg text-status-good-text"
      : tone === "warn"
        ? "border-status-warn-border bg-status-warn-bg text-status-warn-text"
        : "border-app-border/80 bg-app-surface text-app-fg";

  if (value === null) {
    return (
      <div className={`rounded-md border p-3 ${toneClass}`}>
        <div className="text-[11px] font-semibold uppercase tracking-normal text-app-muted-dim">
          {label}
        </div>
        <div className="mt-1 text-lg font-semibold leading-none">Check stats</div>
      </div>
    );
  }

  const grade = getRatingGrade(value);

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-normal text-app-muted-dim">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`rounded px-2 py-1 text-base font-bold leading-none ${ratingGradeClasses(
            grade,
          )}`}
        >
          {grade}
        </span>
        <span className="text-lg font-semibold leading-none">{value.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function DetailScreen({
  character,
  weapons,
  weaponInventory,
  assignmentCounts,
  onBack,
  onDelete,
  onUpdate,
}: {
  character: TrackedCharacter;
  weapons: ApiWeapon[];
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (character: TrackedCharacter) => void;
}) {
  const inventoryCounts = useMemo(
    () =>
      weaponInventory.reduce<Record<number, number>>((counts, item) => {
        counts[item.weaponId] = item.count;
        return counts;
      }, {}),
    [weaponInventory],
  );
  const availableWeapons = weapons.filter(
    (weapon) => weapon.Type === character.weaponTypeId && (inventoryCounts[weapon.Id] ?? 0) > 0,
  );
  const ratings = getRatings(character);
  const complete = isComplete(character);
  const primaryRole = getPrimaryRole(character.roles);
  const characterToneClasses = characterRoleToneClasses(primaryRole, complete);
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const selectedWeapon = weapons.find((weapon) => weapon.Id === character.weaponId) ?? null;
  const weaponStatus = getWeaponInventoryStatus({
    weaponId: character.weaponId,
    inventory: weaponInventory,
    assignmentCounts,
  });
  const prydwenUrl = getPrydwenCharacterUrl(character.characterName);

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

  function toggleRole(role: Role) {
    const nextRoles = character.roles.includes(role)
      ? character.roles.filter((item) => item !== role)
      : [...character.roles, role];

    if (nextRoles.length === 0) {
      return;
    }

    patchCharacter({ roles: nextRoles });
  }

  function updateWeapon(selectedWeapon: ApiWeapon | null) {
    patchCharacter({
      weaponId: selectedWeapon?.Id ?? null,
      weaponName: selectedWeapon?.Name ?? "",
      weaponQualityId: selectedWeapon?.QualityId ?? null,
    });
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CharacterAvatar character={character} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-app-fg">{character.characterName}</h1>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${characterToneClasses.status}`}
              >
                {complete ? "Done" : "In progress"}
              </span>
            </div>
            <p className="mt-1 text-sm text-app-muted-subtle">
              {character.elementName} / {character.weaponTypeName}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextButton onClick={onBack}>Dashboard</TextButton>
          <TextLink href={prydwenUrl}>Prydwen</TextLink>
          <TextButton onClick={onDelete} variant="danger">
            Delete
          </TextButton>
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="grid content-start gap-5 rounded-md border border-app-border/80 bg-app-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-app-fg">Build Setup</h2>
          <PickerSummary
            actionLabel="Change"
            image={selectedWeapon?.Icon}
            label="Weapon"
            meta={
              selectedWeapon
                ? `${selectedWeapon.TypeName} / Own ${
                    inventoryCounts[selectedWeapon.Id] ?? 0
                  } / Used ${assignmentCounts[selectedWeapon.Id] ?? 0}`
                : "No weapon selected"
            }
            onClick={() => setWeaponPickerOpen(true)}
            quality={selectedWeapon?.QualityId ?? character.weaponQualityId}
            rarityTone={getWeaponRarityTone({
              name: selectedWeapon?.Name ?? character.weaponName,
              qualityId: selectedWeapon?.QualityId ?? character.weaponQualityId,
            })}
            title={(selectedWeapon?.Name ?? character.weaponName) || "No weapon selected"}
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
              weaponTypeName={character.weaponTypeName}
            />
          ) : null}

          <div>
            <div className="mb-2 text-sm font-medium text-app-muted">Roles</div>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <RoleToggle
                  active={character.roles.includes(role)}
                  key={role}
                  onToggle={() => toggleRole(role)}
                  role={role}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-app-muted">4 Cost Main Stat</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FOUR_COST_OPTIONS.map((option) => (
                <button
                  className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
                    !character.noCrit && character.fourCostMain === option.value
                      ? "border-2 border-app-accent bg-app-accent text-app-bg shadow-[0_0_0_1px_rgb(101_223_208_/_0.26),0_10px_24px_rgb(101_223_208_/_0.16)]"
                      : "border-app-border bg-app-surface text-app-muted-subtle opacity-75 hover:border-app-accent hover:bg-app-raised hover:text-app-muted hover:opacity-100"
                  }`}
                  aria-pressed={!character.noCrit && character.fourCostMain === option.value}
                  key={option.value}
                  onClick={() => patchCharacter({ fourCostMain: option.value, noCrit: false })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
              <button
                className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
                  character.noCrit
                    ? "border-2 border-app-accent bg-app-accent text-app-bg shadow-[0_0_0_1px_rgb(101_223_208_/_0.26),0_10px_24px_rgb(101_223_208_/_0.16)]"
                    : "border-app-border bg-app-surface text-app-muted-subtle opacity-75 hover:border-app-accent hover:bg-app-raised hover:text-app-muted hover:opacity-100"
                }`}
                aria-pressed={character.noCrit}
                onClick={() => patchCharacter({ noCrit: !character.noCrit })}
                type="button"
              >
                No crit
              </button>
            </div>
          </div>

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

        <section className="grid content-start gap-5 rounded-md border border-app-border/80 bg-app-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-app-fg">Completion</h2>
          <div>
            <div className="mb-2 text-sm font-medium text-app-muted">Character Stats</div>
            {character.noCrit ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-app-border/80 bg-app-surface px-3 py-2 text-sm font-medium text-app-muted">
                  No crit
                </div>
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
                    onChange={(value) => patchCharacter({ critRate: value })}
                    placeholder="37.5"
                    value={character.critRate}
                  />
                </Field>
                <Field label="Echo Crit DMG">
                  <NumberInput
                    onChange={(value) => patchCharacter({ critDmg: value })}
                    placeholder="75"
                    value={character.critDmg}
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
              Use Crit Rate and Crit DMG from the echo selection screen, and ER from the main
              character screen.
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
                      className="flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-app-border bg-app-surface px-2 py-2 text-xs font-semibold text-app-muted"
                      key={item.key}
                    >
                      <span>{item.label}</span>
                      <input
                        checked={character.checklist[item.key]}
                        className="h-4 w-4 shrink-0 accent-app-accent"
                        onChange={(event) => patchChecklist(item.key, event.target.checked)}
                        type="checkbox"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Field label="Notes">
            <textarea
              className="min-h-40 rounded-md border border-app-border bg-app-surface p-3 text-sm text-app-fg outline-none transition focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/25"
              onChange={(event) => patchCharacter({ notes: event.target.value })}
              value={character.notes}
            />
          </Field>
        </section>
      </div>
    </main>
  );
}
