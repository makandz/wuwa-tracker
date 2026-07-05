import { normalizeTrackerDocumentV5, type TrackerDocumentV5 } from "../documents";
import {
  CURRENT_SCHEMA_VERSION,
  TRACKER_DOCUMENT_STORAGE_KEY,
} from "../keys";
import {
  TrackerStorageRevisionConflictError,
  hasNewerTrackerDocumentRevision,
  readCurrentTrackerDocument,
  writeCurrentTrackerDocument,
} from "../recovery";
import { readMigrationSource } from "./sources";
import type {
  MigrationSource,
  MigrationStep,
  RegisteredMigrationStep,
  StorageVersion,
} from "./types";
import { migrateTrackerDocumentV4ToV5 } from "./steps/v4-to-v5";
import type { TrackerDocumentV4 } from "../schemas/v4";

export type { MigrationStep } from "./types";

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

const migrationRegistry: RegisteredMigrationStep[] = [
  {
    id: "v4-to-v5",
    fromVersion: 4,
    toVersion: CURRENT_SCHEMA_VERSION,
    title: "Remove cached catalog display fields",
    description:
      "Tracked characters will keep durable IDs, reference names, and build data. Live catalog details will load from Encore.",
    apply: (input) => migrateTrackerDocumentV4ToV5(input as TrackerDocumentV4),
  },
];

function versionMatches(left: StorageVersion, right: StorageVersion) {
  return left === right;
}

function findMigrationStep(fromVersion: StorageVersion) {
  return migrationRegistry.find((step) =>
    versionMatches(step.fromVersion, fromVersion),
  );
}

function buildPlan(source: MigrationSource): StorageMigrationPlan {
  const steps: RegisteredMigrationStep[] = [];
  let cursor = source.payloadVersion;

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
    const source = readMigrationSource();

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

  const currentDocument = readCurrentTrackerDocument();

  if (
    currentDocument &&
    hasNewerTrackerDocumentRevision(currentDocument, document.revision)
  ) {
    throw new TrackerStorageRevisionConflictError(currentDocument);
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
