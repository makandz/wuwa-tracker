"use client";

import { useMemo, useState } from "react";

import { emptyChecklist } from "../constants";
import {
  buildWeaponInventoryCountMap,
  getCharacterRarityDisplay,
  getOwnedWeaponsByType,
  getWeaponRarityTone,
} from "../domain";
import type { ApiCharacter, Catalog, FourCostMain, Role, TrackedCharacter, WeaponInventoryItem } from "../types";
import {
  FourCostMainControl,
  RoleSelectionControl,
} from "../components/build-form-controls";
import {
  getFourCostMainSelection,
  getNextNoCrit,
  getNextRolesAfterRoleToggle,
  getRolesAfterMultipleRolesChange,
} from "../components/build-form-state";
import { CharacterPickerModal, PickerSummary, WeaponPickerModal } from "../components/pickers";
import { TextButton } from "../components/ui";

export function AddScreen({
  catalog,
  tracked,
  weaponInventory,
  assignmentCounts,
  onBack,
  onCreate,
}: {
  catalog: Catalog;
  tracked: TrackedCharacter[];
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onBack: () => void;
  onCreate: (character: TrackedCharacter) => void;
}) {
  const firstCharacter = catalog.characters.find(
    (character) => !tracked.some((entry) => entry.characterId === character.Id),
  );
  const [characterId, setCharacterId] = useState(firstCharacter?.Id ?? 0);
  const selectedCharacter =
    catalog.characters.find((character) => character.Id === characterId) ?? firstCharacter;
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
  const [roles, setRoles] = useState<Role[]>(["DPS"]);
  const [multipleRoles, setMultipleRoles] = useState(false);
  const [fourCostMain, setFourCostMain] = useState<FourCostMain>("CR");
  const [noCrit, setNoCrit] = useState(false);
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const trackedIds = useMemo(
    () => new Set(tracked.map((entry) => entry.characterId)),
    [tracked],
  );
  const selectedWeapon = availableWeapons.find((weapon) => weapon.Id === weaponId) ?? null;

  function toggleRole(role: Role) {
    setRoles((current) => {
      return getNextRolesAfterRoleToggle({
        multipleRoles,
        role,
        roles: current,
      });
    });
  }

  function updateMultipleRoles(checked: boolean) {
    setMultipleRoles(checked);
    setRoles((current) => getRolesAfterMultipleRolesChange(current, checked));
  }

  function updateFourCostMain(fourCostMain: FourCostMain) {
    const next = getFourCostMainSelection(fourCostMain);

    setFourCostMain(next.fourCostMain);
    setNoCrit(next.noCrit);
  }

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

  function createCharacter() {
    if (!selectedCharacter || roles.length === 0) {
      return;
    }

    const selectedWeaponForSave = availableWeapons.find((weapon) => weapon.Id === weaponId);
    const now = new Date().toISOString();

    onCreate({
      id: `${selectedCharacter.Id}-${now}`,
      characterId: selectedCharacter.Id,
      characterName: selectedCharacter.Name,
      roles,
      weaponId: selectedWeaponForSave?.Id ?? null,
      weaponName: selectedWeaponForSave?.Name ?? "",
      fourCostMain,
      noCrit,
      critRate: 0,
      critDmg: 0,
      checklist: { ...emptyChecklist },
      substatPriority: "",
      expectedEr: 0,
      actualEr: 0,
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
          <TextButton onClick={onBack}>Dashboard</TextButton>
          <TextButton onClick={createCharacter} variant="primary">
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
            {selectedCharacter ? (
              <PickerSummary
                actionLabel="Choose"
                image={selectedCharacter.RoleHeadIcon}
                label="Character"
                meta={`${selectedCharacter.Element?.Name ?? "Unknown"} / ${
                  selectedCharacter.WeaponType?.Name ?? "Unknown"
                }`}
                onClick={() => setCharacterPickerOpen(true)}
                quality={selectedCharacterRarity.qualityId}
                characterBadgeTone={selectedCharacterRarity.badgeTone}
                animatedBadge={selectedCharacterRarity.animatedBadge}
                title={selectedCharacter.Name}
              />
            ) : null}

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

            <RoleSelectionControl
              multipleRoles={multipleRoles}
              onMultipleRolesChange={updateMultipleRoles}
              onToggleRole={toggleRole}
              roles={roles}
            />

            <FourCostMainControl
              fourCostMain={fourCostMain}
              noCrit={noCrit}
              onSelectFourCostMain={updateFourCostMain}
              onToggleNoCrit={() => setNoCrit((current) => getNextNoCrit(current))}
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
