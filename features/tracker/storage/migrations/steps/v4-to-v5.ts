import type { TrackerDocumentV5 } from "../../documents";
import { TRACKER_APP_ID, TRACKER_SCHEMA_VERSION } from "../../keys";
import type { TrackerCharacterV4, TrackerDocumentV4 } from "../../schemas/v4";
import { trackerDocumentV5Schema } from "../../schemas/v5";

function migrateCharacterV4ToV5(character: TrackerCharacterV4) {
  return {
    id: character.id,
    characterId: character.characterId,
    characterName: character.characterName,
    roles: character.roles,
    weaponId: character.weaponId,
    weaponName: character.weaponName,
    fourCostMain: character.fourCostMain,
    noCrit: character.noCrit,
    critRate: character.critRate,
    critDmg: character.critDmg,
    checklist: character.checklist,
    echoChecker: character.echoChecker,
    substatPriority: character.substatPriority,
    expectedEr: character.expectedEr,
    actualEr: character.actualEr,
    notes: character.notes,
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
  };
}

export function migrateTrackerDocumentV4ToV5(
  document: TrackerDocumentV4,
): TrackerDocumentV5 {
  return trackerDocumentV5Schema.parse({
    schemaVersion: TRACKER_SCHEMA_VERSION,
    app: TRACKER_APP_ID,
    savedAt: document.savedAt,
    revision: document.revision,
    data: {
      characters: document.data.characters.map(migrateCharacterV4ToV5),
      weaponInventory: document.data.weaponInventory,
      matrixTeams: document.data.matrixTeams,
      preferences: document.data.preferences,
    },
  }) as TrackerDocumentV5;
}
