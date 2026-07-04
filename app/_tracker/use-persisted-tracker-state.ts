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

type TrackerData = TrackerDocumentV4["data"];

function getDocumentDataSignature(document: TrackerDocumentV4) {
  return JSON.stringify(document.data);
}

function getTrackerDataSignature(data: TrackerData) {
  return JSON.stringify(data);
}

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
  const normalizedDocument = createTrackerDocumentV4({
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

  return createTrackerDocumentV4({
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

  function applyDocumentToState(document: TrackerDocumentV4, writable: boolean) {
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

    const nextDocument = createInvariantTrackerDocument({
      ...nextData,
      revision: revisionRef.current + 1,
    });

    if (
      getDocumentDataSignature(nextDocument) ===
      getTrackerDataSignature(trackerDataRef.current)
    ) {
      return false;
    }

    try {
      writeStoredTrackerDocument(nextDocument);
      revisionRef.current = nextDocument.revision;
      storageWritableRef.current = true;
      applyDataToState(nextDocument.data);
      setStorageStatus({
        state: "ready",
        message: statusMessage,
      });
      setStorageVersion(nextDocument.schemaVersion);
      setStorageMigrationPlan(null);

      return true;
    } catch {
      setStorageSaveError();
      throw new Error("Tracker storage could not be saved.");
    }
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

      setStorageLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // Storage inspection must only run once when the client provider mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function createCharacter(character: TrackedCharacter) {
    const currentData = trackerDataRef.current;
    const now = new Date().toISOString();
    const nextCharacter = {
      ...character,
      createdAt: character.createdAt || now,
      updatedAt: now,
    };

    if (currentData.characters.some((item) => item.id === nextCharacter.id)) {
      return;
    }

    commitTrackerData({
      ...currentData,
      characters: [...currentData.characters, nextCharacter],
    });
  }

  function updateCharacter(character: TrackedCharacter) {
    const currentData = trackerDataRef.current;

    if (!currentData.characters.some((item) => item.id === character.id)) {
      return;
    }

    commitTrackerData({
      ...currentData,
      characters: currentData.characters.map((item) =>
        item.id === character.id
          ? {
              ...character,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    });
  }

  function deleteCharacter(id: string) {
    const currentData = trackerDataRef.current;

    if (!currentData.characters.some((character) => character.id === id)) {
      return;
    }

    commitTrackerData({
      ...currentData,
      characters: currentData.characters.filter((character) => character.id !== id),
      matrixTeams: currentData.matrixTeams.map((team) => ({
        ...team,
        slots: team.slots.map((characterId) =>
          characterId === id ? null : characterId,
        ) as MatrixTeam["slots"],
      })),
    });
  }

  function setWeaponCount(weaponId: number, count: number) {
    const currentData = trackerDataRef.current;
    const nextCount = Math.max(0, Math.round(count));
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

    commitTrackerData({
      ...currentData,
      weaponInventory,
    });
  }

  function replaceAllData(imported: ParsedImportedTrackerData) {
    const currentData = trackerDataRef.current;

    commitTrackerData(
      {
        characters: imported.characters,
        weaponInventory: imported.weaponInventory,
        matrixTeams: imported.matrixTeams,
        preferences: imported.preferences ?? currentData.preferences,
      },
      {
        forceWritable: true,
      },
    );
  }

  function clearTrackerData() {
    commitTrackerData(
      {
        characters: [],
        weaponInventory: [],
        matrixTeams: [],
        preferences: trackerDataRef.current.preferences,
      },
      {
        forceWritable: true,
      },
    );
  }

  function updateMatrixTeams(matrixTeams: MatrixTeam[]) {
    commitTrackerData({
      ...trackerDataRef.current,
      matrixTeams,
    });
  }

  function updatePreferences(preferences: Partial<TrackerPreferences>) {
    const currentData = trackerDataRef.current;

    commitTrackerData({
      ...currentData,
      preferences: {
        ...currentData.preferences,
        ...preferences,
      },
    });
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
  };
}
