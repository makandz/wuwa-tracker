import { z } from "zod";

import { parseTrackerDocument, type TrackerDocument } from "./documents";
import {
  CURRENT_SCHEMA_VERSION,
  getVersionBackupKey,
  TRACKER_DOCUMENT_STORAGE_KEY,
} from "./keys";

const versionEnvelopeSchema = z.object({
  app: z.literal("wuwa-tracker"),
  format: z.literal("unified"),
  schemaVersion: z.number().int().positive(),
});

/** Identifies damaged supported saves that may use a recovery copy. */
export class InvalidTrackerDocumentError extends Error {}

/** Identifies formats this app must leave untouched, including newer versions. */
export class UnsupportedTrackerVersionError extends Error {}

/**
 * Validates a unified save, providing the entry point for future version scripts.
 * @param input - The untrusted unified document.
 * @returns The validated current document.
 */
export function upgradeTrackerDocument(input: unknown): TrackerDocument {
  const envelope = versionEnvelopeSchema.safeParse(input);

  if (!envelope.success) {
    throw new InvalidTrackerDocumentError("The unified save envelope is invalid.");
  }

  if (envelope.data.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedTrackerVersionError(
      `Unsupported unified save version: ${envelope.data.schemaVersion}.`,
    );
  }

  // Future conversions belong here: validate the source, convert, validate the target.
  const document = parseTrackerDocument(input);

  if (!document) {
    throw new InvalidTrackerDocumentError("The unified save is invalid.");
  }

  return document;
}

/**
 * Saves a validated upgrade after preserving its original unified version.
 * @param document - The destination document.
 * @param source - The original unified JSON and version; absent for the legacy bridge.
 */
export function saveTrackerUpgrade(
  document: TrackerDocument,
  source?: { schemaVersion: number; raw: string },
) {
  const validated = upgradeTrackerDocument(document);

  if (source) {
    const backupKey = getVersionBackupKey(source.schemaVersion);

    if (localStorage.getItem(backupKey) === null) {
      localStorage.setItem(backupKey, source.raw);
    }
  }

  localStorage.setItem(TRACKER_DOCUMENT_STORAGE_KEY, JSON.stringify(validated));
}

/**
 * Loads a unified JSON save and persists any supported version upgrades.
 * @param raw - The original stored JSON.
 * @returns The validated current document.
 */
export function loadUnifiedTrackerDocument(raw: string): TrackerDocument {
  const input: unknown = JSON.parse(raw);
  const document = upgradeTrackerDocument(input);
  const source = versionEnvelopeSchema.parse(input);

  if (source.schemaVersion !== document.schemaVersion) {
    saveTrackerUpgrade(document, { schemaVersion: source.schemaVersion, raw });
  }

  return document;
}
