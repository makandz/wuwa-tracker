import type { FourCostMain, Role } from "../types";

export function getNextRolesAfterRoleToggle({
  multipleRoles,
  role,
  roles,
}: {
  multipleRoles: boolean;
  role: Role;
  roles: Role[];
}) {
  if (!multipleRoles) {
    return [role];
  }

  if (!roles.includes(role)) {
    return [...roles, role];
  }

  return roles.length > 1 ? roles.filter((item) => item !== role) : roles;
}

export function getRolesAfterMultipleRolesChange(roles: Role[], checked: boolean) {
  return checked ? roles : [roles[0] ?? "DPS"];
}

export function getFourCostMainSelection(fourCostMain: FourCostMain) {
  return {
    fourCostMain,
    noCrit: false,
  };
}

export function getNextNoCrit(current: boolean | undefined) {
  return !current;
}
