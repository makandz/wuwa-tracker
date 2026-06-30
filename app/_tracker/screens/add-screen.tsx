"use client";

import { useMemo, useState } from "react";

import { FOUR_COST_OPTIONS, ROLES, emptyChecklist } from "../constants";
import { getCharacterRarityDisplay, getWeaponRarityTone } from "../domain";
import type { ApiCharacter, Catalog, FourCostMain, Role, TrackedCharacter, WeaponInventoryItem } from "../types";
import { CharacterPickerModal, PickerSummary, WeaponPickerModal } from "../components/pickers";
import { RoleToggle, TextButton } from "../components/ui";

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
    () =>
      weaponInventory.reduce<Record<number, number>>((counts, item) => {
        counts[item.weaponId] = item.count;
        return counts;
      }, {}),
    [weaponInventory],
  );
  const availableWeapons = selectedCharacter
    ? catalog.weapons.filter(
        (weapon) =>
          weapon.Type === selectedCharacter.WeaponType?.Id &&
          (inventoryCounts[weapon.Id] ?? 0) > 0,
      )
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
      if (!multipleRoles) {
        return [role];
      }

      return current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role];
    });
  }

  function updateMultipleRoles(checked: boolean) {
    setMultipleRoles(checked);

    if (!checked) {
      setRoles((current) => [current[0] ?? "DPS"]);
    }
  }

  function updateSelectedCharacter(nextCharacter: ApiCharacter) {
    const nextWeapon = catalog.weapons.find(
      (weapon) =>
        weapon.Type === nextCharacter?.WeaponType?.Id &&
        (inventoryCounts[weapon.Id] ?? 0) > 0,
    );

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
      characterIcon: selectedCharacter.RoleHeadIcon ?? "",
      qualityId: selectedCharacterRarity.qualityId ?? selectedCharacter.QualityId,
      elementName: selectedCharacter.Element?.Name ?? "Unknown",
      weaponTypeId: selectedCharacter.WeaponType?.Id ?? 0,
      weaponTypeName: selectedCharacter.WeaponType?.Name ?? "Unknown",
      roles,
      weaponId: selectedWeaponForSave?.Id ?? null,
      weaponName: selectedWeaponForSave?.Name ?? "",
      weaponQualityId: selectedWeaponForSave?.QualityId ?? null,
      fourCostMain,
      noCrit,
      critRate: 0,
      critDmg: 0,
      checklist: { ...emptyChecklist },
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

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-medium text-app-muted">Roles</div>
                <label className="flex items-center gap-2 text-sm font-medium text-app-muted-subtle">
                  <input
                    checked={multipleRoles}
                    className="h-4 w-4 accent-app-accent"
                    onChange={(event) => updateMultipleRoles(event.target.checked)}
                    type="checkbox"
                  />
                  Multiple roles?
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => (
                  <RoleToggle
                    active={roles.includes(role)}
                    key={role}
                    onToggle={() => toggleRole(role)}
                    role={role}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-app-muted">4 Cost Main Stat</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FOUR_COST_OPTIONS.map((option) => (
                  <button
                    className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
                      !noCrit && fourCostMain === option.value
                        ? "border-app-accent-strong bg-app-accent-strong text-app-bg"
                        : "border-app-border bg-app-bg text-app-muted-subtle hover:border-app-muted-dim hover:bg-app-surface hover:text-app-muted"
                    }`}
                    aria-pressed={!noCrit && fourCostMain === option.value}
                    key={option.value}
                    onClick={() => {
                      setFourCostMain(option.value);
                      setNoCrit(false);
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
                    noCrit
                      ? "border-app-accent-strong bg-app-accent-strong text-app-bg"
                      : "border-app-border bg-app-bg text-app-muted-subtle hover:border-app-muted-dim hover:bg-app-surface hover:text-app-muted"
                  }`}
                  aria-pressed={noCrit}
                  onClick={() => setNoCrit((current) => !current)}
                  type="button"
                >
                  No crit
                </button>
              </div>
            </div>

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
