"use client";

import { useEffect, useMemo, useState } from "react";

import { ROLES } from "../constants";
import {
  characterRoleToneClasses,
  checklistTotal,
  formatPercent,
  formatRatingValue,
  formatRoleSummaryValue,
  getEffectiveChecklist,
  getPrimaryRole,
  getRatings,
  getRoleSummary,
  getWeaponInventoryStatus,
  getWeaponRarityTone,
  getWeaponToneClasses,
  isEchoCheckerEnabled,
  isComplete,
  rolePillClasses,
  roleSectionClasses,
  sortDashboardCharacters,
} from "../domain";
import {
  readStoredDashboardSortKey,
  readStoredDashboardViewMode,
  writeStoredDashboardSortKey,
  writeStoredDashboardViewMode,
} from "../storage";
import type {
  DashboardSortKey,
  DashboardViewMode,
  RoleFilter,
  TrackedCharacter,
  WeaponFilter,
  WeaponInventoryItem,
} from "../types";
import {
  CharacterAvatar,
  ChecklistProgressSegments,
  RatingBlock,
  SearchInput,
  SelectInput,
  TextButton,
  WeaponStatusBadge,
} from "../components/ui";

export function Dashboard({
  characters,
  weaponInventory,
  assignmentCounts,
  onAdd,
  onExportBackup,
  onOpen,
  onInventory,
  onMatrix,
  onSettings,
  showBackupNotice,
}: {
  characters: TrackedCharacter[];
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onAdd: () => void;
  onExportBackup: () => void;
  onOpen: (id: string) => void;
  onInventory: () => void;
  onMatrix: () => void;
  onSettings: () => void;
  showBackupNotice: boolean;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [weaponFilter, setWeaponFilter] = useState<WeaponFilter>("all");
  const [hideComplete, setHideComplete] = useState(false);
  const [sortKey, setSortKey] = useState<DashboardSortKey>(readStoredDashboardSortKey);
  const [dashboardView, setDashboardView] = useState<DashboardViewMode>(
    readStoredDashboardViewMode,
  );
  const completeCount = characters.filter(isComplete).length;
  const critScoredCharacters = characters.filter((character) => !character.noCrit);
  const validBuildScores = critScoredCharacters
    .map((character) => getRatings(character).buildScore)
    .filter((score): score is number => score !== null);
  const averageBuildScore =
    validBuildScores.length > 0
      ? validBuildScores.reduce((sum, score) => sum + score, 0) / validBuildScores.length
      : null;
  const averageBuildScoreValue =
    characters.length === 0
      ? "0.00"
      : averageBuildScore !== null
        ? formatRatingValue(averageBuildScore)
        : critScoredCharacters.length === 0
          ? "No crit"
          : formatRatingValue(null);
  const totalWeaponCopies = weaponInventory.reduce((sum, item) => sum + item.count, 0);
  const hasWeaponCopies = totalWeaponCopies > 0;
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

  useEffect(() => {
    writeStoredDashboardViewMode(dashboardView);
  }, [dashboardView]);

  const filtersActive =
    normalizedQuery ||
    roleFilter !== "all" ||
    weaponFilter !== "all" ||
    hideComplete;
  const dashboardStats = [
    { label: "Tracked", value: String(characters.length) },
    { label: "Complete", value: `${completeCount}/${characters.length}` },
    { label: "Avg build", value: averageBuildScoreValue },
    { label: "Weapon copies", value: String(totalWeaponCopies) },
  ];

  return (
    <>
      <section className="border-b border-app-border/80 bg-app-subtle">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal text-app-fg">
              Build Tracker
            </h1>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              {dashboardStats.map((stat) => (
                <div className="flex items-center gap-1.5" key={stat.label}>
                  <dt className="text-app-muted-dim">{stat.label}</dt>
                  <dd className="font-semibold text-app-muted">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasWeaponCopies ? (
              <TextButton onClick={onAdd} variant="primary">
                Add Character
              </TextButton>
            ) : (
              <TextButton onClick={onInventory} variant="primary">
                Add Weapons First
              </TextButton>
            )}
            <TextButton className="matrix-planner-button" onClick={onMatrix}>
              Matrix Planner
            </TextButton>
            <TextButton onClick={onInventory}>Weapon Inventory</TextButton>
            <TextButton onClick={onSettings}>Settings</TextButton>
          </div>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-5 sm:px-6 lg:px-8">
        {showBackupNotice ? (
          <section className="flex flex-col gap-3 rounded-md border border-app-border bg-app-surface px-4 py-3 text-app-muted sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium leading-6">
              This website is a work in progress. Please export and back up your tracker data.
            </p>
            <TextButton
              className="border-app-muted-dim bg-app-raised text-app-fg hover:bg-app-surface"
              onClick={onExportBackup}
            >
              Export Backup
            </TextButton>
          </section>
        ) : null}

        {characters.length === 0 ? (
          <div className="rounded-md border border-dashed border-app-border bg-app-surface p-8 text-center">
            <h2 className="text-xl font-semibold text-app-fg">No tracked characters yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-app-muted-subtle">
              {hasWeaponCopies
                ? "Add a character, assign a weapon, and track the build from one row."
                : "Add owned weapons first so characters can be assigned real inventory copies."}
            </p>
            <div className="mt-5">
              {hasWeaponCopies ? (
                <TextButton onClick={onAdd} variant="primary">
                  Add Character
                </TextButton>
              ) : (
                <TextButton onClick={onInventory} variant="primary">
                  Add Weapons First
                </TextButton>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5">
            <section className="flex flex-wrap items-center gap-2 rounded-md border border-app-border/80 bg-app-surface px-3 py-2">
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
                    { label: "Highest build score", value: "weightDesc" },
                    { label: "Lowest build score", value: "weightAsc" },
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
              <div
                aria-label="Dashboard view"
                className="flex h-9 rounded-md border border-app-border bg-app-bg p-0.5"
                role="group"
              >
                {(["list", "grid"] as const).map((viewMode) => (
                  <button
                    aria-pressed={dashboardView === viewMode}
                    className={`rounded-sm px-2.5 text-xs font-semibold capitalize transition-colors ${
                      dashboardView === viewMode
                        ? "bg-app-raised text-app-fg"
                        : "text-app-muted hover:bg-app-surface hover:text-app-fg"
                    }`}
                    key={viewMode}
                    onClick={() => setDashboardView(viewMode)}
                    type="button"
                  >
                    {viewMode}
                  </button>
                ))}
              </div>
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
                  className={`flex flex-col gap-1 border-b px-1 pb-2 pt-2 sm:flex-row sm:items-center sm:justify-between ${roleSectionClasses(
                    group.role,
                  )}`}
                >
                  <h2 className="text-sm font-semibold">{group.role}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-app-muted-subtle sm:justify-end">
                    <span>
                      {group.summary.count} {group.summary.count === 1 ? "char" : "chars"}
                    </span>
                    <span>
                      CR {formatRoleSummaryValue(group.summary.averageCr, group.summary.critCharacterCount)}
                    </span>
                    <span>
                      CD {formatRoleSummaryValue(group.summary.averageCd, group.summary.critCharacterCount)}
                    </span>
                    <span>
                      Build{" "}
                      {formatRoleSummaryValue(
                        group.summary.averageBuildScore,
                        group.summary.critCharacterCount,
                      )}
                    </span>
                  </div>
                </div>

                <div
                  className={
                    dashboardView === "grid"
                      ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      : "grid gap-2"
                  }
                >
                  {group.characters.map((character) =>
                    dashboardView === "grid" ? (
                      <DashboardGridCard
                        assignmentCounts={assignmentCounts}
                        character={character}
                        key={character.id}
                        onOpen={onOpen}
                        weaponInventory={weaponInventory}
                      />
                    ) : (
                      <DashboardListCard
                        assignmentCounts={assignmentCounts}
                        character={character}
                        key={character.id}
                        onOpen={onOpen}
                        weaponInventory={weaponInventory}
                      />
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

type DashboardCharacterCardProps = {
  character: TrackedCharacter;
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onOpen: (id: string) => void;
};

function getDashboardCharacterCardState({
  assignmentCounts,
  character,
  weaponInventory,
}: Pick<
  DashboardCharacterCardProps,
  "assignmentCounts" | "character" | "weaponInventory"
>) {
  const complete = isComplete(character);
  const primaryRole = getPrimaryRole(character.roles);
  const characterToneClasses = characterRoleToneClasses(primaryRole, complete);
  const effectiveChecklist = getEffectiveChecklist(character);
  const checklistCount = checklistTotal(effectiveChecklist);
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
  const echoTrackerEnabled = isEchoCheckerEnabled(character);

  return {
    characterToneClasses,
    checklistCount,
    complete,
    echoTrackerEnabled,
    effectiveChecklist,
    erBelowTarget,
    ratings,
    weaponStatus,
    weaponToneClasses,
  };
}

function EchoTrackerBadge() {
  return (
    <span
      className="rounded-sm border border-status-good-border/70 bg-status-good-bg/55 px-1.5 py-0.5 text-[10px] font-semibold text-status-good-text"
      title="Echo Tracker mode enabled"
    >
      Echo Tracker
    </span>
  );
}

function DashboardListCard({
  assignmentCounts,
  character,
  onOpen,
  weaponInventory,
}: DashboardCharacterCardProps) {
  const {
    characterToneClasses,
    checklistCount,
    complete,
    echoTrackerEnabled,
    effectiveChecklist,
    erBelowTarget,
    ratings,
    weaponStatus,
    weaponToneClasses,
  } = getDashboardCharacterCardState({
    assignmentCounts,
    character,
    weaponInventory,
  });

  return (
    <button
      className={`grid gap-3 rounded-md border px-3 py-2.5 text-left transition-colors hover:border-app-muted-dim hover:bg-app-raised lg:grid-cols-[minmax(180px,0.65fr)_minmax(250px,1fr)_minmax(210px,0.85fr)] ${
        characterToneClasses.card
      }`}
      onClick={() => onOpen(character.id)}
      type="button"
    >
      <div className="flex min-w-0 gap-3">
        <CharacterAvatar character={character} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate text-sm font-semibold text-app-fg">
              {character.characterName}
            </h2>
            <span
              className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${characterToneClasses.status}`}
            >
              {complete ? "Done" : "In progress"}
            </span>
            {echoTrackerEnabled ? <EchoTrackerBadge /> : null}
          </div>
          <p className="mt-0.5 text-[11px] text-app-muted-subtle">
            {character.elementName} / {character.weaponTypeName}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {character.roles.map((role) => (
              <span
                className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${rolePillClasses(
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
            <ChecklistProgressSegments checklist={effectiveChecklist} />
          </div>
        </div>
        {character.noCrit ? (
          <div className="rounded-md border border-app-border/80 bg-app-surface p-2">
            <div className="text-[10px] font-medium text-app-muted-subtle">
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
            <RatingBlock label="Build" value={ratings.buildScore} />
          </div>
        )}
      </div>

      <div className="grid content-start gap-1.5 text-xs text-app-muted">
        <div className="flex justify-between gap-3">
          <span className="text-app-muted-dim">Weapon</span>
          <span className="flex min-w-0 flex-wrap justify-end gap-1">
            <span
              className={`truncate rounded-sm px-1.5 py-0.5 font-semibold ${
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
          className={`flex justify-between gap-3 rounded-sm px-1.5 py-1 ${
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
              className="block min-w-0 truncate rounded-sm bg-app-bg px-1.5 py-1 text-right font-medium text-app-fg"
              title={character.notes}
            >
              {character.notes}
            </span>
          </div>
        ) : null}
      </div>
    </button>
  );
}

function DashboardGridCard({
  assignmentCounts,
  character,
  onOpen,
  weaponInventory,
}: DashboardCharacterCardProps) {
  const {
    characterToneClasses,
    checklistCount,
    complete,
    echoTrackerEnabled,
    effectiveChecklist,
    erBelowTarget,
    ratings,
    weaponStatus,
    weaponToneClasses,
  } = getDashboardCharacterCardState({
    assignmentCounts,
    character,
    weaponInventory,
  });

  return (
    <button
      className={`grid min-h-[170px] content-start gap-2 rounded-md border px-2.5 py-2.5 text-left transition-colors hover:border-app-muted-dim hover:bg-app-raised ${
        characterToneClasses.card
      }`}
      onClick={() => onOpen(character.id)}
      type="button"
    >
      <div className="flex min-w-0 gap-2">
        <CharacterAvatar character={character} dense />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-1.5">
            <h2 className="min-w-0 truncate text-sm font-semibold text-app-fg">
              {character.characterName}
            </h2>
            <span className="flex shrink-0 flex-wrap justify-end gap-1">
              <span
                className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${
                  characterToneClasses.status
                }`}
              >
                {complete ? "Done" : "WIP"}
              </span>
              {echoTrackerEnabled ? <EchoTrackerBadge /> : null}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {character.roles.map((role) => (
              <span
                className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${rolePillClasses(
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

      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-app-muted">Checklist</span>
          <span className="text-app-muted-dim">{checklistCount}/6</span>
        </div>
        <div className="mt-1.5">
          <ChecklistProgressSegments checklist={effectiveChecklist} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {character.noCrit ? (
          <div className="rounded-md border border-app-border/80 bg-app-surface p-2">
            <div className="text-[10px] font-medium text-app-muted-subtle">
              Rating
            </div>
            <div className="mt-0.5 text-sm font-bold leading-none text-app-muted">
              No crit
            </div>
          </div>
        ) : (
          <RatingBlock label="Build" value={ratings.buildScore} />
        )}
        <div
          className={`rounded-md border p-2 ${
            erBelowTarget
              ? "border-status-warn-border bg-status-warn-bg text-status-warn-text"
              : "border-app-border/80 bg-app-surface text-app-fg"
          }`}
        >
          <div className="text-[10px] font-medium text-app-muted-subtle">
            ER
          </div>
          <div
            className={`mt-0.5 text-sm font-bold leading-none ${
              erBelowTarget ? "text-status-warn-text" : "text-app-muted"
            }`}
          >
            {character.actualEr || 0}% / {character.expectedEr || 0}%
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] font-semibold">
        <span
          className={`max-w-full truncate rounded-sm px-1.5 py-0.5 ${
            character.weaponName
              ? `${weaponToneClasses.badge}`
              : "bg-app-raised text-app-muted-subtle"
          }`}
        >
          {character.weaponName || "No weapon"}
        </span>
        <WeaponStatusBadge status={weaponStatus} />
      </div>
    </button>
  );
}
