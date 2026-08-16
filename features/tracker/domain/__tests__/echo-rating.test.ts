import { describe, expect, test } from "vitest";

import {
  getCharacterRedundantErRollCount,
  getEchoCheckerCritValueRating,
  getEchoCheckerScore,
  getEchoCheckerSubstatBoosts,
  getEchoCheckerSubstatOptions,
  getEffectiveChecklist,
  getIgnoredErEchoKeys,
  getRatingGrade,
  getRatings,
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
    characterId: 1202,
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

  test("builds checkbox options from prioritized non-crit stats only", () => {
    expect(getEchoCheckerSubstatOptions(priority)).toEqual([
      "atk-percent",
      "heavy",
      "atk",
      "skill",
    ]);
  });

  test("builds priority-only options from parsed priorities", () => {
    expect(
      getEchoCheckerSubstatOptions(
        "Energy Regen (Until Satisfied) > CRIT Rate = CRIT DMG > ATK% > ATK",
        true,
      ),
    ).toEqual([
      "energy-regen",
      "crit-rate",
      "crit-dmg",
      "atk-percent",
      "atk",
    ]);
  });

  test("uses mode-specific boosts for priority tiers and can ignore an ER roll", () => {
    expect(Object.fromEntries(getEchoCheckerSubstatBoosts(priority, false))).toMatchObject({
      "energy-regen": 0.11,
      "atk-percent": 0.12,
      heavy: 0.12,
      atk: 0.09,
      skill: 0.05,
      hp: 0.05,
    });
    expect(
      Object.fromEntries(getEchoCheckerSubstatBoosts(priority, false, true)),
    ).toMatchObject({
      "crit-rate": 0.2,
      "crit-dmg": 0.2,
      "atk-percent": 0.17,
      heavy: 0.17,
      atk: 0.15,
      skill: 0.12,
    });
    expect(getEchoCheckerSubstatBoosts(priority, true).get("energy-regen")).toBe(0);
    expect(getEchoCheckerSubstatBoosts("", false).get("hp")).toBe(0.06);
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

  test("adds prioritized substat boosts and ignores unprioritized selections", () => {
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

    expect(getEchoCheckerScore(prioritizedEcho, priority)).toBe(1.18);
    expect(getEchoCheckerScore(erEcho, priority, false)).toBe(0.92);
    expect(getEchoCheckerScore(erEcho, priority, true)).toBe(0.92);
  });

  test("grades non-crit echoes by prioritized stat presence instead of roll values", () => {
    const supportPriority =
      "Energy Regen (Until Satisfied) > CRIT Rate = CRIT DMG > ATK% > ATK";
    const echo: EchoCheckerEcho = {
      critRate: 10.5,
      critDmg: 21,
      prioritySubstatIds: [
        "energy-regen",
        "crit-rate",
        "crit-dmg",
        null,
        null,
      ],
    };

    expect(getEchoCheckerScore(echo, supportPriority, false, true)).toBe(1.05);
    expect(
      getEchoCheckerScore(
        { ...echo, critRate: 6.3, critDmg: 12.6 },
        supportPriority,
        false,
        true,
      ),
    ).toBe(1.05);
    expect(getEchoCheckerScore(echo, supportPriority, true, true)).toBe(0.68);
    expect(isEchoCheckerEchoComplete(echo, "HybridSupport", false, true)).toBe(true);
    expect(isEchoCheckerEchoComplete(echo, "HybridSupport", true, true)).toBe(false);

    const fullyTracked = makeErCharacter({
      noCrit: true,
      actualEr: 100,
      substatPriority: supportPriority,
    });

    for (const trackedEcho of Object.values(fullyTracked.echoChecker!.echoes)) {
      trackedEcho.critRate = null;
      trackedEcho.critDmg = null;
      trackedEcho.prioritySubstatIds = [
        "energy-regen",
        "crit-rate",
        "crit-dmg",
        null,
        null,
      ];
    }

    expect(getRatings(fullyTracked)).toMatchObject({
      crRating: null,
      cdRating: null,
      critScore: null,
      buildScore: 1.05,
      issue: "",
    });
  });

  test("grades three non-crit stats from A- through A+ by priority", () => {
    const orderedPriority =
      "Energy Regen > CRIT Rate > CRIT DMG > ATK% > ATK";
    const score = (prioritySubstatIds: EchoCheckerEcho["prioritySubstatIds"]) =>
      getEchoCheckerScore(
        { critRate: null, critDmg: null, prioritySubstatIds },
        orderedPriority,
        false,
        true,
      );

    const topThree = score([
      "energy-regen",
      "crit-rate",
      "crit-dmg",
      null,
      null,
    ]);
    const middleThree = score([
      "crit-rate",
      "crit-dmg",
      "atk-percent",
      null,
      null,
    ]);
    const bottomThree = score([
      "crit-dmg",
      "atk-percent",
      "atk",
      null,
      null,
    ]);

    expect(topThree).toBe(1.05);
    expect(middleThree).toBe(0.99);
    expect(bottomThree).toBe(0.93);
    expect(getRatingGrade(topThree!)).toBe("A+");
    expect(getRatingGrade(middleThree!)).toBe("A");
    expect(getRatingGrade(bottomThree!)).toBe("A-");
  });

  test("rates empty non-crit echoes as zero and five selected stats as S+", () => {
    const supportPriority =
      "Energy Regen (Until Satisfied) > CRIT Rate = CRIT DMG > ATK% > ATK";
    const emptyEcho: EchoCheckerEcho = {
      critRate: null,
      critDmg: null,
      prioritySubstatIds: [null, null, null, null, null],
    };
    const fullEcho: EchoCheckerEcho = {
      critRate: null,
      critDmg: null,
      prioritySubstatIds: [
        "energy-regen",
        "crit-rate",
        "crit-dmg",
        "atk-percent",
        "atk",
      ],
    };
    const fullScore = getEchoCheckerScore(
      fullEcho,
      supportPriority,
      false,
      true,
    );

    expect(getEchoCheckerScore(emptyEcho, supportPriority, false, true)).toBe(0);
    expect(fullScore).toBe(1.66);
    expect(getRatingGrade(fullScore!)).toBe("S+");
    expect(
      getRatings(
        makeErCharacter({
          noCrit: true,
          actualEr: 100,
          substatPriority: supportPriority,
        }),
      ),
    ).toMatchObject({ buildScore: 0, issue: "" });
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

  test("does not fall back to a legacy stored priority when curated data is missing", () => {
    expect(
      getRatings(
        makeErCharacter({
          characterId: 999999,
          substatPriority: priority,
        }),
      ),
    ).toMatchObject({
      buildScore: null,
      issue: "",
    });
  });

  test("ignores legacy checked targets that have no factual substat identity", () => {
    const echo: EchoCheckerEcho = {
      critRate: null,
      critDmg: null,
      hasRelevantStat: true,
      hasSecondRelevantStat: true,
      hasThirdRelevantStat: false,
    };

    expect(getEchoCheckerScore(echo, priority)).toBeNull();
  });

  test("clears selected stats that are no longer prioritized", () => {
    const echo: EchoCheckerEcho = {
      critRate: null,
      critDmg: null,
      substatIds: ["atk-percent", "hp-percent", "skill", null, null],
    };

    expect(reconcileEchoCheckerSubstats(echo, "ATK% > Skill")).toEqual([
      "atk-percent",
      null,
      "skill",
      null,
      null,
    ]);
  });
});
