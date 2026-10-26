import { describe, expect, test } from "vitest";

import {
  getRedundantErRollCount, getEchoCheckerCritValueRating, getEchoCheckerScore,
  getEchoCheckerSubstatBoosts, getEchoCheckerSubstatOptions, getEchoSetChecklist,
  getIgnoredErEchoKeys, getRatingGrade, getEchoSetScore, getErStatus,
  isEchoCheckerEchoComplete, reconcileEchoCheckerSubstats, isComplete,
} from "../echo-rating";
import { parseEchoPrioritySubstats } from "../../echo-estimates";
import { createEchoSet } from "../../echo-sets";
import { makeTrackedCharacter } from "../../__tests__/fixtures";
import type { EchoCheckerEcho, EchoSet } from "../../types";

const priority =
  "CRIT Rate = CRIT DMG > ATK% = Heavy Attack DMG% > ATK > Resonance Skill DMG%";

/** Creates two distinct ER-bearing echoes for independent-set scoring tests. */
function makeErSet(overrides: Partial<EchoSet> = {}): EchoSet {
  const set = createEchoSet("er-set");
  set.mode = "detailed";
  set.scoring = "standard-crit";
  set.actualEr = 111;
  set.echoes.fourCost = {
    critRate: 6.3, critDmg: 12.6,
    substatIds: ["energy-regen", null, null, null, null],
    prioritySubstatIds: [null, null, null, null, null],
  };
  set.echoes.threeCostA = {
    critRate: 10.5, critDmg: 21,
    substatIds: ["energy-regen", null, null, null, null],
    prioritySubstatIds: [null, null, null, null, null],
  };

  return { ...set, ...overrides };
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
        substatIds: [null, null, null, null, null],
        prioritySubstatIds: [null, null, null, null, null],
        critRate: 7.5,
        critDmg: 15,
      }),
    ).toBe(1);
    expect(
      getEchoCheckerCritValueRating({
        substatIds: [null, null, null, null, null],
        prioritySubstatIds: [null, null, null, null, null],
        critRate: 10.5,
        critDmg: 21,
      }),
    ).toBe(1.2);
  });

  test("adds prioritized substat boosts and ignores unprioritized selections", () => {
    const prioritizedEcho: EchoCheckerEcho = {
      prioritySubstatIds: [null, null, null, null, null],
      critRate: 7.5,
      critDmg: 15,
      substatIds: ["atk-percent", "atk", "skill", null, null],
    };
    const erEcho: EchoCheckerEcho = {
      prioritySubstatIds: [null, null, null, null, null],
      critRate: 7.5,
      critDmg: 15,
      substatIds: ["energy-regen", null, null, null, null],
    };

    expect(getEchoCheckerScore(prioritizedEcho, priority)).toBe(1.18);
    expect(getEchoCheckerScore(erEcho, priority, false)).toBe(0.92);
    expect(getEchoCheckerScore(erEcho, priority, true)).toBe(0.92);
  });

  test("grades non-crit echoes by prioritized stat presence instead of roll values", () => {
    const supportPriority =
      "Energy Regen (Until Satisfied) > CRIT Rate = CRIT DMG > ATK% > ATK";
    const echo: EchoCheckerEcho = {
      substatIds: [null, null, null, null, null],
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
    expect(isEchoCheckerEchoComplete(echo, "priority-stats", false)).toBe(true);
    expect(isEchoCheckerEchoComplete(echo, "priority-stats", true)).toBe(false);

    const fullyTracked = makeErSet({
      scoring: "priority-stats",
      actualEr: 100,
    });

    for (const trackedEcho of Object.values(fullyTracked.echoes)) {
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

    expect(getEchoSetScore(1202, 100, fullyTracked)).toBe(1.05);
  });

  test("grades three non-crit stats from A- through A+ by priority", () => {
    const orderedPriority =
      "Energy Regen > CRIT Rate > CRIT DMG > ATK% > ATK";
    const score = (prioritySubstatIds: EchoCheckerEcho["prioritySubstatIds"]) =>
      getEchoCheckerScore(
        {
          critRate: null,
          critDmg: null,
          substatIds: [null, null, null, null, null],
          prioritySubstatIds,
        },
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
      substatIds: [null, null, null, null, null],
      critRate: null,
      critDmg: null,
      prioritySubstatIds: [null, null, null, null, null],
    };
    const fullEcho: EchoCheckerEcho = {
      substatIds: [null, null, null, null, null],
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
    expect(getEchoSetScore(1202, 100, makeErSet({
      scoring: "priority-stats", actualEr: 100,
    }))).toBe(0);
  });

  test("counts full excess ER rolls and treats unknown targets neutrally", () => {
    expect(getRedundantErRollCount(100, 110.24)).toBe(0);
    expect(getRedundantErRollCount(100, 110.25)).toBe(1);
    expect(getRedundantErRollCount(100, 120.49)).toBe(1);
    expect(getRedundantErRollCount(100, 120.5)).toBe(2);
    expect(getRedundantErRollCount(null, 150)).toBe(0);
    expect(getRedundantErRollCount(0, 150)).toBe(0);
    expect(getRedundantErRollCount(100, null)).toBe(0);
  });

  test("limits excess ER adjustments to the independently evaluated set", () => {
    const first = makeErSet();
    const second = makeErSet({ id: "other", actualEr: 100 });

    expect([...getIgnoredErEchoKeys(1202, 100, first)]).toEqual(["fourCost"]);
    expect([...getIgnoredErEchoKeys(1202, 100, second)]).toEqual([]);
    expect([...getIgnoredErEchoKeys(1202, 100, makeErSet({ actualEr: 141 }))]).toEqual(["fourCost", "threeCostA"]);
    expect(getEchoSetChecklist(1202, 100, first)).toMatchObject({ fourCost: false, threeCostA: true });
    expect(getEchoSetChecklist(1202, 100, second)).toMatchObject({ fourCost: true, threeCostA: true });
  });

  test("keeps Strict and Standard crit formulas equal while changing completion thresholds", () => {
    const standard = makeErSet({ actualEr: 100 });
    const strict = { ...standard, scoring: "strict-crit" as const };
    const echo = standard.echoes.fourCost;

    expect(isEchoCheckerEchoComplete(echo, "standard-crit")).toBe(true);
    expect(isEchoCheckerEchoComplete(echo, "strict-crit")).toBe(false);
    expect(getEchoSetChecklist(1202, 100, standard).fourCost).toBe(true);
    expect(getEchoSetChecklist(1202, 100, strict).fourCost).toBe(false);
    for (const echo of Object.values(standard.echoes)) {
      echo.critRate = 6.3;
      echo.critDmg = 12.6;
    }
    expect(getEchoSetScore(1202, 100, standard)).toBeTypeOf("number");
    expect(getEchoSetScore(1202, 100, strict)).toBe(getEchoSetScore(1202, 100, standard));
  });

  test("keeps manual completion independent of detailed measurements", () => {
    const set = makeErSet({ mode: "checklist" });
    set.checklist.fourCost = true;

    expect(getEchoSetScore(1202, 100, set)).toBeNull();
    expect(getEchoSetChecklist(1202, 100, set)).toEqual(set.checklist);
    expect(getEchoSetChecklist(1202, 100, { ...set, mode: "detailed" }).fourCost).toBe(false);
    expect(set.checklist.fourCost).toBe(true);
  });

  test("requires curated priorities for detailed scores and completion", () => {
    const set = makeErSet();

    expect(getEchoSetScore(999999, 100, set)).toBeNull();
    expect(Object.values(getEchoSetChecklist(999999, 100, set))).toEqual([false, false, false, false, false]);
  });

  test("colors actual ER against the shared minimum, with unknown values neutral", () => {
    expect(getErStatus(120, 120)).toBe("met");
    expect(getErStatus(130, 120)).toBe("met");
    expect(getErStatus(119.9, 120)).toBe("below");
    expect(getErStatus(null, 120)).toBe("unknown");
    expect(getErStatus(120, null)).toBe("unknown");
    expect(getErStatus(120, 0)).toBe("unknown");
  });

  test("requires shared skills and every set to be complete", () => {
    const set = createEchoSet("complete");
    for (const key of Object.keys(set.checklist)) Reflect.set(set.checklist, key, true);
    const character = makeTrackedCharacter({ echoSets: [set] });

    expect(isComplete(character)).toBe(true);
    expect(isComplete({ ...character, skillsDone: false })).toBe(false);
    expect(isComplete({ ...character, echoSets: [set, createEchoSet("incomplete")] })).toBe(false);
  });

  test("does not score empty critical echoes", () => {
    const echo = createEchoSet("empty").echoes.fourCost;
    expect(getEchoCheckerScore(echo, priority)).toBeNull();
  });

  test("clears unsupported selections only in the derived evaluation", () => {
    const echo = createEchoSet("empty").echoes.fourCost;
    echo.substatIds = ["atk-percent", "hp-percent", "skill", null, null];
    expect(reconcileEchoCheckerSubstats(echo, "ATK% > Skill")).toEqual(["atk-percent", null, "skill", null, null]);
    expect(echo.substatIds).toEqual(["atk-percent", "hp-percent", "skill", null, null]);
  });
});
