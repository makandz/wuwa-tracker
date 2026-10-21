import { describe, expect, test } from "vitest";

import substatPriorities from "../data/substat-priorities.json";
import { parseEchoPrioritySubstats } from "../echo-estimates";
import { getCharacterSubstatPriority } from "../substat-priorities";

describe("curated substat priorities", () => {
  test("looks up priorities by Encore character id", () => {
    expect(getCharacterSubstatPriority(1203)).toContain("CRIT Rate = CRIT DMG");
    expect(getCharacterSubstatPriority(999999)).toBeNull();
  });

  test("contains non-empty, parseable priorities", () => {
    expect(Object.keys(substatPriorities)).toHaveLength(63);

    for (const [characterId, priority] of Object.entries(substatPriorities)) {
      expect(Number(characterId)).toBeGreaterThan(0);
      expect(priority.trim()).not.toBe("");
      expect(parseEchoPrioritySubstats(priority).priorityTiers.length).toBeGreaterThan(0);
    }
  });

  test.each([
    {
      characterId: 1413,
      name: "Qingxiao",
      priority: "Energy Regen (Until Satisfied) > CRIT Rate = CRIT DMG > ATK% > ATK > Heavy/Liberation/Basic DMG%",
      tiers: [
        ["energy-regen"],
        ["crit-rate", "crit-dmg"],
        ["atk-percent"],
        ["atk"],
        ["heavy", "liberation", "basic"],
      ],
    },
    {
      characterId: 1311,
      name: "Hsin",
      priority: "Energy Regen (Until Satisfied) > CRIT Rate = CRIT DMG > ATK% = Skill DMG% > ATK",
      tiers: [
        ["energy-regen"],
        ["crit-rate", "crit-dmg"],
        ["atk-percent", "skill"],
        ["atk"],
      ],
    },
    {
      characterId: 1212,
      name: "Jingran",
      priority: "Energy Regen (Until Satisfied) > HP (Until 50000) > CRIT Rate = CRIT DMG > Heavy DMG% > ATK% > ATK",
      tiers: [
        ["energy-regen"],
        ["hp"],
        ["crit-rate", "crit-dmg"],
        ["heavy"],
        ["atk-percent"],
        ["atk"],
      ],
    },
  ])("preserves $name's published priority and parsed tiers", ({ characterId, priority, tiers }) => {
    const actual = getCharacterSubstatPriority(characterId);

    expect(actual).toBe(priority);
    expect(parseEchoPrioritySubstats(actual ?? "")).toEqual({
      priorityTiers: tiers,
      otherTargetStats: tiers.flat().filter((stat) => stat !== "crit-rate" && stat !== "crit-dmg"),
      usedFallback: false,
    });
  });

  test("leaves Suoming unavailable until Prydwen publishes build priorities", () => {
    expect(getCharacterSubstatPriority(1312)).toBeNull();
  });

  test("keeps the corrected separator in character 1610's priority", () => {
    expect(getCharacterSubstatPriority(1610)).toBe(
      "Energy Regen (Until Satisfied) > CRIT Rate = CRIT DMG > ATK% = Heavy DMG% > ATK",
    );
  });

  test("includes Heavy Attack DMG% in Zani's priority", () => {
    expect(getCharacterSubstatPriority(1507)).toBe(
      "Energy Regen (Until Satisfied) > CRIT Rate = CRIT DMG > ATK% > Heavy Attack DMG% > ATK",
    );
  });
});
