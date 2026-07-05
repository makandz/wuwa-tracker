import { describe, expect, test } from "vitest";

import {
  buildCatalogCharacterLookup,
  buildCatalogWeaponLookup,
  buildWeaponInventoryCountMap,
  getOwnedWeaponsByType,
} from "../domain";
import type { ApiCharacter, ApiWeapon, WeaponInventoryItem } from "../types";

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
