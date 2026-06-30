"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { getWeaponRarityTone, getWeaponToneClasses, parseWholeNumberInput } from "../domain";
import type { ApiWeapon, Catalog, WeaponInventoryItem } from "../types";
import {
  ImageFallback,
  SearchInput,
  StarBadge,
  TextButton,
  WeaponStatusBadge,
} from "../components/ui";

const catalogThumbnailSizes = "128px";

function compareWeaponsByType(a: ApiWeapon, b: ApiWeapon) {
  return (
    a.Type - b.Type ||
    a.TypeName.localeCompare(b.TypeName) ||
    a.Name.localeCompare(b.Name)
  );
}

export function WeaponInventoryScreen({
  catalog,
  inventory,
  assignmentCounts,
  onBack,
  onUpdate,
}: {
  catalog: Catalog;
  inventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onBack: () => void;
  onUpdate: (inventory: WeaponInventoryItem[]) => void;
}) {
  const [query, setQuery] = useState("");
  const inventoryCounts = useMemo(
    () =>
      inventory.reduce<Record<number, number>>((counts, item) => {
        counts[item.weaponId] = item.count;
        return counts;
      }, {}),
    [inventory],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredWeapons = catalog.weapons.filter((weapon) => {
    const haystack = [weapon.Name, weapon.TypeName, String(weapon.QualityId)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
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
    const nextCount = Math.max(0, Math.round(count));

    if (nextCount === 0) {
      onUpdate(inventory.filter((item) => item.weaponId !== weaponId));
      return;
    }

    const existing = inventory.find((item) => item.weaponId === weaponId);

    if (existing) {
      onUpdate(
        inventory.map((item) =>
          item.weaponId === weaponId ? { ...item, count: nextCount } : item,
        ),
      );
      return;
    }

    onUpdate([...inventory, { weaponId, count: nextCount }]);
  }

  function renderWeaponCard(weapon: ApiWeapon) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <TextButton onClick={onBack}>Dashboard</TextButton>
      </div>

      <section className="grid gap-4 rounded-md border border-app-border/80 bg-app-surface p-5">
        <SearchInput onChange={setQuery} placeholder="Search weapons" value={query} />

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
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                  {group.weapons.map((weapon) => renderWeaponCard(weapon))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
