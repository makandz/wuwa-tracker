"use client";

import Image from "next/image";
import { useState } from "react";

import {
  getPrydwenCharacterUrl,
  getTethysCharacterUrl,
  getTrackedCharacterDisplay,
  getTrackedWeaponDisplay,
  getWeaponRarityTone,
  getWeaponToneClasses,
  isComplete,
} from "../domain";
import type { ApiCharacter, ApiWeapon, TrackedCharacter } from "../types";
import { CharacterAvatar, ErInput } from "./ui";

/**
 * Shows character identity and the settings shared by every echo set.
 * @param props - The character, catalog details, inventory count, and edit handlers.
 * @returns The character heading and compact settings bar.
 */
export function CharacterOverview({
  character,
  catalogCharacter,
  weapon,
  ownedCount,
  onChangeWeapon,
  onDelete,
  onPatch,
}: {
  character: TrackedCharacter;
  catalogCharacter: ApiCharacter | null;
  weapon: ApiWeapon | null;
  ownedCount: number;
  onChangeWeapon: () => void;
  onDelete: () => void;
  onPatch: (patch: Partial<TrackedCharacter>) => void;
}) {
  const [notesOpen, setNotesOpen] = useState(Boolean(character.notes.trim()));
  const display = getTrackedCharacterDisplay(character, catalogCharacter);
  const weaponDisplay = getTrackedWeaponDisplay(character, weapon);
  const weaponTone = getWeaponToneClasses(getWeaponRarityTone({
    name: weaponDisplay.name,
    qualityId: weaponDisplay.qualityId,
  }));
  const complete = isComplete(character);
  const weaponMeta = [weaponDisplay.typeName];

  if (weaponDisplay.qualityId) {
    weaponMeta.push(`${weaponDisplay.qualityId}★`);
  }

  if (weapon) {
    weaponMeta.push(`Owned ${ownedCount}`);
  }

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CharacterAvatar character={character} catalogCharacter={catalogCharacter} compact />
          <div className="min-w-0">
            <h1 className="text-2xl font-medium text-app-fg">{display.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-app-muted-subtle">
              <span>{[display.elementName, display.weaponTypeName].filter(Boolean).join(" / ")}</span>
              <span aria-hidden="true">·</span>
              <span className={complete ? "text-status-good-text" : undefined}>
                {complete ? "Done" : "In progress"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            className="rounded-sm py-1 text-xs text-app-muted-subtle hover:text-app-fg focus-visible:outline-2 focus-visible:outline-app-accent"
            href={getPrydwenCharacterUrl(display.name)}
            target="_blank"
            rel="noreferrer"
          >Prydwen <span aria-hidden="true">↗</span></a>
          <a
            className="rounded-sm py-1 text-xs text-app-muted-subtle hover:text-app-fg focus-visible:outline-2 focus-visible:outline-app-accent"
            href={getTethysCharacterUrl(character.characterId)}
            target="_blank"
            rel="noreferrer"
          >Tethys <span aria-hidden="true">↗</span></a>
          <details
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                event.currentTarget.open = false;
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary
              aria-label="More character actions"
              className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-md border border-app-border bg-app-surface text-app-muted hover:bg-app-raised focus-visible:outline-2 focus-visible:outline-app-accent [&::-webkit-details-marker]:hidden"
            ><span aria-hidden="true">⋯</span></summary>
            <div className="absolute right-0 top-full z-10 mt-1 min-w-40 rounded-md border border-app-border bg-app-surface p-1 shadow-lg">
              <button
                className="w-full rounded-sm px-3 py-2 text-left text-xs text-status-danger-text hover:bg-status-danger-bg focus-visible:outline-2 focus-visible:outline-app-accent"
                onClick={onDelete}
                type="button"
              >Delete character</button>
            </div>
          </details>
        </div>
      </header>

      <section aria-label="Character settings" className="rounded-lg border border-app-border bg-app-surface">
        <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_7.25rem_8.875rem]">
          <button
            aria-label={`Change weapon: ${weaponDisplay.name || "No weapon selected"}`}
            aria-haspopup="dialog"
            className="col-span-2 min-w-0 rounded-t-lg border-b border-app-border p-3.5 text-left hover:bg-app-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent md:col-span-1 md:rounded-tr-none md:border-b-0"
            onClick={onChangeWeapon}
            type="button"
          >
            <span className="mb-1.5 block text-xs text-app-muted-subtle">Weapon</span>
            <span className="flex items-center gap-2.5">
              <span className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border ${weaponTone.image}`}>
                {weaponDisplay.icon ? (
                  <Image alt="" className="object-contain" fill sizes="40px" src={weaponDisplay.icon} />
                ) : (
                  <span className="text-lg text-app-muted-dim">{weaponDisplay.name.charAt(0) || "+"}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-medium ${weaponTone.text}`}>
                  {weaponDisplay.name || "No weapon selected"}
                </span>
                <span className="mt-0.5 block truncate text-xs text-app-muted-subtle">
                  {weaponMeta.filter(Boolean).join(" · ") || "Choose an owned weapon"}
                </span>
              </span>
              <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-app-muted-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m8 8 4-4 4 4M8 16l4 4 4-4" />
              </svg>
            </span>
          </button>
          <label className="block min-w-0 p-3.5 md:border-l md:border-app-border">
            <span className="mb-1.5 block text-xs text-app-muted-subtle">
              Target ER<span className="sr-only"> for all echo sets</span>
            </span>
            <ErInput value={character.expectedEr} onChange={(expectedEr) => onPatch({ expectedEr })} />
          </label>
          <div className="border-l border-app-border p-3.5">
            <span className="mb-1.5 block text-xs text-app-muted-subtle">Skills / Forte</span>
            <label className="flex h-10 cursor-pointer items-center gap-2 text-sm">
              <input
                aria-label="Skills / Forte complete"
                className="h-4 w-4 accent-app-accent"
                type="checkbox"
                checked={character.skillsDone}
                onChange={(event) => onPatch({ skillsDone: event.target.checked })}
              />
              <span className={character.skillsDone ? "text-status-good-text" : "text-app-muted-subtle"}>
                {character.skillsDone ? "Complete" : "Pending"}
              </span>
            </label>
          </div>
        </div>
        <details
          className="group border-t border-app-border"
          open={notesOpen}
          onToggle={(event) => setNotesOpen(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-b-lg px-3.5 py-2.5 text-xs text-app-muted-subtle hover:text-app-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent [&::-webkit-details-marker]:hidden">
            <svg aria-hidden="true" className="h-3 w-3 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
            Character notes
          </summary>
          <div className="px-3.5 pb-3.5">
            <textarea
              aria-label="Character notes"
              className="block min-h-16 w-full resize-y rounded-md border border-app-border bg-app-bg p-2.5 text-sm text-app-fg outline-none focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/20"
              placeholder="Add a note…"
              rows={2}
              value={character.notes}
              onChange={(event) => onPatch({ notes: event.target.value })}
            />
          </div>
        </details>
      </section>
    </div>
  );
}
