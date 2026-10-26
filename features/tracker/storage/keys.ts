export const TRACKER_DOCUMENT_STORAGE_KEY = "wuwa-tracker.unified";
export const TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY =
  "wuwa-tracker.unified.lastKnownGood";
export const TRACKER_DOCUMENT_BEFORE_RESTORE_STORAGE_KEY =
  "wuwa-tracker.unified.beforeRestore";
export const LEGACY_TRACKER_DOCUMENT_STORAGE_KEY = "wuwa-tracker.document.v4";
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Identifies the frozen snapshot made before upgrading a unified version.
 * @param version - The source unified schema version.
 * @returns The storage key for that version's backup.
 */
export function getVersionBackupKey(version: number) {
  return `wuwa-tracker.unified.backup.v${version}`;
}
