"use client";

import { useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { getAssignmentCounts } from "./_tracker/domain";
import { exportTrackerData, parseImportedTrackerData } from "./_tracker/storage";
import { useTrackerData } from "./_tracker/tracker-provider";
import type { TrackedCharacter } from "./_tracker/types";
import { Dashboard } from "./_tracker/screens/dashboard";
import { WeaponInventoryScreen } from "./_tracker/screens/inventory";
import { AddScreen } from "./_tracker/screens/add-screen";
import { DetailScreen } from "./_tracker/screens/detail";
import { MatrixScreen } from "./_tracker/screens/matrix";

function getCharacterHref(id: string) {
  return `/characters/${encodeURIComponent(id)}`;
}

export function DashboardRoute() {
  const router = useRouter();
  const {
    characters,
    setCharacters,
    weaponInventory,
    setWeaponInventory,
    matrixTeams,
    setMatrixTeams,
  } = useTrackerData();
  const importRef = useRef<HTMLInputElement | null>(null);
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  function clearData() {
    if (
      (!characters.length && !weaponInventory.length) ||
      !confirm("Clear all tracked characters and weapon inventory from this browser?")
    ) {
      return;
    }

    setCharacters([]);
    setWeaponInventory([]);
    router.replace("/");
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

      setCharacters(imported.characters);
      setWeaponInventory(imported.weaponInventory);
      setMatrixTeams(imported.matrixTeams);
      router.replace("/");
    } catch {
      alert("That JSON file could not be imported.");
    }
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-fg">
      <Dashboard
        assignmentCounts={assignmentCounts}
        characters={characters}
        importRef={importRef}
        onAdd={() => router.push("/add")}
        onClear={clearData}
        onExport={() => exportTrackerData(characters, weaponInventory, matrixTeams)}
        onImport={importCharacters}
        onInventory={() => router.push("/inventory")}
        onMatrix={() => router.push("/matrix")}
        onOpen={(id) => router.push(getCharacterHref(id))}
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
    <div className="min-h-screen bg-app-bg text-app-fg">
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
    <div className="min-h-screen bg-app-bg text-app-fg">
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
    <div className="min-h-screen bg-app-bg text-app-fg">
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
    return <div className="min-h-screen bg-app-bg text-app-fg" />;
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-fg">
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
