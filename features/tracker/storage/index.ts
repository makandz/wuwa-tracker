import type { MatrixTeam, TrackedCharacter, WeaponInventoryItem } from "../types";
import {
  createTrackerDocument,
  DEFAULT_TRACKER_PREFERENCES,
  type TrackerPreferences,
} from "./documents";

export {
  createTrackerDocument,
  DEFAULT_TRACKER_PREFERENCES,
  parseTrackerDocument,
} from "./documents";
export type {
  ParsedImportedTrackerData,
  TrackerData,
  TrackerDocument,
  TrackerPreferences,
} from "./documents";
export { parseImportedTrackerData } from "./imports";
export { CURRENT_SCHEMA_VERSION } from "./keys";
export {
  hasNewerTrackerDocumentRevision,
  readStoredTrackerDocument,
  restoreStoredTrackerDocument,
  TrackerStorageRevisionConflictError,
  writeStoredTrackerDocument,
  writeStoredTrackerDocumentWithRevisionGuard,
} from "./recovery";
export type { ReadTrackerDocumentResult, TrackerStorageStatus } from "./recovery";

/**
 * Downloads a complete validated unified save as JSON.
 * @param characters - The tracked character builds.
 * @param weaponInventory - The owned weapon counts.
 * @param matrixTeams - The saved teams.
 * @param preferences - The tracker preferences.
 * @param revision - The exported document revision.
 */
export function exportTrackerData(
  characters: TrackedCharacter[],
  weaponInventory: WeaponInventoryItem[],
  matrixTeams: MatrixTeam[],
  preferences: TrackerPreferences = DEFAULT_TRACKER_PREFERENCES,
  revision = 1,
) {
  const document = createTrackerDocument({
    characters,
    weaponInventory,
    matrixTeams,
    preferences,
    revision,
  });
  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");

  link.href = url;
  link.download = `wuwa-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
