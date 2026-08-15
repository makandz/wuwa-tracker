import {
  DASHBOARD_SORT_KEYS,
  DASHBOARD_VIEW_MODES,
  DEFAULT_DASHBOARD_SORT_KEY,
  DEFAULT_DASHBOARD_VIEW_MODE,
  ECHO_CHECKLIST_ITEMS,
  FOUR_COST_OPTIONS,
  ROLES,
  emptyChecklist,
} from "../constants";
import type {
  Checklist,
  DashboardSortKey,
  DashboardViewMode,
  EchoChecker,
  EchoCheckerEcho,
  EchoCheckerPlan,
  EchoCheckerSubstat,
  EchoCheckerSubstatId,
  EchoCheckerSubstatSlots,
  FourCostMain,
  MatrixTeam,
  Role,
  TrackedCharacter,
  WeaponInventoryItem,
} from "../types";
import { TRACKER_APP_ID, TRACKER_SCHEMA_VERSION } from "./keys";
import { trackerDocumentV5Schema } from "./schemas/v5";

export type TrackerPreferences = {
  welcomeSeen: boolean;
  dashboardSortKey: DashboardSortKey;
  dashboardViewMode: DashboardViewMode;
  backupNoticeAcknowledgedAt: number;
};

export type TrackerDocumentV5 = {
  schemaVersion: typeof TRACKER_SCHEMA_VERSION;
  app: typeof TRACKER_APP_ID;
  savedAt: string;
  revision: number;
  data: {
    characters: TrackedCharacter[];
    weaponInventory: WeaponInventoryItem[];
    matrixTeams: MatrixTeam[];
    preferences: TrackerPreferences;
  };
};

export type ParsedImportedTrackerData = {
  characters: TrackedCharacter[];
  weaponInventory: WeaponInventoryItem[];
  matrixTeams: MatrixTeam[];
  preferences: TrackerPreferences | null;
};

export const DEFAULT_TRACKER_PREFERENCES: TrackerPreferences = {
  welcomeSeen: false,
  dashboardSortKey: DEFAULT_DASHBOARD_SORT_KEY,
  dashboardViewMode: DEFAULT_DASHBOARD_VIEW_MODE,
  backupNoticeAcknowledgedAt: 0,
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toNonNegativeInteger(value: unknown, fallback = 0) {
  return Math.max(0, Math.round(toFiniteNumber(value, fallback)));
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeTimestamp(value: unknown) {
  const timestamp = Number(value);

  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}

function normalizeSavedAt(value: unknown) {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return value;
  }

  return new Date().toISOString();
}

function normalizeRevision(value: unknown) {
  const revision = Number(value);

  return Number.isInteger(revision) && revision > 0 ? revision : 1;
}

function isFourCostMain(value: unknown): value is FourCostMain {
  return FOUR_COST_OPTIONS.some((option) => option.value === value);
}

function normalizeRoles(roles: unknown): Role[] {
  if (!Array.isArray(roles)) {
    return ["DPS"];
  }

  const normalizedRoles = roles.filter((role): role is Role =>
    ROLES.includes(role as Role),
  );

  return normalizedRoles.length > 0 ? normalizedRoles : ["DPS"];
}

function normalizeChecklist(checklist: unknown): Checklist {
  const candidate = isRecord(checklist) ? checklist : {};

  return {
    skills: candidate.skills === true,
    fourCost: candidate.fourCost === true,
    threeCostA: candidate.threeCostA === true,
    threeCostB: candidate.threeCostB === true,
    oneCostA: candidate.oneCostA === true,
    oneCostB: candidate.oneCostB === true,
  };
}

function normalizeEchoCheckerPlan(value: unknown): EchoCheckerPlan {
  return value === "HybridSupport" ? "HybridSupport" : "DPS";
}

function normalizeEchoCheckerSubstat(
  substat: unknown,
): EchoCheckerSubstat | null {
  if (!isRecord(substat)) {
    return null;
  }

  const id = toStringValue(substat.id);
  const label = toStringValue(substat.label);

  if (!id || !label) {
    return null;
  }

  return {
    id,
    label,
    checked: substat.checked === true,
  };
}

export function isDashboardSortKey(value: unknown): value is DashboardSortKey {
  return DASHBOARD_SORT_KEYS.includes(value as DashboardSortKey);
}

export function isDashboardViewMode(
  value: unknown,
): value is DashboardViewMode {
  return DASHBOARD_VIEW_MODES.includes(value as DashboardViewMode);
}

export function normalizePreferences(preferences: unknown): TrackerPreferences {
  const candidate = isRecord(preferences) ? preferences : {};

  return {
    welcomeSeen: candidate.welcomeSeen === true,
    dashboardSortKey: isDashboardSortKey(candidate.dashboardSortKey)
      ? candidate.dashboardSortKey
      : DEFAULT_DASHBOARD_SORT_KEY,
    dashboardViewMode: isDashboardViewMode(candidate.dashboardViewMode)
      ? candidate.dashboardViewMode
      : DEFAULT_DASHBOARD_VIEW_MODE,
    backupNoticeAcknowledgedAt: normalizeTimestamp(
      candidate.backupNoticeAcknowledgedAt,
    ),
  };
}

function normalizeEchoCheckerEcho(echo: unknown): EchoCheckerEcho {
  if (!isRecord(echo)) {
    return {
      critRate: null,
      critDmg: null,
      substatIds: [null, null, null, null, null],
    };
  }

  const rawSubstatIds = Array.isArray(echo.substatIds)
    ? echo.substatIds
    : null;
  const rawPrioritySubstatIds = Array.isArray(echo.prioritySubstatIds)
    ? echo.prioritySubstatIds
    : null;
  const allowedSubstatIds = new Set<EchoCheckerSubstatId>([
    "atk",
    "hp",
    "def",
    "atk-percent",
    "hp-percent",
    "def-percent",
    "energy-regen",
    "basic",
    "heavy",
    "skill",
    "liberation",
    "crit-rate",
    "crit-dmg",
  ]);
  const normalizeSubstatIds = (stats: unknown[]) => {
    const seenStats = new Set<EchoCheckerSubstatId>();

    return Array.from({ length: 5 }, (_, index) => {
      const stat = stats[index];

      if (
        typeof stat !== "string" ||
        !allowedSubstatIds.has(stat as EchoCheckerSubstatId) ||
        seenStats.has(stat as EchoCheckerSubstatId)
      ) {
        return null;
      }

      seenStats.add(stat as EchoCheckerSubstatId);
      return stat as EchoCheckerSubstatId;
    }) as EchoCheckerSubstatSlots;
  };
  const substatIds = rawSubstatIds && [3, 5].includes(rawSubstatIds.length)
    ? normalizeSubstatIds(rawSubstatIds)
    : [null, null, null, null, null] as EchoCheckerSubstatSlots;

  return {
    critRate: typeof echo.critRate === "number" ? echo.critRate : null,
    critDmg: typeof echo.critDmg === "number" ? echo.critDmg : null,
    substatIds,
    ...(rawPrioritySubstatIds?.length === 5
      ? { prioritySubstatIds: normalizeSubstatIds(rawPrioritySubstatIds) }
      : {}),
  };
}

function normalizeEchoChecker(echoChecker: unknown): EchoChecker | undefined {
  if (!isRecord(echoChecker)) {
    return undefined;
  }

  const rawEchoes = isRecord(echoChecker.echoes) ? echoChecker.echoes : {};
  const rawSubstats = Array.isArray(echoChecker.substats)
    ? echoChecker.substats
    : [];
  const substats = rawSubstats
    .map(normalizeEchoCheckerSubstat)
    .filter((substat): substat is EchoCheckerSubstat => substat !== null);

  return {
    enabled: echoChecker.enabled === true,
    plan: normalizeEchoCheckerPlan(echoChecker.plan),
    echoes: ECHO_CHECKLIST_ITEMS.reduce(
      (echoes, item) => ({
        ...echoes,
        [item.key]: normalizeEchoCheckerEcho(rawEchoes[item.key]),
      }),
      {} as EchoChecker["echoes"],
    ),
    substatPriority: toStringValue(echoChecker.substatPriority),
    substats,
  };
}

export function createEmptyMatrixTeam(id = "team-1"): MatrixTeam {
  return {
    id,
    slots: [null, null, null],
  };
}

export function ensureMatrixTeams(teams: MatrixTeam[]) {
  return teams.length > 0 ? teams : [createEmptyMatrixTeam()];
}

export function createTrackerDocumentV5({
  characters,
  weaponInventory,
  matrixTeams,
  preferences = DEFAULT_TRACKER_PREFERENCES,
  revision = 1,
  savedAt = new Date().toISOString(),
}: {
  characters: unknown;
  weaponInventory: unknown;
  matrixTeams: unknown;
  preferences?: unknown;
  revision?: unknown;
  savedAt?: unknown;
}): TrackerDocumentV5 {
  const document = {
    schemaVersion: TRACKER_SCHEMA_VERSION,
    app: TRACKER_APP_ID,
    savedAt: normalizeSavedAt(savedAt),
    revision: normalizeRevision(revision),
    data: {
      characters: normalizeCharacters(characters),
      weaponInventory: normalizeWeaponInventory(weaponInventory),
      matrixTeams: ensureMatrixTeams(normalizeMatrixTeams(matrixTeams)),
      preferences: normalizePreferences(preferences),
    },
  };

  return trackerDocumentV5Schema.parse(document) as TrackerDocumentV5;
}

export function normalizeTrackerDocumentV5(
  document: unknown,
): TrackerDocumentV5 | null {
  const result = trackerDocumentV5Schema.safeParse(document);

  if (!result.success) {
    return null;
  }

  return createTrackerDocumentV5({
    characters: result.data.data.characters,
    weaponInventory: result.data.data.weaponInventory,
    matrixTeams: result.data.data.matrixTeams,
    preferences: result.data.data.preferences,
    revision: result.data.revision,
    savedAt: result.data.savedAt,
  });
}

export function normalizeCharacters(characters: unknown): TrackedCharacter[] {
  if (!Array.isArray(characters)) {
    return [];
  }

  return characters
    .map(normalizeTrackedCharacter)
    .filter((character): character is TrackedCharacter => character !== null);
}

function normalizeTrackedCharacter(character: unknown): TrackedCharacter | null {
  if (!isRecord(character)) {
    return null;
  }

  const characterId = toNonNegativeInteger(character.characterId);
  const createdAt = normalizeSavedAt(character.createdAt);
  const characterName = toStringValue(character.characterName);
  const id = toStringValue(
    character.id,
    characterId > 0
      ? `${characterId}-${createdAt}`
      : characterName
        ? `${characterName}-${createdAt}`
        : "",
  );

  if (!id || (characterId === 0 && !characterName)) {
    return null;
  }

  const echoChecker = normalizeEchoChecker(character.echoChecker);
  const legacySubstatPriority =
    echoChecker && typeof echoChecker.substatPriority === "string"
      ? echoChecker.substatPriority
      : "";
  const checklist = normalizeChecklist(character.checklist);

  return {
    id,
    characterId,
    characterName: characterName || id,
    roles: normalizeRoles(character.roles),
    weaponId: toNullableNumber(character.weaponId),
    weaponName: toStringValue(character.weaponName),
    fourCostMain: isFourCostMain(character.fourCostMain)
      ? character.fourCostMain
      : "CR",
    noCrit: character.noCrit === true,
    critRate: toFiniteNumber(character.critRate),
    critDmg: toFiniteNumber(character.critDmg),
    checklist: {
      ...emptyChecklist,
      ...checklist,
    },
    echoChecker,
    substatPriority: toStringValue(
      character.substatPriority,
      legacySubstatPriority,
    ),
    expectedEr: toFiniteNumber(character.expectedEr),
    actualEr: toFiniteNumber(character.actualEr),
    notes: toStringValue(character.notes),
    createdAt,
    updatedAt: normalizeSavedAt(character.updatedAt ?? createdAt),
  };
}

export function normalizeWeaponInventory(
  inventory: unknown,
): WeaponInventoryItem[] {
  if (!Array.isArray(inventory)) {
    return [];
  }

  return inventory
    .filter(isRecord)
    .map((item) => ({
      weaponId: Number(item.weaponId),
      count: Math.max(0, Math.round(Number(item.count) || 0)),
    }))
    .filter((item) => item.weaponId && item.count > 0);
}

export function normalizeMatrixTeams(teams: unknown): MatrixTeam[] {
  if (!Array.isArray(teams)) {
    return [];
  }

  return teams
    .map((team, index) => {
      const candidate = isRecord(team) ? team : {};
      const rawSlots = Array.isArray(candidate.slots) ? candidate.slots : [];
      const slots = [0, 1, 2].map((slotIndex) => {
        const value = rawSlots[slotIndex];

        return typeof value === "string" && value ? value : null;
      }) as MatrixTeam["slots"];

      return {
        id:
          typeof candidate.id === "string" && candidate.id
            ? candidate.id
            : `team-${index + 1}`,
        slots,
      };
    })
    .filter((team) => team.slots.length === 3);
}
