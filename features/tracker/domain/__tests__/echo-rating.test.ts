import { describe, expect, test } from "vitest";

import {
  getCharacterRedundantErRollCount,
  getEchoCheckerCritValueRating,
  getEchoCheckerScore,
  getEchoCheckerSubstatBoosts,
  getEchoCheckerSubstatOptions,
  getEffectiveChecklist,
  getIgnoredErEchoKeys,
  isCharacterErOvercapped,
  isEchoCheckerEchoComplete,
  reconcileEchoCheckerSubstats,
} from "../echo-rating";
import { parseEchoPrioritySubstats } from "../../echo-estimates";
import type { EchoCheckerEcho, TrackedCharacter } from "../../types";

const priority =
  "CRIT Rate = CRIT DMG > ATK% = Heavy Attack DMG% > ATK > Resonance Skill DMG%";

function makeErCharacter(
  overrides: Partial<TrackedCharacter> = {},
): TrackedCharacter {
  return {
    id: "character",
    characterId: 1,
    characterName: "Test Character",
    roles: ["Hybrid"],
    weaponId: null,
    weaponName: "",
    fourCostMain: "CR",
    critRate: 0,
    critDmg: 0,
    checklist: {
      skills: true,
      fourCost: false,
      threeCostA: false,
      threeCostB: false,
      oneCostA: false,
      oneCostB: false,
    },
    echoChecker: {
      enabled: true,
      plan: "HybridSupport",
      echoes: {
        fourCost: {
          critRate: 6.3,
          critDmg: 12.6,
          substatIds: ["energy-regen", null, null],
        },
        threeCostA: {
          critRate: 10.5,
          critDmg: 21,
          substatIds: ["energy-regen", null, null],
        },
        threeCostB: {
          critRate: null,
          critDmg: null,
          substatIds: [null, null, null],
        },
        oneCostA: {
          critRate: null,
          critDmg: null,
          substatIds: [null, null, null],
        },
        oneCostB: {
          critRate: null,
          critDmg: null,
          substatIds: [null, null, null],
        },
      },
      substats: [],
    },
    substatPriority: priority,
    expectedEr: 100,
    actualEr: 111,
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("echo substat priorities", () => {
  test("preserves ordered equality tiers and treats >= as a descending relation", () => {
    expect(parseEchoPrioritySubstats(priority).priorityTiers).toEqual([
      ["crit-rate", "crit-dmg"],
      ["atk-percent", "heavy"],
      ["atk"],
      ["skill"],
    ]);
    expect(
      parseEchoPrioritySubstats("ER >= ATK% = Heavy > ATK").priorityTiers,
    ).toEqual([
      ["energy-regen"],
      ["atk-percent", "heavy"],
      ["atk"],
    ]);
  });

  test("builds checkbox options from non-crit priorities with ER and Other last", () => {
    expect(getEchoCheckerSubstatOptions(priority)).toEqual([
      "atk-percent",
      "heavy",
      "atk",
      "skill",
      "energy-regen",
      "other",
    ]);
  });

  test("uses fixed boosts for priority tiers and can ignore an ER roll", () => {
    expect(Object.fromEntries(getEchoCheckerSubstatBoosts(priority, false))).toMatchObject({
      "energy-regen": 0.11,
      "atk-percent": 0.1,
      heavy: 0.1,
      atk: 0.08,
      skill: 0.06,
      other: 0.05,
    });
    expect(getEchoCheckerSubstatBoosts(priority, true).get("energy-regen")).toBe(0);
    expect(getEchoCheckerSubstatBoosts("", false).get("other")).toBe(0.06);
    expect(getEchoCheckerSubstatBoosts("", true).get("energy-regen")).toBe(0);
  });

  test("soft-caps crit value above the 30 CV target", () => {
    expect(
      getEchoCheckerCritValueRating({
        critRate: 7.5,
        critDmg: 15,
      }),
    ).toBe(1);
    expect(
      getEchoCheckerCritValueRating({
        critRate: 10.5,
        critDmg: 21,
      }),
    ).toBe(1.2);
  });

  test("adds selected substat boosts to crit value and zeroes ignored ER", () => {
    const prioritizedEcho: EchoCheckerEcho = {
      critRate: 7.5,
      critDmg: 15,
      substatIds: ["atk-percent", "atk", "skill"],
    };
    const erEcho: EchoCheckerEcho = {
      critRate: 7.5,
      critDmg: 15,
      substatIds: ["energy-regen", null, null],
    };

    expect(getEchoCheckerScore(prioritizedEcho, priority)).toBe(1.16);
    expect(getEchoCheckerScore(erEcho, priority, false)).toBe(1.03);
    expect(getEchoCheckerScore(erEcho, priority, true)).toBe(0.92);
  });

  test("counts one redundant roll per full 10.25 ER above the target", () => {
    expect(
      getCharacterRedundantErRollCount(makeErCharacter({ actualEr: 110.24 })),
    ).toBe(0);
    expect(
      getCharacterRedundantErRollCount(makeErCharacter({ actualEr: 110.25 })),
    ).toBe(1);
    expect(
      getCharacterRedundantErRollCount(makeErCharacter({ actualEr: 120.49 })),
    ).toBe(1);
    expect(
      getCharacterRedundantErRollCount(makeErCharacter({ actualEr: 120.5 })),
    ).toBe(2);
    expect(isCharacterErOvercapped(makeErCharacter({ expectedEr: 0 }))).toBe(false);
  });

  test("ignores ER on the lowest-scoring echoes and caps at tracked ER rolls", () => {
    expect([...getIgnoredErEchoKeys(makeErCharacter())]).toEqual(["fourCost"]);
    expect(
      [
        ...getIgnoredErEchoKeys(
          makeErCharacter({
            actualEr: 141,
          }),
        ),
      ],
    ).toEqual(["fourCost", "threeCostA"]);
  });

  test("does not count ignored ER toward echo completion", () => {
    const character = makeErCharacter();
    const lowEcho = character.echoChecker!.echoes.fourCost;

    expect(isEchoCheckerEchoComplete(lowEcho, "HybridSupport")).toBe(true);
    expect(isEchoCheckerEchoComplete(lowEcho, "HybridSupport", true)).toBe(false);
    expect(getEffectiveChecklist(character)).toMatchObject({
      fourCost: false,
      threeCostA: true,
    });
  });

  test("converts unavailable and duplicate named stats to Other", () => {
    const echo: EchoCheckerEcho = {
      critRate: null,
      critDmg: null,
      substatIds: ["atk-percent", "atk-percent", "skill"],
    };

    expect(reconcileEchoCheckerSubstats(echo, "ATK% > ATK")).toEqual([
      "atk-percent",
      "other",
      "other",
    ]);
  });

  test("maps legacy checked targets to corresponding Other slots", () => {
    const echo: EchoCheckerEcho = {
      critRate: null,
      critDmg: null,
      hasRelevantStat: true,
      hasSecondRelevantStat: true,
      hasThirdRelevantStat: false,
    };

    expect(reconcileEchoCheckerSubstats(echo, priority)).toEqual([
      "other",
      "other",
      null,
    ]);
  });
});
