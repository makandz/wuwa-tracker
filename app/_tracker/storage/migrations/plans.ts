import { z } from "zod";

import {
  createTrackerDocumentV5,
  normalizeTrackerDocumentV5,
  type TrackerDocumentV5,
} from "../documents";
import {
  BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
  CURRENT_SCHEMA_VERSION,
  DASHBOARD_SORT_STORAGE_KEY,
  DASHBOARD_VIEW_STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MATRIX_STORAGE_KEY,
  STORAGE_KEY,
  TRACKER_DOCUMENT_STORAGE_KEY,
  WELCOME_SEEN_STORAGE_KEY,
  TRACKER_APP_ID,
} from "../keys";
import { legacyArrayExportSchema } from "../schemas/legacy-v3";
import type { LegacySplitStorage } from "../schemas/legacy-v3";
import { writeCurrentTrackerDocument } from "../recovery";
import { migrateLegacySplitStorageToV5 } from "./legacy-v3-to-v5";

type StorageVersion = "legacy-v3" | number;

type MigrationSource = {
  id: string;
  version: StorageVersion;
  label: string;
  payload: unknown;
  backup: {
    keys: Array<{
      key: string;
      value: string | null;
    }>;
  };
  preview: {
    counts: Array<{
      label: string;
      value: number;
    }>;
    items: string[];
  };
};

type RegisteredMigrationStep = {
  id: string;
  fromVersion: StorageVersion;
  toVersion: StorageVersion;
  title: string;
  description: string;
  apply: (input: unknown) => unknown;
};

export type MigrationStep = {
  id: string;
  fromVersion: StorageVersion;
  toVersion: StorageVersion;
  title: string;
  description: string;
};

export type StorageMigrationPlan = {
  id: string;
  source: MigrationSource;
  targetVersion: typeof CURRENT_SCHEMA_VERSION;
  targetLabel: string;
  steps: MigrationStep[];
  createdAt: string;
};

export type StorageMigrationPlanResult =
  | {
      state: "none";
      plan: null;
      error: null;
    }
  | {
      state: "ready";
      plan: StorageMigrationPlan;
      error: null;
    }
  | {
      state: "error";
      plan: null;
      error: string;
    };

const LEGACY_SPLIT_STORAGE_KEYS = [
  STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MATRIX_STORAGE_KEY,
  WELCOME_SEEN_STORAGE_KEY,
  DASHBOARD_SORT_STORAGE_KEY,
  DASHBOARD_VIEW_STORAGE_KEY,
  BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
];

const migrationRegistry: RegisteredMigrationStep[] = [
  {
    id: "v4-to-v5",
    fromVersion: 4,
    toVersion: CURRENT_SCHEMA_VERSION,
    title: "Remove cached catalog display fields",
    description:
      "Tracked characters will keep durable IDs, reference names, and build data. Live catalog details will load from Encore.",
    apply: (input) => {
      const document = input as LegacyTrackerDocumentV4;

      return createTrackerDocumentV5({
        characters: document.data.characters,
        weaponInventory: document.data.weaponInventory,
        matrixTeams: document.data.matrixTeams,
        preferences: document.data.preferences,
        revision: document.revision,
        savedAt: document.savedAt,
      });
    },
  },
  {
    id: "legacy-v3-to-v5",
    fromVersion: "legacy-v3",
    toVersion: CURRENT_SCHEMA_VERSION,
    title: "Move tracker data into one save file",
    description:
      "Characters, weapon inventory, Matrix teams, and settings will be copied into the current save format.",
    apply: (input) => migrateLegacySplitStorageToV5(input as LegacySplitStorage),
  },
];

const legacyTrackerDocumentV4Schema = z
  .object({
    schemaVersion: z.literal(4),
    app: z.literal(TRACKER_APP_ID),
    savedAt: z.unknown(),
    revision: z.unknown(),
    data: z
      .object({
        characters: z.array(z.unknown()),
        weaponInventory: z.array(z.unknown()),
        matrixTeams: z.array(z.unknown()),
        preferences: z.object({}).catchall(z.unknown()),
      })
      .catchall(z.unknown()),
  })
  .catchall(z.unknown());

type LegacyTrackerDocumentV4 = z.infer<typeof legacyTrackerDocumentV4Schema>;

function versionMatches(left: StorageVersion, right: StorageVersion) {
  return left === right;
}

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

function readCurrentDocumentV4Source(): MigrationSource | null {
  const raw = localStorage.getItem(TRACKER_DOCUMENT_STORAGE_KEY);

  if (raw === null) {
    return null;
  }

  const parsed = legacyTrackerDocumentV4Schema.safeParse(parseJson(raw));

  if (!parsed.success) {
    return null;
  }

  const previewDocument = createTrackerDocumentV5({
    characters: parsed.data.data.characters,
    weaponInventory: parsed.data.data.weaponInventory,
    matrixTeams: parsed.data.data.matrixTeams,
    preferences: parsed.data.data.preferences,
    revision: parsed.data.revision,
    savedAt: parsed.data.savedAt,
  });

  return {
    id: "tracker-document-v4",
    version: 4,
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
    preview: {
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
    },
  };
}

function readLegacySplitStorageSource(): MigrationSource | null {
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

  const payload: LegacySplitStorage = {
    characters: characters.value,
    weaponInventory: weaponInventory.value,
    matrixTeams: matrixTeams.value,
    preferences: {
      welcomeSeen: localStorage.getItem(WELCOME_SEEN_STORAGE_KEY) === "true",
      dashboardSortKey: localStorage.getItem(DASHBOARD_SORT_STORAGE_KEY),
      dashboardViewMode: localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY),
      backupNoticeAcknowledgedAt: Number(
        localStorage.getItem(BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY),
      ),
    },
  };
  const previewDocument = createTrackerDocumentV5(payload);

  return {
    id: "legacy-split-storage",
    version: "legacy-v3",
    label: "Older tracker save",
    payload,
    backup: {
      keys: backupKeys,
    },
    preview: {
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
    },
  };
}

function findMigrationStep(fromVersion: StorageVersion) {
  return migrationRegistry.find((step) =>
    versionMatches(step.fromVersion, fromVersion),
  );
}

function buildPlan(source: MigrationSource): StorageMigrationPlan {
  const steps: RegisteredMigrationStep[] = [];
  let cursor = source.version;

  while (!versionMatches(cursor, CURRENT_SCHEMA_VERSION)) {
    const step = findMigrationStep(cursor);

    if (!step) {
      throw new Error(`No storage migration registered from ${String(cursor)}.`);
    }

    steps.push(step);
    cursor = step.toVersion;
  }

  return {
    id: `${source.id}-to-v${CURRENT_SCHEMA_VERSION}`,
    source,
    targetVersion: CURRENT_SCHEMA_VERSION,
    targetLabel: `Current save format v${CURRENT_SCHEMA_VERSION}`,
    steps: steps.map((step) => ({
      id: step.id,
      fromVersion: step.fromVersion,
      toVersion: step.toVersion,
      title: step.title,
      description: step.description,
    })),
    createdAt: new Date().toISOString(),
  };
}

export function createStorageMigrationPlan(): StorageMigrationPlanResult {
  if (typeof window === "undefined") {
    return {
      state: "none",
      plan: null,
      error: null,
    };
  }

  try {
    const source = readCurrentDocumentV4Source() ?? readLegacySplitStorageSource();

    if (!source) {
      return {
        state: "none",
        plan: null,
        error: null,
      };
    }

    return {
      state: "ready",
      plan: buildPlan(source),
      error: null,
    };
  } catch (error) {
    return {
      state: "error",
      plan: null,
      error:
        error instanceof Error
          ? error.message
          : "Legacy tracker storage could not be inspected.",
    };
  }
}

export function commitStorageMigration(
  plan: StorageMigrationPlan,
): TrackerDocumentV5 {
  let migrated: unknown = plan.source.payload;

  for (const plannedStep of plan.steps) {
    const registeredStep = migrationRegistry.find(
      (step) => step.id === plannedStep.id,
    );

    if (!registeredStep) {
      throw new Error(`Storage migration step is not registered: ${plannedStep.id}`);
    }

    migrated = registeredStep.apply(migrated);
  }

  const document = normalizeTrackerDocumentV5(migrated);

  if (!document) {
    throw new Error("Storage migration did not produce a valid tracker document.");
  }

  writeCurrentTrackerDocument(document);

  return document;
}

export function exportStorageMigrationBackup(plan: StorageMigrationPlan) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          app: "wuwa-tracker",
          exportedAt: new Date().toISOString(),
          migration: {
            from: plan.source.label,
            to: plan.targetLabel,
            plannedAt: plan.createdAt,
            steps: plan.steps,
          },
          currentDocumentKey: TRACKER_DOCUMENT_STORAGE_KEY,
          legacyLocalStorage: plan.source.backup.keys,
        },
        null,
        2,
      ),
    ],
    {
      type: "application/json",
    },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `wuwa-tracker-storage-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
