"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BACKUP_NOTICE_FIRST_VISIT_DELAY_MS,
  BACKUP_NOTICE_INTERVAL_MS,
} from "@/features/tracker/constants";
import {
  formatPercent,
  formatRoleSummaryValue,
  getAssignmentCounts,
  rolePillClasses,
  roleSectionClasses,
} from "@/features/tracker/domain";
import {
  buildDashboardCatalogLookups,
  filterDashboardCharacters,
  getDashboardCharacterCardState,
  getDashboardStats,
  groupDashboardCharacters,
} from "@/features/tracker/domain/dashboard-selectors";
import { exportTrackerData, type TrackerStorageStatus } from "@/features/tracker/storage";
import { StorageStatusNotice } from "@/features/tracker/components/storage-status-notice";
import {
  CharacterAvatar,
  ChecklistProgressSegments,
  RatingBlock,
  SearchInput,
  SelectInput,
  TextButton,
  WeaponStatusBadge,
} from "@/features/tracker/components/ui";
import { getCharacterHref, hasTrackerData } from "@/features/tracker/route-helpers";
import { useTrackerData } from "@/features/tracker/tracker-provider";
import type {
  ApiCharacter,
  ApiWeapon,
  Catalog,
  DashboardSortKey,
  DashboardViewMode,
  TrackedCharacter,
  WeaponFilter,
  WeaponInventoryItem,
} from "@/features/tracker/types";

export default function Home() {
  const router = useRouter();
  const {
    catalog,
    characters,
    backupNoticeAcknowledgedAt,
    dashboardSortKey,
    dashboardViewMode,
    matrixTeams,
    storageLoaded,
    storageStatus,
    storageVersion,
    updatePreferences,
    welcomeSeen,
    weaponInventory,
  } = useTrackerData();
  const [backupNoticeCheckedAt, setBackupNoticeCheckedAt] = useState<number | null>(null);
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBackupNoticeCheckedAt(Date.now());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [backupNoticeAcknowledgedAt, storageLoaded]);

  if (!storageLoaded) {
    return <div className="min-h-full bg-app-bg text-app-fg" />;
  }

  if (storageStatus.state === "error") {
    return (
      <div className="min-h-full bg-app-bg text-app-fg">
        <main className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <StorageStatusNotice storageStatus={storageStatus} />
          <TextButton onClick={() => router.push("/settings")}>
            Open Settings
          </TextButton>
        </main>
      </div>
    );
  }

  if (!welcomeSeen) {
    return (
      <WelcomeScreen
        onStart={() => {
          const preferences = {
            welcomeSeen: true,
            backupNoticeAcknowledgedAt,
          };

          if (
            backupNoticeAcknowledgedAt === 0 &&
            !hasTrackerData(characters, weaponInventory, matrixTeams)
          ) {
            preferences.backupNoticeAcknowledgedAt =
              Date.now() -
              BACKUP_NOTICE_INTERVAL_MS +
              BACKUP_NOTICE_FIRST_VISIT_DELAY_MS;
          }

          updatePreferences(preferences);
        }}
      />
    );
  }

  function exportBackupFromNotice() {
    const acknowledgedAt = Date.now();

    exportTrackerData(characters, weaponInventory, matrixTeams, {
      welcomeSeen,
      dashboardSortKey,
      dashboardViewMode,
      backupNoticeAcknowledgedAt: acknowledgedAt,
    });
    updatePreferences({ backupNoticeAcknowledgedAt: acknowledgedAt });
  }

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <Dashboard
        assignmentCounts={assignmentCounts}
        catalog={catalog}
        characters={characters}
        dashboardSortKey={dashboardSortKey}
        dashboardViewMode={dashboardViewMode}
        onAdd={() => router.push("/add")}
        onDashboardSortKeyChange={(nextSortKey) =>
          updatePreferences({ dashboardSortKey: nextSortKey })
        }
        onDashboardViewModeChange={(nextViewMode) =>
          updatePreferences({ dashboardViewMode: nextViewMode })
        }
        onExportBackup={exportBackupFromNotice}
        onInventory={() => router.push("/inventory")}
        onOpen={(id) => {
          const character = characters.find((item) => item.id === id);

          if (character) {
            router.push(getCharacterHref(character, characters));
          }
        }}
        showBackupNotice={
          backupNoticeCheckedAt !== null &&
          backupNoticeCheckedAt - backupNoticeAcknowledgedAt >= BACKUP_NOTICE_INTERVAL_MS
        }
        storageStatus={storageStatus}
        storageVersion={storageVersion}
        weaponInventory={weaponInventory}
      />
    </div>
  );
}

function Dashboard({
  characters,
  catalog,
  weaponInventory,
  assignmentCounts,
  dashboardSortKey,
  dashboardViewMode,
  storageStatus,
  storageVersion,
  onAdd,
  onDashboardSortKeyChange,
  onDashboardViewModeChange,
  onExportBackup,
  onOpen,
  onInventory,
  showBackupNotice,
}: {
  characters: TrackedCharacter[];
  catalog: Catalog;
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  dashboardSortKey: DashboardSortKey;
  dashboardViewMode: DashboardViewMode;
  storageStatus: TrackerStorageStatus;
  storageVersion: number | null;
  onAdd: () => void;
  onDashboardSortKeyChange: (sortKey: DashboardSortKey) => void;
  onDashboardViewModeChange: (viewMode: DashboardViewMode) => void;
  onExportBackup: () => void;
  onOpen: (id: string) => void;
  onInventory: () => void;
  showBackupNotice: boolean;
}) {
  const [query, setQuery] = useState("");
  const [weaponFilter, setWeaponFilter] = useState<WeaponFilter>("all");
  const [hideComplete, setHideComplete] = useState(false);
  const sortKey = dashboardSortKey;
  const dashboardView = dashboardViewMode;
  const { catalogCharacterById, catalogWeaponById } = useMemo(
    () => buildDashboardCatalogLookups(catalog),
    [catalog],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const dashboardStats = useMemo(
    () => getDashboardStats({ characters, storageVersion, weaponInventory }),
    [characters, storageVersion, weaponInventory],
  );
  const visibleCharacters = useMemo(
    () =>
      filterDashboardCharacters({
        assignmentCounts,
        catalogCharacterById,
        catalogWeaponById,
        characters,
        hideComplete,
        query,
        weaponFilter,
        weaponInventory,
      }),
    [
      assignmentCounts,
      catalogCharacterById,
      catalogWeaponById,
      characters,
      hideComplete,
      query,
      weaponFilter,
      weaponInventory,
    ],
  );
  const groupedCharacters = useMemo(
    () => groupDashboardCharacters(visibleCharacters, sortKey),
    [sortKey, visibleCharacters],
  );

  const filtersActive = normalizedQuery || weaponFilter !== "all" || hideComplete;

  return (
    <>
      <section className="border-b border-app-border/80 bg-app-subtle">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal text-app-fg">
              Build Tracker
            </h1>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              {dashboardStats.items.map((stat) => (
                <div className="flex items-center gap-1.5" key={stat.label}>
                  <dt className="text-app-muted-dim">{stat.label}</dt>
                  <dd className="font-semibold text-app-muted" title={stat.title}>
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            {dashboardStats.hasWeaponCopies ? (
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
      </section>

      <main className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-5 sm:px-6 lg:px-8">
        <StorageStatusNotice storageStatus={storageStatus} />

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
              {dashboardStats.hasWeaponCopies
                ? "Add a character, assign a weapon, and track the build from one row."
                : "Add owned weapons first so characters can be assigned real inventory copies."}
            </p>
            <div className="mt-5">
              {dashboardStats.hasWeaponCopies ? (
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
              <div className="grid flex-1 gap-2 sm:flex-none sm:grid-cols-2">
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
                  onChange={onDashboardSortKeyChange}
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
                    onClick={() => onDashboardViewModeChange(viewMode)}
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
                        group.summary.count,
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
                        catalogCharacterById={catalogCharacterById}
                        catalogWeaponById={catalogWeaponById}
                        character={character}
                        key={character.id}
                        onOpen={onOpen}
                        weaponInventory={weaponInventory}
                      />
                    ) : (
                      <DashboardListCard
                        assignmentCounts={assignmentCounts}
                        catalogCharacterById={catalogCharacterById}
                        catalogWeaponById={catalogWeaponById}
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
  catalogCharacterById: Map<number, ApiCharacter>;
  catalogWeaponById: Map<number, ApiWeapon>;
  onOpen: (id: string) => void;
};

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
  catalogCharacterById,
  catalogWeaponById,
  character,
  onOpen,
  weaponInventory,
}: DashboardCharacterCardProps) {
  const {
    catalogCharacter,
    characterToneClasses,
    characterDisplay,
    checklistCount,
    complete,
    echoTrackerEnabled,
    effectiveChecklist,
    erBelowTarget,
    ratings,
    weaponDisplay,
    weaponStatus,
    weaponToneClasses,
  } = getDashboardCharacterCardState({
    assignmentCounts,
    catalogCharacterById,
    catalogWeaponById,
    character,
    weaponInventory,
  });
  const characterMeta =
    [characterDisplay.elementName, characterDisplay.weaponTypeName]
      .filter(Boolean)
      .join(" / ") || "Catalog data unavailable";

  return (
    <button
      className={`grid gap-3 rounded-md border px-3 py-2.5 text-left transition-colors hover:border-app-muted-dim hover:bg-app-raised lg:grid-cols-[minmax(180px,0.65fr)_minmax(250px,1fr)_minmax(210px,0.85fr)] ${
        characterToneClasses.card
      }`}
      onClick={() => onOpen(character.id)}
      type="button"
    >
      <div className="flex min-w-0 gap-3">
        <CharacterAvatar character={character} catalogCharacter={catalogCharacter} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate text-sm font-semibold text-app-fg">
              {characterDisplay.name}
            </h2>
            <span
              className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${characterToneClasses.status}`}
            >
              {complete ? "Done" : "In progress"}
            </span>
            {echoTrackerEnabled ? <EchoTrackerBadge /> : null}
          </div>
          <p className="mt-0.5 text-[11px] text-app-muted-subtle">
            {characterMeta}
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
          <div className="grid grid-cols-1 gap-1.5">
            <RatingBlock label="Build" value={ratings.buildScore} />
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
                weaponDisplay.name
                  ? `${weaponToneClasses.badge}`
                  : "bg-app-raised text-app-muted-subtle"
              }`}
            >
              {weaponDisplay.name || "Not selected"}
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
  catalogCharacterById,
  catalogWeaponById,
  character,
  onOpen,
  weaponInventory,
}: DashboardCharacterCardProps) {
  const {
    catalogCharacter,
    characterToneClasses,
    characterDisplay,
    checklistCount,
    complete,
    echoTrackerEnabled,
    effectiveChecklist,
    erBelowTarget,
    ratings,
    weaponDisplay,
    weaponStatus,
    weaponToneClasses,
  } = getDashboardCharacterCardState({
    assignmentCounts,
    catalogCharacterById,
    catalogWeaponById,
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
        <CharacterAvatar character={character} catalogCharacter={catalogCharacter} dense />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-1.5">
            <h2 className="min-w-0 truncate text-sm font-semibold text-app-fg">
              {characterDisplay.name}
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
        <RatingBlock label="Build" value={ratings.buildScore} />
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
            weaponDisplay.name
              ? `${weaponToneClasses.badge}`
              : "bg-app-raised text-app-muted-subtle"
          }`}
        >
          {weaponDisplay.name || "No weapon"}
        </span>
        <WeaponStatusBadge status={weaponStatus} />
      </div>
    </button>
  );
}

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

function WelcomeScreen({ onStart }: { onStart: () => void }) {
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
