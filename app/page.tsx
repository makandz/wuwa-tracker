"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BACKUP_NOTICE_FIRST_VISIT_DELAY_MS,
  BACKUP_NOTICE_INTERVAL_MS,
} from "./_tracker/constants";
import { getAssignmentCounts } from "./_tracker/domain";
import { exportTrackerData } from "./_tracker/storage";
import { StorageStatusNotice } from "./_tracker/components/storage-status-notice";
import { TextButton } from "./_tracker/components/ui";
import { Dashboard } from "./_tracker/screens/dashboard";
import { WelcomeScreen } from "./_tracker/screens/welcome";
import { getCharacterHref, hasTrackerData } from "./_tracker/route-helpers";
import { useTrackerData } from "./_tracker/tracker-provider";

export default function Home() {
  const router = useRouter();
  const {
    catalog,
    characters,
    backupNoticeAcknowledgedAt,
    dashboardSortKey,
    dashboardViewMode,
    matrixTeams,
    storageLoaded,
    storageStatus,
    storageVersion,
    updatePreferences,
    welcomeSeen,
    weaponInventory,
  } = useTrackerData();
  const [backupNoticeCheckedAt, setBackupNoticeCheckedAt] = useState<number | null>(null);
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBackupNoticeCheckedAt(Date.now());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [backupNoticeAcknowledgedAt, storageLoaded]);

  if (!storageLoaded) {
    return <div className="min-h-full bg-app-bg text-app-fg" />;
  }

  if (storageStatus.state === "error") {
    return (
      <div className="min-h-full bg-app-bg text-app-fg">
        <main className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <StorageStatusNotice storageStatus={storageStatus} />
          <TextButton onClick={() => router.push("/settings")}>
            Open Settings
          </TextButton>
        </main>
      </div>
    );
  }

  if (!welcomeSeen) {
    return (
      <WelcomeScreen
        onStart={() => {
          const preferences = {
            welcomeSeen: true,
            backupNoticeAcknowledgedAt,
          };

          if (
            backupNoticeAcknowledgedAt === 0 &&
            !hasTrackerData(characters, weaponInventory, matrixTeams)
          ) {
            preferences.backupNoticeAcknowledgedAt =
              Date.now() -
              BACKUP_NOTICE_INTERVAL_MS +
              BACKUP_NOTICE_FIRST_VISIT_DELAY_MS;
          }

          updatePreferences(preferences);
        }}
      />
    );
  }

  function exportBackupFromNotice() {
    const acknowledgedAt = Date.now();

    exportTrackerData(characters, weaponInventory, matrixTeams, {
      welcomeSeen,
      dashboardSortKey,
      dashboardViewMode,
      backupNoticeAcknowledgedAt: acknowledgedAt,
    });
    updatePreferences({ backupNoticeAcknowledgedAt: acknowledgedAt });
  }

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <Dashboard
        assignmentCounts={assignmentCounts}
        catalog={catalog}
        characters={characters}
        dashboardSortKey={dashboardSortKey}
        dashboardViewMode={dashboardViewMode}
        onAdd={() => router.push("/add")}
        onDashboardSortKeyChange={(nextSortKey) =>
          updatePreferences({ dashboardSortKey: nextSortKey })
        }
        onDashboardViewModeChange={(nextViewMode) =>
          updatePreferences({ dashboardViewMode: nextViewMode })
        }
        onExportBackup={exportBackupFromNotice}
        onInventory={() => router.push("/inventory")}
        onMatrix={() => router.push("/matrix")}
        onOpen={(id) => {
          const character = characters.find((item) => item.id === id);

          if (character) {
            router.push(getCharacterHref(character, characters));
          }
        }}
        onSettings={() => router.push("/settings")}
        showBackupNotice={
          backupNoticeCheckedAt !== null &&
          backupNoticeCheckedAt - backupNoticeAcknowledgedAt >= BACKUP_NOTICE_INTERVAL_MS
        }
        storageStatus={storageStatus}
        storageVersion={storageVersion}
        weaponInventory={weaponInventory}
      />
    </div>
  );
}
