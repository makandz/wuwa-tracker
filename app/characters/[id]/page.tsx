"use client";

import { use, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import {
  findTrackedCharacterByRouteSegment,
  getAssignmentCounts,
} from "../../_tracker/domain";
import { DetailScreen } from "../../_tracker/screens/detail";
import { useTrackerData } from "../../_tracker/tracker-provider";

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
        characters={catalog.characters}
        onBack={() => router.push("/")}
        onDelete={() => confirmDeleteCharacter(selectedCharacter.id)}
        onUpdate={updateCharacter}
        weaponInventory={weaponInventory}
        weapons={catalog.weapons}
      />
    </div>
  );
}
