import {
  MATRIX_DOUBLE_USE_CHARACTER_IDS,
  MATRIX_DOUBLE_USE_CHARACTER_NAMES,
} from "../constants";
import type { ApiWeapon, TrackedCharacter, WeaponInventoryItem } from "../types";

export function getMatrixCharacterMaxUses(character: TrackedCharacter) {
  if (
    MATRIX_DOUBLE_USE_CHARACTER_IDS.has(character.characterId) ||
    MATRIX_DOUBLE_USE_CHARACTER_NAMES.has(character.characterName.toLowerCase())
  ) {
    return 2;
  }

  return 1;
}

export function getInventoryCount(
  inventory: WeaponInventoryItem[],
  weaponId: number | null,
) {
  if (!weaponId) {
    return 0;
  }

  return inventory.find((item) => item.weaponId === weaponId)?.count ?? 0;
}

export function buildWeaponInventoryCountMap(inventory: WeaponInventoryItem[]) {
  return inventory.reduce<Record<number, number>>((counts, item) => {
    counts[item.weaponId] = item.count;
    return counts;
  }, {});
}

export function getOwnedWeaponsByType({
  inventoryCounts,
  weaponTypeId,
  weapons,
}: {
  inventoryCounts: Record<number, number>;
  weaponTypeId: number | null | undefined;
  weapons: ApiWeapon[];
}) {
  if (!weaponTypeId) {
    return [];
  }

  return weapons.filter(
    (weapon) => weapon.Type === weaponTypeId && (inventoryCounts[weapon.Id] ?? 0) > 0,
  );
}

export function getAssignmentCounts(characters: TrackedCharacter[]) {
  return characters.reduce<Record<number, number>>((counts, character) => {
    if (!character.weaponId) {
      return counts;
    }

    counts[character.weaponId] = (counts[character.weaponId] ?? 0) + 1;
    return counts;
  }, {});
}

export function getWeaponInventoryStatus({
  weaponId,
  inventory,
  assignmentCounts,
}: {
  weaponId: number | null;
  inventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
}) {
  if (!weaponId) {
    return null;
  }

  const owned = getInventoryCount(inventory, weaponId);
  const assigned = assignmentCounts[weaponId] ?? 0;

  if (owned === 0) {
    return "Not in inventory";
  }

  if (assigned > owned) {
    return "Shared";
  }

  return null;
}
