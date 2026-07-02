import {
  readStoredTrackerDocument,
  type ReadTrackerDocumentResult,
  type TrackerStorageStatus,
} from "./recovery";
import {
  createStorageMigrationPlan,
  type StorageMigrationPlan,
} from "./migrations/plans";

export type TrackerStorageInspection =
  | (ReadTrackerDocumentResult & {
      state: "ready";
      migrationPlan: null;
    })
  | (ReadTrackerDocumentResult & {
      state: "migration-required";
      document: null;
      migrationPlan: StorageMigrationPlan;
    })
  | (ReadTrackerDocumentResult & {
      state: "error";
      document: null;
      migrationPlan: null;
    });

function errorStatus(message: string): TrackerStorageStatus {
  return {
    state: "error",
    message,
  };
}

export function inspectTrackerStorage(): TrackerStorageInspection {
  const result = readStoredTrackerDocument();

  if (result.document) {
    return {
      ...result,
      state: "ready",
      migrationPlan: null,
    };
  }

  if (result.status.state === "error") {
    return {
      document: null,
      status: result.status,
      state: "error",
      migrationPlan: null,
    };
  }

  const migration = createStorageMigrationPlan();

  if (migration.state === "error") {
    return {
      document: null,
      status: errorStatus(migration.error),
      state: "error",
      migrationPlan: null,
    };
  }

  if (migration.state === "ready") {
    return {
      document: null,
      status: {
        state: "ready",
        message: "Legacy tracker storage needs migration.",
      },
      state: "migration-required",
      migrationPlan: migration.plan,
    };
  }

  return {
    ...result,
    state: "ready",
    migrationPlan: null,
  };
}
