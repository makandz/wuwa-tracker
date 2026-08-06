"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import {
  buildWeaponInventoryCountMap,
  getAssignmentCounts,
  getWeaponRarityTone,
  getWeaponToneClasses,
  parseWholeNumberInput,
} from "@/features/tracker/domain";
import {
  ImageFallback,
  SearchInput,
  SelectInput,
  StarBadge,
  WeaponStatusBadge,
} from "@/features/tracker/components/ui";
import { useTrackerData } from "@/features/tracker/tracker-provider";
import type { ApiWeapon, Catalog, WeaponInventoryItem } from "@/features/tracker/types";

export default function InventoryPage() {
  const { catalog, characters, weaponInventory, setWeaponCount } = useTrackerData();
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <WeaponInventoryScreen
        assignmentCounts={assignmentCounts}
        catalog={catalog}
        inventory={weaponInventory}
        onSetWeaponCount={setWeaponCount}
      />
    </div>
  );
}

const catalogThumbnailSizes = "128px";

function compareWeaponsByType(a: ApiWeapon, b: ApiWeapon) {
  return (
    a.Type - b.Type ||
    a.TypeName.localeCompare(b.TypeName) ||
    a.Name.localeCompare(b.Name)
  );
}

function WeaponInventoryScreen({
  catalog,
  inventory,
  assignmentCounts,
  onSetWeaponCount,
}: {
  catalog: Catalog;
  inventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onSetWeaponCount: (weaponId: number, count: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [weaponTypeFilter, setWeaponTypeFilter] = useState("all");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const inventoryCounts = useMemo(
    () => buildWeaponInventoryCountMap(inventory),
    [inventory],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const weaponTypeOptions = useMemo(
    () => [
      { label: "All weapon types", value: "all" },
      ...Array.from(new Set(catalog.weapons.map((weapon) => weapon.TypeName)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((typeName) => ({ label: typeName, value: typeName })),
    ],
    [catalog.weapons],
  );
  const filteredWeapons = catalog.weapons.filter((weapon) => {
    const haystack = [weapon.Name, weapon.TypeName, String(weapon.QualityId)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesRarity =
      rarityFilter === "all" ||
      (rarityFilter === "other"
        ? weapon.QualityId < 4
        : String(weapon.QualityId) === rarityFilter);
    const matchesWeaponType =
      weaponTypeFilter === "all" || weapon.TypeName === weaponTypeFilter;
    const matchesOwnership = !ownedOnly || (inventoryCounts[weapon.Id] ?? 0) > 0;

    return (
      haystack.includes(normalizedQuery) &&
      matchesRarity &&
      matchesWeaponType &&
      matchesOwnership
    );
  });
  const weaponGroups = [
    {
      title: "5 Star",
      weapons: filteredWeapons
        .filter((weapon) => weapon.QualityId === 5)
        .sort(compareWeaponsByType),
    },
    {
      title: "4 Star",
      weapons: filteredWeapons
        .filter((weapon) => weapon.QualityId === 4)
        .sort(compareWeaponsByType),
    },
    {
      title: "Other",
      weapons: filteredWeapons
        .filter((weapon) => weapon.QualityId < 4)
        .sort(compareWeaponsByType),
    },
  ].filter((group) => group.weapons.length > 0);
  const overSharedCount = inventory.filter(
    (item) => (assignmentCounts[item.weaponId] ?? 0) > item.count,
  ).length;
  const totalCopies = inventory.reduce((sum, item) => sum + item.count, 0);
  const inventoryStats = [
    { label: "Unique weapons", value: String(inventory.length) },
    { label: "Total copies", value: String(totalCopies) },
    { label: "Over shared", value: String(overSharedCount), warn: overSharedCount > 0 },
  ];

  function setWeaponCount(weaponId: number, count: number) {
    onSetWeaponCount(weaponId, count);
  }

  function renderWeaponCard(weapon: ApiWeapon, loadEagerly = false) {
    const count = inventoryCounts[weapon.Id] ?? 0;
    const assigned = assignmentCounts[weapon.Id] ?? 0;
    const status = assigned > count && count > 0 ? "Shared" : null;
    const unowned = count === 0;
    const tone = getWeaponRarityTone({
      name: weapon.Name,
      qualityId: weapon.QualityId,
    });
    const toneClasses = getWeaponToneClasses(tone);

    return (
      <div
        className={`grid overflow-hidden rounded-md border text-left transition ${
          unowned
            ? `${toneClasses.card} opacity-55`
            : toneClasses.card
        }`}
        key={weapon.Id}
      >
        <div className={`relative h-24 border-b sm:h-28 ${toneClasses.image}`}>
          {weapon.Icon ? (
            <Image
              alt=""
                  className="object-contain p-2"
                  fill
                  loading={loadEagerly ? "eager" : "lazy"}
                  sizes={catalogThumbnailSizes}
              src={weapon.Icon}
            />
          ) : (
            <ImageFallback label={weapon.Name} />
          )}
          <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
            <StarBadge quality={weapon.QualityId} tone={tone} />
            <WeaponStatusBadge status={status} />
          </div>
        </div>

        <div className="grid gap-2 p-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-app-fg">
              {weapon.Name}
            </div>
            <div className="truncate text-[11px] text-app-muted-subtle">
              {weapon.TypeName} / Used {assigned}
            </div>
          </div>

          <div className="grid grid-cols-[2rem_1fr_2rem] items-center gap-1">
            <button
              aria-label={`Decrease ${weapon.Name}`}
              className="h-8 rounded-md border border-app-border bg-app-surface text-base font-semibold text-app-muted transition hover:bg-app-raised disabled:cursor-not-allowed disabled:opacity-40"
              disabled={count === 0}
              onClick={() => setWeaponCount(weapon.Id, count - 1)}
              type="button"
            >
              -
            </button>
            <input
              aria-label={`${weapon.Name} copies`}
              className="h-8 min-w-0 rounded-md border border-app-border bg-app-surface text-center text-sm font-semibold text-app-fg outline-none focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/25"
              inputMode="numeric"
              onChange={(event) =>
                setWeaponCount(weapon.Id, parseWholeNumberInput(event.target.value))
              }
              type="text"
              value={count ? String(count) : ""}
            />
            <button
              aria-label={`Increase ${weapon.Name}`}
              className="h-8 rounded-md border border-app-border bg-app-surface text-base font-semibold text-app-muted transition hover:bg-app-raised"
              onClick={() => setWeaponCount(weapon.Id, count + 1)}
              type="button"
            >
              +
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <div>
          <h1 className="text-2xl font-semibold text-app-fg">Weapon Inventory</h1>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {inventoryStats.map((stat) => (
              <div className="flex items-center gap-1.5" key={stat.label}>
                <dt className="text-app-muted-dim">{stat.label}</dt>
                <dd
                  className={`font-semibold ${
                    stat.warn ? "text-status-warn-text" : "text-app-muted"
                  }`}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <section className="grid gap-4 rounded-md border border-app-border/80 bg-app-surface p-4 sm:p-5">
        <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto] lg:items-end">
          <SearchInput onChange={setQuery} placeholder="Search weapons" value={query} />
          <SelectInput
            label="Rarity"
            onChange={setRarityFilter}
            options={[
              { label: "All rarities", value: "all" },
              { label: "5 Star", value: "5" },
              { label: "4 Star", value: "4" },
              { label: "3 Star and below", value: "other" },
            ]}
            showLabel={false}
            value={rarityFilter}
          />
          <SelectInput
            label="Weapon type"
            onChange={setWeaponTypeFilter}
            options={weaponTypeOptions}
            showLabel={false}
            value={weaponTypeFilter}
          />
          <label className="flex h-11 items-center gap-2 whitespace-nowrap rounded-md border border-app-border bg-app-bg px-3 text-sm font-medium text-app-muted">
            <input
              checked={ownedOnly}
              className="h-4 w-4 accent-app-accent"
              onChange={(event) => setOwnedOnly(event.target.checked)}
              type="checkbox"
            />
            Owned only
          </label>
        </div>

        {catalog.loading ? (
          <p className="text-sm text-app-muted-subtle">Loading weapon catalog...</p>
        ) : weaponGroups.length === 0 ? (
          <div className="rounded-md border border-dashed border-app-border p-6 text-center text-sm text-app-muted-subtle">
            No weapons match that search.
          </div>
        ) : (
          <div className="grid gap-5">
            {weaponGroups.map((group) => (
              <section className="grid gap-3" key={group.title}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-app-muted">
                    {group.title}
                  </h2>
                  <div className="h-px flex-1 bg-app-border/60" />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                  {group.weapons.map((weapon, index) =>
                    renderWeaponCard(weapon, group.title === "5 Star" && index === 0),
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
