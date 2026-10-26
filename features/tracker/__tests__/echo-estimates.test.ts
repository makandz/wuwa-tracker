import { expect, test } from "vitest";

import { getMakanEchoEstimate } from "../echo-estimates";

test("includes Balanced's single-crit path only when four priority stats are available", () => {
  const threeTargets = getMakanEchoEstimate({ substatPriority: "CRIT Rate = CRIT DMG > ATK% = ATK = Liberation DMG%" });
  const fourTargets = getMakanEchoEstimate({ substatPriority: "CRIT Rate = CRIT DMG > ATK% = ATK = Liberation DMG% = Energy Regen" });
  const threeTargetBalanced = threeTargets.rows.find((row) => row.id === "hybrid-support");
  const fourTargetBalanced = fourTargets.rows.find((row) => row.id === "hybrid-support");

  // Of 13P5 roll sequences, the four-target case adds 192 surviving single-crit paths.
  expect(threeTargetBalanced?.chance).toBeCloseTo(8472 / 154440, 10);
  expect(fourTargetBalanced?.chance).toBeCloseTo((10560 + 192) / 154440, 10);
  expect(fourTargetBalanced?.label).toContain("Balanced");
});
