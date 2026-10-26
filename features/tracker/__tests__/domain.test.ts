import { describe, expect, test } from "vitest";

import {
  buildCatalogCharacterLookup,
  buildCatalogWeaponLookup,
  buildWeaponInventoryCountMap,
  getMatrixCharacterMaxUses,
  getOwnedWeaponsByType,
  getWeaponInventoryGroups,
} from "../domain";
import type {
  ApiCharacter,
  ApiWeapon,
  TrackedCharacter,
  WeaponInventoryItem,
} from "../types";

const characters: ApiCharacter[] = [
  {
    Id: 101,
    Name: "Rover",
    QualityId: 5,
    Element: { Name: "Spectro" },
    RoleHeadIcon: "/rover.png",
    WeaponType: { Id: 1, Name: "Sword" },
  },
  {
    Id: 102,
    Name: "Verina",
    QualityId: 5,
    Element: { Name: "Spectro" },
    RoleHeadIcon: "/verina.png",
    WeaponType: { Id: 4, Name: "Rectifier" },
  },
];

const weapons: ApiWeapon[] = [
  {
    Id: 201,
    Name: "Emerald of Genesis",
    Icon: "/emerald.png",
    Type: 1,
    QualityId: 5,
    TypeName: "Sword",
  },
  {
    Id: 202,
    Name: "Stringmaster",
    Icon: "/stringmaster.png",
    Type: 4,
    QualityId: 5,
    TypeName: "Rectifier",
  },
  {
    Id: 203,
    Name: "Variation",
    Icon: "/variation.png",
    Type: 4,
    QualityId: 4,
    TypeName: "Rectifier",
  },
];

describe("domain lookup helpers", () => {
  test("shows one owned stack per weapon grouped by type and sorted by rarity", () => {
    const groups = getWeaponInventoryGroups(weapons, [
      { weaponId: 203, count: 2 },
      { weaponId: 202, count: 3 },
      { weaponId: 201, count: 1 },
    ]);

    expect(groups.map((group) => group.name)).toEqual(["Sword", "Rectifier"]);
    expect(groups.map((group) => group.weapons.map((weapon) => weapon.Id))).toEqual([[201], [202, 203]]);
    expect(weapons.map((weapon) => weapon.Id)).toEqual([201, 202, 203]);
  });

  test("searches owned names and types while excluding unowned or zero-count entries", () => {
    const inventory = [{ weaponId: 201, count: 0 }, { weaponId: 202, count: 2 }];

    expect(getWeaponInventoryGroups(weapons, inventory, "  STRING  ")[0].weapons.map((weapon) => weapon.Id)).toEqual([202]);
    expect(getWeaponInventoryGroups(weapons, inventory, "rectifier")[0].weapons.map((weapon) => weapon.Id)).toEqual([202]);
    expect(getWeaponInventoryGroups(weapons, inventory, "emerald")).toEqual([]);
    expect(getWeaponInventoryGroups(weapons, inventory, "variation")).toEqual([]);
    expect(getWeaponInventoryGroups(weapons, [])).toEqual([]);
  });

  test("keeps missing catalog entries visible and editable in an Other group", () => {
    const inventory = [{ weaponId: 999, count: 3 }, { weaponId: 202, count: 1 }];
    const groups = getWeaponInventoryGroups(weapons, inventory);

    expect(groups.map((group) => group.name)).toEqual(["Rectifier", "Other"]);
    expect(groups[1].weapons[0]).toMatchObject({ Id: 999, Name: "Weapon 999" });
    expect(getWeaponInventoryGroups([], inventory).flatMap((group) => group.weapons)).toHaveLength(2);
  });

  test("allows Chisa to be used twice in Matrix teams", () => {
    const chisa = {
      characterId: 0,
      characterName: "Chisa",
    } as TrackedCharacter;
    const rover = {
      characterId: 101,
      characterName: "Rover",
    } as TrackedCharacter;

    expect(getMatrixCharacterMaxUses(chisa)).toBe(2);
    expect(getMatrixCharacterMaxUses(rover)).toBe(1);
  });

  test("builds catalog lookup maps keyed by API ids", () => {
    const characterLookup = buildCatalogCharacterLookup(characters);
    const weaponLookup = buildCatalogWeaponLookup(weapons);

    expect(characterLookup.get(102)?.Name).toBe("Verina");
    expect(weaponLookup.get(201)?.Name).toBe("Emerald of Genesis");
    expect(characterLookup.has(999)).toBe(false);
    expect(weaponLookup.has(999)).toBe(false);
  });

  test("builds weapon inventory counts keyed by weapon id", () => {
    const inventory: WeaponInventoryItem[] = [
      { weaponId: 201, count: 1 },
      { weaponId: 202, count: 3 },
    ];

    expect(buildWeaponInventoryCountMap(inventory)).toEqual({
      201: 1,
      202: 3,
    });
  });

  test("filters owned weapons by type using inventory counts", () => {
    const inventoryCounts = buildWeaponInventoryCountMap([
      { weaponId: 201, count: 1 },
      { weaponId: 202, count: 0 },
      { weaponId: 203, count: 2 },
    ]);

    expect(
      getOwnedWeaponsByType({
        inventoryCounts,
        weaponTypeId: 4,
        weapons,
      }).map((weapon) => weapon.Id),
    ).toEqual([203]);
    expect(
      getOwnedWeaponsByType({
        inventoryCounts,
        weaponTypeId: null,
        weapons,
      }),
    ).toEqual([]);
  });
});
