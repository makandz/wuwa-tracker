"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { getAssignmentCounts } from "../_tracker/domain";
import { AddScreen } from "../_tracker/screens/add-screen";
import { getCharacterHref } from "../_tracker/route-helpers";
import { useTrackerData } from "../_tracker/tracker-provider";
import type { TrackedCharacter } from "../_tracker/types";

export default function AddPage() {
  const router = useRouter();
  const {
    catalog,
    characters,
    createCharacter,
    weaponInventory,
  } = useTrackerData();
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  function addCharacter(character: TrackedCharacter) {
    createCharacter(character);
    router.push(getCharacterHref(character, [...characters, character]));
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
