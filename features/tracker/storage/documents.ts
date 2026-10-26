import { trackerDocumentV1Schema, type TrackerDocumentV1 } from "./schemas/v1";

export type TrackerDocument = TrackerDocumentV1;
export type TrackerData = TrackerDocument["data"];
export type TrackerPreferences = TrackerData["preferences"];
export type ParsedImportedTrackerData = Omit<TrackerData, "preferences"> & {
  preferences: TrackerPreferences | null;
};

export const DEFAULT_TRACKER_PREFERENCES: TrackerPreferences = {
  welcomeSeen: false,
  backupNoticeAcknowledgedAt: 0,
};

/**
 * Creates and validates a unified document without coercing or discarding data.
 * @param input - Tracker data and optional save metadata.
 * @returns The validated unified document.
 */
export function createTrackerDocument({
  revision = 1,
  savedAt = new Date().toISOString(),
  ...data
}: TrackerData & { revision?: number; savedAt?: string }): TrackerDocument {
  return trackerDocumentV1Schema.parse({
    app: "wuwa-tracker",
    format: "unified",
    schemaVersion: 1,
    revision,
    savedAt,
    data,
  });
}

/**
 * Validates an unknown value as the current unified format.
 * @param input - The untrusted document.
 * @returns The validated document, or null when validation fails.
 */
export function parseTrackerDocument(input: unknown): TrackerDocument | null {
  const result = trackerDocumentV1Schema.safeParse(input);

  return result.success ? result.data : null;
}
