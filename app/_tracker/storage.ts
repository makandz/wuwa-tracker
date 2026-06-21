import {
  BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
  DASHBOARD_SORT_KEYS,
  DASHBOARD_SORT_STORAGE_KEY,
  DEFAULT_DASHBOARD_SORT_KEY,
  INVENTORY_STORAGE_KEY,
  MATRIX_STORAGE_KEY,
  STORAGE_KEY,
  WELCOME_SEEN_STORAGE_KEY,
} from "./constants";
import type { DashboardSortKey, MatrixTeam, TrackedCharacter, WeaponInventoryItem } from "./types";

function createEmptyMatrixTeam(id = "team-1"): MatrixTeam {
  return {
    id,
    slots: [null, null, null],
  };
}

function ensureMatrixTeams(teams: MatrixTeam[]) {
  return teams.length > 0 ? teams : [createEmptyMatrixTeam()];
}

export function exportTrackerData(
  characters: TrackedCharacter[],
  weaponInventory: WeaponInventoryItem[],
  matrixTeams: MatrixTeam[],
) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          version: 3,
          exportedAt: new Date().toISOString(),
          characters,
          weaponInventory,
          matrixTeams,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `wuwa-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function readStoredCharacters() {
  try {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as TrackedCharacter[];
  } catch {
    return [];
  }
}

export function normalizeWeaponInventory(
  inventory: unknown,
): WeaponInventoryItem[] {
  if (!Array.isArray(inventory)) {
    return [];
  }

  return inventory
    .map((item) => ({
      weaponId: Number((item as Partial<WeaponInventoryItem>).weaponId),
      count: Math.max(
        0,
        Math.round(Number((item as Partial<WeaponInventoryItem>).count) || 0),
      ),
    }))
    .filter((item) => item.weaponId && item.count > 0);
}

export function readStoredWeaponInventory() {
  try {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return normalizeWeaponInventory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function normalizeMatrixTeams(teams: unknown): MatrixTeam[] {
  if (!Array.isArray(teams)) {
    return [];
  }

  return teams
    .map((team, index) => {
      const candidate = team as Partial<MatrixTeam>;
      const rawSlots = Array.isArray(candidate.slots) ? candidate.slots : [];
      const slots = [0, 1, 2].map((slotIndex) => {
        const value = rawSlots[slotIndex];

        return typeof value === "string" && value ? value : null;
      }) as MatrixTeam["slots"];

      return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : `team-${index + 1}`,
        slots,
      };
    })
    .filter((team) => team.slots.length === 3);
}

export function readStoredMatrixTeams() {
  try {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = localStorage.getItem(MATRIX_STORAGE_KEY);

    if (!raw) {
      return [createEmptyMatrixTeam()];
    }

    return ensureMatrixTeams(normalizeMatrixTeams(JSON.parse(raw)));
  } catch {
    return [createEmptyMatrixTeam()];
  }
}

export function writeStoredCharacters(characters: TrackedCharacter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

export function writeStoredWeaponInventory(
  weaponInventory: WeaponInventoryItem[],
) {
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(weaponInventory));
}

export function writeStoredMatrixTeams(matrixTeams: MatrixTeam[]) {
  localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(matrixTeams));
}

export function isDashboardSortKey(value: unknown): value is DashboardSortKey {
  return DASHBOARD_SORT_KEYS.includes(value as DashboardSortKey);
}

export function readStoredDashboardSortKey() {
  try {
    if (typeof window === "undefined") {
      return DEFAULT_DASHBOARD_SORT_KEY;
    }

    const storedSortKey = localStorage.getItem(DASHBOARD_SORT_STORAGE_KEY);

    return isDashboardSortKey(storedSortKey) ? storedSortKey : DEFAULT_DASHBOARD_SORT_KEY;
  } catch {
    return DEFAULT_DASHBOARD_SORT_KEY;
  }
}

export function writeStoredDashboardSortKey(sortKey: DashboardSortKey) {
  localStorage.setItem(DASHBOARD_SORT_STORAGE_KEY, sortKey);
}

export function readStoredWelcomeSeen() {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem(WELCOME_SEEN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeStoredWelcomeSeen(welcomeSeen: boolean) {
  localStorage.setItem(WELCOME_SEEN_STORAGE_KEY, String(welcomeSeen));
}

export function readStoredBackupNoticeAcknowledgedAt() {
  try {
    if (typeof window === "undefined") {
      return 0;
    }

    const storedValue = Number(
      localStorage.getItem(BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY),
    );

    return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : 0;
  } catch {
    return 0;
  }
}

export function writeStoredBackupNoticeAcknowledgedAt(acknowledgedAt: number) {
  localStorage.setItem(
    BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
    String(acknowledgedAt),
  );
}

export function parseImportedTrackerData(text: string) {
  const parsed = JSON.parse(text) as {
    characters?: TrackedCharacter[];
    weaponInventory?: WeaponInventoryItem[];
    matrixTeams?: MatrixTeam[];
  };
  const importedCharacters = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.characters)
      ? parsed.characters
      : null;

  if (!importedCharacters) {
    throw new Error("Invalid file.");
  }

  return {
    characters: importedCharacters,
    weaponInventory:
      Array.isArray(parsed) || !Array.isArray(parsed.weaponInventory)
        ? []
        : normalizeWeaponInventory(parsed.weaponInventory),
    matrixTeams: ensureMatrixTeams(
      Array.isArray(parsed) || !Array.isArray(parsed.matrixTeams)
        ? []
        : normalizeMatrixTeams(parsed.matrixTeams),
    ),
  };
}
