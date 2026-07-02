import {
  DEFAULT_DASHBOARD_SORT_KEY,
  DEFAULT_DASHBOARD_VIEW_MODE,
} from "../constants";
import type {
  DashboardSortKey,
  DashboardViewMode,
  MatrixTeam,
  TrackedCharacter,
  WeaponInventoryItem,
} from "../types";
import {
  DEFAULT_TRACKER_PREFERENCES,
  createEmptyMatrixTeam,
  createTrackerDocumentV4,
  ensureMatrixTeams,
  isDashboardSortKey,
  isDashboardViewMode,
  normalizeCharacters,
  normalizeMatrixTeams,
  normalizeTrackerDocumentV4,
  normalizeWeaponInventory,
  type ParsedImportedTrackerData,
  type TrackerDocumentV4,
  type TrackerPreferences,
} from "./documents";
import {
  CURRENT_SCHEMA_VERSION,
  BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
  DASHBOARD_SORT_STORAGE_KEY,
  DASHBOARD_VIEW_STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MATRIX_STORAGE_KEY,
  STORAGE_KEY,
  WELCOME_SEEN_STORAGE_KEY,
} from "./keys";
import { inspectTrackerStorage } from "./inspection";
import {
  commitStorageMigration,
  exportStorageMigrationBackup,
  type StorageMigrationPlan,
} from "./migrations/plans";
import {
  parseLegacyArrayExport,
  parseLegacyObjectExport,
} from "./migrations/legacy-v3-to-v4";
import {
  readCurrentTrackerDocument,
  readStoredTrackerDocument,
  updateCurrentTrackerDocumentData,
  writeStoredTrackerDocument,
  type ReadTrackerDocumentResult,
  type TrackerStorageStatus,
} from "./recovery";
import {
  legacyArrayExportSchema,
  legacyObjectExportSchema,
} from "./schemas/legacy-v3";

export {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_TRACKER_PREFERENCES,
  commitStorageMigration,
  createTrackerDocumentV4,
  exportStorageMigrationBackup,
  inspectTrackerStorage,
  isDashboardSortKey,
  isDashboardViewMode,
  normalizeCharacters,
  normalizeMatrixTeams,
  normalizeTrackerDocumentV4,
  normalizeWeaponInventory,
  readStoredTrackerDocument,
  writeStoredTrackerDocument,
};
export type {
  ParsedImportedTrackerData,
  ReadTrackerDocumentResult,
  StorageMigrationPlan,
  TrackerDocumentV4,
  TrackerPreferences,
  TrackerStorageStatus,
};

function parseJsonValue(raw: string | null) {
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as unknown;
}

export function exportTrackerData(
  characters: TrackedCharacter[],
  weaponInventory: WeaponInventoryItem[],
  matrixTeams: MatrixTeam[],
  preferences: TrackerPreferences = DEFAULT_TRACKER_PREFERENCES,
  revision = 1,
) {
  const exportedAt = new Date().toISOString();
  const trackerDocument = createTrackerDocumentV4({
    characters,
    weaponInventory,
    matrixTeams,
    preferences,
    revision,
    savedAt: exportedAt,
  });
  const blob = new Blob([JSON.stringify(trackerDocument, null, 2)], {
    type: "application/json",
  });
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

    const currentDocument = readCurrentTrackerDocument();

    if (currentDocument) {
      return currentDocument.data.characters;
    }

    const parsed = legacyArrayExportSchema.safeParse(
      parseJsonValue(localStorage.getItem(STORAGE_KEY)),
    );

    return parsed.success ? normalizeCharacters(parsed.data) : [];
  } catch {
    return [];
  }
}

export function readStoredWeaponInventory() {
  try {
    if (typeof window === "undefined") {
      return [];
    }

    const currentDocument = readCurrentTrackerDocument();

    if (currentDocument) {
      return currentDocument.data.weaponInventory;
    }

    const parsed = legacyArrayExportSchema.safeParse(
      parseJsonValue(localStorage.getItem(INVENTORY_STORAGE_KEY)),
    );

    return parsed.success ? normalizeWeaponInventory(parsed.data) : [];
  } catch {
    return [];
  }
}

export function readStoredMatrixTeams() {
  try {
    if (typeof window === "undefined") {
      return [];
    }

    const currentDocument = readCurrentTrackerDocument();

    if (currentDocument) {
      return currentDocument.data.matrixTeams;
    }

    const raw = localStorage.getItem(MATRIX_STORAGE_KEY);

    if (!raw) {
      return [createEmptyMatrixTeam()];
    }

    const parsed = legacyArrayExportSchema.safeParse(parseJsonValue(raw));

    return parsed.success
      ? ensureMatrixTeams(normalizeMatrixTeams(parsed.data))
      : [createEmptyMatrixTeam()];
  } catch {
    return [createEmptyMatrixTeam()];
  }
}

export function writeStoredCharacters(characters: TrackedCharacter[]) {
  if (
    updateCurrentTrackerDocumentData(() => ({
      characters,
    }))
  ) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

export function writeStoredWeaponInventory(
  weaponInventory: WeaponInventoryItem[],
) {
  if (
    updateCurrentTrackerDocumentData(() => ({
      weaponInventory,
    }))
  ) {
    return;
  }

  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(weaponInventory));
}

export function writeStoredMatrixTeams(matrixTeams: MatrixTeam[]) {
  if (
    updateCurrentTrackerDocumentData(() => ({
      matrixTeams,
    }))
  ) {
    return;
  }

  localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(matrixTeams));
}

export function readStoredDashboardSortKey() {
  try {
    if (typeof window === "undefined") {
      return DEFAULT_DASHBOARD_SORT_KEY;
    }

    const currentDocument = readCurrentTrackerDocument();

    if (currentDocument) {
      return currentDocument.data.preferences.dashboardSortKey;
    }

    const storedSortKey = localStorage.getItem(DASHBOARD_SORT_STORAGE_KEY);

    return isDashboardSortKey(storedSortKey)
      ? storedSortKey
      : DEFAULT_DASHBOARD_SORT_KEY;
  } catch {
    return DEFAULT_DASHBOARD_SORT_KEY;
  }
}

export function writeStoredDashboardSortKey(sortKey: DashboardSortKey) {
  if (
    updateCurrentTrackerDocumentData((document) => ({
      preferences: {
        ...document.data.preferences,
        dashboardSortKey: sortKey,
      },
    }))
  ) {
    return;
  }

  localStorage.setItem(DASHBOARD_SORT_STORAGE_KEY, sortKey);
}

export function readStoredDashboardViewMode() {
  try {
    if (typeof window === "undefined") {
      return DEFAULT_DASHBOARD_VIEW_MODE;
    }

    const currentDocument = readCurrentTrackerDocument();

    if (currentDocument) {
      return currentDocument.data.preferences.dashboardViewMode;
    }

    const storedViewMode = localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);

    return isDashboardViewMode(storedViewMode)
      ? storedViewMode
      : DEFAULT_DASHBOARD_VIEW_MODE;
  } catch {
    return DEFAULT_DASHBOARD_VIEW_MODE;
  }
}

export function writeStoredDashboardViewMode(viewMode: DashboardViewMode) {
  if (
    updateCurrentTrackerDocumentData((document) => ({
      preferences: {
        ...document.data.preferences,
        dashboardViewMode: viewMode,
      },
    }))
  ) {
    return;
  }

  localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, viewMode);
}

export function readStoredWelcomeSeen() {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    const currentDocument = readCurrentTrackerDocument();

    if (currentDocument) {
      return currentDocument.data.preferences.welcomeSeen;
    }

    return localStorage.getItem(WELCOME_SEEN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeStoredWelcomeSeen(welcomeSeen: boolean) {
  if (
    updateCurrentTrackerDocumentData((document) => ({
      preferences: {
        ...document.data.preferences,
        welcomeSeen,
      },
    }))
  ) {
    return;
  }

  localStorage.setItem(WELCOME_SEEN_STORAGE_KEY, String(welcomeSeen));
}

export function readStoredBackupNoticeAcknowledgedAt() {
  try {
    if (typeof window === "undefined") {
      return 0;
    }

    const currentDocument = readCurrentTrackerDocument();

    if (currentDocument) {
      return currentDocument.data.preferences.backupNoticeAcknowledgedAt;
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
  if (
    updateCurrentTrackerDocumentData((document) => ({
      preferences: {
        ...document.data.preferences,
        backupNoticeAcknowledgedAt: acknowledgedAt,
      },
    }))
  ) {
    return;
  }

  localStorage.setItem(
    BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
    String(acknowledgedAt),
  );
}

export function parseImportedTrackerData(
  text: string,
): ParsedImportedTrackerData {
  const parsed = JSON.parse(text) as unknown;
  const trackerDocument = normalizeTrackerDocumentV4(parsed);

  if (trackerDocument) {
    return {
      characters: trackerDocument.data.characters,
      weaponInventory: trackerDocument.data.weaponInventory,
      matrixTeams: trackerDocument.data.matrixTeams,
      preferences: trackerDocument.data.preferences,
    };
  }

  const legacyArray = legacyArrayExportSchema.safeParse(parsed);

  if (legacyArray.success) {
    return parseLegacyArrayExport(legacyArray.data);
  }

  const legacyObject = legacyObjectExportSchema.safeParse(parsed);

  if (legacyObject.success) {
    return parseLegacyObjectExport(legacyObject.data);
  }

  throw new Error("Invalid file.");
}
