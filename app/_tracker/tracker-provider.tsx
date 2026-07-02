"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
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
  TrackerStorageStatus,
} from "./storage";
import { exportStorageMigrationBackup } from "./storage";
import { StorageMigrationScreen } from "./screens/storage-migration";
import { useCatalog } from "./use-catalog";
import { usePersistedTrackerState } from "./use-persisted-tracker-state";

type TrackerContextValue = {
  catalog: Catalog;
  characters: TrackedCharacter[];
  setCharacters: Dispatch<SetStateAction<TrackedCharacter[]>>;
  weaponInventory: WeaponInventoryItem[];
  setWeaponInventory: Dispatch<SetStateAction<WeaponInventoryItem[]>>;
  matrixTeams: MatrixTeam[];
  setMatrixTeams: Dispatch<SetStateAction<MatrixTeam[]>>;
  welcomeSeen: boolean;
  setWelcomeSeen: Dispatch<SetStateAction<boolean>>;
  dashboardSortKey: DashboardSortKey;
  setDashboardSortKey: Dispatch<SetStateAction<DashboardSortKey>>;
  dashboardViewMode: DashboardViewMode;
  setDashboardViewMode: Dispatch<SetStateAction<DashboardViewMode>>;
  backupNoticeAcknowledgedAt: number;
  setBackupNoticeAcknowledgedAt: Dispatch<SetStateAction<number>>;
  replaceTrackerData: (data: ParsedImportedTrackerData) => void;
  storageLoaded: boolean;
  storageStatus: TrackerStorageStatus;
  storageMigrationPlan: StorageMigrationPlan | null;
  storageVersion: number | null;
  commitPendingStorageMigration: () => void;
};

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: ReactNode }) {
  const catalog = useCatalog();
  const [migrationRunning, setMigrationRunning] = useState(false);
  const {
    characters,
    setCharacters,
    weaponInventory,
    setWeaponInventory,
    matrixTeams,
    setMatrixTeams,
    welcomeSeen,
    setWelcomeSeen,
    dashboardSortKey,
    setDashboardSortKey,
    dashboardViewMode,
    setDashboardViewMode,
    backupNoticeAcknowledgedAt,
    setBackupNoticeAcknowledgedAt,
    replaceTrackerData,
    storageLoaded,
    storageStatus,
    storageMigrationPlan,
    storageVersion,
    commitPendingStorageMigration,
  } = usePersistedTrackerState();
  const value: TrackerContextValue = {
    catalog,
    characters,
    setCharacters,
    weaponInventory,
    setWeaponInventory,
    matrixTeams,
    setMatrixTeams,
    welcomeSeen,
    setWelcomeSeen,
    dashboardSortKey,
    setDashboardSortKey,
    dashboardViewMode,
    setDashboardViewMode,
    backupNoticeAcknowledgedAt,
    setBackupNoticeAcknowledgedAt,
    replaceTrackerData,
    storageLoaded,
    storageStatus,
    storageMigrationPlan,
    storageVersion,
    commitPendingStorageMigration,
  };

  if (!storageLoaded) {
    return (
      <TrackerContext.Provider value={value}>
        <div className="min-h-screen bg-app-bg text-app-fg" />
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
