import {
  createTrackerDocument,
  parseTrackerDocument,
  type TrackerDocument,
  type TrackerPreferences,
} from "./documents";
import {
  LEGACY_TRACKER_DOCUMENT_STORAGE_KEY,
  TRACKER_DOCUMENT_BEFORE_RESTORE_STORAGE_KEY,
  TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
  TRACKER_DOCUMENT_STORAGE_KEY,
} from "./keys";
import { convertLegacyV5Document } from "./imports";
import {
  InvalidTrackerDocumentError,
  loadUnifiedTrackerDocument,
  saveTrackerUpgrade,
  UnsupportedTrackerVersionError,
  upgradeTrackerDocument,
} from "./upgrades";

export type TrackerStorageStatus = {
  state: "ready" | "recovered" | "stale" | "error";
  message: string;
};
export type ReadTrackerDocumentResult = {
  document: TrackerDocument | null;
  status: TrackerStorageStatus;
};
export type GuardedWriteTrackerDocumentResult =
  | { state: "written"; document: TrackerDocument }
  | { state: "stale"; currentDocument: TrackerDocument };

export class TrackerStorageRevisionConflictError extends Error {
  currentDocument: TrackerDocument;

  /**
   * Identifies a save attempted from an outdated tab.
   * @param currentDocument - The newer stored document.
   */
  constructor(currentDocument: TrackerDocument) {
    super("Tracker storage has a newer revision.");
    this.name = "TrackerStorageRevisionConflictError";
    this.currentDocument = currentDocument;
  }
}

/**
 * Reads the active unified document without performing recovery or conversion.
 * @returns The current document, or null when missing or invalid.
 */
export function readCurrentTrackerDocument() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY);

  try {
    return raw === null ? null : parseTrackerDocument(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Checks whether stored data supersedes a tab's last loaded revision.
 * @param document - The stored document.
 * @param baseRevision - The tab's last loaded revision.
 * @returns Whether the stored revision is newer.
 */
export function hasNewerTrackerDocumentRevision(
  document: TrackerDocument,
  baseRevision: number,
) {
  return document.revision > baseRevision;
}

/**
 * Saves a validated document after preserving the previous valid save.
 * @param document - The next document.
 * @returns The validated document that was saved.
 */
export function writeStoredTrackerDocument(document: TrackerDocument) {
  const validated = parseTrackerDocument(document);

  if (!validated) {
    throw new Error("Tracker document is invalid.");
  }

  const currentRaw = localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY);
  const currentDocument = readCurrentTrackerDocument();

  if (currentRaw !== null && !currentDocument) {
    throw new Error(
      "The existing unified save is unreadable. Reload before saving.",
    );
  }

  if (currentDocument) {
    localStorage.setItem(
      TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
      JSON.stringify(currentDocument),
    );
  }

  localStorage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(validated));

  return validated;
}

/**
 * Refuses a stale tab's save before changing the active document or its backup.
 * @param document - The next document.
 * @param baseRevision - The revision used to produce the edit.
 * @returns The written document, or the newer document that prevented saving.
 */
export function writeStoredTrackerDocumentWithRevisionGuard(
  document: TrackerDocument,
  baseRevision: number,
): GuardedWriteTrackerDocumentResult {
  const currentDocument = readCurrentTrackerDocument();

  if (
    currentDocument &&
    hasNewerTrackerDocumentRevision(currentDocument, baseRevision)
  ) {
    return { state: "stale", currentDocument };
  }

  const written = writeStoredTrackerDocument(document);

  return { state: "written", document: written };
}

/**
 * Restores an explicit import or reset, preserving unreadable data before replacement.
 * @param document - The validated replacement document.
 * @param baseRevision - The revision loaded by the tab requesting the restore.
 * @returns The restored document, or the newer document that prevented saving.
 */
export function restoreStoredTrackerDocument(
  document: TrackerDocument,
  baseRevision: number,
): GuardedWriteTrackerDocumentResult {
  const validated = upgradeTrackerDocument(document);
  const currentRaw = localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY);

  if (currentRaw === null) {
    return writeStoredTrackerDocumentWithRevisionGuard(validated, baseRevision);
  }

  try {
    upgradeTrackerDocument(JSON.parse(currentRaw));
  } catch (error) {
    // Explicit recovery may replace damaged data, but never an unsupported version.
    if (
      !(error instanceof InvalidTrackerDocumentError) &&
      !(error instanceof SyntaxError)
    ) {
      throw error;
    }

    localStorage.setItem(TRACKER_DOCUMENT_BEFORE_RESTORE_STORAGE_KEY, currentRaw);
    localStorage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(validated));

    return { state: "written", document: validated };
  }

  return writeStoredTrackerDocumentWithRevisionGuard(validated, baseRevision);
}

/**
 * Updates a stored document using the same validation and revision guard as UI edits.
 * @param updater - The changes to apply to the current document.
 * @returns Whether a document was updated.
 */
export function updateCurrentTrackerDocumentData(
  updater: (document: TrackerDocument) => {
    characters?: TrackerDocument["data"]["characters"];
    weaponInventory?: TrackerDocument["data"]["weaponInventory"];
    matrixTeams?: TrackerDocument["data"]["matrixTeams"];
    preferences?: TrackerPreferences;
  },
) {
  const current = readCurrentTrackerDocument();

  if (!current) {
    return false;
  }

  const document = createTrackerDocument({
    ...current.data,
    ...updater(current),
    revision: current.revision + 1,
  });

  const result = writeStoredTrackerDocumentWithRevisionGuard(document, current.revision);

  return result.state === "written";
}

/** Builds a consistent storage result for startup and recovery. */
function storageResult(
  document: TrackerDocument | null,
  state: TrackerStorageStatus["state"],
  message: string,
): ReadTrackerDocumentResult {
  return { document, status: { state, message } };
}

/**
 * Loads unified storage, recovering locally or copying legacy v5 only on first use.
 * @returns The loaded document and its storage status.
 */
export function readStoredTrackerDocument(): ReadTrackerDocumentResult {
  if (typeof window === "undefined") {
    return storageResult(
      null,
      "ready",
      "Storage is unavailable during server rendering.",
    );
  }

  try {
    const raw = localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY);
    const backup = localStorage.getItem(
      TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
    );

    if (raw !== null) {
      try {
        return storageResult(
          loadUnifiedTrackerDocument(raw),
          "ready",
          "Tracker document loaded.",
        );
      } catch (error) {
        // A newer format must never be replaced with an older recovery copy.
        if (error instanceof UnsupportedTrackerVersionError) {
          return storageResult(null, "error", error.message);
        }

        // Failed upgrade writes must preserve the active save rather than recover over it.
        if (
          !(error instanceof InvalidTrackerDocumentError) &&
          !(error instanceof SyntaxError)
        ) {
          throw error;
        }
      }
    }

    if (backup !== null) {
      const recovered = loadUnifiedTrackerDocument(backup);
      localStorage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(recovered));
      return storageResult(
        recovered,
        "recovered",
        "Tracker storage was recovered from the last known good backup.",
      );
    }

    if (raw !== null) {
      return storageResult(
        null,
        "error",
        "Tracker storage is invalid and no recovery backup was available.",
      );
    }

    const legacyRaw = localStorage.getItem(LEGACY_TRACKER_DOCUMENT_STORAGE_KEY);

    if (legacyRaw !== null) {
      const document = convertLegacyV5Document(JSON.parse(legacyRaw));
      saveTrackerUpgrade(document);
      return storageResult(
        document,
        "ready",
        "Tracker data copied to unified storage. The legacy save is unchanged.",
      );
    }

    return storageResult(null, "ready", "No tracker document was found.");
  } catch {
    return storageResult(
      null,
      "error",
      "Tracker storage could not be loaded or saved. Existing data has been preserved.",
    );
  }
}
