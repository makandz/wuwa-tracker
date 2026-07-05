"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import {
  exportStorageMigrationBackup,
  type ParsedImportedTrackerData,
  type StorageMigrationPlan,
  type TrackerPreferences,
  type TrackerStorageStatus,
} from "./storage";
import { TextButton } from "./components/ui";
import { useCatalog } from "./use-catalog";
import { usePersistedTrackerState } from "./use-persisted-tracker-state";
import type {
  Catalog,
  DashboardSortKey,
  DashboardViewMode,
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "./types";

type TrackerContextValue = {
  catalog: Catalog;
  characters: TrackedCharacter[];
  weaponInventory: WeaponInventoryItem[];
  matrixTeams: MatrixTeam[];
  welcomeSeen: boolean;
  dashboardSortKey: DashboardSortKey;
  dashboardViewMode: DashboardViewMode;
  backupNoticeAcknowledgedAt: number;
  createCharacter: (character: TrackedCharacter) => void;
  updateCharacter: (character: TrackedCharacter) => void;
  deleteCharacter: (id: string) => void;
  setWeaponCount: (weaponId: number, count: number) => void;
  replaceAllData: (data: ParsedImportedTrackerData) => void;
  clearTrackerData: () => void;
  updateMatrixTeams: (teams: MatrixTeam[]) => void;
  updatePreferences: (preferences: Partial<TrackerPreferences>) => void;
  storageLoaded: boolean;
  storageStatus: TrackerStorageStatus;
  storageMigrationPlan: StorageMigrationPlan | null;
  storageVersion: number | null;
  commitPendingStorageMigration: () => void;
  reloadStoredTrackerData: () => void;
};

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: ReactNode }) {
  const catalog = useCatalog();
  const [migrationRunning, setMigrationRunning] = useState(false);
  const {
    characters,
    weaponInventory,
    matrixTeams,
    welcomeSeen,
    dashboardSortKey,
    dashboardViewMode,
    backupNoticeAcknowledgedAt,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    setWeaponCount,
    replaceAllData,
    clearTrackerData,
    updateMatrixTeams,
    updatePreferences,
    storageLoaded,
    storageStatus,
    storageMigrationPlan,
    storageVersion,
    commitPendingStorageMigration,
    reloadStoredTrackerData,
  } = usePersistedTrackerState();
  const value: TrackerContextValue = {
    catalog,
    characters,
    weaponInventory,
    matrixTeams,
    welcomeSeen,
    dashboardSortKey,
    dashboardViewMode,
    backupNoticeAcknowledgedAt,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    setWeaponCount,
    replaceAllData,
    clearTrackerData,
    updateMatrixTeams,
    updatePreferences,
    storageLoaded,
    storageStatus,
    storageMigrationPlan,
    storageVersion,
    commitPendingStorageMigration,
    reloadStoredTrackerData,
  };

  if (!storageLoaded) {
    return (
      <TrackerContext.Provider value={value}>
        <div className="min-h-screen bg-app-bg text-app-fg" />
      </TrackerContext.Provider>
    );
  }

  if (storageStatus.state === "stale") {
    return (
      <TrackerContext.Provider value={value}>
        <StorageConflictScreen onReload={reloadStoredTrackerData} />
      </TrackerContext.Provider>
    );
  }

  if (storageMigrationPlan) {
    return (
      <TrackerContext.Provider value={value}>
        <div className="min-h-screen bg-app-bg text-app-fg">
          <StorageMigrationScreen
            isMigrating={migrationRunning}
            onExportBackup={() => exportStorageMigrationBackup(storageMigrationPlan)}
            onMigrate={() => {
              setMigrationRunning(true);

              try {
                commitPendingStorageMigration();
              } catch {
                alert("Tracker storage could not be migrated.");
              } finally {
                setMigrationRunning(false);
              }
            }}
            plan={storageMigrationPlan}
          />
        </div>
      </TrackerContext.Provider>
    );
  }

  return (
    <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
  );
}

export function useTrackerData() {
  const value = useContext(TrackerContext);

  if (!value) {
    throw new Error("useTrackerData must be used within TrackerProvider.");
  }

  return value;
}

function StorageConflictScreen({ onReload }: { onReload: () => void }) {
  return (
    <div className="min-h-screen bg-app-bg text-app-fg">
      <main className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-md border border-status-warn-border/80 bg-status-warn-bg/35 px-4 py-4 text-status-warn-text">
          <h1 className="text-base font-semibold">Data changed in another tab</h1>
          <p className="mt-2 text-sm leading-6">
            This tab has older tracker data. Reload the latest local data before
            making more edits.
          </p>
          <div className="mt-4">
            <TextButton onClick={onReload} variant="primary">
              Reload Data
            </TextButton>
          </div>
        </section>
      </main>
    </div>
  );
}

function formatVersion(version: StorageMigrationPlan["source"]["version"]) {
  if (version === "legacy-v3") {
    return "old format";
  }

  return typeof version === "number" ? `v${version}` : version;
}

function StorageMigrationScreen({
  plan,
  isMigrating,
  onExportBackup,
  onMigrate,
}: {
  plan: StorageMigrationPlan;
  isMigrating: boolean;
  onExportBackup: () => void;
  onMigrate: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-full w-full max-w-4xl content-start gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-b border-app-border/80 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-app-fg">
            Update saved data
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted-subtle">
            Your tracker data was saved by an older version of the app. Update it
            once to keep using this data on this browser.
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <dt className="text-app-muted-dim">Saved data</dt>
              <dd className="font-semibold text-app-muted">
                {plan.source.label} ({formatVersion(plan.source.version)})
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="text-app-muted-dim">New format</dt>
              <dd className="font-semibold text-app-muted">{plan.targetLabel}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="grid gap-3 rounded-md border border-app-border/80 bg-app-surface p-4">
        <h2 className="text-base font-semibold text-app-fg">
          Found in this browser
        </h2>
        <dl className="grid gap-2 sm:grid-cols-3">
          {plan.source.preview.counts.map((count) => (
            <div
              className="rounded-md border border-app-border/80 bg-app-bg p-3"
              key={count.label}
            >
              <dt className="text-xs font-medium text-app-muted-subtle">
                {count.label}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-app-fg">
                {count.value}
              </dd>
            </div>
          ))}
        </dl>
        {plan.source.preview.items.length > 0 ? (
          <div className="text-sm leading-6 text-app-muted-subtle">
            Characters found: {plan.source.preview.items.join(", ")}
          </div>
        ) : (
          <div className="text-sm leading-6 text-app-muted-subtle">
            No character names were found in the saved data.
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-md border border-app-border/80 bg-app-surface p-4">
        <h2 className="text-base font-semibold text-app-fg">What will happen</h2>
        <ol className="grid gap-2">
          {plan.steps.map((step, index) => (
            <li
              className="rounded-md border border-app-border/80 bg-app-bg p-3"
              key={step.id}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-xs font-semibold text-app-muted-dim">
                  {index + 1}
                </span>
                <h3 className="text-sm font-semibold text-app-fg">
                  {step.title}
                </h3>
                <span className="text-xs font-medium text-app-muted-dim">
                  {formatVersion(step.fromVersion)} to {formatVersion(step.toVersion)}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-app-muted-subtle">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-md border border-status-warn-border/80 bg-status-warn-bg/30 px-4 py-3 text-sm leading-6 text-status-warn-text">
        The old saved data stays in place. The app will write a new current save
        and open your tracker after the update finishes.
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-app-border/80 pt-4 sm:flex-row sm:justify-end">
        <TextButton disabled={isMigrating} onClick={onExportBackup}>
          Download Backup
        </TextButton>
        <TextButton disabled={isMigrating} onClick={onMigrate} variant="primary">
          {isMigrating ? "Updating..." : "Update Data"}
        </TextButton>
      </div>
      <p className="text-right text-xs leading-5 text-app-muted-dim">
        Downloading a backup is optional, but recommended before updating saved data.
      </p>
    </main>
  );
}
