import type {
  Checklist,
  DashboardSortKey,
  EchoChecklistKey,
  EchoCheckerPlan,
  Role,
} from "./types";

export const CHARACTER_API = "https://api-v2.encore.moe/api/en/character";
export const WEAPON_API = "https://api-v2.encore.moe/api/en/weapon";
export const STORAGE_KEY = "wuwa-tracker.characters.v1";
export const INVENTORY_STORAGE_KEY = "wuwa-tracker.weapon-inventory.v1";
export const DASHBOARD_SORT_STORAGE_KEY = "wuwa-tracker.dashboard-sort.v1";
export const MATRIX_STORAGE_KEY = "wuwa-tracker.matrix-teams.v1";
export const WELCOME_SEEN_STORAGE_KEY = "wuwa-tracker.welcome-seen.v1";
export const BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY =
  "wuwa-tracker.backup-notice-acknowledged-at.v1";
export const BACKUP_NOTICE_FIRST_VISIT_DELAY_MS = 24 * 60 * 60 * 1000;
export const BACKUP_NOTICE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const PRYDWEN_CHARACTER_BASE_URL =
  "https://www.prydwen.gg/wuthering-waves/characters";
export const PRYDWEN_CHARACTER_SLUG_OVERRIDES: Record<string, string> = {};
// Prefer IDs when Matrix vigor data is available; names should be lowercase.
export const MATRIX_DOUBLE_USE_CHARACTER_IDS = new Set<number>([]);
export const MATRIX_DOUBLE_USE_CHARACTER_NAMES = new Set<string>([
  "baizhi",
  "buling",
  "mornye",
  "shorekeeper",
  "verina",
]);

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

export const ECHO_CHECKER_PLAN_OPTIONS: {
  label: string;
  value: EchoCheckerPlan;
}[] = [
  { label: "DPS", value: "DPS" },
  { label: "Hybrid/Support", value: "HybridSupport" },
];

export const ECHO_CRIT_RATE_VALUES = [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5];
export const ECHO_CRIT_DMG_VALUES = [12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21];

export const ECHO_RELEVANT_SUBSTAT_OPTIONS = [
  { id: "er", label: "ER", checked: true },
  { id: "atk", label: "ATK", checked: true },
  { id: "atk-percent", label: "ATK%", checked: true },
  { id: "hp", label: "HP", checked: false },
  { id: "hp-percent", label: "HP%", checked: false },
  { id: "def", label: "DEF", checked: false },
  { id: "def-percent", label: "DEF%", checked: false },
  { id: "basic", label: "Basic", checked: false },
  { id: "heavy", label: "Heavy", checked: false },
  { id: "skill", label: "Skill", checked: false },
  { id: "liberation", label: "Liberation", checked: false },
];

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

export const ECHO_CHECKLIST_ITEMS: {
  key: EchoChecklistKey;
  label: string;
}[] = [
  { key: "fourCost", label: "Echo 1" },
  { key: "threeCostA", label: "Echo 2" },
  { key: "threeCostB", label: "Echo 3" },
  { key: "oneCostA", label: "Echo 4" },
  { key: "oneCostB", label: "Echo 5" },
];
