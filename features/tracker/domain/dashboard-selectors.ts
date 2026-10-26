import { compareCharacterReleaseOrder } from "../character-release-order";
import {
  buildCatalogCharacterLookup,
  buildCatalogWeaponLookup,
  checklistTotal,
  getEchoSetChecklist,
  getEchoSetScore,
  getErStatus,
  getTrackedCharacterDisplay,
  getTrackedWeaponDisplay,
  getWeaponInventoryStatus,
  getWeaponRarityTone,
  getWeaponToneClasses,
  isComplete,
} from "../domain";
import { TRACKER_DOCUMENT_STORAGE_KEY } from "../storage/keys";
import type {
  ApiCharacter,
  ApiWeapon,
  Catalog,
  TrackedCharacter,
  WeaponInventoryItem,
} from "../types";

export type DashboardCatalogLookups = {
  catalogCharacterById: Map<number, ApiCharacter>;
  catalogWeaponById: Map<number, ApiWeapon>;
};

/**
 * Indexes catalog entries needed by dashboard cards.
 * @param catalog - The live catalog.
 * @returns Lookup maps for characters and weapons.
 */
export function buildDashboardCatalogLookups(catalog: Catalog): DashboardCatalogLookups {
  return {
    catalogCharacterById: buildCatalogCharacterLookup(catalog.characters),
    catalogWeaponById: buildCatalogWeaponLookup(catalog.weapons),
  };
}

/**
 * Summarizes shared character progress without combining independent set scores.
 * @param input - Characters, inventory, and the loaded storage version.
 * @returns Dashboard counts and their display values.
 */
export function getDashboardStats({ characters, storageVersion, weaponInventory }: {
  characters: TrackedCharacter[];
  storageVersion: number | null;
  weaponInventory: WeaponInventoryItem[];
}) {
  const completeCount = characters.filter(isComplete).length;
  const totalWeaponCopies = weaponInventory.reduce((sum, item) => sum + item.count, 0);

  return {
    completeCount,
    hasWeaponCopies: totalWeaponCopies > 0,
    totalWeaponCopies,
    items: [
      { label: "Tracked", value: String(characters.length) },
      { label: "Complete", value: `${completeCount}/${characters.length}` },
      { label: "Weapon copies", value: String(totalWeaponCopies) },
      { label: "Storage", title: TRACKER_DOCUMENT_STORAGE_KEY, value: storageVersion ? `v${storageVersion}` : "Local" },
    ],
  };
}

/**
 * Searches names and orders the roster by release without requiring live catalog data.
 * @param characters - The tracked roster.
 * @param catalogCharacterById - Optional live names to search.
 * @param query - The name search text.
 * @returns Matching characters, with unknown releases first and newest known releases next.
 */
export function getDashboardCharacters(
  characters: TrackedCharacter[],
  catalogCharacterById: Map<number, ApiCharacter>,
  query: string,
) {
  const search = query.trim().toLowerCase();

  return characters.filter((character) => {
    const name = catalogCharacterById.get(character.characterId)?.Name ?? character.characterName;

    return name.toLowerCase().includes(search);
  }).sort((left, right) => compareCharacterReleaseOrder(left.characterId, right.characterId));
}

/**
 * Builds a compact card summary with an independent result for every set.
 * @param input - The character, live lookups, and inventory assignment data.
 * @returns Shared character information and up to three set summaries.
 */
export function getDashboardCharacterCardState({
  assignmentCounts, catalogCharacterById, catalogWeaponById, character, weaponInventory,
}: DashboardCatalogLookups & {
  assignmentCounts: Record<number, number>;
  character: TrackedCharacter;
  weaponInventory: WeaponInventoryItem[];
}) {
  const catalogCharacter = catalogCharacterById.get(character.characterId) ?? null;
  const catalogWeapon = catalogWeaponById.get(character.weaponId ?? 0) ?? null;
  const weaponDisplay = getTrackedWeaponDisplay(character, catalogWeapon);

  return {
    catalogCharacter,
    characterDisplay: getTrackedCharacterDisplay(character, catalogCharacter),
    complete: isComplete(character),
    sets: character.echoSets.map((set) => ({
      id: set.id,
      name: set.name,
      mode: set.mode,
      score: getEchoSetScore(character.characterId, character.expectedEr, set),
      completedEchoes: checklistTotal(getEchoSetChecklist(character.characterId, character.expectedEr, set)),
      actualEr: set.actualEr,
      erStatus: getErStatus(set.actualEr, character.expectedEr),
    })),
    weaponDisplay,
    weaponStatus: getWeaponInventoryStatus({ weaponId: character.weaponId, inventory: weaponInventory, assignmentCounts }),
    weaponToneClasses: getWeaponToneClasses(getWeaponRarityTone({ name: weaponDisplay.name, qualityId: weaponDisplay.qualityId })),
  };
}
