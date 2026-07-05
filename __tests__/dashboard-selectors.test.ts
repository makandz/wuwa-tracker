import { describe, expect, test } from "vitest";

import {
  buildDashboardCatalogLookups,
  filterDashboardCharacters,
  getDashboardCharacterCardState,
  getDashboardStats,
  groupDashboardCharacters,
} from "../app/_tracker/domain/dashboard-selectors";
import type {
  Catalog,
  TrackedCharacter,
  WeaponInventoryItem,
} from "../app/_tracker/types";

function makeCharacter(
  overrides: Partial<TrackedCharacter> = {},
): TrackedCharacter {
  return {
    id: "char-1",
    characterId: 101,
    characterName: "Rover",
    roles: ["DPS"],
    weaponId: 201,
    weaponName: "Emerald of Genesis",
    fourCostMain: "CR",
    noCrit: false,
    critRate: 0.7,
    critDmg: 2.4,
    checklist: {
      skills: true,
      fourCost: false,
      threeCostA: true,
      threeCostB: false,
      oneCostA: true,
      oneCostB: false,
    },
    substatPriority: "Crit Rate > Crit DMG",
    expectedEr: 120,
    actualEr: 118,
    notes: "main team",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function makeCatalog(): Catalog {
  return {
    characters: [
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
      {
        Id: 103,
        Name: "Encore",
        QualityId: 5,
        Element: { Name: "Fusion" },
        RoleHeadIcon: "/encore.png",
        WeaponType: { Id: 4, Name: "Rectifier" },
      },
    ],
    weapons: [
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
    ],
    loading: false,
    error: "",
  };
}

function makeDashboardData() {
  const characters = [
    makeCharacter({
      id: "char-1",
      characterId: 101,
      characterName: "Rover",
      roles: ["DPS"],
      weaponId: 201,
      weaponName: "Emerald of Genesis",
      updatedAt: "2026-01-02T00:00:00.000Z",
    }),
    makeCharacter({
      id: "char-2",
      characterId: 102,
      characterName: "Verina",
      roles: ["Support"],
      weaponId: null,
      weaponName: "",
      noCrit: true,
      checklist: {
        skills: true,
        fourCost: true,
        threeCostA: true,
        threeCostB: true,
        oneCostA: true,
        oneCostB: true,
      },
      updatedAt: "2026-01-03T00:00:00.000Z",
    }),
    makeCharacter({
      id: "char-3",
      characterId: 103,
      characterName: "Encore",
      roles: ["Hybrid"],
      weaponId: 202,
      weaponName: "Stringmaster",
      actualEr: 130,
      expectedEr: 120,
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
  ];
  const weaponInventory: WeaponInventoryItem[] = [
    { weaponId: 201, count: 1 },
    { weaponId: 202, count: 1 },
  ];

  return {
    assignmentCounts: {
      201: 1,
      202: 2,
    },
    catalog: makeCatalog(),
    characters,
    weaponInventory,
  };
}

describe("dashboard selectors", () => {
  test("builds dashboard stats with completion, average build, copies, and storage display", () => {
    const completeCharacter = makeCharacter({
      checklist: {
        skills: true,
        fourCost: true,
        threeCostA: true,
        threeCostB: true,
        oneCostA: true,
        oneCostB: true,
      },
    });
    const noCritCharacter = makeCharacter({
      id: "char-2",
      characterId: 102,
      characterName: "Verina",
      noCrit: true,
    });

    const stats = getDashboardStats({
      characters: [completeCharacter, noCritCharacter],
      storageVersion: 7,
      weaponInventory: [{ weaponId: 201, count: 3 }],
    });

    expect(stats.completeCount).toBe(1);
    expect(stats.hasWeaponCopies).toBe(true);
    expect(stats.totalWeaponCopies).toBe(3);
    expect(stats.items.map((item) => [item.label, item.value])).toEqual([
      ["Tracked", "2"],
      ["Complete", "1/2"],
      ["Avg build", "2.24"],
      ["Weapon copies", "3"],
      ["Storage", "v7"],
    ]);
  });

  test("shows no-crit and empty-state average build labels", () => {
    expect(
      getDashboardStats({
        characters: [],
        storageVersion: null,
        weaponInventory: [],
      }).items.map((item) => [item.label, item.value]),
    ).toContainEqual(["Avg build", "0.00"]);

    expect(
      getDashboardStats({
        characters: [makeCharacter({ noCrit: true })],
        storageVersion: null,
        weaponInventory: [],
      }).items.map((item) => [item.label, item.value]),
    ).toContainEqual(["Avg build", "No crit"]);
  });

  test("filters visible characters by query, weapon state, completion, and attention", () => {
    const { assignmentCounts, catalog, characters, weaponInventory } = makeDashboardData();
    const { catalogCharacterById, catalogWeaponById } =
      buildDashboardCatalogLookups(catalog);
    const filter = (overrides = {}) =>
      filterDashboardCharacters({
        assignmentCounts,
        catalogCharacterById,
        catalogWeaponById,
        characters,
        hideComplete: false,
        query: "",
        weaponFilter: "all",
        weaponInventory,
        ...overrides,
      }).map((character) => character.id);

    expect(filter({ query: "fusion" })).toEqual(["char-3"]);
    expect(filter({ query: "rectifier" })).toEqual(["char-2", "char-3"]);
    expect(filter({ weaponFilter: "missing" })).toEqual(["char-2"]);
    expect(filter({ weaponFilter: "selected" })).toEqual(["char-1", "char-3"]);
    expect(filter({ weaponFilter: "attention" })).toEqual(["char-3"]);
    expect(filter({ hideComplete: true })).toEqual(["char-1", "char-3"]);
  });

  test("groups visible characters by primary role and sorts each group", () => {
    const characters = [
      makeCharacter({ id: "support", characterName: "Verina", roles: ["Support"] }),
      makeCharacter({ id: "dps-b", characterName: "Rover", roles: ["DPS"] }),
      makeCharacter({ id: "hybrid", characterName: "Encore", roles: ["Hybrid"] }),
      makeCharacter({ id: "dps-a", characterName: "Camellya", roles: ["DPS"] }),
    ];

    const groups = groupDashboardCharacters(characters, "name");

    expect(groups.map((group) => group.role)).toEqual(["DPS", "Hybrid", "Support"]);
    expect(groups[0]?.characters.map((character) => character.id)).toEqual([
      "dps-a",
      "dps-b",
    ]);
    expect(groups[0]?.summary.count).toBe(2);
  });

  test("derives dashboard card state from catalog, checklist, weapon, and ER data", () => {
    const { assignmentCounts, catalog, characters, weaponInventory } = makeDashboardData();
    const { catalogCharacterById, catalogWeaponById } =
      buildDashboardCatalogLookups(catalog);

    const state = getDashboardCharacterCardState({
      assignmentCounts,
      catalogCharacterById,
      catalogWeaponById,
      character: characters[2],
      weaponInventory,
    });

    expect(state.catalogCharacter?.Name).toBe("Encore");
    expect(state.characterDisplay.elementName).toBe("Fusion");
    expect(state.weaponDisplay.name).toBe("Stringmaster");
    expect(state.weaponStatus).toBe("Shared");
    expect(state.checklistCount).toBe(3);
    expect(state.complete).toBe(false);
    expect(state.erBelowTarget).toBe(false);
    expect(state.ratings.buildScore).toBe(2.24);
  });
});
