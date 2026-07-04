"use client";

import { FOUR_COST_OPTIONS, ROLES } from "../constants";
import type { FourCostMain, Role } from "../types";
import { RoleToggle } from "./ui";

const fourCostButtonBaseClass =
  "h-10 rounded-md border px-3 text-sm font-semibold transition";
const fourCostButtonActiveClass =
  "border-app-accent-strong bg-app-accent-strong text-app-bg";
const fourCostButtonIdleClass =
  "border-app-border bg-app-bg text-app-muted-subtle hover:border-app-muted-dim hover:bg-app-surface hover:text-app-muted";

export function RoleSelectionControl({
  multipleRoles,
  onMultipleRolesChange,
  onToggleRole,
  roles,
}: {
  multipleRoles: boolean;
  onMultipleRolesChange: (checked: boolean) => void;
  onToggleRole: (role: Role) => void;
  roles: Role[];
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-app-muted">Roles</div>
        <label className="flex items-center gap-2 text-sm font-medium text-app-muted-subtle">
          <input
            checked={multipleRoles}
            className="h-4 w-4 accent-app-accent"
            onChange={(event) => onMultipleRolesChange(event.target.checked)}
            type="checkbox"
          />
          Multiple roles?
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => (
          <RoleToggle
            active={roles.includes(role)}
            key={role}
            onToggle={() => onToggleRole(role)}
            role={role}
          />
        ))}
      </div>
    </div>
  );
}

export function FourCostMainControl({
  fourCostMain,
  noCrit,
  onSelectFourCostMain,
  onToggleNoCrit,
}: {
  fourCostMain: FourCostMain;
  noCrit: boolean | undefined;
  onSelectFourCostMain: (fourCostMain: FourCostMain) => void;
  onToggleNoCrit: () => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-app-muted">4 Cost Main Stat</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FOUR_COST_OPTIONS.map((option) => {
          const active = !noCrit && fourCostMain === option.value;

          return (
            <button
              className={`${fourCostButtonBaseClass} ${
                active ? fourCostButtonActiveClass : fourCostButtonIdleClass
              }`}
              aria-pressed={active}
              key={option.value}
              onClick={() => onSelectFourCostMain(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
        <button
          className={`${fourCostButtonBaseClass} ${
            noCrit ? fourCostButtonActiveClass : fourCostButtonIdleClass
          }`}
          aria-pressed={noCrit}
          onClick={onToggleNoCrit}
          type="button"
        >
          No crit
        </button>
      </div>
    </div>
  );
}
