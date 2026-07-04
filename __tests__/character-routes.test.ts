import { describe, expect, test } from "vitest";

import {
  findTrackedCharacterByRouteSegment,
  getTrackedCharacterRouteSegment,
  slugifyCharacterName,
} from "../app/_tracker/domain";
import type { TrackedCharacter } from "../app/_tracker/types";

function makeCharacter(overrides: Partial<TrackedCharacter> = {}): TrackedCharacter {
  return {
    id: "char-1",
    characterId: 1210,
    characterName: "Aemeath",
    roles: ["DPS"],
    weaponId: null,
    weaponName: "",
    fourCostMain: "CR",
    critRate: 0,
    critDmg: 0,
    checklist: {
      skills: false,
      fourCost: false,
      threeCostA: false,
      threeCostB: false,
      oneCostA: false,
      oneCostB: false,
    },
    substatPriority: "",
    expectedEr: 0,
    actualEr: 0,
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("character route segments", () => {
  test("uses a readable slug from the character name", () => {
    expect(slugifyCharacterName("Rover: Aero")).toBe("rover-aero");
    expect(slugifyCharacterName("Xiangli Yao")).toBe("xiangli-yao");
  });

  test("uses the name slug when tracked character names are unique", () => {
    const characters = [makeCharacter()];

    expect(getTrackedCharacterRouteSegment(characters[0], characters)).toBe("aemeath");
    expect(findTrackedCharacterByRouteSegment("aemeath", characters)).toBe(characters[0]);
  });

  test("adds the catalog id when two tracked characters share a name slug", () => {
    const characters = [
      makeCharacter({
        id: "rover-aero-1",
        characterId: 1408,
        characterName: "Rover: Aero",
      }),
      makeCharacter({
        id: "rover-aero-2",
        characterId: 1406,
        characterName: "Rover: Aero",
      }),
    ];

    expect(getTrackedCharacterRouteSegment(characters[0], characters)).toBe(
      "rover-aero-1408",
    );
    expect(getTrackedCharacterRouteSegment(characters[1], characters)).toBe(
      "rover-aero-1406",
    );
    expect(findTrackedCharacterByRouteSegment("rover-aero-1406", characters)).toBe(
      characters[1],
    );
  });

  test("keeps old timestamp id URLs working", () => {
    const characters = [
      makeCharacter({
        id: "1210-2026-07-01T18:00:39.915Z",
      }),
    ];

    expect(
      findTrackedCharacterByRouteSegment(
        "1210-2026-07-01T18%3A00%3A39.915Z",
        characters,
      ),
    ).toBe(characters[0]);
  });
});
