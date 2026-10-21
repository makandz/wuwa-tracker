import { describe, expect, test } from "vitest";

import { sortCharactersByReleaseOrder } from "../character-release-order";
import type { ApiCharacter } from "../types";

function makeCharacters(ids: number[]): ApiCharacter[] {
  return ids.map((Id) => ({ Id, Name: `Character ${Id}`, QualityId: 5 }));
}

describe("character release order", () => {
  test("orders the latest roster newest first from shuffled catalog input", () => {
    const characters = makeCharacters([
      1309, 1109, 1610, 1413, 1312, 1511, 1110, 1211, 1310, 1311, 1308, 1212,
    ]);

    expect(sortCharactersByReleaseOrder(characters).map(({ Id }) => Id)).toEqual([
      1312, 1311, 1212, 1413, 1110, 1610, 1310, 1309, 1109, 1308, 1511, 1211,
    ]);
  });

  test.each([1309, 1310])("orders Electro Rover %i when the other variant is absent", (roverId) => {
    const characters = makeCharacters([1109, roverId, 1610, 1110]);

    expect(sortCharactersByReleaseOrder(characters).map(({ Id }) => Id)).toEqual([
      1110, 1610, roverId, 1109,
    ]);
  });

  test("keeps unknown IDs first in descending order, including lower IDs", () => {
    const characters = makeCharacters([1109, 1000, 1312, 9000, 1212]);

    expect(sortCharactersByReleaseOrder(characters).map(({ Id }) => Id)).toEqual([
      9000, 1000, 1312, 1212, 1109,
    ]);
  });

  test("returns a new array without changing input order or character objects", () => {
    const characters = Object.freeze(makeCharacters([1109, 1312]));
    const sorted = sortCharactersByReleaseOrder(characters);

    expect(sorted).not.toBe(characters);
    expect(characters.map(({ Id }) => Id)).toEqual([1109, 1312]);
    expect(sorted[0]).toBe(characters[1]);
    expect(sorted[1]).toBe(characters[0]);
  });
});
