"use client";

import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_TRACKER_PREFERENCES,
  TrackerStorageRevisionConflictError,
  commitStorageMigration,
  createTrackerDocumentV5,
  inspectTrackerStorage,
  normalizeTrackerDocumentV5,
  readStoredTrackerDocument,
  writeStoredTrackerDocumentWithRevisionGuard,
  type ParsedImportedTrackerData,
  type StorageMigrationPlan,
  type TrackerDocumentV5,
  type TrackerPreferences,
  type TrackerStorageStatus,
} from "./storage";
import { TRACKER_DOCUMENT_STORAGE_KEY } from "./storage/keys";
import type {
  DashboardSortKey,
  DashboardViewMode,
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "./types";

type TrackerData = TrackerDocumentV5["data"];

export function cleanMatrixTeamsForCharacters(
  matrixTeams: MatrixTeam[],
  characters: TrackedCharacter[],
) {
  const characterIds = new Set(characters.map((character) => character.id));

  return matrixTeams.map((team) => ({
    ...team,
    slots: team.slots.map((characterId) =>
      characterId && characterIds.has(characterId) ? characterId : null,
    ) as MatrixTeam["slots"],
  }));
}

function createInvariantTrackerDocument({
  characters,
  weaponInventory,
  matrixTeams,
  preferences,
  revision,
  savedAt,
}: TrackerData & {
  revision: number;
  savedAt?: string;
}) {
  const normalizedDocument = createTrackerDocumentV5({
    characters,
    weaponInventory,
    matrixTeams,
    preferences,
    revision,
    savedAt,
  });
  const cleanedMatrixTeams = cleanMatrixTeamsForCharacters(
    normalizedDocument.data.matrixTeams,
    normalizedDocument.data.characters,
  );

  return createTrackerDocumentV5({
    ...normalizedDocument.data,
    matrixTeams: cleanedMatrixTeams,
    revision: normalizedDocument.revision,
    savedAt: normalizedDocument.savedAt,
  });
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
  const storageWritableRef = useRef(false);
  const revisionRef = useRef(0);
  const trackerDataRef = useRef<TrackerData>({
    characters: [],
    weaponInventory: [],
    matrixTeams: [],
    preferences: DEFAULT_TRACKER_PREFERENCES,
  });

  function applyDataToState(data: TrackerData) {
    trackerDataRef.current = data;
    setCharacters(data.characters);
    setWeaponInventory(data.weaponInventory);
    setMatrixTeams(data.matrixTeams);
    setWelcomeSeen(data.preferences.welcomeSeen);
    setDashboardSortKey(data.preferences.dashboardSortKey);
    setDashboardViewMode(data.preferences.dashboardViewMode);
    setBackupNoticeAcknowledgedAt(data.preferences.backupNoticeAcknowledgedAt);
  }

  function applyDocumentToState(document: TrackerDocumentV5, writable: boolean) {
    const normalizedDocument = createInvariantTrackerDocument({
      ...document.data,
      revision: document.revision,
      savedAt: document.savedAt,
    });

    revisionRef.current = normalizedDocument.revision;
    storageWritableRef.current = writable;
    setStorageVersion(normalizedDocument.schemaVersion);
    applyDataToState(normalizedDocument.data);
  }

  function setStorageSaveError() {
    storageWritableRef.current = false;
    setStorageStatus({
      state: "error",
      message: "Tracker storage could not be saved in this browser.",
    });
  }

  function setStorageStale() {
    storageWritableRef.current = false;
    setStorageStatus({
      state: "stale",
      message: "Data changed in another tab. Reload data before making more edits.",
    });
  }

  function setStorageReadError(message: string) {
    storageWritableRef.current = false;
    setStorageStatus({
      state: "error",
      message,
    });
  }

  function parseStorageEventDocument(raw: string | null) {
    if (!raw) {
      return null;
    }

    try {
      return normalizeTrackerDocumentV5(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }

  function commitTrackerData(
    nextData: TrackerData,
    {
      forceWritable = false,
      statusMessage = "Tracker document saved.",
    }: {
      forceWritable?: boolean;
      statusMessage?: string;
    } = {},
  ) {
    if (!forceWritable && !storageWritableRef.current) {
      setStorageSaveError();
      throw new Error("Tracker storage is not writable.");
    }

    const baseRevision = revisionRef.current;
    const nextDocument = createInvariantTrackerDocument({
      ...nextData,
      revision: baseRevision + 1,
    });

    if (
      JSON.stringify(nextDocument.data) === JSON.stringify(trackerDataRef.current)
    ) {
      return false;
    }

    try {
      const result = writeStoredTrackerDocumentWithRevisionGuard(
        nextDocument,
        baseRevision,
      );

      if (result.state === "stale") {
        setStorageStale();
        throw new TrackerStorageRevisionConflictError(result.currentDocument);
      }

      revisionRef.current = result.document.revision;
      storageWritableRef.current = true;
      applyDataToState(result.document.data);
      setStorageStatus({
        state: "ready",
        message: statusMessage,
      });
      setStorageVersion(result.document.schemaVersion);
      setStorageMigrationPlan(null);

      return true;
    } catch (error) {
      if (error instanceof TrackerStorageRevisionConflictError) {
        throw error;
      }

      setStorageSaveError();
      throw new Error("Tracker storage could not be saved.");
    }
  }

  function commitTrackerDataUpdate(
    getNextData: (currentData: TrackerData) => TrackerData | null,
    options?: Parameters<typeof commitTrackerData>[1],
  ) {
    const nextData = getNextData(trackerDataRef.current);

    return nextData ? commitTrackerData(nextData, options) : false;
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const result = inspectTrackerStorage();
      const { document } = result;

      setStorageStatus(result.status);

      if (result.state === "migration-required") {
        setStorageMigrationPlan(result.migrationPlan);
        storageWritableRef.current = false;
        setStorageLoaded(true);
        return;
      }

      if (document) {
        setStorageMigrationPlan(null);
        applyDocumentToState(document, true);
      } else if (result.state === "ready") {
        setStorageMigrationPlan(null);
        applyDocumentToState(
          createTrackerDocumentV5({
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

      setStorageLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // Storage inspection must only run once when the client provider mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    function handleStorageEvent(event: StorageEvent) {
      if (event.key !== TRACKER_DOCUMENT_STORAGE_KEY) {
        return;
      }

      const changedDocument = parseStorageEventDocument(event.newValue);

      if (!changedDocument) {
        setStorageReadError(
          "Tracker storage changed in another tab but could not be read.",
        );
        return;
      }

      if (changedDocument.revision > revisionRef.current) {
        setStorageStale();
      }
    }

    window.addEventListener("storage", handleStorageEvent);

    return () => window.removeEventListener("storage", handleStorageEvent);
  }, [storageLoaded]);

  function createCharacter(character: TrackedCharacter) {
    const now = new Date().toISOString();
    const nextCharacter = {
      ...character,
      createdAt: character.createdAt || now,
      updatedAt: now,
    };

    commitTrackerDataUpdate((currentData) =>
      currentData.characters.some((item) => item.id === nextCharacter.id)
        ? null
        : {
            ...currentData,
            characters: [...currentData.characters, nextCharacter],
          },
    );
  }

  function updateCharacter(character: TrackedCharacter) {
    const now = new Date().toISOString();

    commitTrackerDataUpdate((currentData) =>
      currentData.characters.some((item) => item.id === character.id)
        ? {
            ...currentData,
            characters: currentData.characters.map((item) =>
              item.id === character.id
                ? {
                    ...character,
                    updatedAt: now,
                  }
                : item,
            ),
          }
        : null,
    );
  }

  function deleteCharacter(id: string) {
    commitTrackerDataUpdate((currentData) =>
      currentData.characters.some((character) => character.id === id)
        ? {
            ...currentData,
            characters: currentData.characters.filter(
              (character) => character.id !== id,
            ),
            matrixTeams: currentData.matrixTeams.map((team) => ({
              ...team,
              slots: team.slots.map((characterId) =>
                characterId === id ? null : characterId,
              ) as MatrixTeam["slots"],
            })),
          }
        : null,
    );
  }

  function setWeaponCount(weaponId: number, count: number) {
    const nextCount = Math.max(0, Math.round(count));

    commitTrackerDataUpdate((currentData) => {
      const existing = currentData.weaponInventory.find(
        (item) => item.weaponId === weaponId,
      );
      const weaponInventory =
        nextCount === 0
          ? currentData.weaponInventory.filter((item) => item.weaponId !== weaponId)
          : existing
            ? currentData.weaponInventory.map((item) =>
                item.weaponId === weaponId ? { ...item, count: nextCount } : item,
              )
            : [...currentData.weaponInventory, { weaponId, count: nextCount }];

      return {
        ...currentData,
        weaponInventory,
      };
    });
  }

  function replaceAllData(imported: ParsedImportedTrackerData) {
    commitTrackerDataUpdate(
      (currentData) => ({
        characters: imported.characters,
        weaponInventory: imported.weaponInventory,
        matrixTeams: imported.matrixTeams,
        preferences: imported.preferences ?? currentData.preferences,
      }),
      {
        forceWritable: true,
      },
    );
  }

  function clearTrackerData() {
    commitTrackerDataUpdate(
      (currentData) => ({
        characters: [],
        weaponInventory: [],
        matrixTeams: [],
        preferences: currentData.preferences,
      }),
      {
        forceWritable: true,
      },
    );
  }

  function updateMatrixTeams(matrixTeams: MatrixTeam[]) {
    commitTrackerDataUpdate((currentData) => ({
      ...currentData,
      matrixTeams,
    }));
  }

  function updatePreferences(preferences: Partial<TrackerPreferences>) {
    commitTrackerDataUpdate((currentData) => ({
      ...currentData,
      preferences: {
        ...currentData.preferences,
        ...preferences,
      },
    }));
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
    } catch (error) {
      if (error instanceof TrackerStorageRevisionConflictError) {
        setStorageMigrationPlan(null);
        setStorageStale();
        return;
      }

      storageWritableRef.current = false;
      setStorageStatus({
        state: "error",
        message: "Tracker storage migration could not be completed.",
      });
      throw new Error("Tracker storage migration could not be completed.");
    }
  }

  function reloadStoredTrackerData() {
    const result = readStoredTrackerDocument();

    if (!result.document) {
      setStorageReadError(
        result.status.state === "error"
          ? result.status.message
          : "Tracker storage could not be reloaded from this browser.",
      );
      return;
    }

    setStorageMigrationPlan(null);
    applyDocumentToState(result.document, true);
    setStorageStatus(result.status);
  }

  return {
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
}
