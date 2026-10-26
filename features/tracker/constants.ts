import type { Checklist, EchoChecklistKey, EchoScoringPreset } from "./types";

export const CHARACTER_API = "https://api-v2.encore.moe/api/en/character";
export const WEAPON_API = "https://api-v2.encore.moe/api/en/weapon";
export const STORAGE_KEY = "wuwa-tracker.characters.v1";
export const INVENTORY_STORAGE_KEY = "wuwa-tracker.weapon-inventory.v1";
export const DASHBOARD_SORT_STORAGE_KEY = "wuwa-tracker.dashboard-sort.v1";
export const DASHBOARD_VIEW_STORAGE_KEY = "wuwa-tracker.dashboard-view.v1";
export const MATRIX_STORAGE_KEY = "wuwa-tracker.matrix-teams.v1";
export const WELCOME_SEEN_STORAGE_KEY = "wuwa-tracker.welcome-seen.v1";
export const BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY =
  "wuwa-tracker.backup-notice-acknowledged-at.v1";
export const TRACKER_DOCUMENT_STORAGE_KEY = "wuwa-tracker.document.v4";
export const TRACKER_DOCUMENT_LAST_KNOWN_GOOD_STORAGE_KEY =
  "wuwa-tracker.document.v4.lastKnownGood";
export const BACKUP_NOTICE_FIRST_VISIT_DELAY_MS = 24 * 60 * 60 * 1000;
export const BACKUP_NOTICE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const PRYDWEN_CHARACTER_BASE_URL =
  "https://www.prydwen.gg/wuthering-waves/characters";
export const PRYDWEN_CHARACTER_SLUG_OVERRIDES: Record<string, string> = {};
export const TETHYS_CHARACTER_BASE_URL = "https://tethys.gg/resonators";
// Prefer IDs when Matrix vigor data is available; names should be lowercase.
export const MATRIX_DOUBLE_USE_CHARACTER_IDS = new Set<number>([]);
export const MATRIX_DOUBLE_USE_CHARACTER_NAMES = new Set<string>([
  "baizhi",
  "buling",
  "chisa",
  "mornye",
  "shorekeeper",
  "verina",
]);

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

export const MAX_ECHO_SETS = 3;
export const ECHO_SCORING_OPTIONS: { label: string; value: EchoScoringPreset }[] = [
  { label: "Strict Crit", value: "strict-crit" },
  { label: "Standard Crit", value: "standard-crit" },
  { label: "Priority Stats", value: "priority-stats" },
];

export const ECHO_CRIT_RATE_VALUES = [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5];
export const ECHO_CRIT_DMG_VALUES = [12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21];

export const emptyChecklist: Checklist = {
  fourCost: false,
  threeCostA: false,
  threeCostB: false,
  oneCostA: false,
  oneCostB: false,
};

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
