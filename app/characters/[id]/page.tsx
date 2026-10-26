"use client";

import {
  use,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  buildWeaponInventoryCountMap, findCatalogCharacter, findCatalogWeapon,
  findTrackedCharacterByRouteSegment, getAssignmentCounts,
  getOwnedWeaponsByType, getTrackedCharacterDisplay,
} from "@/features/tracker/domain";
import { getCharacterRotations } from "@/features/tracker/rotations";
import { CharacterEchoSets } from "@/features/tracker/components/character-echo-sets";
import { CharacterOverview } from "@/features/tracker/components/character-overview";
import { WeaponPickerModal } from "@/features/tracker/components/pickers";
import { CharacterRotationsSection } from "@/features/tracker/components/rotations";
import { useTrackerData } from "@/features/tracker/tracker-provider";
import type {
  ApiCharacter, ApiWeapon, TrackedCharacter, WeaponInventoryItem,
} from "@/features/tracker/types";

/**
 * Opens the tracked character identified by its route.
 * @param props - The asynchronous character route parameters.
 * @returns The character editor after data loads.
 */
export default function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    catalog,
    characters,
    deleteCharacter,
    updateCharacter,
    weaponInventory,
    storageLoaded,
  } = useTrackerData();
  const selectedCharacter = findTrackedCharacterByRouteSegment(id, characters);
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  useEffect(() => {
    if (!storageLoaded || selectedCharacter) {
      return;
    }

    router.replace("/");
  }, [router, selectedCharacter, storageLoaded]);

  /** Deletes the character after confirmation. */
  function confirmDeleteCharacter(characterId: string) {
    if (!confirm("Delete this tracked character?")) {
      return;
    }

    deleteCharacter(characterId);
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
        key={selectedCharacter.id}
        characters={catalog.characters}
        onDelete={() => confirmDeleteCharacter(selectedCharacter.id)}
        onUpdate={updateCharacter}
        weaponInventory={weaponInventory}
        weapons={catalog.weapons}
      />
    </div>
  );
}

/** Edits a character's shared settings, echo sets, and weapon assignment. */
function DetailScreen({
  character,
  characters,
  weapons,
  weaponInventory,
  assignmentCounts,
  onDelete,
  onUpdate,
}: {
  character: TrackedCharacter;
  characters: ApiCharacter[];
  weapons: ApiWeapon[];
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onDelete: () => void;
  onUpdate: (character: TrackedCharacter) => void;
}) {
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const inventoryCounts = buildWeaponInventoryCountMap(weaponInventory);
  const catalogCharacter = findCatalogCharacter(characters, character.characterId);
  const display = getTrackedCharacterDisplay(character, catalogCharacter);
  const selectedWeapon = findCatalogWeapon(weapons, character.weaponId);
  const availableWeapons = getOwnedWeaponsByType({ inventoryCounts, weaponTypeId: display.weaponTypeId, weapons });

  /** Saves shared fields through the validated tracker update path. */
  function patchCharacter(patch: Partial<TrackedCharacter>) {
    onUpdate({ ...character, ...patch });
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <CharacterOverview
        character={character}
        catalogCharacter={catalogCharacter}
        weapon={selectedWeapon}
        ownedCount={selectedWeapon ? inventoryCounts[selectedWeapon.Id] ?? 0 : 0}
        onChangeWeapon={() => setWeaponPickerOpen(true)}
        onDelete={onDelete}
        onPatch={patchCharacter}
      />

      <CharacterEchoSets character={character} onUpdate={onUpdate} />

      <CharacterRotationsSection rotations={getCharacterRotations(display.name)} />
      {weaponPickerOpen ? (
        <WeaponPickerModal
          weapons={availableWeapons}
          inventoryCounts={inventoryCounts}
          assignmentCounts={assignmentCounts}
          selectedId={character.weaponId}
          weaponTypeName={display.weaponTypeName}
          onClose={() => setWeaponPickerOpen(false)}
          onClear={() => {
            patchCharacter({ weaponId: null, weaponName: "" });
            setWeaponPickerOpen(false);
          }}
          onSelect={(weapon) => {
            patchCharacter({ weaponId: weapon.Id, weaponName: weapon.Name });
            setWeaponPickerOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}
