import {
  createTrackerDocumentV5,
  normalizeTrackerDocumentV5,
  type TrackerDocumentV5,
  type TrackerPreferences,
} from "./documents";
import {
  TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
  TRACKER_DOCUMENT_STORAGE_KEY,
} from "./keys";

export type TrackerStorageStatus = {
  state: "ready" | "recovered" | "stale" | "error";
  message: string;
};

export type ReadTrackerDocumentResult = {
  document: TrackerDocumentV5 | null;
  status: TrackerStorageStatus;
};

export type GuardedWriteTrackerDocumentResult =
  | {
      state: "written";
      document: TrackerDocumentV5;
    }
  | {
      state: "stale";
      currentDocument: TrackerDocumentV5;
    };

export class TrackerStorageRevisionConflictError extends Error {
  currentDocument: TrackerDocumentV5;

  constructor(currentDocument: TrackerDocumentV5) {
    super("Tracker storage has a newer revision.");
    this.name = "TrackerStorageRevisionConflictError";
    this.currentDocument = currentDocument;
  }
}

export function parseTrackerDocument(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    return normalizeTrackerDocumentV5(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readCurrentTrackerDocument() {
  if (typeof window === "undefined") {
    return null;
  }

  return parseTrackerDocument(localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY));
}

export function hasNewerTrackerDocumentRevision(
  document: TrackerDocumentV5,
  baseRevision: number,
) {
  return document.revision > baseRevision;
}

export function writeCurrentTrackerDocument(document: TrackerDocumentV5) {
  localStorage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(document));
}

export function updateCurrentTrackerDocumentData(
  updater: (document: TrackerDocumentV5) => {
    characters?: TrackerDocumentV5["data"]["characters"];
    weaponInventory?: TrackerDocumentV5["data"]["weaponInventory"];
    matrixTeams?: TrackerDocumentV5["data"]["matrixTeams"];
    preferences?: TrackerPreferences;
  },
) {
  const currentDocument = readCurrentTrackerDocument();

  if (!currentDocument) {
    return false;
  }

  const updatedData = updater(currentDocument);
  const nextDocument = createTrackerDocumentV5({
    characters: updatedData.characters ?? currentDocument.data.characters,
    weaponInventory:
      updatedData.weaponInventory ?? currentDocument.data.weaponInventory,
    matrixTeams: updatedData.matrixTeams ?? currentDocument.data.matrixTeams,
    preferences: updatedData.preferences ?? currentDocument.data.preferences,
    revision: currentDocument.revision + 1,
  });

  writeStoredTrackerDocument(nextDocument);

  return true;
}

export function writeStoredTrackerDocument(document: TrackerDocumentV5) {
  const normalizedDocument = normalizeTrackerDocumentV5(document);

  if (!normalizedDocument) {
    throw new Error("Tracker document is invalid.");
  }

  const currentDocument = readCurrentTrackerDocument();

  if (currentDocument) {
    localStorage.setItem(
      TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
      JSON.stringify(currentDocument),
    );
  }

  writeCurrentTrackerDocument(normalizedDocument);
}

export function writeStoredTrackerDocumentWithRevisionGuard(
  document: TrackerDocumentV5,
  baseRevision: number,
): GuardedWriteTrackerDocumentResult {
  const normalizedDocument = normalizeTrackerDocumentV5(document);

  if (!normalizedDocument) {
    throw new Error("Tracker document is invalid.");
  }

  const currentDocument = readCurrentTrackerDocument();

  if (
    currentDocument &&
    hasNewerTrackerDocumentRevision(currentDocument, baseRevision)
  ) {
    return {
      state: "stale",
      currentDocument,
    };
  }

  if (currentDocument) {
    localStorage.setItem(
      TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
      JSON.stringify(currentDocument),
    );
  }

  writeCurrentTrackerDocument(normalizedDocument);

  return {
    state: "written",
    document: normalizedDocument,
  };
}

export function readStoredTrackerDocument(): ReadTrackerDocumentResult {
  try {
    if (typeof window === "undefined") {
      return {
        document: null,
        status: {
          state: "ready",
          message: "Storage is not available during server rendering.",
        },
      };
    }

    const rawDocument = localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY);

    if (rawDocument) {
      const currentDocument = parseTrackerDocument(rawDocument);

      if (currentDocument) {
        return {
          document: currentDocument,
          status: {
            state: "ready",
            message: "Tracker document loaded.",
          },
        };
      }

      const recoveredDocument = parseTrackerDocument(
        localStorage.getItem(TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY),
      );

      if (recoveredDocument) {
        try {
          writeCurrentTrackerDocument(recoveredDocument);
        } catch {
          // The recovered document is still safe to use for this session.
        }

        return {
          document: recoveredDocument,
          status: {
            state: "recovered",
            message:
              "Tracker storage was recovered from the last known good backup.",
          },
        };
      }

      return {
        document: null,
        status: {
          state: "error",
          message:
            "Tracker storage is corrupt and no last known good backup was available.",
        },
      };
    }

    return {
      document: null,
      status: {
        state: "ready",
        message: "No current tracker document was found.",
      },
    };
  } catch {
    return {
      document: null,
      status: {
        state: "error",
        message: "Tracker storage could not be read from this browser.",
      },
    };
  }
}
