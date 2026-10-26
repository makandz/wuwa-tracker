"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BACKUP_NOTICE_FIRST_VISIT_DELAY_MS,
  BACKUP_NOTICE_INTERVAL_MS,
} from "@/features/tracker/constants";
import { ER_STATUS_CLASSES, getAssignmentCounts } from "@/features/tracker/domain";
import {
  buildDashboardCatalogLookups,
  getDashboardCharacters,
  getDashboardCharacterCardState,
  getDashboardStats,
} from "@/features/tracker/domain/dashboard-selectors";
import { exportTrackerData, type TrackerStorageStatus } from "@/features/tracker/storage";
import { StorageStatusNotice } from "@/features/tracker/components/storage-status-notice";
import {
  CharacterAvatar,
  RatingBlock,
  SearchInput,
  TextButton,
  WeaponStatusBadge,
} from "@/features/tracker/components/ui";
import { getCharacterHref, hasTrackerData } from "@/features/tracker/route-helpers";
import { useTrackerData } from "@/features/tracker/tracker-provider";
import type {
  ApiCharacter,
  ApiWeapon,
  Catalog,
  TrackedCharacter,
  WeaponInventoryItem,
} from "@/features/tracker/types";

/**
 * Renders the release-ordered tracker dashboard after local data loads.
 * @returns The dashboard or first-visit screen.
 */
export default function Home() {
  const router = useRouter();
  const {
    catalog,
    characters,
    backupNoticeAcknowledgedAt,
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

  /** Exports the current data and acknowledges the backup reminder. */
  function exportBackupFromNotice() {
    const acknowledgedAt = Date.now();

    exportTrackerData(characters, weaponInventory, matrixTeams, {
      welcomeSeen,
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
        onAdd={() => router.push("/add")}
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

/** Renders a single searchable character grid. */
function Dashboard({
  characters,
  catalog,
  weaponInventory,
  assignmentCounts,
  storageStatus,
  storageVersion,
  onAdd,
  onExportBackup,
  onOpen,
  onInventory,
  showBackupNotice,
}: {
  characters: TrackedCharacter[];
  catalog: Catalog;
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  storageStatus: TrackerStorageStatus;
  storageVersion: number | null;
  onAdd: () => void;
  onExportBackup: () => void;
  onOpen: (id: string) => void;
  onInventory: () => void;
  showBackupNotice: boolean;
}) {
  const [query, setQuery] = useState("");
  const { catalogCharacterById, catalogWeaponById } = useMemo(
    () => buildDashboardCatalogLookups(catalog),
    [catalog],
  );
  const dashboardStats = useMemo(
    () => getDashboardStats({ characters, storageVersion, weaponInventory }),
    [characters, storageVersion, weaponInventory],
  );
  const visibleCharacters = useMemo(
    () => getDashboardCharacters(characters, catalogCharacterById, query),
    [characters, catalogCharacterById, query],
  );

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
                <div
                  className="flex items-center gap-1.5"
                  key={stat.label}
                >
                  <dt className="text-app-muted-dim">{stat.label}</dt>
                  <dd
                    className="font-semibold text-app-muted"
                    title={stat.title}
                  >
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            {dashboardStats.hasWeaponCopies ? (
              <TextButton
                onClick={onAdd}
                variant="primary"
              >
                Add Character
              </TextButton>
            ) : (
              <TextButton
                onClick={onInventory}
                variant="primary"
              >
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
                ? "Add a character, assign a weapon, and track its echo sets."
                : "Add owned weapons first so characters can be assigned real inventory copies."}
            </p>
            <div className="mt-5">
              {dashboardStats.hasWeaponCopies ? (
                <TextButton
                  onClick={onAdd}
                  variant="primary"
                >
                  Add Character
                </TextButton>
              ) : (
                <TextButton
                  onClick={onInventory}
                  variant="primary"
                >
                  Add Weapons First
                </TextButton>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5">
            <SearchInput
              ariaLabel="Search characters"
              compact
              onChange={setQuery}
              placeholder="Search characters"
              value={query}
            />

            {visibleCharacters.length === 0 ? (
              <div className="rounded-md border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted-subtle">
                No characters match those filters.
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleCharacters.map((character) => (
                <DashboardGridCard
                  assignmentCounts={assignmentCounts}
                  catalogCharacterById={catalogCharacterById}
                  catalogWeaponById={catalogWeaponById}
                  character={character}
                  key={character.id}
                  onOpen={onOpen}
                  weaponInventory={weaponInventory}
                />
              ))}
            </div>
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

/** Displays up to three independent build summaries within one character card. */
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
    characterDisplay,
    complete,
    sets,
    weaponDisplay,
    weaponStatus,
    weaponToneClasses,
  } = getDashboardCharacterCardState({
    assignmentCounts, catalogCharacterById, catalogWeaponById, character, weaponInventory,
  });

  return (
    <button
      className="grid content-start gap-2 rounded-md border border-app-border/80 bg-app-surface px-2.5 py-2.5 text-left transition-colors hover:border-app-muted-dim hover:bg-app-raised"
      onClick={() => onOpen(character.id)}
      type="button"
    >
      <div className="flex min-w-0 items-start gap-2">
        <CharacterAvatar
          character={character}
          catalogCharacter={catalogCharacter}
          dense
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-app-fg">{characterDisplay.name}</h2>
          <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-app-muted-subtle">
            <span>{complete ? "Done" : "In progress"}</span>
            <span className={character.skillsDone ? "text-status-good-text" : ""}>
              Skills {character.skillsDone ? "done" : "pending"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {sets.map((set) => (
          <div
            className="min-w-0"
            key={set.id}
          >
            <div
              className="mb-1 truncate text-[10px] font-semibold text-app-muted"
              title={set.name}
            >
              {set.name}
            </div>
            {set.mode === "detailed" ? (
              <RatingBlock
                label="Build"
                value={set.score}
                compact
              />
            ) : (
              <div className="rounded-md border border-app-border/80 bg-app-surface p-1.5">
                <div className="text-[10px] text-app-muted-subtle">Checklist</div>
                <div className="mt-0.5 text-sm font-bold text-app-fg">{set.completedEchoes}/5</div>
              </div>
            )}
            <div className={`mt-1 text-[10px] font-semibold ${ER_STATUS_CLASSES[set.erStatus]}`}>
              {set.actualEr === null ? "— ER" : `${set.actualEr}% ER`}
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2 border-t border-app-border/70 pt-2 text-[10px] font-semibold">
        <span
          className={`min-w-0 truncate rounded-sm px-1.5 py-0.5 ${weaponToneClasses.badge}`}
          title={weaponDisplay.name}
        >
          {weaponDisplay.name || "No weapon"}
        </span>
        <span className="shrink-0 text-app-muted-subtle">
          Target ER: {character.expectedEr ? `${character.expectedEr}%` : "—"}
        </span>
      </div>
      <WeaponStatusBadge status={weaponStatus} />
    </button>
  );
}

const workflowSteps = [
  {
    title: "Add your characters",
    description: "Pick the characters you are building and assign their weapon.",
  },
  {
    title: "Track what is done",
    description: "Mark skills and echo slots as finished when they reach your target.",
  },
  {
    title: "Compare builds",
    description: "Track up to three echo sets per character with independent scores.",
  },
  {
    title: "Plan endgame teams",
    description: "Use your tracked roster to build Matrix teams and spot shared weapon conflicts.",
  },
];

/** Introduces the tracker before the first visit. */
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
              <div
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3"
                key={step.title}
              >
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
          <TextButton
            onClick={onStart}
            variant="primary"
          >
            Start Tracking
          </TextButton>
        </div>
      </section>
    </main>
  );
}
