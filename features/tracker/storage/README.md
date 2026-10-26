# Tracker storage

Unified documents live at `wuwa-tracker.unified`. The document's `format` and
`schemaVersion` identify its schema; storage keys do not change with versions.

`schemas/v1.ts` is the complete, strict unified v1 contract. Persisted domain
types are inferred from it. Validate reads, imports, edits, and conversion outputs
with Zod. Do not silently coerce invalid unified values, drop records, strip
unknown properties, or use the legacy normalizers for unified data.

## Character and set ownership

Unified v1 is still unpublished. Each character owns shared identity, weapon,
skills completion, notes, and an optional target ER. It contains one to three
independent named echo sets with unique IDs. Each set retains its manual
checklist, detailed measurements, both substat-selection modes, scoring preset,
and optional actual ER. Switching modes or presets must preserve inactive data.
There is no persisted selected or equipped set.

Character-wide roles, aggregate crit values, four-cost main-stat selection, and
dashboard sorting/view preferences are not part of this format. The dashboard
uses release order, placing unknown IDs first in descending ID order.

## Legacy transition

If both unified storage and its recovery copy are absent, startup reads
`wuwa-tracker.document.v4`, validates its **v5** contents, converts them, and
writes unified v1. Never write or remove legacy keys, including the legacy
`lastKnownGood` key. A damaged unified save must not fall back to legacy data.

JSON imports accept complete legacy v5 and unified v1 documents only. Reject
pre-v5, unversioned, and character-only exports rather than guessing their shape.
Each legacy character becomes one Default set. Skills and target ER remain shared;
actual ER, manual echo progress, and detailed measurements move to that set.
Legacy DPS and HybridSupport plans map to Strict Crit and Standard Crit; No Crit
maps to Priority Stats. Unused priority text, custom target lists, legacy target
flags, roles, and aggregate crit fields are omitted. Both selection modes and
disabled detailed measurements are kept.

## Backups and future versions

- Ordinary saves preserve the previous validated document at
  `wuwa-tracker.unified.lastKnownGood` before replacing the active save.
- Settings remains available after load failures. Explicit imports and resets can
  replace damaged unified data after saving its exact bytes at
  `wuwa-tracker.unified.beforeRestore`. If that backup fails, stop the restore.
  Keep the existing recovery copy and legacy keys untouched. Supported active
  documents still use the revision guard and ordinary backup path; unsupported
  newer versions cannot be replaced through recovery.
- Version transitions preserve the exact source JSON at
  `wuwa-tracker.unified.backup.vN`. Existing version snapshots are never replaced
  by retries or ordinary saves. A failed backup write must stop the upgrade.
- Keep each published schema independent and unchanged. A future `schemas/v2.ts`
  defines its complete format without importing v1 or mutable app constants.
- Add a conversion script only when a new saved format is needed. In
  `upgradeTrackerDocument`, validate the source with its schema, convert it, and
  validate the destination with its schema. `loadUnifiedTrackerDocument` and
  `saveTrackerUpgrade` handle preserving the source before replacement. If
  multiple versions are crossed, preserve each intermediate validated version.
- Invalid source documents can use recovery. Conversion bugs, failed writes,
  and unsupported versions must leave the active save untouched. In particular,
  never restore an older backup over an unsupported newer version.

Version snapshots and recovery copies share the browser's storage. JSON export
provides a backup outside that storage.
