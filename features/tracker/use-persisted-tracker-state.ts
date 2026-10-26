"use client";

import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_TRACKER_PREFERENCES,
  TrackerStorageRevisionConflictError,
  createTrackerDocument,
  parseTrackerDocument,
  readStoredTrackerDocument,
  writeStoredTrackerDocumentWithRevisionGuard,
  type ParsedImportedTrackerData,
  type TrackerDocument,
  type TrackerPreferences,
  type TrackerStorageStatus,
} from "./storage";
import { TRACKER_DOCUMENT_STORAGE_KEY } from "./storage/keys";
import {
  clearTrackerData as clearTrackerDataValue,
  createCharacterData,
  deleteCharacterData,
  replaceAllTrackerData,
  setWeaponCountData,
  updateCharacterData,
  updateMatrixTeamsData,
  updatePreferencesData,
} from "./tracker-data";
import type {
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "./types";

type TrackerData = TrackerDocument["data"];

/**
 * Connects validated unified storage to the tracker UI and saves user edits.
 * @returns Tracker data, storage status, and editing actions.
 */
export function usePersistedTrackerState() {
  const [characters, setCharacters] = useState<TrackedCharacter[]>([]);
  const [weaponInventory, setWeaponInventory] = useState<WeaponInventoryItem[]>([]);
  const [matrixTeams, setMatrixTeams] = useState<MatrixTeam[]>([]);
  const [welcomeSeen, setWelcomeSeen] = useState(
    DEFAULT_TRACKER_PREFERENCES.welcomeSeen,
  );
  const [backupNoticeAcknowledgedAt, setBackupNoticeAcknowledgedAt] = useState(
    DEFAULT_TRACKER_PREFERENCES.backupNoticeAcknowledgedAt,
  );
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageStatus, setStorageStatus] = useState<TrackerStorageStatus>({
    state: "ready",
    message: "Tracker storage has not loaded yet.",
  });
  const [storageVersion, setStorageVersion] = useState<number | null>(null);
  const storageWritableRef = useRef(false);
  const revisionRef = useRef(0);
  const trackerDataRef = useRef<TrackerData>({
    characters: [],
    weaponInventory: [],
    matrixTeams: [],
    preferences: DEFAULT_TRACKER_PREFERENCES,
  });

  /** Updates React state after a successful load or save. */
  function applyDataToState(data: TrackerData) {
    trackerDataRef.current = data;
    setCharacters(data.characters);
    setWeaponInventory(data.weaponInventory);
    setMatrixTeams(data.matrixTeams);
    setWelcomeSeen(data.preferences.welcomeSeen);
    setBackupNoticeAcknowledgedAt(data.preferences.backupNoticeAcknowledgedAt);
  }

  /** Applies validated document data and its revision. */
  function applyDocumentToState(document: TrackerDocument, writable: boolean) {
    revisionRef.current = document.revision;
    storageWritableRef.current = writable;
    setStorageVersion(document.schemaVersion);
    applyDataToState(document.data);
  }

  /** Disables further writes after a failed save. */
  function setStorageSaveError() {
    storageWritableRef.current = false;
    setStorageStatus({
      state: "error",
      message: "Tracker storage could not be saved in this browser.",
    });
  }

  /** Requires a reload before an outdated tab can edit. */
  function setStorageStale() {
    storageWritableRef.current = false;
    setStorageStatus({
      state: "stale",
      message: "Data changed in another tab. Reload data before making more edits.",
    });
  }

  /** Disables writes when stored data cannot be read. */
  function setStorageReadError(message: string) {
    storageWritableRef.current = false;
    setStorageStatus({
      state: "error",
      message,
    });
  }

  /** Validates data received from another browser tab. */
  function parseStorageEventDocument(raw: string | null) {
    if (!raw) {
      return null;
    }

    try {
      return parseTrackerDocument(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }

  /** Validates and persists an edit before updating React state. */
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
    const nextDocument = createTrackerDocument({
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

      return true;
    } catch (error) {
      if (error instanceof TrackerStorageRevisionConflictError) {
        throw error;
      }

      setStorageSaveError();
      throw new Error("Tracker storage could not be saved.");
    }
  }

  /** Applies an editing action to the latest in-memory data. */
  function commitTrackerDataUpdate(
    getNextData: (currentData: TrackerData) => TrackerData | null,
    options?: Parameters<typeof commitTrackerData>[1],
  ) {
    const nextData = getNextData(trackerDataRef.current);

    return nextData ? commitTrackerData(nextData, options) : false;
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const result = readStoredTrackerDocument();
      const { document } = result;

      setStorageStatus(result.status);

      if (document) {
        applyDocumentToState(document, true);
      } else if (result.status.state === "ready") {
        applyDocumentToState(
          createTrackerDocument({
            characters: [],
            weaponInventory: [],
            matrixTeams: [{ id: "team-1", slots: [null, null, null] }],
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
    // Load storage only once when the client provider mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    /** Detects edits or clearing of storage in another tab. */
    function handleStorageEvent(event: StorageEvent) {
      if (event.key !== null && event.key !== TRACKER_DOCUMENT_STORAGE_KEY) {
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

  /** Adds a tracked character. */
  function createCharacter(character: TrackedCharacter) {
    const now = new Date().toISOString();

    commitTrackerDataUpdate((currentData) =>
      createCharacterData(currentData, character, now),
    );
  }

  /** Saves a character build update. */
  function updateCharacter(character: TrackedCharacter) {
    const now = new Date().toISOString();

    commitTrackerDataUpdate((currentData) =>
      updateCharacterData(currentData, character, now),
    );
  }

  /** Deletes a character and clears its team references. */
  function deleteCharacter(id: string) {
    commitTrackerDataUpdate((currentData) =>
      deleteCharacterData(currentData, id),
    );
  }

  /** Updates an inventory count. */
  function setWeaponCount(weaponId: number, count: number) {
    commitTrackerDataUpdate((currentData) =>
      setWeaponCountData(currentData, weaponId, count),
    );
  }

  /** Replaces tracker data with validated imported data. */
  function replaceAllData(imported: ParsedImportedTrackerData) {
    commitTrackerDataUpdate(
      (currentData) => replaceAllTrackerData(currentData, imported),
      {
        forceWritable: true,
      },
    );
  }

  /** Clears builds while retaining preferences. */
  function clearTrackerData() {
    commitTrackerDataUpdate(
      (currentData) => clearTrackerDataValue(currentData),
      {
        forceWritable: true,
      },
    );
  }

  /** Updates the saved teams. */
  function updateMatrixTeams(matrixTeams: TrackerData["matrixTeams"]) {
    commitTrackerDataUpdate((currentData) =>
      updateMatrixTeamsData(currentData, matrixTeams),
    );
  }

  /** Updates tracker preferences. */
  function updatePreferences(preferences: Partial<TrackerPreferences>) {
    commitTrackerDataUpdate((currentData) =>
      updatePreferencesData(currentData, preferences),
    );
  }

  /** Reloads data after a storage conflict. */
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

    applyDocumentToState(result.document, true);
    setStorageStatus(result.status);
  }

  return {
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
}
