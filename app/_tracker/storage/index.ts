import type {
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "../types";
import {
  DEFAULT_TRACKER_PREFERENCES,
  createTrackerDocumentV5,
  isDashboardSortKey,
  isDashboardViewMode,
  normalizeCharacters,
  normalizeMatrixTeams,
  normalizeTrackerDocumentV5,
  normalizeWeaponInventory,
  type ParsedImportedTrackerData,
  type TrackerDocumentV5,
  type TrackerPreferences,
} from "./documents";
import { CURRENT_SCHEMA_VERSION } from "./keys";
import { inspectTrackerStorage } from "./inspection";
import {
  commitStorageMigration,
  exportStorageMigrationBackup,
  type StorageMigrationPlan,
} from "./migrations/plans";
import {
  parseLegacyArrayExport,
  parseLegacyObjectExport,
} from "./migrations/legacy-v3-to-v5";
import {
  TrackerStorageRevisionConflictError,
  hasNewerTrackerDocumentRevision,
  readStoredTrackerDocument,
  writeStoredTrackerDocument,
  writeStoredTrackerDocumentWithRevisionGuard,
  type ReadTrackerDocumentResult,
  type TrackerStorageStatus,
} from "./recovery";
import {
  legacyArrayExportSchema,
  legacyObjectExportSchema,
} from "./schemas/legacy-v3";

export {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_TRACKER_PREFERENCES,
  commitStorageMigration,
  createTrackerDocumentV5,
  exportStorageMigrationBackup,
  hasNewerTrackerDocumentRevision,
  inspectTrackerStorage,
  isDashboardSortKey,
  isDashboardViewMode,
  normalizeCharacters,
  normalizeMatrixTeams,
  normalizeTrackerDocumentV5,
  normalizeWeaponInventory,
  readStoredTrackerDocument,
  TrackerStorageRevisionConflictError,
  writeStoredTrackerDocument,
  writeStoredTrackerDocumentWithRevisionGuard,
};
export type {
  ParsedImportedTrackerData,
  ReadTrackerDocumentResult,
  StorageMigrationPlan,
  TrackerDocumentV5,
  TrackerPreferences,
  TrackerStorageStatus,
};

export function exportTrackerData(
  characters: TrackedCharacter[],
  weaponInventory: WeaponInventoryItem[],
  matrixTeams: MatrixTeam[],
  preferences: TrackerPreferences = DEFAULT_TRACKER_PREFERENCES,
  revision = 1,
) {
  const exportedAt = new Date().toISOString();
  const trackerDocument = createTrackerDocumentV5({
    characters,
    weaponInventory,
    matrixTeams,
    preferences,
    revision,
    savedAt: exportedAt,
  });
  const blob = new Blob([JSON.stringify(trackerDocument, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `wuwa-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseImportedTrackerData(
  text: string,
): ParsedImportedTrackerData {
  const parsed = JSON.parse(text) as unknown;
  const trackerDocument = normalizeTrackerDocumentV5(parsed);

  if (trackerDocument) {
    return {
      characters: trackerDocument.data.characters,
      weaponInventory: trackerDocument.data.weaponInventory,
      matrixTeams: trackerDocument.data.matrixTeams,
      preferences: trackerDocument.data.preferences,
    };
  }

  const legacyArray = legacyArrayExportSchema.safeParse(parsed);

  if (legacyArray.success) {
    return parseLegacyArrayExport(legacyArray.data);
  }

  const legacyObject = legacyObjectExportSchema.safeParse(parsed);

  if (legacyObject.success) {
    return parseLegacyObjectExport(legacyObject.data);
  }

  throw new Error("Invalid file.");
}
