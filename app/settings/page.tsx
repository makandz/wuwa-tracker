"use client";

import { useMemo, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { getAssignmentCounts } from "../_tracker/domain";
import {
  exportTrackerData,
  parseImportedTrackerData,
} from "../_tracker/storage";
import { SettingsScreen } from "../_tracker/screens/settings";
import { hasTrackerData } from "../_tracker/route-helpers";
import { useTrackerData } from "../_tracker/tracker-provider";

export default function SettingsPage() {
  const router = useRouter();
  const {
    characters,
    dashboardSortKey,
    dashboardViewMode,
    weaponInventory,
    matrixTeams,
    clearTrackerData,
    replaceAllData,
    storageStatus,
    storageVersion,
    updatePreferences,
    welcomeSeen,
  } = useTrackerData();
  const importRef = useRef<HTMLInputElement | null>(null);
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  function clearData() {
    const noLoadedData = !hasTrackerData(characters, weaponInventory, matrixTeams);

    if (storageStatus.state !== "error" && noLoadedData) {
      return;
    }

    if (!confirm("Clear all tracker data from this browser?")) {
      return;
    }

    try {
      clearTrackerData();
    } catch {
      alert("Tracker data could not be cleared.");
    }
  }

  async function importCharacters(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const imported = parseImportedTrackerData(text);

      replaceAllData(imported);
      router.replace("/");
    } catch {
      alert("That JSON file could not be imported.");
    }
  }

  function exportSettingsBackup() {
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
      <SettingsScreen
        assignmentCounts={assignmentCounts}
        characters={characters}
        importRef={importRef}
        matrixTeams={matrixTeams}
        onBack={() => router.push("/")}
        onClear={clearData}
        onExport={exportSettingsBackup}
        onImport={importCharacters}
        storageStatus={storageStatus}
        storageVersion={storageVersion}
        weaponInventory={weaponInventory}
      />
    </div>
  );
}
