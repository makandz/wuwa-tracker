"use client";

import { useMemo, useState } from "react";

import { buildWeaponInventoryCountMap, getAssignmentCounts, getWeaponInventoryGroups } from "@/features/tracker/domain";
import { SearchInput, TextButton } from "@/features/tracker/components/ui";
import { WeaponInventoryIdentity, WeaponInventoryModal, WeaponQuantityInput } from "@/features/tracker/components/weapon-inventory";
import { useTrackerData } from "@/features/tracker/tracker-provider";

/**
 * Displays owned weapon stacks and a catalog picker for changing inventory quantities.
 * @returns The searchable weapon inventory grouped by weapon type.
 */
export default function InventoryPage() {
  const { catalog, characters, weaponInventory, setWeaponCount } = useTrackerData();
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);
  const inventoryCounts = useMemo(() => buildWeaponInventoryCountMap(weaponInventory), [weaponInventory]);
  const groups = useMemo(() => getWeaponInventoryGroups(catalog.weapons, weaponInventory, query), [catalog.weapons, weaponInventory, query]);
  const totalCopies = weaponInventory.reduce((sum, item) => sum + item.count, 0);
  const sharedWeapons = weaponInventory.filter((item) => (assignmentCounts[item.weaponId] ?? 0) > item.count).length;

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium text-app-fg">Weapons</h1>
            <p className="mt-1 text-xs text-app-muted-subtle">
              {weaponInventory.length} weapons · {totalCopies} copies
              {sharedWeapons > 0 ? <span className="ml-3 text-status-warn-text">{sharedWeapons} shared</span> : null}
            </p>
          </div>
          <TextButton disabled={catalog.loading || catalog.weapons.length === 0} onClick={() => setPickerOpen(true)} variant="primary">+ Add weapons</TextButton>
        </header>

        <SearchInput ariaLabel="Search owned weapons" placeholder="Search your weapons" value={query} onChange={setQuery} />

        {catalog.error ? <p className="text-sm text-status-warn-text">{catalog.error}</p> : null}
        {catalog.loading ? <p className="text-sm text-app-muted-subtle">Loading weapon catalog…</p> : null}

        {groups.map((group) => (
          <section className="grid gap-3" key={group.type}>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium text-app-muted-subtle">{group.name}</h2>
              <div className="h-px flex-1 bg-app-border" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.weapons.map((weapon) => {
                const count = inventoryCounts[weapon.Id] ?? 0;
                const assigned = assignmentCounts[weapon.Id] ?? 0;
                const shared = assigned > count;
                const allAssigned = count > 0 && assigned === count;
                const meta = weapon.QualityId ? `${weapon.QualityId}★ · ${assigned} assigned` : "Catalog details unavailable";
                let borderClasses = "border-app-border";

                if (shared) {
                  borderClasses = "border-status-warn-border";
                } else if (allAssigned) {
                  borderClasses = "border-status-good-border";
                }

                return (
                  <div className={`flex min-w-0 flex-col gap-3 rounded-lg border bg-app-surface p-3 ${borderClasses}`} key={weapon.Id}>
                    <div className="flex items-start justify-between gap-2">
                      <WeaponInventoryIdentity weapon={weapon} meta={meta} />
                      {shared ? (
                        <span className="shrink-0 rounded-sm bg-status-warn-bg px-1.5 py-0.5 text-xs text-status-warn-text">Shared</span>
                      ) : null}
                      {allAssigned ? (
                        <span className="shrink-0 whitespace-nowrap rounded-sm bg-status-good-bg px-1.5 py-0.5 text-xs text-status-good-text">All assigned</span>
                      ) : null}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <span className="text-xs text-app-muted-subtle">Copies</span>
                      <WeaponQuantityInput name={weapon.Name} count={count} onChange={(nextCount) => setWeaponCount(weapon.Id, nextCount)} />
                    </div>
                    {shared ? <p className="text-xs text-status-warn-text">Shared across {assigned} characters with {count} {count === 1 ? "copy" : "copies"}.</p> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {!catalog.loading && groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-app-muted-subtle">
            {weaponInventory.length === 0 ? "No weapons yet. Add your first weapon to start your inventory." : "No owned weapons match that search."}
          </p>
        ) : null}
      </main>

      {pickerOpen ? (
        <WeaponInventoryModal weapons={catalog.weapons} inventoryCounts={inventoryCounts} onSetWeaponCount={setWeaponCount} onClose={() => setPickerOpen(false)} />
      ) : null}
    </div>
  );
}
