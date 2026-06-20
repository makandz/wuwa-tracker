"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import {
  CHECKLIST_SEGMENTS,
  DEFAULT_SCREEN,
  FOUR_COST_OPTIONS,
  ROLES,
  emptyChecklist,
} from "./_tracker/constants";
import {
  characterRoleToneClasses,
  checklistTotal,
  formatDecimalInputValue,
  formatPercent,
  formatRatingValue,
  formatRoleSummaryValue,
  getAssignmentCounts,
  getPrimaryRole,
  getPrydwenCharacterUrl,
  getRatingGrade,
  getRatings,
  getRoleSummary,
  getWeaponInventoryStatus,
  getWeaponRarityTone,
  getWeaponToneClasses,
  isComplete,
  parseDecimalInput,
  parseWholeNumberInput,
  ratingGradeClasses,
  roleButtonClasses,
  rolePillClasses,
  roleSectionClasses,
  sanitizeDecimalInput,
  sortDashboardCharacters,
} from "./_tracker/domain";
import {
  exportTrackerData,
  parseImportedTrackerData,
  readStoredDashboardSortKey,
  writeStoredDashboardSortKey,
} from "./_tracker/storage";
import type {
  ApiCharacter,
  ApiWeapon,
  Catalog,
  Checklist,
  DashboardSortKey,
  FourCostMain,
  RatingValue,
  Role,
  RoleFilter,
  TrackedCharacter,
  WeaponFilter,
  WeaponInventoryItem,
  WeaponRarityTone,
} from "./_tracker/types";
import { useCatalog } from "./_tracker/use-catalog";
import { usePersistedTrackerState } from "./_tracker/use-persisted-tracker-state";
import { useTrackerNavigation } from "./_tracker/use-tracker-navigation";

function StatBlock({
  label,
  value,
  tone = "neutral",
  compact = false,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
  compact?: boolean;
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/60 bg-emerald-950/35 text-emerald-100"
      : tone === "warn"
        ? "border-amber-500/60 bg-amber-950/35 text-amber-100"
        : "border-app-border/80 bg-app-surface text-app-fg";

  return (
    <div className={`rounded-md border ${compact ? "p-2" : "p-3"} ${toneClass}`}>
      <div
        className={`font-semibold uppercase tracking-normal text-app-muted-dim ${
          compact ? "text-[10px]" : "text-[11px]"
        }`}
      >
        {label}
      </div>
      <div
        className={`font-semibold leading-none ${
          compact ? "mt-0.5 text-sm" : "mt-1 text-lg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function RatingBlock({ label, value }: { label: string; value: RatingValue }) {
  if (value === null) {
    return (
      <div className="rounded-md border border-amber-500/60 bg-amber-950/35 p-2">
        <div className="text-[10px] font-semibold uppercase tracking-normal text-amber-200">
          {label}
        </div>
        <div className="mt-0.5 text-sm font-bold leading-none text-amber-100">Check</div>
      </div>
    );
  }

  const grade = getRatingGrade(value);

  return (
    <div className="rounded-md border border-app-border/80 bg-app-surface p-2">
      <div className="text-[10px] font-semibold uppercase tracking-normal text-app-muted-dim">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-sm font-bold leading-none ${ratingGradeClasses(
            grade,
          )}`}
        >
          {grade}
        </span>
        <span className="text-[11px] font-semibold leading-none text-app-muted-dim">
          {value.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function TextButton({
  children,
  onClick,
  variant = "secondary",
  type = "button",
  compact = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  compact?: boolean;
}) {
  const classes =
    variant === "primary"
      ? "border-app-accent bg-app-accent text-app-bg hover:bg-app-accent-hover"
      : variant === "danger"
        ? "border-rose-500/50 bg-rose-950/25 text-rose-200 hover:bg-rose-950/45"
        : "border-app-border bg-app-surface text-app-muted hover:bg-app-raised";

  return (
    <button
      className={`rounded-md border font-semibold transition ${
        compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
      } ${classes}`}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function TextLink({
  children,
  href,
  compact = false,
}: {
  children: React.ReactNode;
  href: string;
  compact?: boolean;
}) {
  return (
    <a
      className={`inline-flex items-center rounded-md border border-app-border bg-app-surface font-semibold text-app-muted transition hover:bg-app-raised ${
        compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
      }`}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-app-muted">
      {label}
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  const [draftValue, setDraftValue] = useState(() => formatDecimalInputValue(value * 100));
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? draftValue : formatDecimalInputValue(value * 100);

  return (
    <div className="relative">
      <input
        className="h-11 w-full rounded-md border border-app-border bg-app-surface px-3 pr-9 text-sm text-app-fg outline-none transition focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/25"
        inputMode="decimal"
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const nextValue = sanitizeDecimalInput(event.target.value);

          setDraftValue(nextValue);
          onChange(parseDecimalInput(nextValue) / 100);
        }}
        onFocus={() => {
          setDraftValue(formatDecimalInputValue(value * 100));
          setFocused(true);
        }}
        placeholder={placeholder}
        type="text"
        value={displayValue}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm font-semibold text-app-muted-dim">
        %
      </span>
    </div>
  );
}

function StarBadge({
  quality,
  tone,
}: {
  quality: number | null | undefined;
  tone?: WeaponRarityTone;
}) {
  if (!quality) {
    return null;
  }

  const toneClass =
    tone === undefined
      ? quality >= 5
        ? "bg-amber-300 text-app-bg"
        : quality === 4
          ? "bg-violet-500 text-white"
          : "bg-sky-500 text-white"
      : getWeaponToneClasses(tone).badge;

  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${toneClass}`}>
      {quality} star
    </span>
  );
}

function WeaponStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return null;
  }

  return (
    <span
      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
        status === "Shared"
          ? "bg-amber-950/70 text-amber-200"
          : "bg-rose-950/70 text-rose-200"
      }`}
    >
      {status}
    </span>
  );
}

function ImageFallback({ label }: { label: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-app-raised text-lg font-bold text-app-muted-dim">
      {label.charAt(0)}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-app-bg/75 p-3 sm:p-6">
      <div
        aria-modal="true"
        className="grid max-h-[90vh] w-full max-w-5xl grid-rows-[auto_1fr] overflow-hidden rounded-md border border-app-border/80 bg-app-surface shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-app-border/80 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-xl font-semibold text-app-fg">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-app-muted-subtle">{subtitle}</p> : null}
          </div>
          <button
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-app-border bg-app-surface text-xl leading-none text-app-muted transition hover:bg-app-raised"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
  compact = false,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  compact?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      className={`w-full rounded-md border border-app-border bg-app-surface text-app-fg outline-none transition focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/25 ${
        compact ? "h-9 px-2.5 text-xs" : "h-11 px-3 text-sm"
      }`}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="search"
      value={value}
    />
  );
}

function SelectInput<TValue extends string>({
  label,
  value,
  options,
  onChange,
  compact = false,
  showLabel = true,
}: {
  label: string;
  value: TValue;
  options: { label: string; value: TValue }[];
  onChange: (value: TValue) => void;
  compact?: boolean;
  showLabel?: boolean;
}) {
  return (
    <label
      className={`grid font-medium text-app-muted ${
        compact && showLabel ? "gap-1 text-xs" : compact ? "gap-0 text-xs" : "gap-2 text-sm"
      }`}
    >
      {showLabel ? label : <span className="sr-only">{label}</span>}
      <select
        aria-label={label}
        className={`w-full rounded-md border border-app-border bg-app-surface font-semibold text-app-fg outline-none transition focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/25 ${
          compact ? "h-9 px-2.5 text-xs" : "h-11 px-3 text-sm"
        }`}
        onChange={(event) => onChange(event.target.value as TValue)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CharacterPickerModal({
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
    const haystack = [
      character.Name,
      character.Element?.Name,
      character.WeaponType?.Name,
      String(character.QualityId),
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
                      sizes="(min-width: 1024px) 120px, (min-width: 640px) 20vw, 33vw"
                      src={character.RoleHeadIcon}
                    />
                  ) : (
                    <ImageFallback label={character.Name} />
                  )}
                  <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                    <StarBadge quality={character.QualityId} />
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

function WeaponPickerModal({
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
                          sizes="(min-width: 1024px) 120px, (min-width: 640px) 20vw, 33vw"
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

function PickerSummary({
  label,
  title,
  meta,
  image,
  quality,
  rarityTone,
  actionLabel,
  onClick,
}: {
  label: string;
  title: string;
  meta: string;
  image?: string;
  quality?: number | null;
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
            <StarBadge quality={quality} tone={rarityTone} />
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

function ErInput({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  const [draftValue, setDraftValue] = useState(() => formatDecimalInputValue(value));
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? draftValue : formatDecimalInputValue(value);

  return (
    <div className="relative">
      <input
        className="h-11 w-full rounded-md border border-app-border bg-app-surface px-3 pr-9 text-sm text-app-fg outline-none transition focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/25"
        inputMode="decimal"
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const nextValue = sanitizeDecimalInput(event.target.value);

          setDraftValue(nextValue);
          onChange(parseDecimalInput(nextValue));
        }}
        onFocus={() => {
          setDraftValue(formatDecimalInputValue(value));
          setFocused(true);
        }}
        placeholder={placeholder}
        type="text"
        value={displayValue}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm font-semibold text-app-muted-dim">
        %
      </span>
    </div>
  );
}

function RoleToggle({
  role,
  active,
  onToggle,
}: {
  role: Role;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${roleButtonClasses(
        role,
        active,
      )}`}
      onClick={onToggle}
      type="button"
    >
      {role}
    </button>
  );
}

function CharacterAvatar({
  character,
  compact = false,
}: {
  character: TrackedCharacter;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md border border-app-border/80 bg-app-raised ${
        compact ? "h-12 w-12" : "h-14 w-14"
      }`}
    >
      {character.characterIcon ? (
        <Image
          alt=""
          className="h-full w-full object-cover"
          fill
          sizes={compact ? "48px" : "56px"}
          src={character.characterIcon}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-lg font-bold text-app-muted-dim">
          {character.characterName.charAt(0)}
        </div>
      )}
      <span
        className={`absolute bottom-0 right-0 px-1 text-[10px] font-bold ${
          character.qualityId >= 5
            ? "bg-amber-300 text-app-bg"
            : "bg-violet-500 text-white"
        }`}
      >
        {character.qualityId}
      </span>
    </div>
  );
}

function ChecklistProgressSegments({ checklist }: { checklist: Checklist }) {
  return (
    <div
      aria-label="Checklist progress"
      className="grid h-5 grid-cols-6 gap-0.5 overflow-hidden rounded-full bg-app-raised p-0.5"
    >
      {CHECKLIST_SEGMENTS.map((segment) => {
        const complete = checklist[segment.key];

        return (
          <span
            aria-label={`${segment.label}: ${complete ? "done" : "not done"}`}
            className={`grid min-w-0 place-items-center rounded-full text-[9px] font-bold leading-none transition ${
              complete
                ? "bg-app-accent-strong text-app-bg"
                : "bg-app-surface text-app-muted-dim"
            }`}
            key={segment.key}
            title={`${segment.label}: ${complete ? "done" : "not done"}`}
          >
            {segment.shortLabel}
          </span>
        );
      })}
    </div>
  );
}

function Dashboard({
  characters,
  weaponInventory,
  assignmentCounts,
  onAdd,
  onOpen,
  onInventory,
  onExport,
  onImport,
  onClear,
  importRef,
}: {
  characters: TrackedCharacter[];
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onAdd: () => void;
  onOpen: (id: string) => void;
  onInventory: () => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  importRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [weaponFilter, setWeaponFilter] = useState<WeaponFilter>("all");
  const [hideComplete, setHideComplete] = useState(false);
  const [sortKey, setSortKey] = useState<DashboardSortKey>(readStoredDashboardSortKey);
  const completeCount = characters.filter(isComplete).length;
  const critWeightedCharacters = characters.filter((character) => !character.noCrit);
  const validWeights = critWeightedCharacters
    .map((character) => getRatings(character).weighted)
    .filter((weight): weight is number => weight !== null);
  const averageWeighted =
    validWeights.length > 0
      ? validWeights.reduce((sum, weight) => sum + weight, 0) / validWeights.length
      : null;
  const averageWeightedValue =
    characters.length === 0
      ? "0.00"
      : averageWeighted !== null
        ? formatRatingValue(averageWeighted)
        : critWeightedCharacters.length === 0
          ? "No crit"
          : formatRatingValue(null);
  const totalWeaponCopies = weaponInventory.reduce((sum, item) => sum + item.count, 0);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCharacters = useMemo(() => {
    const filtered = characters.filter((character) => {
      if (hideComplete && isComplete(character)) {
        return false;
      }

      if (roleFilter !== "all" && !character.roles.includes(roleFilter)) {
        return false;
      }

      const weaponStatus = getWeaponInventoryStatus({
        weaponId: character.weaponId,
        inventory: weaponInventory,
        assignmentCounts,
      });

      if (weaponFilter === "selected" && !character.weaponId) {
        return false;
      }

      if (weaponFilter === "missing" && character.weaponId) {
        return false;
      }

      if (weaponFilter === "attention" && !weaponStatus) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        character.characterName,
        character.elementName,
        character.weaponTypeName,
        character.weaponName,
        character.roles.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    return filtered;
  }, [
    assignmentCounts,
    characters,
    hideComplete,
    normalizedQuery,
    roleFilter,
    weaponFilter,
    weaponInventory,
  ]);
  const groupedCharacters = useMemo(
    () =>
      ROLES.map((role) => {
        const characters = sortDashboardCharacters(
          visibleCharacters.filter((character) => getPrimaryRole(character.roles) === role),
          sortKey,
        );

        return {
          role,
          characters,
          summary: getRoleSummary(characters),
        };
      }).filter((group) => group.characters.length > 0),
    [sortKey, visibleCharacters],
  );

  useEffect(() => {
    writeStoredDashboardSortKey(sortKey);
  }, [sortKey]);

  const filtersActive =
    normalizedQuery ||
    roleFilter !== "all" ||
    weaponFilter !== "all" ||
    hideComplete;

  return (
    <>
      <section className="border-b border-app-border/80 bg-app-surface">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-app-accent">Wuthering Waves</p>
              <h1 className="mt-1 text-3xl font-bold tracking-normal text-app-fg">
                Build Tracker
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <TextButton onClick={onAdd} variant="primary">
                Add Character
              </TextButton>
              <TextButton onClick={onInventory}>Weapon Inventory</TextButton>
              <TextButton onClick={onExport}>Export</TextButton>
              <TextButton onClick={() => importRef.current?.click()}>Import</TextButton>
              <TextButton onClick={onClear} variant="danger">
                Clear
              </TextButton>
              <input
                accept="application/json"
                className="hidden"
                onChange={onImport}
                ref={importRef}
                type="file"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatBlock label="Tracked" value={String(characters.length)} />
            <StatBlock
              label="Complete"
              tone={completeCount === characters.length && characters.length > 0 ? "good" : "neutral"}
              value={`${completeCount}/${characters.length}`}
            />
            <StatBlock
              label="Avg Weighted"
              value={averageWeightedValue}
            />
            <StatBlock label="Weapon Copies" value={String(totalWeaponCopies)} />
          </div>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-5 sm:px-6 lg:px-8">
        {characters.length === 0 ? (
          <div className="rounded-md border border-dashed border-app-border bg-app-surface p-8 text-center">
            <h2 className="text-xl font-semibold text-app-fg">No tracked characters yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-app-muted-subtle">
              Add a character from the live catalog, assign roles and a weapon, then track echo
              pieces, skill completion, ER targets, and ratings locally in this browser.
            </p>
            <div className="mt-5">
              <TextButton onClick={onAdd} variant="primary">
                Add Character
              </TextButton>
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5">
            <section className="flex flex-wrap items-center gap-2 rounded-md border border-app-border/80 bg-app-surface px-3 py-2 shadow-sm">
              <div className="min-w-[220px] flex-1">
                <SearchInput
                  ariaLabel="Search"
                  compact
                  onChange={setQuery}
                  placeholder="Search name, element, weapon, or role"
                  value={query}
                />
              </div>
              <div className="grid flex-1 gap-2 sm:flex-none sm:grid-cols-3">
                <SelectInput
                  compact
                  label="Role"
                  onChange={setRoleFilter}
                  options={[
                    { label: "All roles", value: "all" },
                    ...ROLES.map((role) => ({ label: role, value: role })),
                  ]}
                  showLabel={false}
                  value={roleFilter}
                />
                <SelectInput
                  compact
                  label="Weapon"
                  onChange={setWeaponFilter}
                  options={[
                    { label: "All weapon states", value: "all" },
                    { label: "Weapon selected", value: "selected" },
                    { label: "No weapon", value: "missing" },
                    { label: "Needs attention", value: "attention" },
                  ]}
                  showLabel={false}
                  value={weaponFilter}
                />
                <SelectInput
                  compact
                  label="Sort"
                  onChange={setSortKey}
                  options={[
                    { label: "Recently updated", value: "updated" },
                    { label: "Name A-Z", value: "name" },
                    { label: "Closest to done", value: "completionDesc" },
                    { label: "Needs most work", value: "completionAsc" },
                    { label: "Highest weight", value: "weightDesc" },
                    { label: "Lowest weight", value: "weightAsc" },
                  ]}
                  showLabel={false}
                  value={sortKey}
                />
              </div>
              <label className="flex min-h-9 items-center gap-2 whitespace-nowrap text-xs font-semibold text-app-muted">
                <input
                  checked={hideComplete}
                  className="h-3.5 w-3.5 accent-app-accent"
                  onChange={(event) => setHideComplete(event.target.checked)}
                  type="checkbox"
                />
                Hide completed
              </label>
              <div className="ml-auto flex min-h-9 items-center gap-2">
                <span className="whitespace-nowrap text-xs font-medium text-app-muted-dim">
                  {visibleCharacters.length}/{characters.length}
                </span>
                {filtersActive ? (
                  <TextButton
                    compact
                    onClick={() => {
                      setQuery("");
                      setRoleFilter("all");
                      setWeaponFilter("all");
                      setHideComplete(false);
                    }}
                  >
                    Reset
                  </TextButton>
                ) : null}
              </div>
            </section>

            {visibleCharacters.length === 0 ? (
              <div className="rounded-md border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted-subtle">
                No characters match those filters.
              </div>
            ) : null}

            {groupedCharacters.map((group) => (
              <section className="grid gap-2" key={group.role}>
                <div
                  className={`flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${roleSectionClasses(
                    group.role,
                  )}`}
                >
                  <h2 className="text-sm font-bold uppercase tracking-normal">{group.role}</h2>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs font-semibold">
                    <span className="rounded bg-app-bg/30 px-2 py-1">
                      {group.summary.count} {group.summary.count === 1 ? "char" : "chars"}
                    </span>
                    <span className="rounded bg-app-bg/30 px-2 py-1">
                      CR {formatRoleSummaryValue(group.summary.averageCr, group.summary.critCharacterCount)}
                    </span>
                    <span className="rounded bg-app-bg/30 px-2 py-1">
                      CD {formatRoleSummaryValue(group.summary.averageCd, group.summary.critCharacterCount)}
                    </span>
                    <span className="rounded bg-app-bg/30 px-2 py-1">
                      Wt{" "}
                      {formatRoleSummaryValue(
                        group.summary.averageWeighted,
                        group.summary.critCharacterCount,
                      )}
                    </span>
                  </div>
                </div>

                {group.characters.map((character) => {
                  const complete = isComplete(character);
                  const primaryRole = getPrimaryRole(character.roles);
                  const characterToneClasses = characterRoleToneClasses(primaryRole, complete);
                  const checklistCount = checklistTotal(character.checklist);
                  const ratings = getRatings(character);
                  const weaponStatus = getWeaponInventoryStatus({
                    weaponId: character.weaponId,
                    inventory: weaponInventory,
                    assignmentCounts,
                  });
                  const weaponTone = getWeaponRarityTone({
                    name: character.weaponName,
                    qualityId: character.weaponQualityId,
                  });
                  const weaponToneClasses = getWeaponToneClasses(weaponTone);

                  return (
                    <button
                      className={`grid gap-3 rounded-md border px-3 py-2.5 text-left shadow-sm shadow-black/20 transition hover:border-app-accent hover:shadow-md lg:grid-cols-[minmax(240px,1.15fr)_minmax(230px,0.9fr)_minmax(210px,0.8fr)] ${
                        characterToneClasses.card
                      }`}
                      key={character.id}
                      onClick={() => onOpen(character.id)}
                      type="button"
                    >
                      <div className="flex min-w-0 gap-2.5">
                        <CharacterAvatar compact character={character} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h2 className="truncate text-base font-semibold text-app-fg">
                              {character.characterName}
                            </h2>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${characterToneClasses.status}`}
                            >
                              {complete ? "Done" : "In progress"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-app-muted-subtle">
                            {character.elementName} / {character.weaponTypeName}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {character.roles.map((role) => (
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${rolePillClasses(
                                  role,
                                )}`}
                                key={role}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-app-muted">Checklist</span>
                            <span className="text-app-muted-dim">{checklistCount}/6</span>
                          </div>
                          <div className="mt-1.5">
                            <ChecklistProgressSegments checklist={character.checklist} />
                          </div>
                        </div>
                        {character.noCrit ? (
                          <div className="rounded-md border border-app-border/80 bg-app-surface p-2">
                            <div className="text-[10px] font-semibold uppercase tracking-normal text-app-muted-dim">
                              Rating
                            </div>
                            <div className="mt-0.5 text-sm font-bold leading-none text-app-muted">
                              No crit
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5">
                            <RatingBlock label="CR" value={ratings.crRating} />
                            <RatingBlock label="CD" value={ratings.cdRating} />
                            <RatingBlock label="Weight" value={ratings.weighted} />
                          </div>
                        )}
                      </div>

                      <div className="grid content-start gap-1.5 text-xs text-app-muted">
                        <div className="flex justify-between gap-3">
                          <span className="text-app-muted-dim">Weapon</span>
                          <span className="flex min-w-0 flex-wrap justify-end gap-1">
                            <span
                              className={`truncate rounded px-1.5 py-0.5 font-semibold ${
                                character.weaponName
                                  ? `${weaponToneClasses.badge}`
                                  : "bg-app-raised text-app-muted-subtle"
                              }`}
                            >
                              {character.weaponName || "Not selected"}
                            </span>
                            <WeaponStatusBadge status={weaponStatus} />
                          </span>
                        </div>
                        {character.noCrit ? null : (
                          <div className="flex justify-between gap-3">
                            <span className="text-app-muted-dim">Echo Crit</span>
                            <span className="font-medium text-app-fg">
                              {formatPercent(character.critRate)} / {formatPercent(character.critDmg)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between gap-3">
                          <span className="text-app-muted-dim">ER</span>
                          <span className="font-medium text-app-fg">
                            {character.actualEr || 0}% / {character.expectedEr || 0}%
                          </span>
                        </div>
                        {character.notes.trim() ? (
                          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                            <span className="text-app-muted-dim">Notes</span>
                            <span
                              className="block min-w-0 truncate rounded bg-app-surface/70 px-1.5 py-1 text-right font-medium text-app-fg"
                              title={character.notes}
                            >
                              {character.notes}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function WeaponInventoryScreen({
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
    { title: "5 Star", weapons: filteredWeapons.filter((weapon) => weapon.QualityId === 5) },
    { title: "4 Star", weapons: filteredWeapons.filter((weapon) => weapon.QualityId === 4) },
    { title: "Other", weapons: filteredWeapons.filter((weapon) => weapon.QualityId < 4) },
  ].filter((group) => group.weapons.length > 0);
  const overSharedCount = inventory.filter(
    (item) => (assignmentCounts[item.weaponId] ?? 0) > item.count,
  ).length;
  const totalCopies = inventory.reduce((sum, item) => sum + item.count, 0);

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
            : `${toneClasses.card} shadow-sm`
        }`}
        key={weapon.Id}
      >
        <div className={`relative h-24 border-b sm:h-28 ${toneClasses.image}`}>
          {weapon.Icon ? (
            <Image
              alt=""
              className="object-contain p-2"
              fill
              sizes="(min-width: 1024px) 120px, (min-width: 640px) 20vw, 33vw"
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
          <p className="text-sm font-semibold text-app-accent">Wuthering Waves</p>
          <h1 className="mt-1 text-2xl font-bold text-app-fg">Weapon Inventory</h1>
        </div>
        <TextButton onClick={onBack}>Dashboard</TextButton>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatBlock label="Unique Weapons" value={String(inventory.length)} />
        <StatBlock label="Total Copies" value={String(totalCopies)} />
        <StatBlock
          label="Over Shared"
          tone={overSharedCount > 0 ? "warn" : "neutral"}
          value={String(overSharedCount)}
        />
      </section>

      <section className="grid gap-4 rounded-md border border-app-border/80 bg-app-surface p-5 shadow-sm">
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
                  <h2 className="text-sm font-bold uppercase tracking-normal text-app-muted-subtle">
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

function AddScreen({
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
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
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
      qualityId: selectedCharacter.QualityId,
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
          <p className="text-sm font-semibold text-app-accent">Wuthering Waves</p>
          <h1 className="mt-1 text-2xl font-bold text-app-fg">Add Character</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextButton onClick={onBack}>Dashboard</TextButton>
          <TextButton onClick={createCharacter} variant="primary">
            Save Character
          </TextButton>
        </div>
      </div>

      <section className="grid gap-5 rounded-md border border-app-border/80 bg-app-surface p-5 shadow-sm">
        {catalog.loading ? (
          <p className="text-sm text-app-muted-subtle">Loading character and weapon catalog...</p>
        ) : catalog.error ? (
          <p className="text-sm text-rose-300">{catalog.error}</p>
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
                quality={selectedCharacter.QualityId}
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
              <div className="mb-2 text-sm font-medium text-app-muted">Roles</div>
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
                        ? "border-app-accent bg-app-accent text-app-bg"
                        : "border-app-border bg-app-surface text-app-muted hover:bg-app-raised"
                    }`}
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
                      ? "border-app-accent bg-app-accent text-app-bg"
                      : "border-app-border bg-app-surface text-app-muted hover:bg-app-raised"
                  }`}
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

function DetailScreen({
  character,
  weapons,
  weaponInventory,
  assignmentCounts,
  onBack,
  onDelete,
  onUpdate,
}: {
  character: TrackedCharacter;
  weapons: ApiWeapon[];
  weaponInventory: WeaponInventoryItem[];
  assignmentCounts: Record<number, number>;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (character: TrackedCharacter) => void;
}) {
  const inventoryCounts = useMemo(
    () =>
      weaponInventory.reduce<Record<number, number>>((counts, item) => {
        counts[item.weaponId] = item.count;
        return counts;
      }, {}),
    [weaponInventory],
  );
  const availableWeapons = weapons.filter(
    (weapon) => weapon.Type === character.weaponTypeId && (inventoryCounts[weapon.Id] ?? 0) > 0,
  );
  const ratings = getRatings(character);
  const complete = isComplete(character);
  const primaryRole = getPrimaryRole(character.roles);
  const characterToneClasses = characterRoleToneClasses(primaryRole, complete);
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const selectedWeapon = weapons.find((weapon) => weapon.Id === character.weaponId) ?? null;
  const weaponStatus = getWeaponInventoryStatus({
    weaponId: character.weaponId,
    inventory: weaponInventory,
    assignmentCounts,
  });
  const prydwenUrl = getPrydwenCharacterUrl(character.characterName);

  function patchCharacter(patch: Partial<TrackedCharacter>) {
    onUpdate({
      ...character,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  function patchChecklist(key: keyof Checklist, value: boolean) {
    patchCharacter({
      checklist: {
        ...character.checklist,
        [key]: value,
      },
    });
  }

  function toggleRole(role: Role) {
    const nextRoles = character.roles.includes(role)
      ? character.roles.filter((item) => item !== role)
      : [...character.roles, role];

    if (nextRoles.length === 0) {
      return;
    }

    patchCharacter({ roles: nextRoles });
  }

  function updateWeapon(selectedWeapon: ApiWeapon | null) {
    patchCharacter({
      weaponId: selectedWeapon?.Id ?? null,
      weaponName: selectedWeapon?.Name ?? "",
      weaponQualityId: selectedWeapon?.QualityId ?? null,
    });
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CharacterAvatar character={character} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-app-fg">{character.characterName}</h1>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${characterToneClasses.status}`}
              >
                {complete ? "Done" : "In progress"}
              </span>
            </div>
            <p className="mt-1 text-sm text-app-muted-subtle">
              {character.elementName} / {character.weaponTypeName}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextButton onClick={onBack}>Dashboard</TextButton>
          <TextLink href={prydwenUrl}>Prydwen</TextLink>
          <TextButton onClick={onDelete} variant="danger">
            Delete
          </TextButton>
        </div>
      </div>

      {character.noCrit ? (
        <section className="rounded-md border border-app-border/80 bg-app-surface p-3">
          <div className="text-[11px] font-semibold uppercase tracking-normal text-app-muted-dim">
            Crit Rating
          </div>
          <div className="mt-1 text-lg font-semibold leading-none text-app-muted">No crit</div>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-3">
          <StatBlock label="CR Rating" tone={ratings.crRating === null ? "warn" : "neutral"} value={formatRatingValue(ratings.crRating)} />
          <StatBlock label="CD Rating" tone={ratings.cdRating === null ? "warn" : "neutral"} value={formatRatingValue(ratings.cdRating)} />
          <StatBlock
            label="Weighted"
            tone={ratings.weighted === null ? "warn" : ratings.weighted >= 1 ? "good" : "neutral"}
            value={formatRatingValue(ratings.weighted)}
          />
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="grid content-start gap-5 rounded-md border border-app-border/80 bg-app-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-app-fg">Build Setup</h2>
          <PickerSummary
            actionLabel="Change"
            image={selectedWeapon?.Icon}
            label="Weapon"
            meta={
              selectedWeapon
                ? `${selectedWeapon.TypeName} / Own ${
                    inventoryCounts[selectedWeapon.Id] ?? 0
                  } / Used ${assignmentCounts[selectedWeapon.Id] ?? 0}`
                : "No weapon selected"
            }
            onClick={() => setWeaponPickerOpen(true)}
            quality={selectedWeapon?.QualityId ?? character.weaponQualityId}
            rarityTone={getWeaponRarityTone({
              name: selectedWeapon?.Name ?? character.weaponName,
              qualityId: selectedWeapon?.QualityId ?? character.weaponQualityId,
            })}
            title={(selectedWeapon?.Name ?? character.weaponName) || "No weapon selected"}
          />
          <WeaponStatusBadge status={weaponStatus} />

          {weaponPickerOpen ? (
            <WeaponPickerModal
              onClear={() => {
                updateWeapon(null);
                setWeaponPickerOpen(false);
              }}
              onClose={() => setWeaponPickerOpen(false)}
              onSelect={(weapon) => {
                updateWeapon(weapon);
                setWeaponPickerOpen(false);
              }}
              selectedId={character.weaponId}
              weapons={availableWeapons}
              inventoryCounts={inventoryCounts}
              assignmentCounts={assignmentCounts}
              weaponTypeName={character.weaponTypeName}
            />
          ) : null}

          <div>
            <div className="mb-2 text-sm font-medium text-app-muted">Roles</div>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <RoleToggle
                  active={character.roles.includes(role)}
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
                    !character.noCrit && character.fourCostMain === option.value
                      ? "border-app-accent bg-app-accent text-app-bg"
                      : "border-app-border bg-app-surface text-app-muted hover:bg-app-raised"
                  }`}
                  key={option.value}
                  onClick={() => patchCharacter({ fourCostMain: option.value, noCrit: false })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
              <button
                className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
                  character.noCrit
                    ? "border-app-accent bg-app-accent text-app-bg"
                    : "border-app-border bg-app-surface text-app-muted hover:bg-app-raised"
                }`}
                onClick={() => patchCharacter({ noCrit: !character.noCrit })}
                type="button"
              >
                No crit
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-app-muted">Echo Crit</div>
            {character.noCrit ? (
              <div className="rounded-md border border-app-border/80 bg-app-surface px-3 py-2 text-sm font-medium text-app-muted">
                No crit
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Echo Crit Rate">
                  <NumberInput
                    onChange={(value) => patchCharacter({ critRate: value })}
                    placeholder="37.5"
                    value={character.critRate}
                  />
                </Field>
                <Field label="Echo Crit DMG">
                  <NumberInput
                    onChange={(value) => patchCharacter({ critDmg: value })}
                    placeholder="75"
                    value={character.critDmg}
                  />
                </Field>
              </div>
            )}
          </div>
          {ratings.issue ? (
            <div className="rounded-md border border-amber-500/60 bg-amber-950/35 px-3 py-2 text-sm font-medium text-amber-100">
              {ratings.issue}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expected Minimum ER">
              <ErInput
                onChange={(value) => patchCharacter({ expectedEr: value })}
                placeholder="120"
                value={character.expectedEr}
              />
            </Field>
            <Field label="Actual ER">
              <ErInput
                onChange={(value) => patchCharacter({ actualEr: value })}
                placeholder="125"
                value={character.actualEr}
              />
            </Field>
          </div>
        </section>

        <section className="grid content-start gap-5 rounded-md border border-app-border/80 bg-app-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-app-fg">Completion</h2>
          <div className="grid gap-3">
            {[
              ["skills", "Skills / Forte level ups"],
              ["fourCost", "4 cost echo built"],
              ["threeCostA", "3 cost echo 1 built"],
              ["threeCostB", "3 cost echo 2 built"],
              ["oneCostA", "1 cost echo 1 built"],
              ["oneCostB", "1 cost echo 2 built"],
            ].map(([key, label]) => (
              <label
                className="flex items-center justify-between gap-4 rounded-md border border-app-border/80 bg-app-surface/70 px-3 py-3 text-sm font-medium text-app-muted"
                key={key}
              >
                {label}
                <input
                  checked={character.checklist[key as keyof Checklist]}
                  className="h-5 w-5 accent-app-accent"
                  onChange={(event) =>
                    patchChecklist(key as keyof Checklist, event.target.checked)
                  }
                  type="checkbox"
                />
              </label>
            ))}
          </div>

          <Field label="Notes">
            <textarea
              className="min-h-40 rounded-md border border-app-border bg-app-surface p-3 text-sm text-app-fg outline-none transition focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/25"
              onChange={(event) => patchCharacter({ notes: event.target.value })}
              value={character.notes}
            />
          </Field>
        </section>
      </div>
    </main>
  );
}

export default function Tracker() {
  const { screen, navigateToScreen } = useTrackerNavigation();
  const {
    characters,
    setCharacters,
    weaponInventory,
    setWeaponInventory,
    storageLoaded,
  } = usePersistedTrackerState();
  const catalog = useCatalog();
  const importRef = useRef<HTMLInputElement | null>(null);

  const selectedCharacter = useMemo(() => {
    if (screen.name !== "detail") {
      return null;
    }

    return characters.find((character) => character.id === screen.id) ?? null;
  }, [characters, screen]);
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  useEffect(() => {
    if (
      !storageLoaded ||
      screen.name !== "detail" ||
      characters.some((character) => character.id === screen.id)
    ) {
      return;
    }

    navigateToScreen(DEFAULT_SCREEN, true);
  }, [characters, navigateToScreen, screen, storageLoaded]);

  function addCharacter(character: TrackedCharacter) {
    setCharacters((current) => [...current, character]);
    navigateToScreen({ name: "detail", id: character.id });
  }

  function updateCharacter(nextCharacter: TrackedCharacter) {
    setCharacters((current) =>
      current.map((character) =>
        character.id === nextCharacter.id ? nextCharacter : character,
      ),
    );
  }

  function deleteCharacter(id: string) {
    if (!confirm("Delete this tracked character?")) {
      return;
    }

    setCharacters((current) => current.filter((character) => character.id !== id));
    navigateToScreen({ name: "dashboard" }, true);
  }

  function clearData() {
    if (
      (!characters.length && !weaponInventory.length) ||
      !confirm("Clear all tracked characters and weapon inventory from this browser?")
    ) {
      return;
    }

    setCharacters([]);
    setWeaponInventory([]);
    navigateToScreen({ name: "dashboard" }, true);
  }

  async function importCharacters(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const imported = parseImportedTrackerData(text);

      setCharacters(imported.characters);
      setWeaponInventory(imported.weaponInventory);
      navigateToScreen({ name: "dashboard" }, true);
    } catch {
      alert("That JSON file could not be imported.");
    }
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-fg">
      {screen.name === "dashboard" ? (
        <Dashboard
          assignmentCounts={assignmentCounts}
          characters={characters}
          importRef={importRef}
          onAdd={() => navigateToScreen({ name: "add" })}
          onClear={clearData}
          onExport={() => exportTrackerData(characters, weaponInventory)}
          onImport={importCharacters}
          onInventory={() => navigateToScreen({ name: "inventory" })}
          onOpen={(id) => navigateToScreen({ name: "detail", id })}
          weaponInventory={weaponInventory}
        />
      ) : null}

      {screen.name === "inventory" ? (
        <WeaponInventoryScreen
          assignmentCounts={assignmentCounts}
          catalog={catalog}
          inventory={weaponInventory}
          onBack={() => navigateToScreen({ name: "dashboard" })}
          onUpdate={setWeaponInventory}
        />
      ) : null}

      {screen.name === "add" ? (
        <AddScreen
          assignmentCounts={assignmentCounts}
          catalog={catalog}
          onBack={() => navigateToScreen({ name: "dashboard" })}
          onCreate={addCharacter}
          tracked={characters}
          weaponInventory={weaponInventory}
        />
      ) : null}

      {screen.name === "detail" && selectedCharacter ? (
        <DetailScreen
          assignmentCounts={assignmentCounts}
          character={selectedCharacter}
          onBack={() => navigateToScreen({ name: "dashboard" })}
          onDelete={() => deleteCharacter(selectedCharacter.id)}
          onUpdate={updateCharacter}
          weaponInventory={weaponInventory}
          weapons={catalog.weapons}
        />
      ) : null}
    </div>
  );
}
