import type {
  ParsedImportedTrackerData,
  TrackerDocumentV5,
  TrackerPreferences,
} from "./storage";
import type {
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "./types";

type TrackerData = TrackerDocumentV5["data"];

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

export function clearTrackerData(currentData: TrackerData) {
  return {
    characters: [],
    weaponInventory: [],
    matrixTeams: [],
    preferences: currentData.preferences,
  };
}

export function updateMatrixTeamsData(
  currentData: TrackerData,
  matrixTeams: MatrixTeam[],
) {
  return {
    ...currentData,
    matrixTeams,
  };
}

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
