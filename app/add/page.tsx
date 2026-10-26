"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createEchoSet } from "@/features/tracker/echo-sets";
import {
  buildWeaponInventoryCountMap,
  getAssignmentCounts,
  getCharacterRarityDisplay,
  getOwnedWeaponsByType,
  getWeaponRarityTone,
} from "@/features/tracker/domain";
import {
  CharacterPickerModal,
  PickerSummary,
  WeaponPickerModal,
} from "@/features/tracker/components/pickers";
import { TextButton } from "@/features/tracker/components/ui";
import { getCharacterHref } from "@/features/tracker/route-helpers";
import { useTrackerData } from "@/features/tracker/tracker-provider";
import type {
  ApiCharacter,
  Catalog,
  TrackedCharacter,
  WeaponInventoryItem,
} from "@/features/tracker/types";

/**
 * Renders character creation with one default echo set.
 * @returns The page content.
 */
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
        onCreate={addCharacter}
        tracked={characters}
        weaponInventory={weaponInventory}
      />
    </div>
  );
}

function AddScreen({
  catalog,
  tracked,
  weaponInventory,
  assignmentCounts,
  onCreate,
}: {
  catalog: Catalog;
  tracked: TrackedCharacter[];
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onCreate: (character: TrackedCharacter) => void;
}) {
  const [characterId, setCharacterId] = useState(0);
  const selectedCharacter = catalog.characters.find(
    (character) => character.Id === characterId,
  );
  const selectedCharacterRarity = getCharacterRarityDisplay({
    name: selectedCharacter?.Name,
    qualityId: selectedCharacter?.QualityId,
  });
  const inventoryCounts = useMemo(
    () => buildWeaponInventoryCountMap(weaponInventory),
    [weaponInventory],
  );
  const availableWeapons = selectedCharacter
    ? getOwnedWeaponsByType({
        inventoryCounts,
        weaponTypeId: selectedCharacter.WeaponType?.Id,
        weapons: catalog.weapons,
      })
    : [];
  const [weaponId, setWeaponId] = useState<number | null>(availableWeapons[0]?.Id ?? null);
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const trackedIds = useMemo(
    () => new Set(tracked.map((entry) => entry.characterId)),
    [tracked],
  );
  const selectedWeapon = availableWeapons.find((weapon) => weapon.Id === weaponId) ?? null;

  function updateSelectedCharacter(nextCharacter: ApiCharacter) {
    const nextWeapon = getOwnedWeaponsByType({
      inventoryCounts,
      weaponTypeId: nextCharacter.WeaponType?.Id,
      weapons: catalog.weapons,
    })[0];

    setCharacterId(nextCharacter.Id);
    setWeaponId(nextWeapon?.Id ?? null);
    setCharacterPickerOpen(false);
  }

  /** Creates a character using the canonical saved fields. */
  function createCharacter() {
    if (!selectedCharacter) {
      return;
    }

    const selectedWeaponForSave = availableWeapons.find((weapon) => weapon.Id === weaponId);
    const now = new Date().toISOString();

    onCreate({
      id: `${selectedCharacter.Id}-${now}`,
      characterId: selectedCharacter.Id,
      characterName: selectedCharacter.Name,
      weaponId: selectedWeaponForSave?.Id ?? null,
      weaponName: selectedWeaponForSave?.Name ?? "",
      skillsDone: false,
      expectedEr: null,
      echoSets: [createEchoSet(`${selectedCharacter.Id}-default`)],
      notes: "",
      createdAt: now,
      updatedAt: now,
    });
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-app-fg">Add Character</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextButton
            disabled={!selectedCharacter}
            onClick={createCharacter}
            variant="primary"
          >
            Save Character
          </TextButton>
        </div>
      </div>

      <section className="grid gap-5 rounded-md border border-app-border/80 bg-app-surface p-5">
        {catalog.loading ? (
          <p className="text-sm text-app-muted-subtle">Loading character and weapon catalog...</p>
        ) : catalog.error ? (
          <p className="text-sm text-status-danger-text">{catalog.error}</p>
        ) : (
          <>
            <PickerSummary
              actionLabel="Choose"
              animatedBadge={selectedCharacterRarity.animatedBadge}
              characterBadgeTone={selectedCharacterRarity.badgeTone}
              image={selectedCharacter?.RoleHeadIcon}
              label="Character"
              meta={
                selectedCharacter
                  ? `${selectedCharacter.Element?.Name ?? "Unknown"} / ${
                      selectedCharacter.WeaponType?.Name ?? "Unknown"
                    }`
                  : "Select someone from the catalog"
              }
              onClick={() => setCharacterPickerOpen(true)}
              quality={selectedCharacter ? selectedCharacterRarity.qualityId : undefined}
              title={selectedCharacter?.Name ?? "Choose a character"}
            />

            <PickerSummary
              actionLabel="Choose"
              image={selectedWeapon?.Icon}
              label="Weapon"
              meta={
                selectedWeapon
                  ? `${selectedWeapon.TypeName} / Own ${
                      inventoryCounts[selectedWeapon.Id] ?? 0
                    } / Used ${assignmentCounts[selectedWeapon.Id] ?? 0}`
                  : "No owned weapon selected"
              }
              onClick={() => setWeaponPickerOpen(true)}
              quality={selectedWeapon?.QualityId}
              rarityTone={getWeaponRarityTone({
                name: selectedWeapon?.Name,
                qualityId: selectedWeapon?.QualityId,
              })}
              title={selectedWeapon?.Name ?? "No weapon selected"}
            />

            {characterPickerOpen ? (
              <CharacterPickerModal
                characters={catalog.characters}
                onClose={() => setCharacterPickerOpen(false)}
                onSelect={updateSelectedCharacter}
                selectedId={selectedCharacter?.Id}
                trackedIds={trackedIds}
              />
            ) : null}

            {weaponPickerOpen ? (
              <WeaponPickerModal
                onClear={() => {
                  setWeaponId(null);
                  setWeaponPickerOpen(false);
                }}
                onClose={() => setWeaponPickerOpen(false)}
                onSelect={(weapon) => {
                  setWeaponId(weapon.Id);
                  setWeaponPickerOpen(false);
                }}
                selectedId={weaponId}
                weapons={availableWeapons}
                inventoryCounts={inventoryCounts}
                assignmentCounts={assignmentCounts}
                weaponTypeName={selectedCharacter?.WeaponType?.Name ?? "Matching"}
              />
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
