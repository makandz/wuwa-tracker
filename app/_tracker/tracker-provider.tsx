"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type {
  Catalog,
  DashboardSortKey,
  DashboardViewMode,
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "./types";
import type {
  ParsedImportedTrackerData,
  StorageMigrationPlan,
  TrackerPreferences,
  TrackerStorageStatus,
} from "./storage";
import { exportStorageMigrationBackup } from "./storage";
import { TextButton } from "./components/ui";
import { StorageMigrationScreen } from "./screens/storage-migration";
import { useCatalog } from "./use-catalog";
import { usePersistedTrackerState } from "./use-persisted-tracker-state";

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
