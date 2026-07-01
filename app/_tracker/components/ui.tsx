"use client";

import { useState } from "react";
import Image from "next/image";

import { CHECKLIST_SEGMENTS } from "../constants";
import {
  characterElementBorderClasses,
  formatDecimalInputValue,
  getRatingGrade,
  getWeaponToneClasses,
  parseDecimalInput,
  ratingGradeClasses,
  roleButtonClasses,
  sanitizeDecimalInput,
} from "../domain";
import type {
  CharacterBadgeTone,
  Checklist,
  RatingValue,
  Role,
  TrackedCharacter,
  WeaponRarityTone,
} from "../types";

export function StatBlock({
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
      ? "border-status-good-border bg-status-good-bg text-status-good-text"
      : tone === "warn"
        ? "border-status-warn-border bg-status-warn-bg text-status-warn-text"
        : "border-app-border/80 bg-app-surface text-app-fg";

  return (
    <div className={`rounded-md border ${compact ? "p-2" : "p-3"} ${toneClass}`}>
      <div
        className={`font-medium text-app-muted-subtle ${
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

export function RatingBlock({ label, value }: { label: string; value: RatingValue }) {
  if (value === null) {
    return (
      <div className="rounded-md border border-status-warn-border bg-status-warn-bg p-2">
        <div className="text-[10px] font-medium text-status-warn-text">
          {label}
        </div>
        <div className="mt-0.5 text-sm font-bold leading-none text-status-warn-text">Check</div>
      </div>
    );
  }

  const grade = getRatingGrade(value);

  return (
    <div className="rounded-md border border-app-border/80 bg-app-surface p-2">
      <div className="text-[10px] font-medium text-app-muted-subtle">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span
          className={`rounded-sm px-1.5 py-0.5 text-sm font-bold leading-none ${ratingGradeClasses(
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

export function RatingSummaryBlock({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: RatingValue;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "border-status-good-border bg-status-good-bg text-status-good-text"
      : tone === "warn"
        ? "border-status-warn-border bg-status-warn-bg text-status-warn-text"
        : "border-app-border/80 bg-app-surface text-app-fg";

  if (value === null) {
    return (
      <div className={`rounded-md border p-3 ${toneClass}`}>
        <div className="text-[11px] font-medium text-app-muted-subtle">
          {label}
        </div>
        <div className="mt-1 text-lg font-semibold leading-none">Check stats</div>
      </div>
    );
  }

  const grade = getRatingGrade(value);

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="text-[11px] font-medium text-app-muted-subtle">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`rounded-sm px-2 py-1 text-base font-bold leading-none ${ratingGradeClasses(
            grade,
          )}`}
        >
          {grade}
        </span>
        <span className="text-lg font-semibold leading-none">{value.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function TextButton({
  children,
  className = "",
  onClick,
  variant = "secondary",
  type = "button",
  compact = false,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  compact?: boolean;
}) {
  const classes =
    variant === "primary"
      ? "border-app-accent-strong bg-app-accent-strong text-app-bg hover:bg-app-accent"
      : variant === "danger"
        ? "border-status-danger-border/80 bg-status-danger-bg/45 text-status-danger-text hover:bg-status-danger-bg"
        : "border-app-border bg-app-bg text-app-muted hover:border-app-muted-dim hover:bg-app-surface hover:text-app-fg";

  return (
    <button
      className={`rounded-md border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25 ${
        compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
      } ${classes} ${className}`}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export function TextLink({
  children,
  href,
  compact = false,
  variant = "secondary",
}: {
  children: React.ReactNode;
  href: string;
  compact?: boolean;
  variant?: "secondary" | "external";
}) {
  const classes =
    variant === "external"
      ? "border-weapon-blue-strong/80 bg-weapon-blue-bg text-weapon-blue-text hover:border-weapon-blue-strong hover:bg-weapon-blue-strong hover:text-app-bg focus-visible:ring-weapon-blue-strong/30"
      : "border-app-border bg-app-bg text-app-muted hover:border-app-muted-dim hover:bg-app-surface hover:text-app-fg focus-visible:ring-app-accent/25";

  return (
    <a
      className={`inline-flex items-center rounded-md border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
        compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
      } ${classes}`}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-app-muted-subtle">
      {label}
      {children}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draftValue, setDraftValue] = useState(() => formatDecimalInputValue(value * 100));
  const [focused, setFocused] = useState(false);
  const displayValue = focused
    ? draftValue
    : disabled && value === 0
      ? "0"
      : formatDecimalInputValue(value * 100);

  return (
    <div className="relative">
      <input
        className={`h-10 w-full rounded-md border border-app-border px-3 pr-9 text-sm outline-none transition-colors focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/20 ${
          disabled
            ? "cursor-not-allowed bg-app-raised text-app-muted-subtle"
            : "bg-app-surface text-app-fg"
        }`}
        disabled={disabled}
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

export function StarBadge({
  quality,
  tone,
  characterTone,
  animated = false,
}: {
  quality: number | null | undefined;
  tone?: WeaponRarityTone;
  characterTone?: CharacterBadgeTone;
  animated?: boolean;
}) {
  if (!quality) {
    return null;
  }

  const toneClass = animated
    ? "rating-s-plus border border-weapon-gold-text text-app-bg"
    : characterTone === "blue"
      ? "bg-weapon-blue-strong text-white"
      : tone === undefined
        ? quality >= 5
          ? "bg-weapon-gold-text text-app-bg"
          : quality === 4
            ? "bg-weapon-purple-strong text-white"
            : "bg-weapon-blue-strong text-white"
        : getWeaponToneClasses(tone).badge;

  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${toneClass}`}
    >
      {quality} star
    </span>
  );
}

export function WeaponStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return null;
  }

  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-[11px] font-bold ${
        status === "Shared"
          ? "bg-status-warn-bg text-status-warn-text"
          : "bg-status-danger-bg text-status-danger-text"
      }`}
    >
      {status}
    </span>
  );
}

export function ImageFallback({ label }: { label: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-app-raised text-lg font-bold text-app-muted-dim">
      {label.charAt(0)}
    </div>
  );
}

export function Modal({
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
        className="grid max-h-[90vh] w-full max-w-5xl grid-rows-[auto_1fr] overflow-hidden rounded-md border border-app-border/80 bg-app-surface shadow-lg shadow-black/30"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-app-border/80 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-xl font-semibold text-app-fg">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-app-muted-subtle">{subtitle}</p> : null}
          </div>
          <button
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-app-border bg-app-bg text-xl leading-none text-app-muted transition-colors hover:bg-app-raised hover:text-app-fg"
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

export function SearchInput({
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
      className={`w-full rounded-md border border-app-border bg-app-bg text-app-fg outline-none transition-colors placeholder:text-app-muted-dim focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/20 ${
        compact ? "h-9 px-2.5 text-xs" : "h-11 px-3 text-sm"
      }`}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="search"
      value={value}
    />
  );
}

export function SelectInput<TValue extends string>({
  label,
  value,
  options,
  onChange,
  compact = false,
  showLabel = true,
  selectClassName = "",
}: {
  label: string;
  value: TValue;
  options: { label: string; value: TValue }[];
  onChange: (value: TValue) => void;
  compact?: boolean;
  showLabel?: boolean;
  selectClassName?: string;
}) {
  return (
    <label
      className={`grid font-medium text-app-muted ${
        compact && showLabel ? "gap-1 text-xs" : compact ? "gap-0 text-xs" : "gap-2 text-sm"
      }`}
    >
      {showLabel ? label : <span className="sr-only">{label}</span>}
      <span className="relative">
        <select
          aria-label={label}
          className={`w-full appearance-none rounded-md border border-app-border bg-app-bg font-semibold text-app-fg outline-none transition-colors focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/20 ${
            compact ? "h-9 pl-2.5 pr-8 text-xs" : "h-11 pl-3 pr-11 text-sm"
          } ${selectClassName}`}
          onChange={(event) => onChange(event.target.value as TValue)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 grid w-4 place-items-center text-app-fg ${
            compact ? "right-2.5" : "right-4"
          }`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </span>
    </label>
  );
}

export function ErInput({
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
        className="h-10 w-full rounded-md border border-app-border bg-app-bg px-3 pr-9 text-sm text-app-fg outline-none transition-colors focus:border-app-accent-strong focus:ring-2 focus:ring-app-accent/20"
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

export function RoleToggle({
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
      aria-pressed={active}
      className={`h-9 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/20 ${roleButtonClasses(
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

export function CharacterAvatar({
  character,
  compact = false,
  dense = false,
}: {
  character: TrackedCharacter;
  compact?: boolean;
  dense?: boolean;
}) {
  const sizeClass = dense ? "h-10 w-10" : compact ? "h-12 w-12" : "h-14 w-14";
  const imageSize = dense ? "40px" : compact ? "48px" : "56px";
  const elementBorderClasses = characterElementBorderClasses(character.elementName);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md border bg-app-raised ${
        elementBorderClasses
      } ${
        sizeClass
      }`}
      title={character.elementName}
    >
      {character.characterIcon ? (
        <Image
          alt=""
          className="h-full w-full object-cover"
          fill
          sizes={imageSize}
          src={character.characterIcon}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-lg font-bold text-app-muted-dim">
          {character.characterName.charAt(0)}
        </div>
      )}
      <span
        className={`absolute bottom-0 right-0 border-l border-t border-black/20 px-1 text-[10px] font-bold ${
          character.qualityId >= 5
            ? "bg-weapon-gold-text text-app-bg"
            : character.qualityId === 4
              ? "bg-weapon-purple-strong text-white"
              : "bg-weapon-blue-strong text-white"
        }`}
      >
        {character.qualityId}
      </span>
    </div>
  );
}

export function ChecklistProgressSegments({ checklist }: { checklist: Checklist }) {
  return (
    <div
      aria-label="Checklist progress"
      className="grid h-5 grid-cols-6 gap-0.5 overflow-hidden rounded-sm bg-app-bg p-0.5"
    >
      {CHECKLIST_SEGMENTS.map((segment) => {
        const complete = checklist[segment.key];

        return (
          <span
            aria-label={`${segment.label}: ${complete ? "done" : "not done"}`}
            className={`grid min-w-0 place-items-center rounded-sm text-[9px] font-bold leading-none transition-colors ${
              segment.key === "skills"
                ? complete
                  ? "bg-weapon-gold-strong text-app-bg"
                  : "bg-weapon-gold-bg/70 text-weapon-gold-text/70"
                : complete
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
