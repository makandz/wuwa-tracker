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

export type WeaponInventoryGroup = {
  type: number;
  name: string;
  weapons: ApiWeapon[];
};

/**
 * Groups owned weapons by type while retaining entries missing from the live catalog.
 * @param weapons - The live weapon catalog.
 * @param inventory - Owned weapon quantities.
 * @param query - An optional name or type search.
 * @returns Owned weapon groups ordered by type, rarity, and name.
 */
export function getWeaponInventoryGroups(
  weapons: ApiWeapon[],
  inventory: WeaponInventoryItem[],
  query = "",
): WeaponInventoryGroup[] {
  const catalogById = new Map(weapons.map((weapon) => [weapon.Id, weapon]));
  const groups = new Map<number, WeaponInventoryGroup>();
  const search = query.trim().toLowerCase();

  for (const item of inventory) {
    if (item.count <= 0) {
      continue;
    }

    const weapon = catalogById.get(item.weaponId) ?? {
      Id: item.weaponId,
      Name: `Weapon ${item.weaponId}`,
      Type: 0,
      TypeName: "Other",
      QualityId: 0,
    };

    if (!`${weapon.Name} ${weapon.TypeName}`.toLowerCase().includes(search)) {
      continue;
    }

    let group = groups.get(weapon.Type);

    if (!group) {
      group = { type: weapon.Type, name: weapon.TypeName, weapons: [] };
      groups.set(weapon.Type, group);
    }

    group.weapons.push(weapon);
  }

  const sortedGroups = [...groups.values()].sort((left, right) => {
    const leftType = left.type || Number.MAX_SAFE_INTEGER;
    const rightType = right.type || Number.MAX_SAFE_INTEGER;

    return leftType - rightType;
  });

  for (const group of sortedGroups) {
    group.weapons.sort((left, right) => right.QualityId - left.QualityId || left.Name.localeCompare(right.Name));
  }

  return sortedGroups;
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
