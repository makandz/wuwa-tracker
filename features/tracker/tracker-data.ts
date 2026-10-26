import type {
  ParsedImportedTrackerData,
  TrackerDocument,
  TrackerPreferences,
} from "./storage";
import type {
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "./types";

type TrackerData = TrackerDocument["data"];

/**
 * Clears team slots that reference removed characters.
 * @param matrixTeams - The saved teams.
 * @param characters - The remaining tracked characters.
 * @returns The teams with valid character references.
 */
export function cleanMatrixTeamsForCharacters(
  matrixTeams: MatrixTeam[],
  characters: TrackedCharacter[],
) {
  const characterIds = new Set(characters.map((character) => character.id));

  return matrixTeams.map((team) => ({
    ...team,
    slots: team.slots.map((characterId) =>
      characterId && characterIds.has(characterId) ? characterId : null,
    ) as MatrixTeam["slots"],
  }));
}

/**
 * Adds a character unless its tracker ID is already present.
 * @param currentData - The current tracker data.
 * @param character - The character to add.
 * @param timestamp - The creation and update timestamp.
 * @returns The updated data, or null for a duplicate ID.
 */
export function createCharacterData(
  currentData: TrackerData,
  character: TrackedCharacter,
  timestamp: string,
) {
  if (currentData.characters.some((item) => item.id === character.id)) {
    return null;
  }

  return {
    ...currentData,
    characters: [
      ...currentData.characters,
      {
        ...character,
        createdAt: character.createdAt || timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

/**
 * Replaces an existing character build.
 * @param currentData - The current tracker data.
 * @param character - The updated character.
 * @param timestamp - The update timestamp.
 * @returns The updated data, or null when the character is missing.
 */
export function updateCharacterData(
  currentData: TrackerData,
  character: TrackedCharacter,
  timestamp: string,
) {
  if (!currentData.characters.some((item) => item.id === character.id)) {
    return null;
  }

  return {
    ...currentData,
    characters: currentData.characters.map((item) =>
      item.id === character.id
        ? {
            ...character,
            updatedAt: timestamp,
          }
        : item,
    ),
  };
}

/**
 * Removes a character and its team references.
 * @param currentData - The current tracker data.
 * @param id - The tracker character ID.
 * @returns The updated data, or null when the character is missing.
 */
export function deleteCharacterData(currentData: TrackerData, id: string) {
  if (!currentData.characters.some((character) => character.id === id)) {
    return null;
  }

  const characters = currentData.characters.filter(
    (character) => character.id !== id,
  );

  return {
    ...currentData,
    characters,
    matrixTeams: cleanMatrixTeamsForCharacters(currentData.matrixTeams, characters),
  };
}

/**
 * Adds, updates, or removes a weapon inventory entry.
 * @param currentData - The current tracker data.
 * @param weaponId - The catalog weapon ID.
 * @param count - The desired owned count.
 * @returns The updated data, or null when nothing changes.
 */
export function setWeaponCountData(
  currentData: TrackerData,
  weaponId: number,
  count: number,
) {
  const nextCount = Math.max(0, Math.round(count));
  const existing = currentData.weaponInventory.find(
    (item) => item.weaponId === weaponId,
  );

  if (nextCount === 0 && !existing) {
    return null;
  }

  const weaponInventory: WeaponInventoryItem[] =
    nextCount === 0
      ? currentData.weaponInventory.filter((item) => item.weaponId !== weaponId)
      : existing
        ? currentData.weaponInventory.map((item) =>
            item.weaponId === weaponId ? { ...item, count: nextCount } : item,
          )
        : [...currentData.weaponInventory, { weaponId, count: nextCount }];

  return {
    ...currentData,
    weaponInventory,
  };
}

/**
 * Replaces builds and inventory with imported data.
 * @param currentData - The current tracker data.
 * @param imported - The validated imported data.
 * @returns The replacement data, retaining preferences for character-only imports.
 */
export function replaceAllTrackerData(
  currentData: TrackerData,
  imported: ParsedImportedTrackerData,
) {
  return {
    characters: imported.characters,
    weaponInventory: imported.weaponInventory,
    matrixTeams: imported.matrixTeams,
    preferences: imported.preferences ?? currentData.preferences,
  };
}

/**
 * Clears builds, inventory, and teams while retaining preferences.
 * @param currentData - The current tracker data.
 * @returns The cleared tracker data.
 */
export function clearTrackerData(currentData: TrackerData) {
  return {
    characters: [],
    weaponInventory: [],
    matrixTeams: [],
    preferences: currentData.preferences,
  };
}

/**
 * Replaces the saved team assignments.
 * @param currentData - The current tracker data.
 * @param matrixTeams - The updated teams.
 * @returns The updated tracker data.
 */
export function updateMatrixTeamsData(
  currentData: TrackerData,
  matrixTeams: MatrixTeam[],
) {
  return {
    ...currentData,
    matrixTeams,
  };
}

/**
 * Merges changes into tracker preferences.
 * @param currentData - The current tracker data.
 * @param preferences - The preferences to change.
 * @returns The updated tracker data.
 */
export function updatePreferencesData(
  currentData: TrackerData,
  preferences: Partial<TrackerPreferences>,
) {
  return {
    ...currentData,
    preferences: {
      ...currentData.preferences,
      ...preferences,
    },
  };
}
