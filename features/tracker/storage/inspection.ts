import {
  readStoredTrackerDocument,
  type ReadTrackerDocumentResult,
  type TrackerStorageStatus,
} from "./recovery";
import { CURRENT_SCHEMA_VERSION } from "./keys";
import {
  createStorageMigrationPlan,
  type StorageMigrationPlan,
} from "./migrations/plans";
import { readCurrentDocumentStorageVersion } from "./migrations/sources";

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

function migrationRequiredInspection(
  migrationPlan: StorageMigrationPlan,
  message = "Legacy tracker storage needs migration.",
): TrackerStorageInspection {
  return {
    document: null,
    status: {
      state: "ready",
      message,
    },
    state: "migration-required",
    migrationPlan,
  };
}

export function inspectTrackerStorage(): TrackerStorageInspection {
  const currentDocument = readCurrentDocumentStorageVersion();

  if (
    currentDocument.state === "versioned" &&
    currentDocument.version !== CURRENT_SCHEMA_VERSION
  ) {
    const migration = createStorageMigrationPlan();

    if (migration.state === "ready") {
      return migrationRequiredInspection(migration.plan);
    }

    return {
      document: null,
      status: errorStatus(
        migration.state === "error"
          ? migration.error
          : `Tracker storage uses unsupported save format v${currentDocument.version}.`,
      ),
      state: "error",
      migrationPlan: null,
    };
  }

  const result = readStoredTrackerDocument();

  if (result.document) {
    return {
      ...result,
      state: "ready",
      migrationPlan: null,
    };
  }

  const migration = createStorageMigrationPlan();

  if (result.status.state === "error") {
    if (migration.state === "ready") {
      return migrationRequiredInspection(
        migration.plan,
        "Current tracker storage could not be recovered, but older tracker data can be migrated.",
      );
    }

    return {
      document: null,
      status:
        migration.state === "error"
          ? errorStatus(`${result.status.message} ${migration.error}`)
          : result.status,
      state: "error",
      migrationPlan: null,
    };
  }

  if (migration.state === "error") {
    return {
      document: null,
      status: errorStatus(migration.error),
      state: "error",
      migrationPlan: null,
    };
  }

  if (migration.state === "ready") {
    return migrationRequiredInspection(migration.plan);
  }

  return {
    ...result,
    state: "ready",
    migrationPlan: null,
  };
}
