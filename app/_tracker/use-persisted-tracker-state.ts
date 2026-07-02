"use client";

import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_TRACKER_PREFERENCES,
  commitStorageMigration,
  createTrackerDocumentV4,
  inspectTrackerStorage,
  writeStoredTrackerDocument,
  type ParsedImportedTrackerData,
  type StorageMigrationPlan,
  type TrackerDocumentV4,
  type TrackerPreferences,
  type TrackerStorageStatus,
} from "./storage";
import type {
  DashboardSortKey,
  DashboardViewMode,
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "./types";

function getDocumentDataSignature(document: TrackerDocumentV4) {
  return JSON.stringify(document.data);
}

export function usePersistedTrackerState() {
  const [characters, setCharacters] = useState<TrackedCharacter[]>([]);
  const [weaponInventory, setWeaponInventory] = useState<WeaponInventoryItem[]>([]);
  const [matrixTeams, setMatrixTeams] = useState<MatrixTeam[]>([]);
  const [welcomeSeen, setWelcomeSeen] = useState(
    DEFAULT_TRACKER_PREFERENCES.welcomeSeen,
  );
  const [dashboardSortKey, setDashboardSortKey] = useState<DashboardSortKey>(
    DEFAULT_TRACKER_PREFERENCES.dashboardSortKey,
  );
  const [dashboardViewMode, setDashboardViewMode] = useState<DashboardViewMode>(
    DEFAULT_TRACKER_PREFERENCES.dashboardViewMode,
  );
  const [backupNoticeAcknowledgedAt, setBackupNoticeAcknowledgedAt] = useState(
    DEFAULT_TRACKER_PREFERENCES.backupNoticeAcknowledgedAt,
  );
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageStatus, setStorageStatus] = useState<TrackerStorageStatus>({
    state: "ready",
    message: "Tracker storage has not loaded yet.",
  });
  const [storageMigrationPlan, setStorageMigrationPlan] =
    useState<StorageMigrationPlan | null>(null);
  const [storageVersion, setStorageVersion] = useState<number | null>(null);
  const storageLoadedRef = useRef(false);
  const storageWritableRef = useRef(false);
  const revisionRef = useRef(0);
  const lastPersistedDataSignatureRef = useRef("");

  function applyDocumentToState(document: TrackerDocumentV4, writable: boolean) {
    const { data } = document;

    revisionRef.current = document.revision;
    storageWritableRef.current = writable;
    lastPersistedDataSignatureRef.current = getDocumentDataSignature(document);
    setStorageVersion(document.schemaVersion);
    setCharacters(data.characters);
    setWeaponInventory(data.weaponInventory);
    setMatrixTeams(data.matrixTeams);
    setWelcomeSeen(data.preferences.welcomeSeen);
    setDashboardSortKey(data.preferences.dashboardSortKey);
    setDashboardViewMode(data.preferences.dashboardViewMode);
    setBackupNoticeAcknowledgedAt(data.preferences.backupNoticeAcknowledgedAt);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const result = inspectTrackerStorage();
      const { document } = result;

      setStorageStatus(result.status);

      if (result.state === "migration-required") {
        setStorageMigrationPlan(result.migrationPlan);
        storageWritableRef.current = false;
        storageLoadedRef.current = true;
        setStorageLoaded(true);
        return;
      }

      if (document) {
        setStorageMigrationPlan(null);
        applyDocumentToState(document, true);
      } else if (result.state === "ready") {
        setStorageMigrationPlan(null);
        applyDocumentToState(
          createTrackerDocumentV4({
            characters: [],
            weaponInventory: [],
            matrixTeams: [],
            preferences: DEFAULT_TRACKER_PREFERENCES,
          }),
          true,
        );
      } else {
        storageWritableRef.current = false;
      }

      storageLoadedRef.current = true;
      setStorageLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!storageLoadedRef.current || !storageWritableRef.current) {
      return;
    }

    const nextDocument = createTrackerDocumentV4({
      characters,
      weaponInventory,
      matrixTeams,
      preferences: {
        welcomeSeen,
        dashboardSortKey,
        dashboardViewMode,
        backupNoticeAcknowledgedAt,
      },
      revision: revisionRef.current + 1,
    });
    const nextSignature = getDocumentDataSignature(nextDocument);

    if (nextSignature === lastPersistedDataSignatureRef.current) {
      return;
    }

    try {
      writeStoredTrackerDocument(nextDocument);
      revisionRef.current = nextDocument.revision;
      lastPersistedDataSignatureRef.current = nextSignature;
    } catch {
      storageWritableRef.current = false;
      window.setTimeout(() => {
        setStorageStatus({
          state: "error",
          message: "Tracker storage could not be saved in this browser.",
        });
      }, 0);
    }
  }, [
    backupNoticeAcknowledgedAt,
    characters,
    dashboardSortKey,
    dashboardViewMode,
    matrixTeams,
    welcomeSeen,
    weaponInventory,
  ]);

  function replaceTrackerData(imported: ParsedImportedTrackerData) {
    const preferences: TrackerPreferences = imported.preferences ?? {
      welcomeSeen,
      dashboardSortKey,
      dashboardViewMode,
      backupNoticeAcknowledgedAt,
    };
    const nextDocument = createTrackerDocumentV4({
      characters: imported.characters,
      weaponInventory: imported.weaponInventory,
      matrixTeams: imported.matrixTeams,
      preferences,
      revision: revisionRef.current + 1,
    });

    writeStoredTrackerDocument(nextDocument);

    revisionRef.current = nextDocument.revision;
    storageWritableRef.current = true;
    lastPersistedDataSignatureRef.current = getDocumentDataSignature(nextDocument);
    setCharacters(nextDocument.data.characters);
    setWeaponInventory(nextDocument.data.weaponInventory);
    setMatrixTeams(nextDocument.data.matrixTeams);
    setWelcomeSeen(nextDocument.data.preferences.welcomeSeen);
    setDashboardSortKey(nextDocument.data.preferences.dashboardSortKey);
    setDashboardViewMode(nextDocument.data.preferences.dashboardViewMode);
    setBackupNoticeAcknowledgedAt(
      nextDocument.data.preferences.backupNoticeAcknowledgedAt,
    );
    setStorageStatus({
      state: "ready",
      message: "Tracker document saved.",
    });
    setStorageVersion(nextDocument.schemaVersion);
    setStorageMigrationPlan(null);
  }

  function commitPendingStorageMigration() {
    if (!storageMigrationPlan) {
      return;
    }

    try {
      const document = commitStorageMigration(storageMigrationPlan);

      setStorageMigrationPlan(null);
      applyDocumentToState(document, true);
      setStorageStatus({
        state: "ready",
        message: `Tracker storage migrated to v${document.schemaVersion}.`,
      });
    } catch {
      storageWritableRef.current = false;
      setStorageStatus({
        state: "error",
        message: "Tracker storage migration could not be completed.",
      });
      throw new Error("Tracker storage migration could not be completed.");
    }
  }

  return {
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
}
