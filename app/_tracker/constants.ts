import type { Checklist, DashboardSortKey, Role } from "./types";

export const CHARACTER_API = "https://api-v2.encore.moe/api/en/character";
export const WEAPON_API = "https://api-v2.encore.moe/api/en/weapon";
export const STORAGE_KEY = "wuwa-tracker.characters.v1";
export const INVENTORY_STORAGE_KEY = "wuwa-tracker.weapon-inventory.v1";
export const DASHBOARD_SORT_STORAGE_KEY = "wuwa-tracker.dashboard-sort.v1";
export const PRYDWEN_CHARACTER_BASE_URL =
  "https://www.prydwen.gg/wuthering-waves/characters";
export const PRYDWEN_CHARACTER_SLUG_OVERRIDES: Record<string, string> = {};

export const ROLES: Role[] = ["DPS", "Hybrid", "Support"];
export const DASHBOARD_SORT_KEYS: DashboardSortKey[] = [
  "updated",
  "name",
  "completionDesc",
  "completionAsc",
  "weightDesc",
  "weightAsc",
];
export const DEFAULT_DASHBOARD_SORT_KEY: DashboardSortKey = "weightDesc";

export const STANDARD_FIVE_STAR_WEAPONS = new Set([
  "abyss surges",
  "boson astrolabe",
  "cosmic ripples",
  "emerald of genesis",
  "laser shearer",
  "lustrous razor",
  "phasic homogenizer",
  "pulsation bracer",
  "radiance cleaver",
  "static mist",
]);

export const FOUR_COST_OPTIONS = [
  { label: "Crit Rate", value: "CR" },
  { label: "Crit DMG", value: "CD" },
  { label: "CR/CD", value: "BOTH" },
] as const;

export const emptyChecklist: Checklist = {
  skills: false,
  fourCost: false,
  threeCostA: false,
  threeCostB: false,
  oneCostA: false,
  oneCostB: false,
};

export const CHECKLIST_SEGMENTS: {
  key: keyof Checklist;
  label: string;
  shortLabel: string;
}[] = [
  { key: "skills", label: "Skills", shortLabel: "Sk" },
  { key: "fourCost", label: "4 cost echo", shortLabel: "E1" },
  { key: "threeCostA", label: "3 cost echo 1", shortLabel: "E2" },
  { key: "threeCostB", label: "3 cost echo 2", shortLabel: "E3" },
  { key: "oneCostA", label: "1 cost echo 1", shortLabel: "E4" },
  { key: "oneCostB", label: "1 cost echo 2", shortLabel: "E5" },
];
export const CHECKLIST_ITEM_COUNT = Object.keys(emptyChecklist).length;
