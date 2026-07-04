import {
  createTrackerDocumentV5,
  ensureMatrixTeams,
  normalizeCharacters,
  normalizeMatrixTeams,
  normalizePreferences,
  normalizeWeaponInventory,
  type ParsedImportedTrackerData,
  type TrackerDocumentV5,
} from "../documents";
import type { LegacySplitStorage } from "../schemas/legacy-v3";

export function migrateLegacySplitStorageToV5(
  storage: LegacySplitStorage,
): TrackerDocumentV5 {
  return createTrackerDocumentV5({
    characters: storage.characters,
    weaponInventory: storage.weaponInventory,
    matrixTeams: storage.matrixTeams,
    preferences: storage.preferences,
  });
}

export function parseLegacyArrayExport(
  characters: unknown[],
): ParsedImportedTrackerData {
  return {
    characters: normalizeCharacters(characters),
    weaponInventory: [],
    matrixTeams: ensureMatrixTeams([]),
    preferences: null,
  };
}

export function parseLegacyObjectExport(exported: {
  characters?: unknown[];
  weaponInventory?: unknown[];
  matrixTeams?: unknown[];
  preferences?: unknown;
}): ParsedImportedTrackerData {
  if (!Array.isArray(exported.characters)) {
    throw new Error("Invalid file.");
  }

  return {
    characters: normalizeCharacters(exported.characters),
    weaponInventory: Array.isArray(exported.weaponInventory)
      ? normalizeWeaponInventory(exported.weaponInventory)
      : [],
    matrixTeams: ensureMatrixTeams(
      Array.isArray(exported.matrixTeams)
        ? normalizeMatrixTeams(exported.matrixTeams)
        : [],
    ),
    preferences: exported.preferences
      ? normalizePreferences(exported.preferences)
      : null,
  };
}
