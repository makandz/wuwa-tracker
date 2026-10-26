# Tracker storage

Unified documents live at `wuwa-tracker.unified`. The document's `format` and
`schemaVersion` identify its schema; storage keys do not change with versions.

`schemas/v1.ts` is the complete, strict unified v1 contract. Persisted domain
types are inferred from it. Validate reads, imports, edits, and conversion outputs
with Zod. Do not silently coerce invalid unified values, drop records, strip
unknown properties, or use the legacy normalizers for unified data.

## Legacy transition

If both unified storage and its recovery copy are absent, startup reads
`wuwa-tracker.document.v4`, validates its **v5** contents, converts them, and
writes unified v1. Never write or remove legacy keys, including the legacy
`lastKnownGood` key. A damaged unified save must not fall back to legacy data.

Historical JSON import adapters are separate from browser startup. Invalid
versioned documents must not fall through to an unversioned import adapter.
Unused priority text, custom target lists, and legacy target flags are omitted
from unified data; actual echo measurements and both selection modes are kept.

## Backups and future versions

- Ordinary saves preserve the previous validated document at
  `wuwa-tracker.unified.lastKnownGood` before replacing the active save.
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
