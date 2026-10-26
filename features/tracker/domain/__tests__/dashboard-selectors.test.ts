import { describe, expect, test } from "vitest";
import {
  buildDashboardCatalogLookups, getDashboardCharacters,
  getDashboardCharacterCardState, getDashboardStats,
} from "../dashboard-selectors";
import { createEchoSet } from "../../echo-sets";
import { makeTrackedCharacter } from "../../__tests__/fixtures";
import type { Catalog } from "../../types";

const catalog: Catalog = { characters: [], weapons: [], loading: false, error: "" };

describe("dashboard selectors", () => {
  test("orders by release with unknown characters first, without catalog data", () => {
    const characters = [
      makeTrackedCharacter({ id: "old", characterId: 1402 }),
      makeTrackedCharacter({ id: "unknown-low", characterId: 1000 }),
      makeTrackedCharacter({ id: "new", characterId: 1312 }),
      makeTrackedCharacter({ id: "unknown-high", characterId: 9999 }),
    ];
    const original = [...characters];

    expect(getDashboardCharacters(characters, new Map(), "").map((character) => character.id)).toEqual([
      "unknown-high", "unknown-low", "new", "old",
    ]);
    expect(characters).toEqual(original);
  });

  test("searches character names, including live names and saved fallbacks", () => {
    const characters = [makeTrackedCharacter(), makeTrackedCharacter({ id: "other", characterName: "Encore", characterId: 1203 })];
    const live = new Map([[101, { Id: 101, Name: "Live Rover", QualityId: 5 }]]);

    expect(getDashboardCharacters(characters, live, " live ").map((character) => character.id)).toEqual(["char-1"]);
    expect(getDashboardCharacters(characters, live, "encore").map((character) => character.id)).toEqual(["other"]);
    expect(getDashboardCharacters(characters, live, "sword")).toEqual([]);
  });

  test("shows all three sets with independent progress, scores, and ER status", () => {
    const character = makeTrackedCharacter({
      echoSets: [
        { ...createEchoSet("first", "First"), actualEr: 125 },
        { ...createEchoSet("second", "Second"), mode: "detailed", actualEr: 110 },
        createEchoSet("third", "Third"),
      ],
    });
    character.echoSets[0].checklist.fourCost = true;
    const state = getDashboardCharacterCardState({
      ...buildDashboardCatalogLookups(catalog), character,
      assignmentCounts: { 201: 2 }, weaponInventory: [{ weaponId: 201, count: 1 }],
    });

    expect(state.sets.map(({ id, completedEchoes, erStatus }) => ({ id, completedEchoes, erStatus }))).toEqual([
      { id: "first", completedEchoes: 1, erStatus: "met" },
      { id: "second", completedEchoes: 0, erStatus: "below" },
      { id: "third", completedEchoes: 0, erStatus: "unknown" },
    ]);
    expect(state.sets.map((set) => set.score)).toEqual([null, null, null]);
    expect(state.weaponStatus).toBe("Shared");
    expect(state.weaponDisplay.name).toBe("Emerald of Genesis");
    expect(state.complete).toBe(false);
  });

  test("counts skills and every set toward completion without aggregating scores", () => {
    const set = createEchoSet("complete");
    Object.keys(set.checklist).forEach((key) => Reflect.set(set.checklist, key, true));
    const characters = [
      makeTrackedCharacter({ echoSets: [set] }),
      makeTrackedCharacter({ id: "incomplete", echoSets: [set, createEchoSet("unfinished")] }),
    ];
    const stats = getDashboardStats({ characters, storageVersion: 1, weaponInventory: [{ weaponId: 201, count: 3 }] });

    expect(stats.completeCount).toBe(1);
    expect(stats.totalWeaponCopies).toBe(3);
    expect(stats.items.map((item) => [item.label, item.value])).toEqual([
      ["Tracked", "2"], ["Complete", "1/2"], ["Weapon copies", "3"], ["Storage", "v1"],
    ]);
  });
});
