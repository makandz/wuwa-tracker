"use client";

import {
  createContext,
  useContext,
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

  return (
    <TrackerContext.Provider
      value={{
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
      }}
    >
      {children}
    </TrackerContext.Provider>
  );
}

export function useTrackerData() {
  const value = useContext(TrackerContext);

  if (!value) {
    throw new Error("useTrackerData must be used within TrackerProvider.");
  }

  return value;
}
