import { describe, expect, test } from "vitest";

import {
  getEchoCheckerCritValueRating,
  getEchoCheckerScore,
  getEchoCheckerSubstatBoosts,
  getEchoCheckerSubstatOptions,
  reconcileEchoCheckerSubstats,
} from "../echo-rating";
import { parseEchoPrioritySubstats } from "../../echo-estimates";
import type { EchoCheckerEcho } from "../../types";

const priority =
  "CRIT Rate = CRIT DMG > ATK% = Heavy Attack DMG% > ATK > Resonance Skill DMG%";

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

  test("uses fixed boosts for priority tiers, ER, Other, and overcapped ER", () => {
    expect(Object.fromEntries(getEchoCheckerSubstatBoosts(priority, false))).toMatchObject({
      "energy-regen": 0.11,
      "atk-percent": 0.1,
      heavy: 0.1,
      atk: 0.08,
      skill: 0.06,
      other: 0.05,
    });
    expect(getEchoCheckerSubstatBoosts(priority, true).get("energy-regen")).toBe(0.025);
    expect(getEchoCheckerSubstatBoosts("", false).get("other")).toBe(0.06);
    expect(getEchoCheckerSubstatBoosts("", true).get("energy-regen")).toBe(0.03);
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

  test("adds selected substat boosts to crit value and lowers overcapped ER", () => {
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
    expect(getEchoCheckerScore(erEcho, priority, true)).toBe(0.95);
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
