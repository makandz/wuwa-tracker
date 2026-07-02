"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import {
  BACKUP_NOTICE_FIRST_VISIT_DELAY_MS,
  BACKUP_NOTICE_INTERVAL_MS,
} from "./_tracker/constants";
import { getAssignmentCounts } from "./_tracker/domain";
import {
  exportStorageMigrationBackup,
  exportTrackerData,
  parseImportedTrackerData,
} from "./_tracker/storage";
import { useTrackerData } from "./_tracker/tracker-provider";
import type { MatrixTeam, TrackedCharacter, WeaponInventoryItem } from "./_tracker/types";
import { StorageStatusNotice } from "./_tracker/components/storage-status-notice";
import { TextButton } from "./_tracker/components/ui";
import { Dashboard } from "./_tracker/screens/dashboard";
import { WeaponInventoryScreen } from "./_tracker/screens/inventory";
import { AddScreen } from "./_tracker/screens/add-screen";
import { DetailScreen } from "./_tracker/screens/detail";
import { MatrixScreen } from "./_tracker/screens/matrix";
import { SettingsScreen } from "./_tracker/screens/settings";
import { StorageMigrationScreen } from "./_tracker/screens/storage-migration";
import { WelcomeScreen } from "./_tracker/screens/welcome";

function getCharacterHref(id: string) {
  return `/characters/${encodeURIComponent(id)}`;
}

function hasTrackerData(
  characters: TrackedCharacter[],
  weaponInventory: WeaponInventoryItem[],
  matrixTeams: MatrixTeam[],
) {
  return (
    characters.length > 0 ||
    weaponInventory.length > 0 ||
    matrixTeams.some((team) => team.slots.some(Boolean))
  );
}

export function DashboardRoute() {
  const router = useRouter();
  const {
    characters,
    backupNoticeAcknowledgedAt,
    dashboardSortKey,
    dashboardViewMode,
    matrixTeams,
    setBackupNoticeAcknowledgedAt,
    setDashboardSortKey,
    setDashboardViewMode,
    setWelcomeSeen,
    storageLoaded,
    storageMigrationPlan,
    storageStatus,
    storageVersion,
    commitPendingStorageMigration,
    welcomeSeen,
    weaponInventory,
  } = useTrackerData();
  const [backupNoticeCheckedAt, setBackupNoticeCheckedAt] = useState<number | null>(null);
  const [migrationRunning, setMigrationRunning] = useState(false);
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

  if (storageMigrationPlan) {
    return (
      <div className="min-h-full bg-app-bg text-app-fg">
        <StorageMigrationScreen
          isMigrating={migrationRunning}
          onExportBackup={() => exportStorageMigrationBackup(storageMigrationPlan)}
          onMigrate={() => {
            setMigrationRunning(true);

            try {
              commitPendingStorageMigration();
            } catch {
              alert("Tracker storage could not be migrated.");
            } finally {
              setMigrationRunning(false);
            }
          }}
          plan={storageMigrationPlan}
        />
      </div>
    );
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
          if (
            backupNoticeAcknowledgedAt === 0 &&
            !hasTrackerData(characters, weaponInventory, matrixTeams)
          ) {
            setBackupNoticeAcknowledgedAt(
              Date.now() - BACKUP_NOTICE_INTERVAL_MS + BACKUP_NOTICE_FIRST_VISIT_DELAY_MS,
            );
          }

          setWelcomeSeen(true);
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
    setBackupNoticeAcknowledgedAt(acknowledgedAt);
  }

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <Dashboard
        assignmentCounts={assignmentCounts}
        characters={characters}
        dashboardSortKey={dashboardSortKey}
        dashboardViewMode={dashboardViewMode}
        onAdd={() => router.push("/add")}
        onDashboardSortKeyChange={setDashboardSortKey}
        onDashboardViewModeChange={setDashboardViewMode}
        onExportBackup={exportBackupFromNotice}
        onInventory={() => router.push("/inventory")}
        onMatrix={() => router.push("/matrix")}
        onOpen={(id) => router.push(getCharacterHref(id))}
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

export function SettingsRoute() {
  const router = useRouter();
  const {
    characters,
    backupNoticeAcknowledgedAt,
    dashboardSortKey,
    dashboardViewMode,
    weaponInventory,
    matrixTeams,
    replaceTrackerData,
    setBackupNoticeAcknowledgedAt,
    storageStatus,
    storageVersion,
    welcomeSeen,
  } = useTrackerData();
  const importRef = useRef<HTMLInputElement | null>(null);
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  function clearData() {
    const noLoadedData =
      !characters.length && !weaponInventory.length && !matrixTeams.length;

    if (storageStatus.state !== "error" && noLoadedData) {
      return;
    }

    if (!confirm("Clear all tracker data from this browser?")) {
      return;
    }

    try {
      replaceTrackerData({
        characters: [],
        weaponInventory: [],
        matrixTeams: [],
        preferences: {
          welcomeSeen,
          dashboardSortKey,
          dashboardViewMode,
          backupNoticeAcknowledgedAt,
        },
      });
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

      replaceTrackerData({
        ...imported,
        preferences: imported.preferences ?? {
          welcomeSeen,
          dashboardSortKey,
          dashboardViewMode,
          backupNoticeAcknowledgedAt,
        },
      });
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
    setBackupNoticeAcknowledgedAt(acknowledgedAt);
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

export function WeaponInventoryRoute() {
  const { catalog, characters, weaponInventory, setWeaponInventory } = useTrackerData();
  const router = useRouter();
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <WeaponInventoryScreen
        assignmentCounts={assignmentCounts}
        catalog={catalog}
        inventory={weaponInventory}
        onBack={() => router.push("/")}
        onUpdate={setWeaponInventory}
      />
    </div>
  );
}

export function AddCharacterRoute() {
  const router = useRouter();
  const {
    catalog,
    characters,
    setCharacters,
    weaponInventory,
  } = useTrackerData();
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  function addCharacter(character: TrackedCharacter) {
    setCharacters((current) => [...current, character]);
    router.push(getCharacterHref(character.id));
  }

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <AddScreen
        assignmentCounts={assignmentCounts}
        catalog={catalog}
        onBack={() => router.push("/")}
        onCreate={addCharacter}
        tracked={characters}
        weaponInventory={weaponInventory}
      />
    </div>
  );
}

export function MatrixRoute() {
  const { characters, matrixTeams, setMatrixTeams } = useTrackerData();
  const router = useRouter();

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <MatrixScreen
        characters={characters}
        onBack={() => router.push("/")}
        onUpdateTeams={setMatrixTeams}
        teams={matrixTeams}
      />
    </div>
  );
}

export function CharacterDetailRoute({ characterId }: { characterId: string }) {
  const router = useRouter();
  const {
    catalog,
    characters,
    setCharacters,
    weaponInventory,
    storageLoaded,
  } = useTrackerData();
  const decodedCharacterId = decodeURIComponent(characterId);
  const selectedCharacter =
    characters.find((character) => character.id === decodedCharacterId) ?? null;
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  useEffect(() => {
    if (!storageLoaded || selectedCharacter) {
      return;
    }

    router.replace("/");
  }, [router, selectedCharacter, storageLoaded]);

  function updateCharacter(nextCharacter: TrackedCharacter) {
    setCharacters((current) =>
      current.map((character) =>
        character.id === nextCharacter.id ? nextCharacter : character,
      ),
    );
  }

  function deleteCharacter(id: string) {
    if (!confirm("Delete this tracked character?")) {
      return;
    }

    setCharacters((current) => current.filter((character) => character.id !== id));
    router.replace("/");
  }

  if (!selectedCharacter) {
    return <div className="min-h-full bg-app-bg text-app-fg" />;
  }

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <DetailScreen
        assignmentCounts={assignmentCounts}
        character={selectedCharacter}
        onBack={() => router.push("/")}
        onDelete={() => deleteCharacter(selectedCharacter.id)}
        onUpdate={updateCharacter}
        weaponInventory={weaponInventory}
        weapons={catalog.weapons}
      />
    </div>
  );
}

export default DashboardRoute;
