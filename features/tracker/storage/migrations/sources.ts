import {
  BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
  DASHBOARD_SORT_STORAGE_KEY,
  DASHBOARD_VIEW_STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MATRIX_STORAGE_KEY,
  STORAGE_KEY,
  TRACKER_DOCUMENT_STORAGE_KEY,
  WELCOME_SEEN_STORAGE_KEY,
} from "../keys";
import { adaptLegacySplitStorageToV4 } from "./steps/legacy-v3-to-v4";
import {
  trackerDocumentV4Schema,
  type TrackerDocumentV4,
} from "../schemas/v4";
import { legacyArrayExportSchema } from "../schemas/legacy-v3";
import type { LegacySplitStorage } from "../schemas/legacy-v3";
import type { MigrationSource } from "./types";
import { migrateTrackerDocumentV4ToV5 } from "./steps/v4-to-v5";

const LEGACY_SPLIT_STORAGE_KEYS = [
  STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MATRIX_STORAGE_KEY,
  WELCOME_SEEN_STORAGE_KEY,
  DASHBOARD_SORT_STORAGE_KEY,
  DASHBOARD_VIEW_STORAGE_KEY,
  BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
];

function parseJson(raw: string) {
  return JSON.parse(raw) as unknown;
}

function readLegacyJsonArray(key: string) {
  const raw = localStorage.getItem(key);

  if (raw === null) {
    return {
      present: false,
      value: [],
      error: null,
    };
  }

  try {
    const parsed = legacyArrayExportSchema.safeParse(parseJson(raw));

    if (!parsed.success) {
      return {
        present: true,
        value: [],
        error: `${key} is not a JSON array.`,
      };
    }

    return {
      present: true,
      value: parsed.data,
      error: null,
    };
  } catch {
    return {
      present: true,
      value: [],
      error: `${key} is not valid JSON.`,
    };
  }
}

function createPreview(document: TrackerDocumentV4) {
  const previewDocument = migrateTrackerDocumentV4ToV5(document);

  return {
    counts: [
      {
        label: "Characters",
        value: previewDocument.data.characters.length,
      },
      {
        label: "Weapons",
        value: previewDocument.data.weaponInventory.length,
      },
      {
        label: "Matrix teams",
        value: previewDocument.data.matrixTeams.length,
      },
    ],
    items: previewDocument.data.characters.map(
      (character) => character.characterName,
    ),
  };
}

export function readCurrentDocumentV4Source(): MigrationSource | null {
  const raw = localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY);

  if (raw === null) {
    return null;
  }

  try {
    const parsed = trackerDocumentV4Schema.safeParse(parseJson(raw));

    if (!parsed.success) {
      return null;
    }

    return {
      id: "tracker-document-v4",
      version: 4,
      payloadVersion: 4,
      label: "Tracker save v4",
      payload: parsed.data,
      backup: {
        keys: [
          {
            key: TRACKER_DOCUMENT_STORAGE_KEY,
            value: raw,
          },
        ],
      },
      preview: createPreview(parsed.data),
    };
  } catch {
    return null;
  }
}

export function readLegacySplitStorageSource(): MigrationSource | null {
  const backupKeys = LEGACY_SPLIT_STORAGE_KEYS.map((key) => ({
    key,
    value: localStorage.getItem(key),
  }));
  const hasLegacyStorage = backupKeys.some((entry) => entry.value !== null);

  if (!hasLegacyStorage) {
    return null;
  }

  const characters = readLegacyJsonArray(STORAGE_KEY);
  const weaponInventory = readLegacyJsonArray(INVENTORY_STORAGE_KEY);
  const matrixTeams = readLegacyJsonArray(MATRIX_STORAGE_KEY);
  const firstError =
    characters.error ?? weaponInventory.error ?? matrixTeams.error;

  if (firstError) {
    throw new Error(firstError);
  }

  const splitStorage: LegacySplitStorage = {
    characters: characters.value,
    weaponInventory: weaponInventory.value,
    matrixTeams: matrixTeams.value,
    preferences: {},
  };
  const payload = adaptLegacySplitStorageToV4(splitStorage);

  return {
    id: "legacy-split-storage",
    version: "legacy-v3",
    payloadVersion: 4,
    label: "Older tracker save",
    payload,
    backup: {
      keys: backupKeys,
    },
    preview: createPreview(payload),
  };
}

export function readMigrationSource(): MigrationSource | null {
  return readCurrentDocumentV4Source() ?? readLegacySplitStorageSource();
}
