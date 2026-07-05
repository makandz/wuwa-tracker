import {
  DASHBOARD_SORT_KEYS,
  DASHBOARD_VIEW_MODES,
  DEFAULT_DASHBOARD_SORT_KEY,
  DEFAULT_DASHBOARD_VIEW_MODE,
} from "../../../constants";
import type { DashboardSortKey, DashboardViewMode } from "../../../types";
import {
  BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY,
  DASHBOARD_SORT_STORAGE_KEY,
  DASHBOARD_VIEW_STORAGE_KEY,
  TRACKER_APP_ID,
  WELCOME_SEEN_STORAGE_KEY,
} from "../../keys";
import {
  trackerDocumentV4Schema,
  type TrackerDocumentV4,
} from "../../schemas/v4";
import type { LegacySplitStorage } from "../../schemas/legacy-v3";

function readDashboardSortKey(): DashboardSortKey {
  const value = localStorage.getItem(DASHBOARD_SORT_STORAGE_KEY);

  return DASHBOARD_SORT_KEYS.includes(value as DashboardSortKey)
    ? (value as DashboardSortKey)
    : DEFAULT_DASHBOARD_SORT_KEY;
}

function readDashboardViewMode(): DashboardViewMode {
  const value = localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);

  return DASHBOARD_VIEW_MODES.includes(value as DashboardViewMode)
    ? (value as DashboardViewMode)
    : DEFAULT_DASHBOARD_VIEW_MODE;
}

function readBackupNoticeAcknowledgedAt() {
  const value = Number(
    localStorage.getItem(BACKUP_NOTICE_ACKNOWLEDGED_AT_STORAGE_KEY),
  );

  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function adaptLegacySplitStorageToV4(
  storage: LegacySplitStorage,
): TrackerDocumentV4 {
  return trackerDocumentV4Schema.parse({
    schemaVersion: 4,
    app: TRACKER_APP_ID,
    savedAt: new Date().toISOString(),
    revision: 1,
    data: {
      characters: storage.characters,
      weaponInventory: storage.weaponInventory,
      matrixTeams: storage.matrixTeams,
      preferences: {
        welcomeSeen: localStorage.getItem(WELCOME_SEEN_STORAGE_KEY) === "true",
        dashboardSortKey: readDashboardSortKey(),
        dashboardViewMode: readDashboardViewMode(),
        backupNoticeAcknowledgedAt: readBackupNoticeAcknowledgedAt(),
      },
    },
  });
}
