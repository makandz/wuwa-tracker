import {
  DASHBOARD_SORT_KEYS,
  DASHBOARD_SORT_STORAGE_KEY,
  DEFAULT_DASHBOARD_SORT_KEY,
  INVENTORY_STORAGE_KEY,
  STORAGE_KEY,
} from "./constants";
import type { DashboardSortKey, TrackedCharacter, WeaponInventoryItem } from "./types";

export function exportTrackerData(
  characters: TrackedCharacter[],
  weaponInventory: WeaponInventoryItem[],
) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          version: 2,
          exportedAt: new Date().toISOString(),
          characters,
          weaponInventory,
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

export function writeStoredCharacters(characters: TrackedCharacter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

export function writeStoredWeaponInventory(
  weaponInventory: WeaponInventoryItem[],
) {
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(weaponInventory));
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

export function parseImportedTrackerData(text: string) {
  const parsed = JSON.parse(text) as {
    characters?: TrackedCharacter[];
    weaponInventory?: WeaponInventoryItem[];
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
  };
}
