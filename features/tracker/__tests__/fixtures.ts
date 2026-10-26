import { createEchoSet } from "../echo-sets";
import type { EchoSet, TrackedCharacter } from "../types";

/**
 * Creates a detailed set with independent factual and priority-only measurements.
 * @param overrides - Specific set fields to replace for a test.
 * @returns A fresh detailed set.
 */
export function makeEchoSet(overrides: Partial<EchoSet> = {}): EchoSet {
  const set = createEchoSet("char-1-default");
  set.mode = "detailed";
  set.actualEr = 118;
  set.echoes.fourCost = {
    critRate: 10.5,
    critDmg: 21,
    substatIds: ["atk-percent", "heavy", null, null, null],
    prioritySubstatIds: ["crit-rate", "crit-dmg", "energy-regen", null, null],
  };
  set.checklist = {
    fourCost: false, threeCostA: true, threeCostB: false, oneCostA: true, oneCostB: false,
  };

  return { ...set, ...overrides };
}

/**
 * Creates a complete tracked character fixture with one independently allocated set.
 * @param overrides - Specific character fields to replace for a test.
 * @returns A fresh tracked character.
 */
export function makeTrackedCharacter(overrides: Partial<TrackedCharacter> = {}): TrackedCharacter {
  return {
    id: "char-1",
    characterId: 101,
    characterName: "Rover",
    weaponId: 201,
    weaponName: "Emerald of Genesis",
    skillsDone: true,
    expectedEr: 120,
    echoSets: [makeEchoSet()],
    notes: "main team",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}
