"use client";

import { useMemo, useRef, type ChangeEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";

import { getAssignmentCounts } from "@/features/tracker/domain";
import {
  exportTrackerData,
  parseImportedTrackerData,
  type TrackerStorageStatus,
} from "@/features/tracker/storage";
import { TRACKER_DOCUMENT_STORAGE_KEY } from "@/features/tracker/storage/keys";
import { StorageStatusNotice } from "@/features/tracker/components/storage-status-notice";
import { TextButton } from "@/features/tracker/components/ui";
import { hasTrackerData } from "@/features/tracker/route-helpers";
import { useTrackerData } from "@/features/tracker/tracker-provider";
import type { MatrixTeam, TrackedCharacter, WeaponInventoryItem } from "@/features/tracker/types";

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

function SettingsScreen({
  characters,
  weaponInventory,
  matrixTeams,
  storageStatus,
  storageVersion,
  assignmentCounts,
  onBack,
  onExport,
  onImport,
  onClear,
  importRef,
}: {
  characters: TrackedCharacter[];
  weaponInventory: WeaponInventoryItem[];
  matrixTeams: MatrixTeam[];
  storageStatus: TrackerStorageStatus;
  storageVersion: number | null;
  assignmentCounts: Record<number, number>;
  onBack: () => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  importRef: RefObject<HTMLInputElement | null>;
}) {
  const assignedWeaponCount = Object.values(assignmentCounts).filter((count) => count > 0).length;
  const totalWeaponCopies = weaponInventory.reduce((sum, item) => sum + item.count, 0);
  const plannedMatrixSlots = matrixTeams.reduce(
    (sum, team) => sum + team.slots.filter(Boolean).length,
    0,
  );
  const settingsStats = [
    { label: "Tracked", value: String(characters.length) },
    { label: "Weapon copies", value: String(totalWeaponCopies) },
    { label: "Assigned weapons", value: String(assignedWeaponCount) },
    { label: "Matrix slots", value: String(plannedMatrixSlots) },
    {
      label: "Storage",
      title: TRACKER_DOCUMENT_STORAGE_KEY,
      value: storageVersion ? `v${storageVersion}` : "Local",
    },
  ];

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-app-fg">Settings</h1>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {settingsStats.map((stat) => (
              <div className="flex items-center gap-1.5" key={stat.label}>
                <dt className="text-app-muted-dim">{stat.label}</dt>
                <dd className="font-semibold text-app-muted" title={stat.title}>
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <TextButton onClick={onBack}>Dashboard</TextButton>
      </div>

      <StorageStatusNotice storageStatus={storageStatus} />

      <section className="grid gap-5 rounded-md border border-app-border/80 bg-app-surface p-5">
        <div>
          <h2 className="text-base font-semibold text-app-fg">Data Management</h2>
          <p className="mt-1 text-sm leading-6 text-app-muted-subtle">
            Tracker data is stored locally in this browser. Export a JSON backup before clearing
            or moving data to another device.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-app-border/80 bg-app-bg p-4">
            <h3 className="text-sm font-semibold text-app-fg">Export</h3>
            <p className="mt-1 min-h-12 text-sm leading-6 text-app-muted-subtle">
              Download your characters, weapon inventory, and matrix teams as a JSON file.
            </p>
            <div className="mt-4">
              <TextButton onClick={onExport} variant="primary">
                Export Data
              </TextButton>
            </div>
          </div>

          <div className="rounded-md border border-app-border/80 bg-app-bg p-4">
            <h3 className="text-sm font-semibold text-app-fg">Import</h3>
            <p className="mt-1 min-h-12 text-sm leading-6 text-app-muted-subtle">
              Replace current local data with a previously exported tracker JSON file.
            </p>
            <div className="mt-4">
              <TextButton onClick={() => importRef.current?.click()}>Import Data</TextButton>
            </div>
            <input
              accept="application/json"
              className="hidden"
              onChange={onImport}
              ref={importRef}
              type="file"
            />
          </div>

          <div className="rounded-md border border-status-danger-border/80 bg-status-danger-bg/25 p-4">
            <h3 className="text-sm font-semibold text-status-danger-text">Clear</h3>
            <p className="mt-1 min-h-12 text-sm leading-6 text-app-muted-subtle">
              Remove all locally stored characters, weapon inventory, and matrix teams.
            </p>
            <div className="mt-4">
              <TextButton onClick={onClear} variant="danger">
                Clear Data
              </TextButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
