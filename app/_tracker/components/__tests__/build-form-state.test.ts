import { describe, expect, test } from "vitest";

import {
  getFourCostMainSelection,
  getNextNoCrit,
  getNextRolesAfterRoleToggle,
  getRolesAfterMultipleRolesChange,
} from "../build-form-state";

describe("build form state helpers", () => {
  test("single-role toggles replace the selected role", () => {
    expect(
      getNextRolesAfterRoleToggle({
        multipleRoles: false,
        role: "Support",
        roles: ["DPS"],
      }),
    ).toEqual(["Support"]);
  });

  test("multiple-role toggles add and remove roles without allowing empty roles", () => {
    expect(
      getNextRolesAfterRoleToggle({
        multipleRoles: true,
        role: "Hybrid",
        roles: ["DPS"],
      }),
    ).toEqual(["DPS", "Hybrid"]);

    expect(
      getNextRolesAfterRoleToggle({
        multipleRoles: true,
        role: "DPS",
        roles: ["DPS", "Hybrid"],
      }),
    ).toEqual(["Hybrid"]);

    expect(
      getNextRolesAfterRoleToggle({
        multipleRoles: true,
        role: "DPS",
        roles: ["DPS"],
      }),
    ).toEqual(["DPS"]);
  });

  test("leaving multiple-role mode keeps the first selected role or DPS fallback", () => {
    expect(getRolesAfterMultipleRolesChange(["Hybrid", "Support"], false)).toEqual([
      "Hybrid",
    ]);
    expect(getRolesAfterMultipleRolesChange([], false)).toEqual(["DPS"]);
    expect(getRolesAfterMultipleRolesChange(["DPS", "Support"], true)).toEqual([
      "DPS",
      "Support",
    ]);
  });

  test("four-cost selection clears no-crit and no-crit toggles independently", () => {
    expect(getFourCostMainSelection("CD")).toEqual({
      fourCostMain: "CD",
      noCrit: false,
    });
    expect(getNextNoCrit(false)).toBe(true);
    expect(getNextNoCrit(true)).toBe(false);
    expect(getNextNoCrit(undefined)).toBe(true);
  });
});
