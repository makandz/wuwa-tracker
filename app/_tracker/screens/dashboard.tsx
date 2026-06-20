"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type RefObject } from "react";

import { ROLES } from "../constants";
import {
  characterRoleToneClasses,
  checklistTotal,
  formatPercent,
  formatRatingValue,
  formatRoleSummaryValue,
  getPrimaryRole,
  getRatings,
  getRoleSummary,
  getWeaponInventoryStatus,
  getWeaponRarityTone,
  getWeaponToneClasses,
  isComplete,
  rolePillClasses,
  roleSectionClasses,
  sortDashboardCharacters,
} from "../domain";
import { readStoredDashboardSortKey, writeStoredDashboardSortKey } from "../storage";
import type { DashboardSortKey, RoleFilter, TrackedCharacter, WeaponFilter, WeaponInventoryItem } from "../types";
import {
  CharacterAvatar,
  ChecklistProgressSegments,
  RatingBlock,
  SearchInput,
  SelectInput,
  StatBlock,
  TextButton,
  WeaponStatusBadge,
} from "../components/ui";

export function Dashboard({
  characters,
  weaponInventory,
  assignmentCounts,
  onAdd,
  onOpen,
  onInventory,
  onMatrix,
  onExport,
  onImport,
  onClear,
  importRef,
}: {
  characters: TrackedCharacter[];
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onAdd: () => void;
  onOpen: (id: string) => void;
  onInventory: () => void;
  onMatrix: () => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  importRef: RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [weaponFilter, setWeaponFilter] = useState<WeaponFilter>("all");
  const [hideComplete, setHideComplete] = useState(false);
  const [sortKey, setSortKey] = useState<DashboardSortKey>(readStoredDashboardSortKey);
  const completeCount = characters.filter(isComplete).length;
  const critWeightedCharacters = characters.filter((character) => !character.noCrit);
  const validWeights = critWeightedCharacters
    .map((character) => getRatings(character).weighted)
    .filter((weight): weight is number => weight !== null);
  const averageWeighted =
    validWeights.length > 0
      ? validWeights.reduce((sum, weight) => sum + weight, 0) / validWeights.length
      : null;
  const averageWeightedValue =
    characters.length === 0
      ? "0.00"
      : averageWeighted !== null
        ? formatRatingValue(averageWeighted)
        : critWeightedCharacters.length === 0
          ? "No crit"
          : formatRatingValue(null);
  const totalWeaponCopies = weaponInventory.reduce((sum, item) => sum + item.count, 0);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCharacters = useMemo(() => {
    const filtered = characters.filter((character) => {
      if (hideComplete && isComplete(character)) {
        return false;
      }

      if (roleFilter !== "all" && !character.roles.includes(roleFilter)) {
        return false;
      }

      const weaponStatus = getWeaponInventoryStatus({
        weaponId: character.weaponId,
        inventory: weaponInventory,
        assignmentCounts,
      });

      if (weaponFilter === "selected" && !character.weaponId) {
        return false;
      }

      if (weaponFilter === "missing" && character.weaponId) {
        return false;
      }

      if (weaponFilter === "attention" && !weaponStatus) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        character.characterName,
        character.elementName,
        character.weaponTypeName,
        character.weaponName,
        character.roles.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    return filtered;
  }, [
    assignmentCounts,
    characters,
    hideComplete,
    normalizedQuery,
    roleFilter,
    weaponFilter,
    weaponInventory,
  ]);
  const groupedCharacters = useMemo(
    () =>
      ROLES.map((role) => {
        const characters = sortDashboardCharacters(
          visibleCharacters.filter((character) => getPrimaryRole(character.roles) === role),
          sortKey,
        );

        return {
          role,
          characters,
          summary: getRoleSummary(characters),
        };
      }).filter((group) => group.characters.length > 0),
    [sortKey, visibleCharacters],
  );

  useEffect(() => {
    writeStoredDashboardSortKey(sortKey);
  }, [sortKey]);

  const filtersActive =
    normalizedQuery ||
    roleFilter !== "all" ||
    weaponFilter !== "all" ||
    hideComplete;

  return (
    <>
      <section className="border-b border-app-border/80 bg-app-surface">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-app-accent">Wuthering Waves</p>
              <h1 className="mt-1 text-3xl font-bold tracking-normal text-app-fg">
                Build Tracker
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <TextButton onClick={onAdd} variant="primary">
                Add Character
              </TextButton>
              <TextButton onClick={onMatrix}>Matrix Planner</TextButton>
              <TextButton onClick={onInventory}>Weapon Inventory</TextButton>
              <TextButton onClick={onExport}>Export</TextButton>
              <TextButton onClick={() => importRef.current?.click()}>Import</TextButton>
              <TextButton onClick={onClear} variant="danger">
                Clear
              </TextButton>
              <input
                accept="application/json"
                className="hidden"
                onChange={onImport}
                ref={importRef}
                type="file"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatBlock label="Tracked" value={String(characters.length)} />
            <StatBlock
              label="Complete"
              tone={completeCount === characters.length && characters.length > 0 ? "good" : "neutral"}
              value={`${completeCount}/${characters.length}`}
            />
            <StatBlock
              label="Avg Weighted"
              value={averageWeightedValue}
            />
            <StatBlock label="Weapon Copies" value={String(totalWeaponCopies)} />
          </div>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-5 sm:px-6 lg:px-8">
        {characters.length === 0 ? (
          <div className="rounded-md border border-dashed border-app-border bg-app-surface p-8 text-center">
            <h2 className="text-xl font-semibold text-app-fg">No tracked characters yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-app-muted-subtle">
              Add a character from the live catalog, assign roles and a weapon, then track echo
              pieces, skill completion, ER targets, and ratings locally in this browser.
            </p>
            <div className="mt-5">
              <TextButton onClick={onAdd} variant="primary">
                Add Character
              </TextButton>
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5">
            <section className="flex flex-wrap items-center gap-2 rounded-md border border-app-border/80 bg-app-surface px-3 py-2 shadow-sm">
              <div className="min-w-[220px] flex-1">
                <SearchInput
                  ariaLabel="Search"
                  compact
                  onChange={setQuery}
                  placeholder="Search name, element, weapon, or role"
                  value={query}
                />
              </div>
              <div className="grid flex-1 gap-2 sm:flex-none sm:grid-cols-3">
                <SelectInput
                  compact
                  label="Role"
                  onChange={setRoleFilter}
                  options={[
                    { label: "All roles", value: "all" },
                    ...ROLES.map((role) => ({ label: role, value: role })),
                  ]}
                  showLabel={false}
                  value={roleFilter}
                />
                <SelectInput
                  compact
                  label="Weapon"
                  onChange={setWeaponFilter}
                  options={[
                    { label: "All weapon states", value: "all" },
                    { label: "Weapon selected", value: "selected" },
                    { label: "No weapon", value: "missing" },
                    { label: "Needs attention", value: "attention" },
                  ]}
                  showLabel={false}
                  value={weaponFilter}
                />
                <SelectInput
                  compact
                  label="Sort"
                  onChange={setSortKey}
                  options={[
                    { label: "Recently updated", value: "updated" },
                    { label: "Name A-Z", value: "name" },
                    { label: "Closest to done", value: "completionDesc" },
                    { label: "Needs most work", value: "completionAsc" },
                    { label: "Highest weight", value: "weightDesc" },
                    { label: "Lowest weight", value: "weightAsc" },
                  ]}
                  showLabel={false}
                  value={sortKey}
                />
              </div>
              <label className="flex min-h-9 items-center gap-2 whitespace-nowrap text-xs font-semibold text-app-muted">
                <input
                  checked={hideComplete}
                  className="h-3.5 w-3.5 accent-app-accent"
                  onChange={(event) => setHideComplete(event.target.checked)}
                  type="checkbox"
                />
                Hide completed
              </label>
              <div className="ml-auto flex min-h-9 items-center gap-2">
                <span className="whitespace-nowrap text-xs font-medium text-app-muted-dim">
                  {visibleCharacters.length}/{characters.length}
                </span>
                {filtersActive ? (
                  <TextButton
                    compact
                    onClick={() => {
                      setQuery("");
                      setRoleFilter("all");
                      setWeaponFilter("all");
                      setHideComplete(false);
                    }}
                  >
                    Reset
                  </TextButton>
                ) : null}
              </div>
            </section>

            {visibleCharacters.length === 0 ? (
              <div className="rounded-md border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted-subtle">
                No characters match those filters.
              </div>
            ) : null}

            {groupedCharacters.map((group) => (
              <section className="grid gap-2" key={group.role}>
                <div
                  className={`flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${roleSectionClasses(
                    group.role,
                  )}`}
                >
                  <h2 className="text-sm font-bold uppercase tracking-normal">{group.role}</h2>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs font-semibold">
                    <span className="rounded bg-app-bg/30 px-2 py-1">
                      {group.summary.count} {group.summary.count === 1 ? "char" : "chars"}
                    </span>
                    <span className="rounded bg-app-bg/30 px-2 py-1">
                      CR {formatRoleSummaryValue(group.summary.averageCr, group.summary.critCharacterCount)}
                    </span>
                    <span className="rounded bg-app-bg/30 px-2 py-1">
                      CD {formatRoleSummaryValue(group.summary.averageCd, group.summary.critCharacterCount)}
                    </span>
                    <span className="rounded bg-app-bg/30 px-2 py-1">
                      Wt{" "}
                      {formatRoleSummaryValue(
                        group.summary.averageWeighted,
                        group.summary.critCharacterCount,
                      )}
                    </span>
                  </div>
                </div>

                {group.characters.map((character) => {
                  const complete = isComplete(character);
                  const primaryRole = getPrimaryRole(character.roles);
                  const characterToneClasses = characterRoleToneClasses(primaryRole, complete);
                  const checklistCount = checklistTotal(character.checklist);
                  const ratings = getRatings(character);
                  const weaponStatus = getWeaponInventoryStatus({
                    weaponId: character.weaponId,
                    inventory: weaponInventory,
                    assignmentCounts,
                  });
                  const weaponTone = getWeaponRarityTone({
                    name: character.weaponName,
                    qualityId: character.weaponQualityId,
                  });
                  const weaponToneClasses = getWeaponToneClasses(weaponTone);
                  const erBelowTarget =
                    character.expectedEr > 0 && character.actualEr < character.expectedEr;

                  return (
                    <button
                      className={`grid gap-3 rounded-md border px-3 py-2.5 text-left shadow-sm shadow-black/20 transition hover:border-app-accent hover:shadow-md lg:grid-cols-[minmax(240px,1.15fr)_minmax(230px,0.9fr)_minmax(210px,0.8fr)] ${
                        characterToneClasses.card
                      }`}
                      key={character.id}
                      onClick={() => onOpen(character.id)}
                      type="button"
                    >
                      <div className="flex min-w-0 gap-2.5">
                        <CharacterAvatar compact character={character} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h2 className="truncate text-base font-semibold text-app-fg">
                              {character.characterName}
                            </h2>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${characterToneClasses.status}`}
                            >
                              {complete ? "Done" : "In progress"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-app-muted-subtle">
                            {character.elementName} / {character.weaponTypeName}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {character.roles.map((role) => (
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${rolePillClasses(
                                  role,
                                )}`}
                                key={role}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-app-muted">Checklist</span>
                            <span className="text-app-muted-dim">{checklistCount}/6</span>
                          </div>
                          <div className="mt-1.5">
                            <ChecklistProgressSegments checklist={character.checklist} />
                          </div>
                        </div>
                        {character.noCrit ? (
                          <div className="rounded-md border border-app-border/80 bg-app-surface p-2">
                            <div className="text-[10px] font-semibold uppercase tracking-normal text-app-muted-dim">
                              Rating
                            </div>
                            <div className="mt-0.5 text-sm font-bold leading-none text-app-muted">
                              No crit
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5">
                            <RatingBlock label="CR" value={ratings.crRating} />
                            <RatingBlock label="CD" value={ratings.cdRating} />
                            <RatingBlock label="Weight" value={ratings.weighted} />
                          </div>
                        )}
                      </div>

                      <div className="grid content-start gap-1.5 text-xs text-app-muted">
                        <div className="flex justify-between gap-3">
                          <span className="text-app-muted-dim">Weapon</span>
                          <span className="flex min-w-0 flex-wrap justify-end gap-1">
                            <span
                              className={`truncate rounded px-1.5 py-0.5 font-semibold ${
                                character.weaponName
                                  ? `${weaponToneClasses.badge}`
                                  : "bg-app-raised text-app-muted-subtle"
                              }`}
                            >
                              {character.weaponName || "Not selected"}
                            </span>
                            <WeaponStatusBadge status={weaponStatus} />
                          </span>
                        </div>
                        {character.noCrit ? null : (
                          <div className="flex justify-between gap-3">
                            <span className="text-app-muted-dim">Echo Crit</span>
                            <span className="font-medium text-app-fg">
                              {formatPercent(character.critRate)} / {formatPercent(character.critDmg)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex justify-between gap-3 rounded px-1.5 py-1 ${
                            erBelowTarget
                              ? "border border-status-warn-border bg-status-warn-bg text-status-warn-text"
                              : ""
                          }`}
                        >
                          <span className="text-app-muted-dim">ER</span>
                          <span
                            className={`font-medium ${
                              erBelowTarget ? "text-status-warn-text" : "text-app-fg"
                            }`}
                          >
                            {character.actualEr || 0}% / {character.expectedEr || 0}%
                          </span>
                        </div>
                        {character.notes.trim() ? (
                          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                            <span className="text-app-muted-dim">Notes</span>
                            <span
                              className="block min-w-0 truncate rounded bg-app-surface/70 px-1.5 py-1 text-right font-medium text-app-fg"
                              title={character.notes}
                            >
                              {character.notes}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
