"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  type ParsedImportedTrackerData,
  type TrackerPreferences,
  type TrackerStorageStatus,
} from "./storage";
import { StorageStatusNotice } from "./components/storage-status-notice";
import { TextButton } from "./components/ui";
import { useCatalog } from "./use-catalog";
import { usePersistedTrackerState } from "./use-persisted-tracker-state";
import type {
  Catalog,
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
  storageVersion: number | null;
  reloadStoredTrackerData: () => void;
};

const TrackerContext = createContext<TrackerContextValue | null>(null);

/**
 * Provides tracker data after storage loading and handles stale tabs.
 * @param props - The tracker content to render.
 * @returns The tracker provider and its current content.
 */
export function TrackerProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const catalog = useCatalog();
  const {
    characters,
    weaponInventory,
    matrixTeams,
    welcomeSeen,
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
    storageVersion,
    reloadStoredTrackerData,
  } = usePersistedTrackerState();
  const value: TrackerContextValue = {
    catalog,
    characters,
    weaponInventory,
    matrixTeams,
    welcomeSeen,
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
    storageVersion,
    reloadStoredTrackerData,
  };

  if (!storageLoaded) {
    return (
      <TrackerContext.Provider value={value}>
        <div className="min-h-screen bg-app-bg text-app-fg" />
      </TrackerContext.Provider>
    );
  }

  if (storageStatus.state === "error" && storageVersion === null && pathname !== "/settings") {
    return (
      <TrackerContext.Provider value={value}>
        <div className="min-h-screen bg-app-bg text-app-fg">
          <main className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-6 sm:px-6 lg:px-8">
            <StorageStatusNotice storageStatus={storageStatus} />
            <div className="flex flex-wrap gap-2">
              <TextButton onClick={reloadStoredTrackerData} variant="primary">
                Retry Loading
              </TextButton>
              <TextButton onClick={() => router.push("/settings")}>
                Open Settings
              </TextButton>
            </div>
          </main>
        </div>
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

  return (
    <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
  );
}

/**
 * Reads the tracker context.
 * @returns The tracker data and editing actions.
 */
export function useTrackerData() {
  const value = useContext(TrackerContext);

  if (!value) {
    throw new Error("useTrackerData must be used within TrackerProvider.");
  }

  return value;
}

/** Prompts an outdated tab to load the latest saved data. */
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
