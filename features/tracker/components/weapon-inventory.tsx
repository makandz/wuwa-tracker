"use client";

import Image from "next/image";
import { useState } from "react";

import { getWeaponRarityTone, getWeaponToneClasses, parseWholeNumberInput, sanitizeWholeNumberInput } from "../domain";
import type { ApiWeapon } from "../types";
import { ImageFallback, Modal, SearchInput, SelectInput, TextButton } from "./ui";

/**
 * Shows weapon artwork and rarity-colored identity in cards and catalog rows.
 * @param props - The weapon, contextual metadata, and optional compact layout.
 * @returns The weapon thumbnail, name, and metadata.
 */
export function WeaponInventoryIdentity({
  weapon,
  meta,
  compact = false,
}: {
  weapon: ApiWeapon;
  meta: string;
  compact?: boolean;
}) {
  const tone = getWeaponToneClasses(getWeaponRarityTone({ name: weapon.Name, qualityId: weapon.QualityId }));

  return (
    <div className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-2.5"}`}>
      <div className={`relative shrink-0 overflow-hidden rounded-md border ${compact ? "h-8 w-8" : "h-12 w-12"} ${tone.image}`}>
        {weapon.Icon ? (
          <Image alt="" className="object-contain p-0.5" fill sizes={compact ? "32px" : "48px"} src={weapon.Icon} />
        ) : (
          <ImageFallback label={weapon.Name} />
        )}
      </div>
      <div className="min-w-0">
        <div className={`break-words font-medium ${compact ? "text-xs" : "text-sm"} ${tone.text}`}>{weapon.Name}</div>
        <div className={`${compact ? "mt-0.5 text-[11px]" : "mt-1 text-xs"} text-app-muted-subtle`}>{meta}</div>
      </div>
    </div>
  );
}

/**
 * Edits a weapon stack using the same controls in the inventory and add picker.
 * @param props - The weapon name, owned quantity, update handler, and optional compact layout.
 * @returns Quantity decrement, direct input, and increment controls.
 */
export function WeaponQuantityInput({
  name,
  count,
  onChange,
  compact = false,
}: {
  name: string;
  count: number;
  onChange: (count: number) => void;
  compact?: boolean;
}) {
  const [draftValue, setDraftValue] = useState(String(count));
  const [focused, setFocused] = useState(false);
  const buttonClasses = `h-8 ${compact ? "w-6 text-xs" : "w-8 text-sm"} text-app-muted hover:bg-app-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-40`;

  return (
    <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md border border-app-border bg-app-bg">
      <button aria-label={`Decrease ${name} copies`} className={buttonClasses} disabled={count === 0} onClick={() => onChange(count - 1)} type="button">−</button>
      <input
        aria-label={`${name} copies`}
        className={`h-8 ${compact ? "w-7 text-xs" : "w-10 text-sm"} min-w-0 bg-transparent text-center tabular-nums text-app-fg outline-none focus:ring-2 focus:ring-inset focus:ring-app-accent`}
        inputMode="numeric"
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const nextValue = sanitizeWholeNumberInput(event.target.value);
          setDraftValue(nextValue);

          // An empty draft must not remove the card while replacing its quantity.
          if (nextValue !== "") {
            onChange(parseWholeNumberInput(nextValue));
          }
        }}
        onFocus={() => {
          setDraftValue(String(count));
          setFocused(true);
        }}
        type="text"
        value={focused ? draftValue : String(count)}
      />
      <button aria-label={`Increase ${name} copies`} className={buttonClasses} onClick={() => onChange(count + 1)} type="button">+</button>
    </div>
  );
}

/**
 * Browses the full catalog with editable quantities that stay open for multiple changes.
 * @param props - Catalog weapons, current quantities, and update and close handlers.
 * @returns The searchable inventory picker with compact tiles grouped by weapon type.
 */
export function WeaponInventoryModal({
  weapons,
  inventoryCounts,
  onSetWeaponCount,
  onClose,
}: {
  weapons: ApiWeapon[];
  inventoryCounts: Record<number, number>;
  onSetWeaponCount: (weaponId: number, count: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const search = query.trim().toLowerCase();
  const typeOptions = [...new Set(weapons.map((weapon) => weapon.TypeName))]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({ label: name, value: name }));
  const filteredWeapons = weapons.filter((weapon) => {
    const matchesSearch = `${weapon.Name} ${weapon.TypeName}`.toLowerCase().includes(search);
    const matchesType = typeFilter === "all" || weapon.TypeName === typeFilter;
    let matchesRarity = rarityFilter === "all" || String(weapon.QualityId) === rarityFilter;

    if (rarityFilter === "other") {
      matchesRarity = weapon.QualityId < 4;
    }

    return matchesSearch && matchesType && matchesRarity;
  }).sort((left, right) => left.Type - right.Type || right.QualityId - left.QualityId || left.Name.localeCompare(right.Name));
  const weaponGroups = new Map<number, { name: string; weapons: ApiWeapon[] }>();

  for (const weapon of filteredWeapons) {
    const group = weaponGroups.get(weapon.Type);

    if (group) {
      group.weapons.push(weapon);
    } else {
      weaponGroups.set(weapon.Type, { name: weapon.TypeName, weapons: [weapon] });
    }
  }

  return (
    <Modal title="Add weapons" onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_9rem]">
          <div className="sm:col-span-2 lg:col-span-1">
            <SearchInput compact ariaLabel="Search weapon catalog" placeholder="Search all weapons" value={query} onChange={setQuery} />
          </div>
          <SelectInput compact showLabel={false} label="Weapon type" options={[{ label: "All types", value: "all" }, ...typeOptions]} value={typeFilter} onChange={setTypeFilter} />
          <SelectInput
            compact
            showLabel={false}
            label="Rarity"
            options={[{ label: "All rarities", value: "all" }, { label: "5 Star", value: "5" }, { label: "4 Star", value: "4" }, { label: "3 Star and below", value: "other" }]}
            value={rarityFilter}
            onChange={setRarityFilter}
          />
        </div>
        <div className="grid gap-4">
          {[...weaponGroups].map(([type, group]) => (
            <section className="grid gap-2" key={type}>
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-medium text-app-muted-subtle">{group.name}</h3>
                <div className="h-px flex-1 bg-app-border" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.weapons.map((weapon) => (
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-app-border bg-app-bg p-2" key={weapon.Id}>
                    <WeaponInventoryIdentity compact weapon={weapon} meta={`${weapon.QualityId}★`} />
                    <WeaponQuantityInput compact name={weapon.Name} count={inventoryCounts[weapon.Id] ?? 0} onChange={(count) => onSetWeaponCount(weapon.Id, count)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
          {filteredWeapons.length === 0 ? <p className="py-6 text-center text-sm text-app-muted-subtle">No weapons match that search.</p> : null}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-app-border pt-3">
          <p className="text-xs text-app-muted-subtle">Changes save as you go.</p>
          <TextButton compact onClick={onClose}>Done</TextButton>
        </div>
      </div>
    </Modal>
  );
}
