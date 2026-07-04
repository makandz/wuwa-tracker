import { describe, expect, test } from "vitest";

import { DEFAULT_TRACKER_PREFERENCES, type TrackerDocumentV5 } from "../app/_tracker/storage";
import {
  cleanMatrixTeamsForCharacters,
  clearTrackerData,
  createCharacterData,
  deleteCharacterData,
  replaceAllTrackerData,
  setWeaponCountData,
  updateCharacterData,
  updateMatrixTeamsData,
  updatePreferencesData,
} from "../app/_tracker/tracker-data";
import type {
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "../app/_tracker/types";

type TrackerData = TrackerDocumentV5["data"];

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
    critRate: 70,
    critDmg: 240,
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

function makeMatrixTeams(): MatrixTeam[] {
  return [
    {
      id: "team-1",
      slots: ["char-1", "char-2", null],
    },
  ];
}

function makeWeaponInventory(): WeaponInventoryItem[] {
  return [{ weaponId: 201, count: 2 }];
}

function makeTrackerData(overrides: Partial<TrackerData> = {}): TrackerData {
  return {
    characters: [makeCharacter()],
    weaponInventory: makeWeaponInventory(),
    matrixTeams: makeMatrixTeams(),
    preferences: DEFAULT_TRACKER_PREFERENCES,
    ...overrides,
  };
}

describe("tracker data helpers", () => {
  test("creates characters with timestamps and ignores duplicate ids", () => {
    const data = makeTrackerData({ characters: [] });
    const created = createCharacterData(
      data,
      makeCharacter({ createdAt: "", updatedAt: "" }),
      "2026-02-01T00:00:00.000Z",
    );

    expect(created?.characters).toEqual([
      makeCharacter({
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    ]);
    expect(
      createCharacterData(created ?? data, makeCharacter(), "2026-02-02T00:00:00.000Z"),
    ).toBeNull();
  });

  test("updates existing characters with updatedAt and ignores missing ids", () => {
    const data = makeTrackerData();
    const updated = updateCharacterData(
      data,
      makeCharacter({ notes: "updated" }),
      "2026-02-01T00:00:00.000Z",
    );

    expect(updated?.characters[0]).toEqual(
      makeCharacter({
        notes: "updated",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    );
    expect(
      updateCharacterData(
        data,
        makeCharacter({ id: "missing" }),
        "2026-02-01T00:00:00.000Z",
      ),
    ).toBeNull();
  });

  test("deletes characters and clears matrix slots that reference them", () => {
    const data = makeTrackerData({
      characters: [
        makeCharacter({ id: "char-1" }),
        makeCharacter({ id: "char-2", characterId: 102, characterName: "Verina" }),
      ],
      matrixTeams: [
        {
          id: "team-1",
          slots: ["char-1", "char-2", "char-1"],
        },
      ],
    });

    const deleted = deleteCharacterData(data, "char-1");

    expect(deleted?.characters.map((character) => character.id)).toEqual(["char-2"]);
    expect(deleted?.matrixTeams).toEqual([
      {
        id: "team-1",
        slots: [null, "char-2", null],
      },
    ]);
    expect(deleteCharacterData(data, "missing")).toBeNull();
  });

  test("cleans matrix teams against a character list", () => {
    const cleanedTeams = cleanMatrixTeamsForCharacters(
      [
        {
          id: "team-1",
          slots: ["char-1", "deleted-char", "char-2"],
        },
        {
          id: "team-2",
          slots: ["deleted-char", null, "char-1"],
        },
      ],
      [
        makeCharacter({ id: "char-1" }),
        makeCharacter({ id: "char-2", characterId: 102, characterName: "Verina" }),
      ],
    );

    expect(cleanedTeams).toEqual([
      {
        id: "team-1",
        slots: ["char-1", null, "char-2"],
      },
      {
        id: "team-2",
        slots: [null, null, "char-1"],
      },
    ]);
  });

  test("sets weapon counts by rounding, clamping, adding, updating, and removing", () => {
    const data = makeTrackerData({ weaponInventory: [] });

    const added = setWeaponCountData(data, 201, 2.6);
    const updated = setWeaponCountData(added ?? data, 201, 1.2);
    const clamped = setWeaponCountData(updated ?? data, 201, -4);

    expect(added?.weaponInventory).toEqual([{ weaponId: 201, count: 3 }]);
    expect(updated?.weaponInventory).toEqual([{ weaponId: 201, count: 1 }]);
    expect(clamped?.weaponInventory).toEqual([]);
    expect(setWeaponCountData(data, 999, 0)).toBeNull();
  });

  test("replaces or clears data while preserving existing preferences when needed", () => {
    const preferences = {
      ...DEFAULT_TRACKER_PREFERENCES,
      welcomeSeen: true,
      dashboardViewMode: "grid" as const,
    };
    const data = makeTrackerData({ preferences });
    const importedPreferences = {
      ...DEFAULT_TRACKER_PREFERENCES,
      dashboardSortKey: "name" as const,
    };

    expect(
      replaceAllTrackerData(data, {
        characters: [],
        weaponInventory: [],
        matrixTeams: [],
        preferences: null,
      }).preferences,
    ).toBe(preferences);
    expect(
      replaceAllTrackerData(data, {
        characters: [],
        weaponInventory: [],
        matrixTeams: [],
        preferences: importedPreferences,
      }).preferences,
    ).toBe(importedPreferences);
    expect(clearTrackerData(data)).toEqual({
      characters: [],
      weaponInventory: [],
      matrixTeams: [],
      preferences,
    });
  });

  test("updates matrix teams and preferences", () => {
    const data = makeTrackerData();
    const matrixTeams: MatrixTeam[] = [
      {
        id: "team-2",
        slots: [null, "char-1", null],
      },
    ];

    expect(updateMatrixTeamsData(data, matrixTeams).matrixTeams).toBe(matrixTeams);
    expect(
      updatePreferencesData(data, {
        welcomeSeen: true,
        dashboardSortKey: "name",
      }).preferences,
    ).toEqual({
      ...DEFAULT_TRACKER_PREFERENCES,
      welcomeSeen: true,
      dashboardSortKey: "name",
    });
  });
});
