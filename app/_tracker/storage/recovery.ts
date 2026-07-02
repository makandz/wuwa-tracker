import {
  createTrackerDocumentV4,
  normalizeTrackerDocumentV4,
  type TrackerDocumentV4,
  type TrackerPreferences,
} from "./documents";
import { migrateLegacySplitStorageToV4 } from "./migrations/legacy-v3-to-v4";
import {
  BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
  DASHBOARD_SORT_STORAGE_KEY,
  DASHBOARD_VIEW_STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MATRIX_STORAGE_KEY,
  STORAGE_KEY,
  TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY,
  TRACKER_DOCUMENT_STORAGE_KEY,
  WELCOME_SEEN_STORAGE_KEY,
} from "./keys";
import {
  legacyArrayExportSchema,
  legacySplitStorageSchema,
} from "./schemas/legacy-v3";

export type TrackerStorageStatus = {
  state: "ready" | "migrated" | "recovered" | "error";
  message: string;
};

export type ReadTrackerDocumentResult = {
  document: TrackerDocumentV4 | null;
  status: TrackerStorageStatus;
};

function parseJson(raw: string | null) {
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as unknown;
}

export function parseTrackerDocument(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    return normalizeTrackerDocumentV4(JSON.parse(raw));
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

function readLegacyJsonArray(key: string) {
  try {
    const parsed = legacyArrayExportSchema.safeParse(
      parseJson(localStorage.getItem(key)),
    );

    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function readLegacySplitStorage() {
  const parsed = legacySplitStorageSchema.safeParse({
    characters: readLegacyJsonArray(STORAGE_KEY),
    weaponInventory: readLegacyJsonArray(INVENTORY_STORAGE_KEY),
    matrixTeams: readLegacyJsonArray(MATRIX_STORAGE_KEY),
    preferences: {
      welcomeSeen: localStorage.getItem(WELCOME_SEEN_STORAGE_KEY) === "true",
      dashboardSortKey: localStorage.getItem(DASHBOARD_SORT_STORAGE_KEY),
      dashboardViewMode: localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY),
      backupNoticeAcknowledgedAt: Number(
        localStorage.getItem(BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY),
      ),
    },
  });

  if (!parsed.success) {
    return {
      characters: [],
      weaponInventory: [],
      matrixTeams: [],
      preferences: {},
    };
  }

  return parsed.data;
}

export function writeCurrentTrackerDocument(document: TrackerDocumentV4) {
  localStorage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(document));
}

export function updateCurrentTrackerDocumentData(
  updater: (document: TrackerDocumentV4) => {
    characters?: TrackerDocumentV4["data"]["characters"];
    weaponInventory?: TrackerDocumentV4["data"]["weaponInventory"];
    matrixTeams?: TrackerDocumentV4["data"]["matrixTeams"];
    preferences?: TrackerPreferences;
  },
) {
  const currentDocument = readCurrentTrackerDocument();

  if (!currentDocument) {
    return false;
  }

  const updatedData = updater(currentDocument);
  const nextDocument = createTrackerDocumentV4({
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

export function writeStoredTrackerDocument(document: TrackerDocumentV4) {
  const normalizedDocument = normalizeTrackerDocumentV4(document);

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

    const migratedDocument = migrateLegacySplitStorageToV4(
      readLegacySplitStorage(),
    );

    writeCurrentTrackerDocument(migratedDocument);

    return {
      document: migratedDocument,
      status: {
        state: "migrated",
        message: "Legacy tracker storage was migrated to the v4 document.",
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
