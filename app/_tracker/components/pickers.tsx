"use client";

import { useState } from "react";
import Image from "next/image";

import {
  getCharacterRarityDisplay,
  getWeaponRarityTone,
  getWeaponToneClasses,
} from "../domain";
import type { ApiCharacter, ApiWeapon, CharacterBadgeTone, WeaponRarityTone } from "../types";
import { ImageFallback, Modal, SearchInput, StarBadge, TextButton } from "./ui";

const catalogThumbnailSizes = "128px";

export function CharacterPickerModal({
  characters,
  trackedIds,
  selectedId,
  onSelect,
  onClose,
}: {
  characters: ApiCharacter[];
  trackedIds: Set<number>;
  selectedId: number | undefined;
  onSelect: (character: ApiCharacter) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCharacters = characters.filter((character) => {
    const rarityDisplay = getCharacterRarityDisplay({
      name: character.Name,
      qualityId: character.QualityId,
    });
    const haystack = [
      character.Name,
      character.Element?.Name,
      character.WeaponType?.Name,
      String(rarityDisplay.qualityId),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  return (
    <Modal
      onClose={onClose}
      subtitle="Search by name, element, rarity, or weapon type."
      title="Choose Character"
    >
      <div className="grid gap-4">
        <SearchInput
          onChange={setQuery}
          placeholder="Search characters"
          value={query}
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
          {filteredCharacters.map((character) => {
            const alreadyTracked = trackedIds.has(character.Id);
            const selected = selectedId === character.Id;
            const rarityDisplay = getCharacterRarityDisplay({
              name: character.Name,
              qualityId: character.QualityId,
            });

            return (
              <button
                className={`grid overflow-hidden rounded-md border text-left transition ${
                  selected
                    ? "border-app-accent bg-app-accent-soft/55 shadow-md"
                    : "border-app-border/80 bg-app-surface hover:border-app-accent hover:shadow-md"
                } ${alreadyTracked ? "cursor-not-allowed opacity-45" : ""}`}
                disabled={alreadyTracked}
                key={character.Id}
                onClick={() => onSelect(character)}
                type="button"
              >
                <div className="relative h-24 bg-app-raised sm:h-28">
                  {character.RoleHeadIcon ? (
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes={catalogThumbnailSizes}
                      src={character.RoleHeadIcon}
                    />
                  ) : (
                    <ImageFallback label={character.Name} />
                  )}
                  <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                    <StarBadge
                      animated={rarityDisplay.animatedBadge}
                      characterTone={rarityDisplay.badgeTone}
                      quality={rarityDisplay.qualityId}
                    />
                    {alreadyTracked ? (
                      <span className="rounded bg-app-bg px-1.5 py-0.5 text-[10px] font-bold text-white">
                        tracked
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-0.5 p-2">
                  <div className="truncate text-xs font-semibold text-app-fg">
                    {character.Name}
                  </div>
                  <div className="truncate text-[11px] text-app-muted-subtle">
                    {character.Element?.Name ?? "Unknown"} /{" "}
                    {character.WeaponType?.Name ?? "Unknown"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {filteredCharacters.length === 0 ? (
          <div className="rounded-md border border-dashed border-app-border p-6 text-center text-sm text-app-muted-subtle">
            No characters match that search.
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function WeaponPickerModal({
  weapons,
  selectedId,
  weaponTypeName,
  inventoryCounts = {},
  assignmentCounts = {},
  showClear = true,
  onSelect,
  onClear,
  onClose,
}: {
  weapons: ApiWeapon[];
  selectedId: number | null;
  weaponTypeName: string;
  inventoryCounts?: Record<number, number>;
  assignmentCounts?: Record<number, number>;
  showClear?: boolean;
  onSelect: (weapon: ApiWeapon) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredWeapons = weapons.filter((weapon) => {
    const haystack = [
      weapon.Name,
      weapon.TypeName,
      String(weapon.QualityId),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
  const weaponGroups = [
    { title: "5 Star", weapons: filteredWeapons.filter((weapon) => weapon.QualityId === 5) },
    { title: "4 Star", weapons: filteredWeapons.filter((weapon) => weapon.QualityId === 4) },
    { title: "Other", weapons: filteredWeapons.filter((weapon) => weapon.QualityId < 4) },
  ].filter((group) => group.weapons.length > 0);

  return (
    <Modal
      onClose={onClose}
      subtitle={`${weaponTypeName} weapons, grouped by rarity.`}
      title="Choose Weapon"
    >
      <div className="grid gap-5">
        <div className={`grid gap-3 ${showClear ? "sm:grid-cols-[1fr_auto]" : ""}`}>
          <SearchInput onChange={setQuery} placeholder="Search weapons" value={query} />
          {showClear ? <TextButton onClick={onClear}>No weapon</TextButton> : null}
        </div>
        {weaponGroups.map((group) => (
          <section className="grid gap-3" key={group.title}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-normal text-app-muted-subtle">
                {group.title}
              </h3>
              <div className="h-px flex-1 bg-app-border/60" />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
              {group.weapons.map((weapon) => {
                const selected = selectedId === weapon.Id;
                const ownedCount = inventoryCounts[weapon.Id] ?? 0;
                const assignedCount = assignmentCounts[weapon.Id] ?? 0;
                const showInventory = ownedCount > 0 || assignedCount > 0;
                const tone = getWeaponRarityTone({
                  name: weapon.Name,
                  qualityId: weapon.QualityId,
                });
                const toneClasses = getWeaponToneClasses(tone);

                return (
                  <button
                    className={`grid overflow-hidden rounded-md border text-left transition ${
                      selected
                        ? "border-app-accent bg-app-accent-soft/55 shadow-md"
                        : `${toneClasses.card} hover:border-app-accent hover:bg-app-raised/80 hover:shadow-md`
                    }`}
                    key={weapon.Id}
                    onClick={() => onSelect(weapon)}
                    type="button"
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
                      <div className="absolute left-1.5 top-1.5">
                        <StarBadge quality={weapon.QualityId} tone={tone} />
                      </div>
                    </div>
                    <div className="grid gap-0.5 p-2">
                      <div className="truncate text-xs font-semibold text-app-fg">
                        {weapon.Name}
                      </div>
                      <div className="truncate text-[11px] text-app-muted-subtle">{weapon.TypeName}</div>
                      {showInventory ? (
                        <div className="truncate text-[11px] font-medium text-app-muted-dim">
                          Own {ownedCount} / Used {assignedCount}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {weaponGroups.length === 0 ? (
          <div className="rounded-md border border-dashed border-app-border p-6 text-center text-sm text-app-muted-subtle">
            No weapons match that search.
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function PickerSummary({
  label,
  title,
  meta,
  image,
  quality,
  characterBadgeTone,
  animatedBadge = false,
  rarityTone,
  actionLabel,
  onClick,
}: {
  label: string;
  title: string;
  meta: string;
  image?: string;
  quality?: number | null;
  characterBadgeTone?: CharacterBadgeTone;
  animatedBadge?: boolean;
  rarityTone?: WeaponRarityTone;
  actionLabel: string;
  onClick: () => void;
}) {
  const toneClasses = rarityTone ? getWeaponToneClasses(rarityTone) : null;

  return (
    <div className="grid gap-3">
      <div className="text-sm font-medium text-app-muted">{label}</div>
      <button
        className={`grid gap-4 rounded-md border p-3 text-left transition hover:border-app-accent hover:bg-app-raised/80 sm:grid-cols-[auto_1fr_auto] ${
          toneClasses ? toneClasses.card : "border-app-border/80 bg-app-surface/70"
        }`}
        onClick={onClick}
        type="button"
      >
        <div
          className={`relative h-20 w-20 overflow-hidden rounded-md border ${
            toneClasses ? toneClasses.image : "border-app-border/80 bg-app-surface"
          }`}
        >
          {image ? (
            <Image
              alt=""
              className="object-contain"
              fill
              sizes="80px"
              src={image}
            />
          ) : (
            <ImageFallback label={title} />
          )}
        </div>
        <div className="min-w-0 self-center">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-lg font-semibold text-app-fg">{title}</div>
            <StarBadge
              animated={animatedBadge}
              characterTone={characterBadgeTone}
              quality={quality}
              tone={rarityTone}
            />
          </div>
          <div className="mt-1 text-sm text-app-muted-subtle">{meta}</div>
        </div>
        <div className="self-center rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm font-semibold text-app-muted">
          {actionLabel}
        </div>
      </button>
    </div>
  );
}
