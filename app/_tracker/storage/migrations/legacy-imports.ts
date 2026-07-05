import {
  ensureMatrixTeams,
  normalizeCharacters,
  normalizeMatrixTeams,
  normalizePreferences,
  normalizeWeaponInventory,
  type ParsedImportedTrackerData,
} from "../documents";

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
