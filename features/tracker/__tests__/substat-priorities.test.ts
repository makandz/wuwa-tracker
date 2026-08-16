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
    expect(Object.keys(substatPriorities)).toHaveLength(60);

    for (const [characterId, priority] of Object.entries(substatPriorities)) {
      expect(Number(characterId)).toBeGreaterThan(0);
      expect(priority.trim()).not.toBe("");
      expect(parseEchoPrioritySubstats(priority).priorityTiers.length).toBeGreaterThan(0);
    }
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
